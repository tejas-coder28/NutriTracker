import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  Image, ActivityIndicator, ScrollView, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { analyzeTextWithGemini, analyzeImageWithGemini } from '../services/aiService';
import { insertFoodLog } from '../services/database';
import { compressFoodPhoto } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import { getLocalDateStr } from '../utils/dateUtils';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { id: 'lunch', label: 'Lunch', icon: 'fast-food-outline' },
  { id: 'dinner', label: 'Dinner', icon: 'restaurant-outline' },
  { id: 'snack', label: 'Snack', icon: 'nutrition-outline' }
];

export default function AddFoodModal({ visible, onClose, onFoodAdded, onFoodSavedSuccess, onFoodSaveError }) {
  const { isDark, themeColors, glassStyles } = useTheme();
  const [tab, setTab] = useState('text');
  const [mealType, setMealType] = useState('snack');
  const [textInput, setTextInput] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [photoNote, setPhotoNote] = useState('');

  // Submit guard refs & states
  const isSubmittingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  // Manual state
  const [manualName, setManualName] = useState('');
  const [manualCals, setManualCals] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualFiber, setManualFiber] = useState('');

  // AI Review state
  const [aiResult, setAiResult] = useState(null);
  const [editName, setEditName] = useState('');
  const [itemsList, setItemsList] = useState([]);
  const [pendingImagePath, setPendingImagePath] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const pickImage = async (useCamera = false) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera/library permission required.'); return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
      if (!result.canceled && result.assets?.[0]) setImageUri(result.assets[0].uri);
    } catch (e) { Alert.alert('Error', 'Could not open camera/gallery.'); }
  };

  const populateReview = (analysis, imagePath = null) => {
    setAiResult(analysis);
    setEditName(analysis.name || 'Meal');
    setPendingImagePath(imagePath);

    const initialItems = (analysis.items || []).map((it, idx) => {
      const unitType = it.unit_type === 'piece' ? 'piece' : 'weight';
      const qty = unitType === 'piece' ? Math.max(1, Number(it.quantity) || 1) : null;
      const gpp = unitType === 'piece' ? Math.max(1, Number(it.grams_per_piece) || 50) : null;
      const g = unitType === 'piece' ? qty * gpp : Math.max(5, Math.round(Number(it.estimated_grams) || 100));
      return {
        id: idx,
        name: it.name || `Item ${idx + 1}`,
        unit_type: unitType,
        quantity: qty,
        gramsPerPiece: gpp,
        grams: String(g),
        origGrams: g,
        calories: Math.round(Number(it.calories) || 0),
        protein: Math.round(Number(it.protein) || 0),
        carbs: Math.round(Number(it.carbs) || 0),
        fat: Math.round(Number(it.fat) || 0),
        fiber: Math.round(Number(it.fiber) || 0),
        origCals: Math.round(Number(it.calories) || 0),
        origProtein: Math.round(Number(it.protein) || 0),
        origCarbs: Math.round(Number(it.carbs) || 0),
        origFat: Math.round(Number(it.fat) || 0),
        origFiber: Math.round(Number(it.fiber) || 0),
        dirty: false,
      };
    });

    setItemsList(initialItems);
  };

  const mergeReanalyzedItems = (freshItems, dirtyIds) => {
    let freshIdx = 0;
    setItemsList(prev => prev.map(item => {
      if (!dirtyIds.has(item.id)) return item;
      const fi = freshItems[freshIdx++];
      if (!fi) return { ...item, dirty: false };
      const unitType = fi.unit_type === 'piece' ? 'piece' : item.unit_type;
      const qty = unitType === 'piece' ? Math.max(1, Number(fi.quantity) || 1) : null;
      const gpp = unitType === 'piece' ? Math.max(1, Number(fi.grams_per_piece) || 50) : null;
      const g = unitType === 'piece' ? qty * gpp : Math.max(5, Math.round(Number(fi.estimated_grams) || 100));
      return {
        ...item,
        name: item.name,
        unit_type: unitType,
        quantity: qty,
        gramsPerPiece: gpp,
        grams: String(g),
        origGrams: g,
        calories: Math.round(Number(fi.calories) || 0),
        protein: Math.round(Number(fi.protein) || 0),
        carbs: Math.round(Number(fi.carbs) || 0),
        fat: Math.round(Number(fi.fat) || 0),
        fiber: Math.round(Number(fi.fiber) || 0),
        origCals: Math.round(Number(fi.calories) || 0),
        origProtein: Math.round(Number(fi.protein) || 0),
        origCarbs: Math.round(Number(fi.carbs) || 0),
        origFat: Math.round(Number(fi.fat) || 0),
        origFiber: Math.round(Number(fi.fiber) || 0),
        dirty: false,
      };
    }));
  };

  const handleReAnalyzeAll = async () => {
    const dirtyItems = itemsList.filter(i => i.dirty);
    if (dirtyItems.length === 0) {
      Alert.alert('Nothing to re-analyze', 'Edit an item\'s name, quantity, or weight first — then tap re-analyze.');
      return;
    }
    const dirtyIds = new Set(dirtyItems.map(i => i.id));
    const query = dirtyItems.map(i => {
      if (i.unit_type === 'piece') {
        return `${i.quantity ?? 1} pieces of ${i.name} (about ${i.gramsPerPiece ?? 50}g each)`;
      }
      return `${i.grams}g of ${i.name}`;
    }).join(', ');

    setIsAnalyzing(true);
    setStatusMsg(`Re-analyzing ${dirtyItems.length} edited item(s)…`);
    try {
      const analysis = await analyzeTextWithGemini(query);
      mergeReanalyzedItems(analysis.items || [], dirtyIds);
    } catch (err) {
      Alert.alert('Re-Analysis Error', err?.message || String(err) || 'Failed to re-analyze food.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteItem = (id) => {
    setItemsList(prev => prev.filter(i => i.id !== id));
  };

  const handleAddItem = () => {
    const newId = Date.now();
    setItemsList(prev => [...prev, {
      id: newId,
      name: 'New food item',
      unit_type: 'weight',
      quantity: null,
      gramsPerPiece: null,
      grams: '100',
      origGrams: 100,
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      origCals: 0, origProtein: 0, origCarbs: 0, origFat: 0, origFiber: 0,
      dirty: true,
    }]);
  };

  const handleItemQtyChange = (id, rawText) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const qty = rawText === '' ? '' : rawText;
      const numQty = parseInt(rawText);
      if (!isNaN(numQty) && numQty > 0) {
        const gpp = typeof item.gramsPerPiece === 'number' ? item.gramsPerPiece : 50;
        const newG = numQty * gpp;
        const scale = item.origGrams > 0 ? newG / item.origGrams : 1;
        return {
          ...item,
          quantity: qty,
          grams: String(newG),
          calories: Math.round(item.origCals * scale),
          protein: Math.round(item.origProtein * scale),
          carbs: Math.round(item.origCarbs * scale),
          fat: Math.round(item.origFat * scale),
          fiber: Math.round(item.origFiber * scale),
          dirty: true,
        };
      }
      return { ...item, quantity: qty, dirty: true };
    }));
  };

  const handleItemQtyBlur = (id) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const clamped = Math.max(1, parseInt(item.quantity) || 1);
      const gpp = typeof item.gramsPerPiece === 'number' ? item.gramsPerPiece : 50;
      const newG = clamped * gpp;
      const scale = item.origGrams > 0 ? newG / item.origGrams : 1;
      return {
        ...item,
        quantity: clamped,
        grams: String(newG),
        calories: Math.round(item.origCals * scale),
        protein: Math.round(item.origProtein * scale),
        carbs: Math.round(item.origCarbs * scale),
        fat: Math.round(item.origFat * scale),
        fiber: Math.round(item.origFiber * scale),
      };
    }));
  };

  const handleItemGppChange = (id, rawText) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const numGpp = parseFloat(rawText);
      if (!isNaN(numGpp) && numGpp > 0) {
        const qty = typeof item.quantity === 'number' ? item.quantity : (parseInt(item.quantity) || 1);
        const newG = qty * numGpp;
        const scale = item.origGrams > 0 ? newG / item.origGrams : 1;
        return {
          ...item,
          gramsPerPiece: rawText,
          grams: String(newG),
          calories: Math.round(item.origCals * scale),
          protein: Math.round(item.origProtein * scale),
          carbs: Math.round(item.origCarbs * scale),
          fat: Math.round(item.origFat * scale),
          fiber: Math.round(item.origFiber * scale),
          dirty: true,
        };
      }
      return { ...item, gramsPerPiece: rawText, dirty: true };
    }));
  };

  const handleItemGppBlur = (id) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const clamped = Math.max(1, parseFloat(item.gramsPerPiece) || 1);
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const newG = qty * clamped;
      const scale = item.origGrams > 0 ? newG / item.origGrams : 1;
      return {
        ...item,
        gramsPerPiece: clamped,
        grams: String(newG),
        calories: Math.round(item.origCals * scale),
        protein: Math.round(item.origProtein * scale),
        carbs: Math.round(item.origCarbs * scale),
        fat: Math.round(item.origFat * scale),
        fiber: Math.round(item.origFiber * scale),
      };
    }));
  };

  const handleAnalyzeText = async () => {
    if (!textInput.trim()) { Alert.alert('Missing Input', 'Describe your meal first.'); return; }
    setIsAnalyzing(true);
    setStatusMsg('Analyzing your meal…');
    try {
      const analysis = await analyzeTextWithGemini(textInput.trim());
      populateReview(analysis);
    } catch (err) {
      Alert.alert('Error', err?.message || String(err) || 'Failed to analyze food.');
    } finally { setIsAnalyzing(false); }
  };

  const handleAnalyzePhoto = async () => {
    if (!imageUri) { Alert.alert('No Photo', 'Please take or select a photo.'); return; }
    setIsAnalyzing(true);
    setStatusMsg('Compressing & scanning photo…');
    try {
      let targetPath = imageUri;
      if (Platform.OS !== 'web') {
        const dir = FileSystem.documentDirectory + 'food_photos/';
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const ext = imageUri.split('.').pop() || 'jpg';
        targetPath = dir + `food_${Date.now()}.${ext}`;
        await FileSystem.copyAsync({ from: imageUri, to: targetPath });
      }

      let compressedDataUri;
      try {
        compressedDataUri = await compressFoodPhoto(targetPath);
      } catch (cErr) {
        Alert.alert('Photo Error', cErr?.message || 'Photo too large, please try a smaller image.');
        setIsAnalyzing(false);
        return;
      }

      const analysis = await analyzeImageWithGemini(compressedDataUri, photoNote);
      populateReview(analysis, compressedDataUri);
    } catch (err) {
      Alert.alert('Error', err?.message || String(err) || 'Failed to scan photo.');
    } finally { setIsAnalyzing(false); }
  };

  const handleManualLog = async () => {
    if (isSubmittingRef.current || isSaving) return;
    if (!manualName.trim()) { Alert.alert('Required', 'Enter a food name.'); return; }

    isSubmittingRef.current = true;
    setIsSaving(true);

    try {
      const loggedAt = getLocalDateStr();
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entryPayload = {
        name: manualName.trim(),
        meal_type: mealType,
        grams_estimate: 200,
        calories: parseFloat(manualCals) || 0,
        protein: parseFloat(manualProtein) || 0,
        carbs: parseFloat(manualCarbs) || 0,
        fat: parseFloat(manualFat) || 0,
        fiber: parseFloat(manualFiber) || 0,
        source: 'manual',
        logged_at: loggedAt,
        created_at: new Date().toISOString(),
      };

      const optimisticEntry = { id: tempId, ...entryPayload };

      if (onFoodAdded) onFoodAdded(optimisticEntry);
      resetForm();
      onClose();

      try {
        const savedEntry = await insertFoodLog(entryPayload);
        if (onFoodSavedSuccess) {
          onFoodSavedSuccess(tempId, savedEntry);
        }
      } catch (err) {
        console.error('Firestore save failed:', err);
        if (onFoodSaveError) {
          onFoodSaveError(tempId, err);
        } else {
          Alert.alert('Save Error', err?.message || String(err) || 'Failed to save entry.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err?.message || String(err));
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleItemGramsChange = (id, rawText) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const numG = parseFloat(rawText);
      if (!isNaN(numG) && numG > 0) {
        const scale = item.origGrams > 0 ? numG / item.origGrams : 1;
        return {
          ...item,
          grams: rawText,
          calories: Math.round(item.origCals * scale),
          protein: Math.round(item.origProtein * scale),
          carbs: Math.round(item.origCarbs * scale),
          fat: Math.round(item.origFat * scale),
          fiber: Math.round(item.origFiber * scale),
          dirty: true,
        };
      }
      return { ...item, grams: rawText, dirty: true };
    }));
  };

  const handleItemGramsBlur = (id) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const clamped = Math.max(1, parseFloat(item.grams) || 1);
      const scale = item.origGrams > 0 ? clamped / item.origGrams : 1;
      return {
        ...item,
        grams: String(clamped),
        calories: Math.round(item.origCals * scale),
        protein: Math.round(item.origProtein * scale),
        carbs: Math.round(item.origCarbs * scale),
        fat: Math.round(item.origFat * scale),
        fiber: Math.round(item.origFiber * scale),
      };
    }));
  };

  const handleItemNameChange = (id, newNameText) => {
    setItemsList(prev => prev.map(item =>
      item.id === id ? { ...item, name: newNameText, dirty: true } : item
    ));
  };

  const applyGlobalMultiplier = (mult) => {
    const updated = itemsList.map(item => {
      const newG = Math.round(item.origGrams * mult);
      return {
        ...item,
        grams: String(newG),
        calories: Math.round(item.origCals * mult),
        protein: Math.round(item.origProtein * mult),
        carbs: Math.round(item.origCarbs * mult),
        fat: Math.round(item.origFat * mult),
        fiber: Math.round(item.origFiber * mult),
      };
    });
    setItemsList(updated);
  };

  const handleConfirmReview = async () => {
    if (isSubmittingRef.current || isSaving) return;
    isSubmittingRef.current = true;
    setIsSaving(true);

    try {
      const totalGrams = itemsList.reduce((acc, i) => acc + (parseFloat(i.grams) || 0), 0);
      const totalCals = itemsList.reduce((acc, i) => acc + (Number(i.calories) || 0), 0);
      const totalProtein = itemsList.reduce((acc, i) => acc + (Number(i.protein) || 0), 0);
      const totalCarbs = itemsList.reduce((acc, i) => acc + (Number(i.carbs) || 0), 0);
      const totalFat = itemsList.reduce((acc, i) => acc + (Number(i.fat) || 0), 0);
      const totalFiber = itemsList.reduce((acc, i) => acc + (Number(i.fiber) || 0), 0);

      const loggedAt = getLocalDateStr();
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entryPayload = {
        name: editName.trim() || 'Logged Meal',
        meal_type: mealType,
        grams_estimate: Math.round(totalGrams),
        calories: totalCals,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        fiber: totalFiber,
        image_path: pendingImagePath,
        items: itemsList,
        source: tab === 'photo' ? 'camera' : 'text',
        logged_at: loggedAt,
        created_at: new Date().toISOString(),
      };

      const optimisticEntry = { id: tempId, ...entryPayload };

      if (onFoodAdded) onFoodAdded(optimisticEntry);
      resetForm();
      onClose();

      try {
        const savedEntry = await insertFoodLog(entryPayload);
        if (onFoodSavedSuccess) {
          onFoodSavedSuccess(tempId, savedEntry);
        }
      } catch (err) {
        console.error('Firestore save failed:', err);
        if (onFoodSaveError) {
          onFoodSaveError(tempId, err);
        } else {
          Alert.alert('Save Error', err?.message || String(err) || 'Failed to save entry.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err?.message || String(err));
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setTextInput(''); setImageUri(null); setPhotoNote('');
    setManualName(''); setManualCals(''); setManualProtein('');
    setManualCarbs(''); setManualFat(''); setManualFiber('');
    setAiResult(null); setItemsList([]); setPendingImagePath(null);
    setIsSaving(false);
    isSubmittingRef.current = false;
  };

  const totalGrams = itemsList.reduce((acc, i) => acc + (parseFloat(i.grams) || 0), 0);
  const totalCals = itemsList.reduce((acc, i) => acc + (Number(i.calories) || 0), 0);
  const totalProtein = itemsList.reduce((acc, i) => acc + (Number(i.protein) || 0), 0);
  const totalCarbs = itemsList.reduce((acc, i) => acc + (Number(i.carbs) || 0), 0);
  const totalFat = itemsList.reduce((acc, i) => acc + (Number(i.fat) || 0), 0);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => { resetForm(); onClose(); }}>
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)' }]}>
        <View style={[glassStyles.modalContent, s.sheet]}>
          <View style={s.header}>
            <Text style={[s.headerTitle, { color: themeColors.textPrimary }]}>Log Food</Text>
            <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
              <Ionicons name="close" size={24} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>

          {!aiResult && (
            <>
              <View style={[s.tabs, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                {[['text', 'text-outline', 'AI Text'], ['photo', 'camera-outline', 'AI Photo'], ['manual', 'create-outline', 'Manual']].map(([id, icon, label]) => (
                  <TouchableOpacity
                    key={id}
                    style={[s.tab, tab === id && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(16, 185, 129, 0.12)' }]}
                    onPress={() => setTab(id)}
                  >
                    <Ionicons name={icon} size={15} color={tab === id ? (isDark ? '#34D399' : '#059669') : themeColors.textMuted} />
                    <Text style={[s.tabText, { color: tab === id ? (isDark ? '#34D399' : '#059669') : themeColors.textSecondary }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.mealRow}>
                {MEAL_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      s.mealPill,
                      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)' },
                      mealType === t.id && s.activeMealPill
                    ]}
                    onPress={() => setMealType(t.id)}
                  >
                    <Ionicons name={t.icon} size={13} color={mealType === t.id ? '#fff' : themeColors.textMuted} />
                    <Text style={[s.mealText, { color: mealType === t.id ? '#fff' : themeColors.textSecondary }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {isAnalyzing ? (
            <View style={s.loading}>
              <ActivityIndicator size="large" color={isDark ? '#34D399' : '#059669'} />
              <Text style={[s.loadingTitle, { color: themeColors.textPrimary }]}>Analyzing your meal…</Text>
              <Text style={[s.loadingSub, { color: themeColors.textSecondary }]}>{statusMsg}</Text>
              <View style={[s.skeleton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]} />
              <View style={[s.skeleton, { width: '65%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]} />
            </View>
          ) : aiResult ? (
            <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
              <View style={[s.reviewCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.85)', borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)' }]}>
                <View style={s.reviewHead}>
                  <Ionicons name="create-outline" size={19} color={isDark ? '#34D399' : '#059669'} />
                  <Text style={[s.reviewTitle, { color: themeColors.textPrimary }]}>Review Individual Food Portions</Text>
                </View>
                <Text style={[s.reviewSub, { color: themeColors.textSecondary }]}>Adjust portion weight for each item below before saving.</Text>

                <Text style={[s.fieldLabel, { color: themeColors.textPrimary }]}>Meal Title</Text>
                <TextInput
                  style={[s.input, { color: themeColors.textPrimary, backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Meal Title"
                  placeholderTextColor={themeColors.placeholder}
                />

                {/* Items Breakdown */}
                <View style={s.itemsSection}>
                  <View style={s.sectionHeaderRow}>
                    <Text style={[s.sectionHeaderLabel, { color: isDark ? '#34D399' : '#059669' }]}>Food Items ({itemsList.length})</Text>
                    <Text style={[s.sectionHint, { color: themeColors.textMuted }]}>Edit name or weight, then Re-analyze</Text>
                  </View>

                  {itemsList.map(item => (
                    <View key={item.id} style={[s.itemCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', borderColor: themeColors.cardBorderSubtle }]}>
                      <View style={s.itemNameRow}>
                        <Ionicons name="restaurant-outline" size={15} color={isDark ? '#34D399' : '#059669'} />
                        <TextInput
                          style={[s.itemNameInput, { color: themeColors.textPrimary, backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                          value={item.name}
                          onChangeText={(txt) => handleItemNameChange(item.id, txt)}
                          placeholder="Food name (e.g. cooked chicken)"
                          placeholderTextColor={themeColors.placeholder}
                        />
                        {item.dirty && <View style={s.dirtyDot} />}
                        <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={s.deleteBtn}>
                          <Ionicons name="close" size={16} color="#F87171" />
                        </TouchableOpacity>
                      </View>

                      {item.unit_type === 'piece' ? (
                        <View style={s.pieceRow}>
                          <View style={s.pieceField}>
                            <Text style={[s.pieceLabel, { color: themeColors.textSecondary }]}>Qty</Text>
                            <View style={s.gramBox}>
                              <TextInput
                                style={[s.gramInput, { color: isDark ? '#34D399' : '#059669', backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                                keyboardType="numeric"
                                value={String(item.quantity ?? 1)}
                                onChangeText={(t) => handleItemQtyChange(item.id, t)}
                                onBlur={() => handleItemQtyBlur(item.id)}
                              />
                              <Text style={[s.gramUnit, { color: themeColors.textSecondary }]}>pcs</Text>
                            </View>
                          </View>
                          <Text style={[s.pieceMult, { color: themeColors.textMuted }]}>×</Text>
                          <View style={s.pieceField}>
                            <Text style={[s.pieceLabel, { color: themeColors.textSecondary }]}>g / piece</Text>
                            <View style={s.gramBox}>
                              <TextInput
                                style={[s.gramInput, { color: isDark ? '#34D399' : '#059669', backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                                keyboardType="numeric"
                                value={String(item.gramsPerPiece ?? 50)}
                                onChangeText={(t) => handleItemGppChange(item.id, t)}
                                onBlur={() => handleItemGppBlur(item.id)}
                              />
                              <Text style={[s.gramUnit, { color: themeColors.textSecondary }]}>g</Text>
                            </View>
                          </View>
                          <View style={[s.pieceTotalBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)' }]}>
                            <Text style={[s.pieceTotalLabel, { color: themeColors.textSecondary }]}>Total</Text>
                            <Text style={[s.pieceTotalVal, { color: isDark ? '#34D399' : '#059669' }]}>{Math.round(parseFloat(item.grams) || 0)}g</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={s.itemGramRow}>
                          <Text style={[s.itemGramLabel, { color: themeColors.textSecondary }]}>Portion weight:</Text>
                          <View style={s.gramBox}>
                            <TextInput
                              style={[s.gramInput, { color: isDark ? '#34D399' : '#059669', backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                              keyboardType="numeric"
                              value={item.grams}
                              onChangeText={(txt) => handleItemGramsChange(item.id, txt)}
                              onBlur={() => handleItemGramsBlur(item.id)}
                            />
                            <Text style={[s.gramUnit, { color: themeColors.textSecondary }]}>g</Text>
                          </View>
                        </View>
                      )}

                      <View style={s.itemMacroPills}>
                        <Text style={[s.macroPillCal, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)', color: isDark ? '#34D399' : '#059669' }]}>{item.calories} kcal</Text>
                        <Text style={[s.macroPill, { color: themeColors.textSecondary, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>P: {item.protein}g</Text>
                        <Text style={[s.macroPill, { color: themeColors.textSecondary, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>C: {item.carbs}g</Text>
                        <Text style={[s.macroPill, { color: themeColors.textSecondary, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>F: {item.fat}g</Text>
                        <Text style={[s.macroPill, { color: themeColors.textSecondary, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>Fib: {item.fiber}g</Text>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={[s.addItemBtn, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)', borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)' }]} onPress={handleAddItem}>
                    <Ionicons name="add-circle-outline" size={16} color={isDark ? '#34D399' : '#059669'} />
                    <Text style={[s.addItemText, { color: isDark ? '#34D399' : '#059669' }]}>Add a missed food item</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.reAnalyzeAllBtn} onPress={handleReAnalyzeAll}>
                    <Ionicons name="sync-outline" size={15} color="#FFFFFF" />
                    <Text style={s.reAnalyzeAllText}>Re-analyze all items</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[s.fieldLabel, { color: themeColors.textPrimary }]}>Scale Entire Meal</Text>
                <View style={s.multRow}>
                  {[0.5, 1.0, 1.5, 2.0].map(m => (
                    <TouchableOpacity key={m} style={[s.multBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]} onPress={() => applyGlobalMultiplier(m)}>
                      <Text style={[s.multText, { color: themeColors.textPrimary }]}>{m}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[s.totalsCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
                  <Text style={[s.totalsTitle, { color: themeColors.textPrimary }]}>Combined Meal Totals</Text>
                  <View style={s.totalsRow}>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: themeColors.textPrimary }]}>{Math.round(totalGrams)}g</Text>
                      <Text style={[s.totalStatSub, { color: themeColors.textSecondary }]}>Total Weight</Text>
                    </View>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: isDark ? '#34D399' : '#059669' }]}>{totalCals}</Text>
                      <Text style={[s.totalStatSub, { color: themeColors.textSecondary }]}>Calories</Text>
                    </View>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: themeColors.protein }]}>{totalProtein}g</Text>
                      <Text style={[s.totalStatSub, { color: themeColors.textSecondary }]}>Protein</Text>
                    </View>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: themeColors.carbs }]}>{totalCarbs}g</Text>
                      <Text style={[s.totalStatSub, { color: themeColors.textSecondary }]}>Carbs</Text>
                    </View>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: themeColors.fat }]}>{totalFat}g</Text>
                      <Text style={[s.totalStatSub, { color: themeColors.textSecondary }]}>Fat</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.saveBtn, (isSaving || isAnalyzing) && { opacity: 0.6 }]}
                  onPress={handleConfirmReview}
                  disabled={isSaving || isAnalyzing}
                  activeOpacity={0.7}
                >
                  {isSaving ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={s.saveBtnText}>Saving...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={s.saveBtnText}>Confirm & Save to Log</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
              {tab === 'text' && (
                <View style={s.form}>
                  <Text style={[s.fieldLabel, { color: themeColors.textPrimary }]}>Describe what you ate</Text>
                  <TextInput
                    style={[glassStyles.input, s.textArea, { color: themeColors.textPrimary }]}
                    placeholder="e.g. 2 rotis with 300g chicken breast"
                    placeholderTextColor={themeColors.placeholder}
                    multiline
                    numberOfLines={4}
                    value={textInput}
                    onChangeText={setTextInput}
                  />
                  <Text style={[s.hint, { color: themeColors.textSecondary }]}>💡 Include weight for accuracy, e.g. "2 rotis with 300g chicken breast"</Text>
                  <TouchableOpacity style={s.saveBtn} onPress={handleAnalyzeText} disabled={isAnalyzing || isSaving}>
                    <Ionicons name="sparkles" size={17} color="#fff" />
                    <Text style={s.saveBtnText}>Analyze Food</Text>
                  </TouchableOpacity>
                </View>
              )}
              {tab === 'photo' && (
                <View style={s.form}>
                  {imageUri ? (
                    <View style={s.previewWrap}>
                      <Image source={{ uri: imageUri }} style={s.preview} />
                      <TouchableOpacity style={s.removeBtn} onPress={() => setImageUri(null)}>
                        <Ionicons name="trash" size={15} color="#fff" /><Text style={s.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={s.photoPickerRow}>
                      <TouchableOpacity style={[s.photoBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)', borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)' }]} onPress={() => pickImage(true)}>
                        <Ionicons name="camera" size={30} color={isDark ? '#34D399' : '#059669'} />
                        <Text style={[s.photoBoxText, { color: themeColors.textSecondary }]}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.photoBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)', borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)' }]} onPress={() => pickImage(false)}>
                        <Ionicons name="images" size={30} color="#818CF8" />
                        <Text style={[s.photoBoxText, { color: themeColors.textSecondary }]}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={[s.fieldLabel, { color: themeColors.textPrimary, marginTop: 10 }]}>Optional Note</Text>
                  <TextInput
                    style={[glassStyles.input, s.input, { color: themeColors.textPrimary }]}
                    placeholder="e.g. extra oil added"
                    placeholderTextColor={themeColors.placeholder}
                    value={photoNote}
                    onChangeText={setPhotoNote}
                  />
                  <TouchableOpacity style={s.saveBtn} onPress={handleAnalyzePhoto} disabled={isAnalyzing || isSaving}>
                    <Ionicons name="sparkles" size={17} color="#fff" />
                    <Text style={s.saveBtnText}>Scan & Estimate</Text>
                  </TouchableOpacity>
                </View>
              )}
              {tab === 'manual' && (
                <View style={s.form}>
                  <Text style={[s.fieldLabel, { color: themeColors.textPrimary }]}>Food Name</Text>
                  <TextInput
                    style={[glassStyles.input, s.input, { color: themeColors.textPrimary }]}
                    placeholder="Protein Shake"
                    placeholderTextColor={themeColors.placeholder}
                    value={manualName}
                    onChangeText={setManualName}
                  />
                  <View style={s.row2}>
                    <View style={s.half}>
                      <Text style={[s.miniLabel, { color: themeColors.textSecondary }]}>Calories</Text>
                      <TextInput
                        style={[glassStyles.input, s.input, { color: themeColors.textPrimary }]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={themeColors.placeholder}
                        value={manualCals}
                        onChangeText={setManualCals}
                      />
                    </View>
                    <View style={s.half}>
                      <Text style={[s.miniLabel, { color: themeColors.textSecondary }]}>Protein (g)</Text>
                      <TextInput
                        style={[glassStyles.input, s.input, { color: themeColors.textPrimary }]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={themeColors.placeholder}
                        value={manualProtein}
                        onChangeText={setManualProtein}
                      />
                    </View>
                  </View>
                  <View style={s.row2}>
                    <View style={s.half}>
                      <Text style={[s.miniLabel, { color: themeColors.textSecondary }]}>Carbs (g)</Text>
                      <TextInput
                        style={[glassStyles.input, s.input, { color: themeColors.textPrimary }]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={themeColors.placeholder}
                        value={manualCarbs}
                        onChangeText={setManualCarbs}
                      />
                    </View>
                    <View style={s.half}>
                      <Text style={[s.miniLabel, { color: themeColors.textSecondary }]}>Fat (g)</Text>
                      <TextInput
                        style={[glassStyles.input, s.input, { color: themeColors.textPrimary }]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={themeColors.placeholder}
                        value={manualFat}
                        onChangeText={setManualFat}
                      />
                    </View>
                  </View>
                  <Text style={[s.miniLabel, { color: themeColors.textSecondary }]}>Fiber (g)</Text>
                  <TextInput
                    style={[glassStyles.input, s.input, { color: themeColors.textPrimary }]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={themeColors.placeholder}
                    value={manualFiber}
                    onChangeText={setManualFiber}
                  />
                  <TouchableOpacity
                    style={[s.saveBtn, (isSaving || isAnalyzing) && { opacity: 0.6 }]}
                    onPress={handleManualLog}
                    disabled={isSaving || isAnalyzing}
                    activeOpacity={0.7}
                  >
                    {isSaving ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={s.saveBtnText}>Saving...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={17} color="#fff" />
                        <Text style={s.saveBtnText}>Add Meal</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '92%',
    padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, gap: 5 },
  activeTab: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  tabText: { fontSize: 12, fontWeight: '600' },
  activeTabText: { color: '#34D399' },
  mealRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  mealPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 10, gap: 3, borderWidth: 1 },
  activeMealPill: { backgroundColor: '#10B981', borderColor: '#10B981' },
  mealText: { fontSize: 10, fontWeight: '600' },
  activeMealText: { color: '#fff' },
  scroll: { marginBottom: 8 },
  form: { gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  miniLabel: { fontSize: 11, fontWeight: '500', marginBottom: 3 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    height: 90,
    textAlignVertical: 'top',
  },
  hint: { color: '#A1A1AA', fontSize: 11 },
  photoPickerRow: { flexDirection: 'row', gap: 12 },
  photoBox: { flex: 1, height: 110, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', borderStyle: 'dashed', gap: 7 },
  photoBoxText: { fontSize: 11, fontWeight: '500' },
  previewWrap: { position: 'relative' },
  preview: { width: '100%', height: 170, borderRadius: 16 },
  removeBtn: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(239,68,68,0.85)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 3 },
  removeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  saveBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 14 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loading: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loadingTitle: { fontSize: 15, fontWeight: '700' },
  loadingSub: { fontSize: 12, textAlign: 'center' },
  skeleton: { width: '88%', height: 14, borderRadius: 7, marginTop: 10 },

  reviewCard: { borderRadius: 18, padding: 15, gap: 10 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  reviewTitle: { fontSize: 15, fontWeight: '700' },
  reviewSub: { fontSize: 11 },

  itemsSection: { gap: 10, marginTop: 6 },
  sectionHeaderLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  itemCard: { borderRadius: 14, padding: 12, gap: 8 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemNameInput: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, fontWeight: '600' },
  itemGramRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemGramLabel: { fontSize: 12, fontWeight: '600' },
  gramBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gramInput: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, fontSize: 14, fontWeight: '800', width: 75, textAlign: 'center' },
  gramUnit: { fontSize: 12, fontWeight: '600' },
  itemMacroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  macroPillCal: { fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  macroPill: { fontSize: 11, fontWeight: '600', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },

  multRow: { flexDirection: 'row', gap: 7, marginTop: 2 },
  multBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  multText: { fontSize: 11, fontWeight: '700' },

  totalsCard: { borderRadius: 14, padding: 12, marginTop: 8, gap: 8 },
  totalsTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalStat: { alignItems: 'center' },
  totalStatNum: { fontSize: 14, fontWeight: '800' },
  totalStatSub: { fontSize: 10, marginTop: 1 },
  row2: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, gap: 4 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHint: { fontSize: 10, fontStyle: 'italic' },
  deleteBtn: { padding: 4, marginLeft: 4 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 13, marginTop: 4 },
  addItemText: { fontSize: 13, fontWeight: '600' },
  reAnalyzeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 11, marginTop: 6 },
  reAnalyzeAllText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pieceField: { gap: 3 },
  pieceLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  pieceMult: { color: '#71717A', fontSize: 16, fontWeight: '700', marginTop: 12 },
  pieceTotalBox: { marginLeft: 'auto', alignItems: 'flex-end', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  pieceTotalLabel: { fontSize: 9, fontWeight: '600' },
  pieceTotalVal: { fontSize: 14, fontWeight: '800' },
});
