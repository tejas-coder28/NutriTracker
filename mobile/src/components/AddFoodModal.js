import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  Image, ActivityIndicator, ScrollView, Alert, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { analyzeTextWithGemini, analyzeImageWithGemini } from '../services/aiService';
import { insertFoodLog } from '../services/database';
import { useTheme } from '../context/ThemeContext';
import { getLocalDateStr } from '../utils/dateUtils';
import LiquidButton from './primitives/LiquidButton';
import Icon from './ui/Icon';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { id: 'lunch', label: 'Lunch', icon: 'fast-food-outline' },
  { id: 'dinner', label: 'Dinner', icon: 'restaurant-outline' },
  { id: 'snack', label: 'Snack', icon: 'nutrition-outline' }
];

export default function AddFoodModal({ visible, onClose, onFoodAdded, onFoodSavedSuccess, onFoodSaveError }) {
  const { isDark, tokens } = useTheme();
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
      if (analysis.items && analysis.items.length > 0) {
        mergeReanalyzedItems(analysis.items, dirtyIds);
      }
    } catch (err) {
      Alert.alert('Re-analysis error', err?.message || 'Failed to re-analyze items.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleItemQtyChange = (id, rawText) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const qty = parseInt(rawText, 10);
      const gpp = item.gramsPerPiece || 50;
      if (!isNaN(qty) && qty > 0) {
        const newG = qty * gpp;
        const scale = item.origGrams > 0 ? newG / item.origGrams : 1;
        return {
          ...item,
          quantity: rawText,
          grams: String(newG),
          calories: Math.round(item.origCals * scale),
          protein: Math.round(item.origProtein * scale),
          carbs: Math.round(item.origCarbs * scale),
          fat: Math.round(item.origFat * scale),
          fiber: Math.round(item.origFiber * scale),
          dirty: true,
        };
      }
      return { ...item, quantity: rawText, dirty: true };
    }));
  };

  const handleItemQtyBlur = (id) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const gpp = item.gramsPerPiece || 50;
      const newG = qty * gpp;
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
      };
    }));
  };

  const handleItemGppChange = (id, rawText) => {
    setItemsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const gpp = parseFloat(rawText);
      const qty = item.quantity || 1;
      if (!isNaN(gpp) && gpp > 0) {
        const newG = Math.round(qty * gpp);
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
      const gpp = Math.max(1, parseFloat(item.gramsPerPiece) || 50);
      const qty = item.quantity || 1;
      const newG = Math.round(qty * gpp);
      const scale = item.origGrams > 0 ? newG / item.origGrams : 1;
      return {
        ...item,
        gramsPerPiece: gpp,
        grams: String(newG),
        calories: Math.round(item.origCals * scale),
        protein: Math.round(item.origProtein * scale),
        carbs: Math.round(item.origCarbs * scale),
        fat: Math.round(item.origFat * scale),
        fiber: Math.round(item.origFiber * scale),
      };
    }));
  };

  const handleAddItem = () => {
    const newId = Date.now();
    setItemsList(prev => [
      ...prev,
      {
        id: newId,
        name: 'New food item',
        unit_type: 'weight',
        quantity: null,
        gramsPerPiece: null,
        grams: '100',
        origGrams: 100,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        origCals: 0,
        origProtein: 0,
        origCarbs: 0,
        origFat: 0,
        origFiber: 0,
        dirty: true,
      }
    ]);
  };

  const handleDeleteItem = (id) => {
    setItemsList(prev => prev.filter(i => i.id !== id));
  };

  const handleAnalyzeText = async () => {
    if (!textInput.trim()) { Alert.alert('Empty Input', 'Please describe what you ate.'); return; }
    setIsAnalyzing(true);
    setStatusMsg('Estimating nutrition…');
    try {
      const analysis = await analyzeTextWithGemini(textInput.trim());
      populateReview(analysis);
    } catch (err) {
      Alert.alert('Error', err?.message || String(err) || 'Failed to analyze text.');
    } finally { setIsAnalyzing(false); }
  };

  const handleAnalyzePhoto = async () => {
    if (!imageUri) { Alert.alert('No Photo', 'Please take or select a photo.'); return; }
    setIsAnalyzing(true);
    setStatusMsg('Scanning photo…');
    try {
      let targetPath = imageUri;
      if (Platform.OS !== 'web') {
        const dir = FileSystem.documentDirectory + 'food_photos/';
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const ext = imageUri.split('.').pop() || 'jpg';
        targetPath = dir + `food_${Date.now()}.${ext}`;
        await FileSystem.copyAsync({ from: imageUri, to: targetPath });
      }

      const analysis = await analyzeImageWithGemini(targetPath, photoNote);
      populateReview(analysis, targetPath);
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

  const isWeb = Platform.OS === 'web';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { resetForm(); onClose(); }}>
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(15,23,42,0.45)' }]}>
        <View
          style={[
            s.sheet,
            {
              backgroundColor: isDark ? tokens.colors.liquidGlassBg : tokens.colors.glassBg,
              borderColor: tokens.colors.glassBorder,
              shadowColor: tokens.colors.glassShadow,
            },
            isWeb && {
              backdropFilter: `blur(${tokens.blur.sheet}px) saturate(160%)`,
              WebkitBackdropFilter: `blur(${tokens.blur.sheet}px) saturate(160%)`,
            }
          ]}
        >
          {Platform.OS !== 'web' && (
            <BlurView intensity={tokens.blur.sheet} tint={tokens.blur.tint} style={StyleSheet.absoluteFill} />
          )}

          {/* Grab Handle */}
          <View style={s.handleContainer}>
            <View style={[s.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.18)' }]} />
          </View>

          {/* Specular highlight */}
          <View style={[s.specularLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)' }]} />

          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={[s.iconBox, { backgroundColor: isDark ? 'rgba(16,232,160,0.12)' : 'rgba(0,179,119,0.12)' }]}>
                <Icon name="nutrition" size={18} color={tokens.colors.primary} />
              </View>
              <Text style={[s.headerTitle, { color: tokens.colors.textPrimary }]}>Log Food</Text>
            </View>
            <TouchableOpacity
              onPress={() => { resetForm(); onClose(); }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[
                s.modalCloseBtn,
                {
                  backgroundColor: tokens.liquidGlass.fill,
                  borderColor: tokens.liquidGlass.rim,
                }
              ]}
            >
              <Icon name="close" size={20} color={tokens.text.primary} />
            </TouchableOpacity>
          </View>

          {!aiResult && (
            <>
              {/* NeuSegmented Tabs */}
              <View
                style={[
                  s.tabs,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
                    borderColor: tokens.colors.glassBorder,
                  }
                ]}
              >
                {[['text', 'text-outline', 'AI Text'], ['photo', 'camera-outline', 'AI Photo'], ['manual', 'create-outline', 'Manual']].map(([id, icon, label]) => {
                  const isActive = tab === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[
                        s.tab,
                        {
                          backgroundColor: isActive
                            ? (isDark ? 'rgba(16, 232, 160, 0.18)' : 'rgba(0, 179, 119, 0.14)')
                            : 'transparent',
                          borderColor: isActive ? tokens.colors.primary : 'transparent',
                          ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
                        }
                      ]}
                      onPress={() => setTab(id)}
                    >
                      <Icon
                        name={icon}
                        size={15}
                        color={isActive ? tokens.colors.primary : tokens.colors.textMuted}
                      />
                      <Text
                        style={[
                          s.tabText,
                          { color: isActive ? tokens.colors.primary : tokens.colors.textSecondary },
                          isActive && { fontWeight: '700' }
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Meal Type Pills */}
              <View style={s.mealRow}>
                {MEAL_TYPES.map(t => {
                  const isSelected = mealType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        s.mealPill,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(16, 232, 160, 0.18)' : 'rgba(0, 179, 119, 0.14)')
                            : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)'),
                          borderColor: isSelected ? tokens.colors.primary : tokens.colors.cardBorderSubtle,
                          ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
                        }
                      ]}
                      onPress={() => setMealType(t.id)}
                    >
                      <Icon
                        name={t.icon}
                        size={13}
                        color={isSelected ? tokens.colors.primary : tokens.colors.textMuted}
                      />
                      <Text
                        style={[
                          s.mealText,
                          { color: isSelected ? tokens.colors.primary : tokens.colors.textSecondary },
                          isSelected && { fontWeight: '700' }
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {isAnalyzing ? (
            <View style={s.loading}>
              <ActivityIndicator size="large" color={tokens.colors.primary} />
              <Text style={[s.loadingTitle, { color: tokens.colors.textPrimary }]}>Analyzing your meal…</Text>
              <Text style={[s.loadingSub, { color: tokens.colors.textSecondary }]}>{statusMsg}</Text>
              <View style={[s.skeleton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />
              <View style={[s.skeleton, { width: '65%', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />
            </View>
          ) : aiResult ? (
            <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View
                style={[
                  s.reviewCard,
                  {
                    backgroundColor: tokens.colors.neuBase,
                    borderColor: tokens.colors.cardBorderSubtle,
                  }
                ]}
              >
                <View style={s.reviewHead}>
                  <Icon name="create-outline" size={19} color={tokens.colors.primary} />
                  <Text style={[s.reviewTitle, { color: tokens.colors.textPrimary }]}>Review Individual Food Portions</Text>
                </View>
                <Text style={[s.reviewSub, { color: tokens.colors.textSecondary }]}>Adjust portion weight for each item below before saving.</Text>

                <Text style={[s.fieldLabel, { color: tokens.colors.textPrimary }]}>Meal Title</Text>
                <TextInput
                  style={[
                    s.input,
                    {
                      color: tokens.colors.textPrimary,
                      backgroundColor: tokens.colors.inputBg,
                      borderColor: tokens.colors.inputBorder,
                    }
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Meal Title"
                  placeholderTextColor={tokens.colors.placeholder}
                />

                {/* Items Breakdown */}
                <View style={s.itemsSection}>
                  <View style={s.sectionHeaderRow}>
                    <Text style={[s.sectionHeaderLabel, { color: tokens.colors.primary }]}>Food Items ({itemsList.length})</Text>
                    <Text style={[s.sectionHint, { color: tokens.colors.textSecondary }]}>Edit name or weight, then Re-analyze</Text>
                  </View>

                  {itemsList.map(item => (
                    <View
                      key={item.id}
                      style={[
                        s.itemCard,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
                          borderColor: tokens.colors.cardBorderSubtle,
                        }
                      ]}
                    >
                      <View style={s.itemNameRow}>
                        <Icon name="restaurant-outline" size={15} color={tokens.colors.primary} />
                        <TextInput
                          style={[
                            s.itemNameInput,
                            {
                              color: tokens.colors.textPrimary,
                              backgroundColor: tokens.colors.inputBg,
                              borderColor: tokens.colors.inputBorder,
                            }
                          ]}
                          value={item.name}
                          onChangeText={(txt) => handleItemNameChange(item.id, txt)}
                          placeholder="Food name (e.g. cooked chicken)"
                          placeholderTextColor={tokens.colors.placeholder}
                        />
                        {item.dirty && <View style={[s.dirtyDot, { backgroundColor: tokens.colors.warning }]} />}
                        <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={s.deleteBtn}>
                          <Icon name="close" size={16} color={tokens.colors.danger} />
                        </TouchableOpacity>
                      </View>

                      {item.unit_type === 'piece' ? (
                        <View style={s.pieceRow}>
                          <View style={s.pieceField}>
                            <Text style={[s.pieceLabel, { color: tokens.colors.textSecondary }]}>Qty</Text>
                            <View style={s.gramBox}>
                              <TextInput
                                style={[
                                  s.gramInput,
                                  {
                                    color: tokens.colors.primary,
                                    backgroundColor: tokens.colors.inputBg,
                                    borderColor: tokens.colors.inputBorder,
                                  }
                                ]}
                                keyboardType="numeric"
                                value={String(item.quantity ?? 1)}
                                onChangeText={(t) => handleItemQtyChange(item.id, t)}
                                onBlur={() => handleItemQtyBlur(item.id)}
                              />
                              <Text style={[s.gramUnit, { color: tokens.colors.textSecondary }]}>pcs</Text>
                            </View>
                          </View>
                          <Text style={[s.pieceMult, { color: tokens.colors.textSecondary }]}>×</Text>
                          <View style={s.pieceField}>
                            <Text style={[s.pieceLabel, { color: tokens.colors.textSecondary }]}>g / piece</Text>
                            <View style={s.gramBox}>
                              <TextInput
                                style={[
                                  s.gramInput,
                                  {
                                    color: tokens.colors.primary,
                                    backgroundColor: tokens.colors.inputBg,
                                    borderColor: tokens.colors.inputBorder,
                                  }
                                ]}
                                keyboardType="numeric"
                                value={String(item.gramsPerPiece ?? 50)}
                                onChangeText={(t) => handleItemGppChange(item.id, t)}
                                onBlur={() => handleItemGppBlur(item.id)}
                              />
                              <Text style={[s.gramUnit, { color: tokens.colors.textSecondary }]}>g</Text>
                            </View>
                          </View>
                          <View
                            style={[
                              s.pieceTotalBox,
                              {
                                backgroundColor: isDark ? 'rgba(16, 232, 160, 0.15)' : 'rgba(0, 179, 119, 0.12)',
                                borderColor: tokens.colors.primary,
                              }
                            ]}
                          >
                            <Text style={[s.pieceTotalLabel, { color: tokens.colors.textSecondary }]}>Total</Text>
                            <Text style={[s.pieceTotalVal, { color: tokens.colors.primary }]}>{Math.round(parseFloat(item.grams) || 0)}g</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={s.itemGramRow}>
                          <Text style={[s.itemGramLabel, { color: tokens.colors.textSecondary }]}>Portion weight:</Text>
                          <View style={s.gramBox}>
                            <TextInput
                              style={[
                                s.gramInput,
                                {
                                  color: tokens.colors.primary,
                                  backgroundColor: tokens.colors.inputBg,
                                  borderColor: tokens.colors.inputBorder,
                                }
                              ]}
                              keyboardType="numeric"
                              value={item.grams}
                              onChangeText={(txt) => handleItemGramsChange(item.id, txt)}
                              onBlur={() => handleItemGramsBlur(item.id)}
                            />
                            <Text style={[s.gramUnit, { color: tokens.colors.textSecondary }]}>g</Text>
                          </View>
                        </View>
                      )}

                      <View style={s.itemMacroPills}>
                        <Text style={[s.macroPill, { backgroundColor: isDark ? 'rgba(255, 77, 77, 0.18)' : 'rgba(224, 58, 58, 0.12)', color: tokens.colors.calories, borderColor: tokens.colors.calories }]}>
                          {item.calories} kcal
                        </Text>
                        <Text style={[s.macroPill, { backgroundColor: isDark ? 'rgba(0, 210, 255, 0.15)' : 'rgba(0, 144, 200, 0.12)', color: tokens.colors.protein }]}>
                          P: {item.protein}g
                        </Text>
                        <Text style={[s.macroPill, { backgroundColor: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(224, 154, 0, 0.12)', color: tokens.colors.carbs }]}>
                          C: {item.carbs}g
                        </Text>
                        <Text style={[s.macroPill, { backgroundColor: isDark ? 'rgba(255, 45, 120, 0.15)' : 'rgba(224, 36, 94, 0.12)', color: tokens.colors.fats }]}>
                          F: {item.fat}g
                        </Text>
                        <Text style={[s.macroPill, { backgroundColor: isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(34, 165, 89, 0.12)', color: tokens.colors.fiber }]}>
                          Fib: {item.fiber}g
                        </Text>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[
                      s.addItemBtn,
                      {
                        backgroundColor: isDark ? 'rgba(16, 232, 160, 0.12)' : 'rgba(0, 179, 119, 0.08)',
                        borderColor: tokens.colors.primary,
                      }
                    ]}
                    onPress={handleAddItem}
                  >
                    <Icon name="add-circle-outline" size={16} color={tokens.colors.primary} />
                    <Text style={[s.addItemText, { color: tokens.colors.primary }]}>Add a missed food item</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.reAnalyzeAllBtn,
                      {
                        backgroundColor: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)',
                        borderColor: tokens.colors.accentViolet,
                      }
                    ]}
                    onPress={handleReAnalyzeAll}
                  >
                    <Icon name="sync-outline" size={15} color={tokens.colors.accentViolet} />
                    <Text style={[s.reAnalyzeAllText, { color: tokens.colors.accentViolet }]}>Re-analyze all items</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[s.fieldLabel, { color: tokens.colors.textPrimary }]}>Scale Entire Meal</Text>
                <View style={s.multRow}>
                  {[0.5, 1.0, 1.5, 2.0].map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        s.multBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)',
                          borderColor: tokens.colors.cardBorderSubtle,
                        }
                      ]}
                      onPress={() => applyGlobalMultiplier(m)}
                    >
                      <Text style={[s.multText, { color: tokens.colors.textPrimary }]}>{m}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Combined Totals */}
                <View
                  style={[
                    s.totalsCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
                      borderColor: tokens.colors.cardBorderSubtle,
                    }
                  ]}
                >
                  <Text style={[s.totalsTitle, { color: tokens.colors.textPrimary }]}>Combined Meal Totals</Text>
                  <View style={s.totalsRow}>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: tokens.colors.textPrimary }]}>{Math.round(totalGrams)}g</Text>
                      <Text style={[s.totalStatSub, { color: tokens.colors.textSecondary }]}>Total Weight</Text>
                    </View>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: tokens.colors.calories }]}>{totalCals}</Text>
                      <Text style={[s.totalStatSub, { color: tokens.colors.textSecondary }]}>Calories</Text>
                    </View>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: tokens.colors.protein }]}>{totalProtein}g</Text>
                      <Text style={[s.totalStatSub, { color: tokens.colors.textSecondary }]}>Protein</Text>
                    </View>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: tokens.colors.carbs }]}>{totalCarbs}g</Text>
                      <Text style={[s.totalStatSub, { color: tokens.colors.textSecondary }]}>Carbs</Text>
                    </View>
                    <View style={s.totalStat}>
                      <Text style={[s.totalStatNum, { color: tokens.colors.fats }]}>{totalFat}g</Text>
                      <Text style={[s.totalStatSub, { color: tokens.colors.textSecondary }]}>Fat</Text>
                    </View>
                  </View>
                </View>

                <View style={s.modalBtnWrap}>
                  <LiquidButton
                    title={isSaving ? 'Saving...' : 'Confirm & Save to Log'}
                    icon="checkmark-circle"
                    onPress={handleConfirmReview}
                    disabled={isSaving || isAnalyzing}
                    variant="primary"
                    shimmer
                  />
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {tab === 'text' && (
                <View style={s.form}>
                  <Text style={[s.fieldLabel, { color: tokens.colors.textPrimary }]}>Describe what you ate</Text>
                  <TextInput
                    style={[
                      s.textArea,
                      {
                        color: tokens.colors.textPrimary,
                        backgroundColor: tokens.colors.inputBg,
                        borderColor: tokens.colors.inputBorder,
                      }
                    ]}
                    placeholder="e.g. 2 rotis with 300g chicken breast"
                    placeholderTextColor={tokens.colors.placeholder}
                    multiline
                    numberOfLines={4}
                    value={textInput}
                    onChangeText={setTextInput}
                  />
                  <Text style={[s.hint, { color: tokens.colors.textSecondary }]}>💡 Include weight for accuracy, e.g. "2 rotis with 300g chicken breast"</Text>
                  <View style={s.modalBtnWrap}>
                    <LiquidButton
                      title="Analyze Food"
                      icon="sparkles"
                      onPress={handleAnalyzeText}
                      disabled={isAnalyzing || isSaving}
                      variant="primary"
                      shimmer
                    />
                  </View>
                </View>
              )}
              {tab === 'photo' && (
                <View style={s.form}>
                  {imageUri ? (
                    <View style={s.previewWrap}>
                      <Image source={{ uri: imageUri }} style={s.preview} />
                      <TouchableOpacity
                        style={[s.removeBtn, { backgroundColor: tokens.colors.danger }]}
                        onPress={() => setImageUri(null)}
                      >
                        <Icon name="trash" size={15} color={tokens.colors.dangerText} />
                        <Text style={[s.removeText, { color: tokens.colors.dangerText }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={s.photoPickerRow}>
                      <TouchableOpacity
                        style={[
                          s.photoBox,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)',
                            borderColor: tokens.colors.glassBorder,
                          }
                        ]}
                        onPress={() => pickImage(true)}
                      >
                        <Icon name="camera" size={30} color={tokens.colors.primary} />
                        <Text style={[s.photoBoxText, { color: tokens.colors.textSecondary }]}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          s.photoBox,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)',
                            borderColor: tokens.colors.glassBorder,
                          }
                        ]}
                        onPress={() => pickImage(false)}
                      >
                        <Icon name="images" size={30} color={tokens.colors.protein} />
                        <Text style={[s.photoBoxText, { color: tokens.colors.textSecondary }]}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={[s.fieldLabel, { color: tokens.colors.textPrimary, marginTop: 10 }]}>Optional Note</Text>
                  <TextInput
                    style={[
                      s.input,
                      {
                        color: tokens.colors.textPrimary,
                        backgroundColor: tokens.colors.inputBg,
                        borderColor: tokens.colors.inputBorder,
                      }
                    ]}
                    placeholder="e.g. extra oil added"
                    placeholderTextColor={tokens.colors.placeholder}
                    value={photoNote}
                    onChangeText={setPhotoNote}
                  />
                  <View style={s.modalBtnWrap}>
                    <LiquidButton
                      title="Scan & Estimate"
                      icon="sparkles"
                      onPress={handleAnalyzePhoto}
                      disabled={isAnalyzing || isSaving}
                      variant="primary"
                      shimmer
                    />
                  </View>
                </View>
              )}
              {tab === 'manual' && (
                <View style={s.form}>
                  <Text style={[s.fieldLabel, { color: tokens.colors.textPrimary }]}>Food Name</Text>
                  <TextInput
                    style={[
                      s.input,
                      {
                        color: tokens.colors.textPrimary,
                        backgroundColor: tokens.colors.inputBg,
                        borderColor: tokens.colors.inputBorder,
                      }
                    ]}
                    placeholder="Protein Shake"
                    placeholderTextColor={tokens.colors.placeholder}
                    value={manualName}
                    onChangeText={setManualName}
                  />
                  <View style={s.row2}>
                    <View style={s.half}>
                      <Text style={[s.miniLabel, { color: tokens.colors.textSecondary }]}>Calories</Text>
                      <TextInput
                        style={[
                          s.input,
                          {
                            color: tokens.colors.textPrimary,
                            backgroundColor: tokens.colors.inputBg,
                            borderColor: tokens.colors.inputBorder,
                          }
                        ]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={tokens.colors.placeholder}
                        value={manualCals}
                        onChangeText={setManualCals}
                      />
                    </View>
                    <View style={s.half}>
                      <Text style={[s.miniLabel, { color: tokens.colors.textSecondary }]}>Protein (g)</Text>
                      <TextInput
                        style={[
                          s.input,
                          {
                            color: tokens.colors.textPrimary,
                            backgroundColor: tokens.colors.inputBg,
                            borderColor: tokens.colors.inputBorder,
                          }
                        ]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={tokens.colors.placeholder}
                        value={manualProtein}
                        onChangeText={setManualProtein}
                      />
                    </View>
                  </View>
                  <View style={s.row2}>
                    <View style={s.half}>
                      <Text style={[s.miniLabel, { color: tokens.colors.textSecondary }]}>Carbs (g)</Text>
                      <TextInput
                        style={[
                          s.input,
                          {
                            color: tokens.colors.textPrimary,
                            backgroundColor: tokens.colors.inputBg,
                            borderColor: tokens.colors.inputBorder,
                          }
                        ]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={tokens.colors.placeholder}
                        value={manualCarbs}
                        onChangeText={setManualCarbs}
                      />
                    </View>
                    <View style={s.half}>
                      <Text style={[s.miniLabel, { color: tokens.colors.textSecondary }]}>Fat (g)</Text>
                      <TextInput
                        style={[
                          s.input,
                          {
                            color: tokens.colors.textPrimary,
                            backgroundColor: tokens.colors.inputBg,
                            borderColor: tokens.colors.inputBorder,
                          }
                        ]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={tokens.colors.placeholder}
                        value={manualFat}
                        onChangeText={setManualFat}
                      />
                    </View>
                  </View>
                  <Text style={[s.miniLabel, { color: tokens.colors.textSecondary }]}>Fiber (g)</Text>
                  <TextInput
                    style={[
                      s.input,
                      {
                        color: tokens.colors.textPrimary,
                        backgroundColor: tokens.colors.inputBg,
                        borderColor: tokens.colors.inputBorder,
                      }
                    ]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={tokens.colors.placeholder}
                    value={manualFiber}
                    onChangeText={setManualFiber}
                  />
                  <View style={s.modalBtnWrap}>
                    <LiquidButton
                      title={isSaving ? 'Saving...' : 'Add Meal'}
                      icon="checkmark-circle"
                      onPress={handleManualLog}
                      disabled={isSaving || isAnalyzing}
                      variant="primary"
                      shimmer
                    />
                  </View>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '92%',
    padding: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  handleContainer: { alignItems: 'center', marginBottom: 12 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  specularLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.15 },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      outlineStyle: 'none',
      cursor: 'pointer',
    } : {}),
  },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 12, borderWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, gap: 5, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  mealRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  mealPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 3, borderWidth: 1 },
  mealText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  scroll: { marginBottom: 8 },
  form: { gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 6 },
  miniLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 3 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    height: 90,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  hint: { fontSize: 12, lineHeight: 17, fontFamily: 'PlusJakartaSans_500Medium' },
  photoPickerRow: { flexDirection: 'row', gap: 12 },
  photoBox: { flex: 1, height: 110, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', gap: 7 },
  photoBoxText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  previewWrap: { position: 'relative' },
  preview: { width: '100%', height: 170, borderRadius: 16 },
  removeBtn: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 3 },
  removeText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  modalBtnWrap: { marginTop: 14, marginBottom: 8 },
  loading: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loadingTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  loadingSub: { fontSize: 13, textAlign: 'center', fontFamily: 'PlusJakartaSans_500Medium' },
  skeleton: { width: '88%', height: 14, borderRadius: 7, marginTop: 10 },

  reviewCard: { borderRadius: 18, padding: 15, gap: 10, borderWidth: 1 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  reviewTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  reviewSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },

  itemsSection: { gap: 10, marginTop: 6 },
  sectionHeaderLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  itemCard: { borderRadius: 14, padding: 12, gap: 8, borderWidth: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemNameInput: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', borderWidth: 1 },
  dirtyDot: { width: 7, height: 7, borderRadius: 4 },
  itemGramRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemGramLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  gramBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gramInput: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', width: 75, textAlign: 'center', borderWidth: 1, fontVariant: ['tabular-nums'] },
  gramUnit: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  itemMacroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  macroPill: { fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk_600SemiBold', fontVariant: ['tabular-nums'], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  multRow: { flexDirection: 'row', gap: 7, marginTop: 2 },
  multBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  multText: { fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },

  totalsCard: { borderRadius: 14, padding: 12, marginTop: 8, gap: 8, borderWidth: 1 },
  totalsTitle: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalStat: { alignItems: 'center' },
  totalStatNum: { fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  totalStatSub: { fontSize: 12, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium', marginTop: 1 },
  row2: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, gap: 4 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHint: { fontSize: 12, fontStyle: 'italic', fontFamily: 'PlusJakartaSans_500Medium' },
  deleteBtn: { padding: 4, marginLeft: 4 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 13, marginTop: 4 },
  addItemText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  reAnalyzeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingVertical: 11, marginTop: 6 },
  reAnalyzeAllText: { fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },

  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pieceField: { gap: 3 },
  pieceLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center' },
  pieceMult: { fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', marginTop: 12 },
  pieceTotalBox: { marginLeft: 'auto', alignItems: 'flex-end', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  pieceTotalLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  pieceTotalVal: { fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
});
