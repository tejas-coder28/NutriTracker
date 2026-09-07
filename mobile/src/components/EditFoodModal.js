import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateFoodLog } from '../services/database';
import { analyzeTextWithGemini } from '../services/aiService';
import { useTheme } from '../context/ThemeContext';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline',      color: '#FBBF24' },
  { key: 'lunch',     label: 'Lunch',     icon: 'fast-food-outline',  color: '#34D399' },
  { key: 'dinner',    label: 'Dinner',    icon: 'restaurant-outline', color: '#818CF8' },
  { key: 'snack',     label: 'Snack',     icon: 'nutrition-outline',  color: '#F472B6' },
];

export default function EditFoodModal({ visible, item, onClose, onSaved }) {
  const { isDark, themeColors, glassStyles } = useTheme();

  const isSubmittingRef = useRef(false);
  const [editName, setEditName] = useState('');
  const [mealType, setMealType] = useState('snack');
  const [itemsList, setItemsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isLegacyBlob, setIsLegacyBlob] = useState(false);

  useEffect(() => {
    if (item) {
      setEditName(item.name || '');
      setMealType(item.meal_type || 'snack');

      // Check if item has stored items array with items
      if (Array.isArray(item.items) && item.items.length > 0) {
        setIsLegacyBlob(false);
        const loadedItems = item.items.map((it, idx) => {
          const unitType = it.unit_type === 'piece' ? 'piece' : 'weight';
          const qty = unitType === 'piece' ? (it.quantity ?? 1) : null;
          const gpp = unitType === 'piece' ? (it.gramsPerPiece ?? it.grams_per_piece ?? 50) : null;
          const gramsVal = Number(
            it.grams ?? it.estimated_grams ?? it.weight ?? it.portion_weight ?? (unitType === 'piece' ? qty * gpp : 100)
          );
          const cals = Math.round(Number(it.calories) || 0);
          const prot = Math.round(Number(it.protein) || 0);
          const carbsVal = Math.round(Number(it.carbs) || 0);
          const fatVal = Math.round(Number(it.fat) || 0);
          const fibVal = Math.round(Number(it.fiber) || 0);

          return {
            id: it.id ?? (Date.now() + idx),
            name: it.name || `Item ${idx + 1}`,
            unit_type: unitType,
            quantity: qty,
            gramsPerPiece: gpp,
            grams: String(gramsVal),
            origGrams: Number(it.origGrams ?? gramsVal ?? 100),
            calories: cals,
            protein: prot,
            carbs: carbsVal,
            fat: fatVal,
            fiber: fibVal,
            origCals: Math.round(Number(it.origCals ?? cals ?? 0)),
            origProtein: Math.round(Number(it.origProtein ?? prot ?? 0)),
            origCarbs: Math.round(Number(it.origCarbs ?? carbsVal ?? 0)),
            origFat: Math.round(Number(it.origFat ?? fatVal ?? 0)),
            origFiber: Math.round(Number(it.origFiber ?? fibVal ?? 0)),
            isNew: false, // existing items have locked food names
            dirty: false,
          };
        });
        setItemsList(loadedItems);
      } else {
        // Entry stored as single combined blob (legacy entry)
        setIsLegacyBlob(true);
        const g = Number(item.grams_estimate ?? 200);
        const cals = Math.round(Number(item.calories) || 0);
        const prot = Math.round(Number(item.protein) || 0);
        const carbsVal = Math.round(Number(item.carbs) || 0);
        const fatVal = Math.round(Number(item.fat) || 0);
        const fibVal = Math.round(Number(item.fiber) || 0);

        setItemsList([
          {
            id: Date.now(),
            name: item.name || 'Food Item',
            unit_type: 'weight',
            quantity: null,
            gramsPerPiece: null,
            grams: String(g),
            origGrams: g > 0 ? g : 200,
            calories: cals,
            protein: prot,
            carbs: carbsVal,
            fat: fatVal,
            fiber: fibVal,
            origCals: cals,
            origProtein: prot,
            origCarbs: carbsVal,
            origFat: fatVal,
            origFiber: fibVal,
            isNew: false,
            dirty: false,
          },
        ]);
      }
    }
  }, [item]);

  useEffect(() => {
    if (!visible) {
      setSaving(false);
      setIsAnalyzing(false);
    }
  }, [visible]);

  if (!item) return null;

  const handleClose = () => {
    setSaving(false);
    setIsAnalyzing(false);
    onClose();
  };

  // Portion weight edit handler per item
  const handleItemGramsChange = (id, rawText) => {
    setItemsList((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const numG = parseFloat(rawText);
        if (!isNaN(numG) && numG > 0) {
          const scale = it.origGrams > 0 ? numG / it.origGrams : 1;
          return {
            ...it,
            grams: rawText,
            calories: Math.round(it.origCals * scale),
            protein: Math.round(it.origProtein * scale),
            carbs: Math.round(it.origCarbs * scale),
            fat: Math.round(it.origFat * scale),
            fiber: Math.round(it.origFiber * scale),
            dirty: true,
          };
        }
        return { ...it, grams: rawText, dirty: true };
      })
    );
  };

  const handleItemGramsBlur = (id) => {
    setItemsList((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const clamped = Math.max(1, parseFloat(it.grams) || 1);
        const scale = it.origGrams > 0 ? clamped / it.origGrams : 1;
        return {
          ...it,
          grams: String(clamped),
          calories: Math.round(it.origCals * scale),
          protein: Math.round(it.origProtein * scale),
          carbs: Math.round(it.origCarbs * scale),
          fat: Math.round(it.origFat * scale),
          fiber: Math.round(it.origFiber * scale),
        };
      })
    );
  };

  // Qty change handler (for piece unit types)
  const handleItemQtyChange = (id, rawText) => {
    setItemsList((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const qty = rawText === '' ? '' : rawText;
        const numQty = parseInt(rawText);
        if (!isNaN(numQty) && numQty > 0) {
          const gpp = typeof it.gramsPerPiece === 'number' ? it.gramsPerPiece : 50;
          const newG = numQty * gpp;
          const scale = it.origGrams > 0 ? newG / it.origGrams : 1;
          return {
            ...it,
            quantity: qty,
            grams: String(newG),
            calories: Math.round(it.origCals * scale),
            protein: Math.round(it.origProtein * scale),
            carbs: Math.round(it.origCarbs * scale),
            fat: Math.round(it.origFat * scale),
            fiber: Math.round(it.origFiber * scale),
            dirty: true,
          };
        }
        return { ...it, quantity: qty, dirty: true };
      })
    );
  };

  const handleItemQtyBlur = (id) => {
    setItemsList((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const clamped = Math.max(1, parseInt(it.quantity) || 1);
        const gpp = typeof it.gramsPerPiece === 'number' ? it.gramsPerPiece : 50;
        const newG = clamped * gpp;
        const scale = it.origGrams > 0 ? newG / it.origGrams : 1;
        return {
          ...it,
          quantity: clamped,
          grams: String(newG),
          calories: Math.round(it.origCals * scale),
          protein: Math.round(it.origProtein * scale),
          carbs: Math.round(it.origCarbs * scale),
          fat: Math.round(it.origFat * scale),
          fiber: Math.round(it.origFiber * scale),
        };
      })
    );
  };

  // Editable name change for newly added items only
  const handleItemNameChange = (id, newNameText) => {
    setItemsList((prev) =>
      prev.map((it) => (it.id === id ? { ...it, name: newNameText, dirty: true } : it))
    );
  };

  // Delete item handler
  const handleDeleteItem = (id) => {
    setItemsList((prev) => prev.filter((it) => it.id !== id));
  };

  // Add missed item handler
  const handleAddItem = () => {
    const newId = Date.now();
    setItemsList((prev) => [
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
        isNew: true, // Newly added item name is editable
        dirty: true,
      },
    ]);
  };

  // Multiplier scaling across ALL items
  const applyGlobalMultiplier = (mult) => {
    const updated = itemsList.map((it) => {
      const newG = Math.round(it.origGrams * mult);
      return {
        ...it,
        grams: String(newG),
        calories: Math.round(it.origCals * mult),
        protein: Math.round(it.origProtein * mult),
        carbs: Math.round(it.origCarbs * mult),
        fat: Math.round(it.origFat * mult),
        fiber: Math.round(it.origFiber * mult),
      };
    });
    setItemsList(updated);
  };

  // Re-analyze all items or split legacy combined entry via Gemini
  const handleReAnalyzeAll = async () => {
    if (itemsList.length === 0) return;

    let query = '';
    if (itemsList.length === 1) {
      const singleItem = itemsList[0];
      query = `${singleItem.grams || 200}g total of ${singleItem.name || editName}`;
    } else {
      query = itemsList
        .map((i) => {
          if (i.unit_type === 'piece') {
            return `${i.quantity ?? 1} pieces of ${i.name} (about ${i.gramsPerPiece ?? 50}g each)`;
          }
          return `${i.grams}g of ${i.name}`;
        })
        .join(', ');
    }

    setIsAnalyzing(true);
    setStatusMsg(
      itemsList.length === 1
        ? 'Analyzing & splitting meal into individual items…'
        : `Re-analyzing ${itemsList.length} item(s)…`
    );

    try {
      const analysis = await analyzeTextWithGemini(query);
      const freshItems = analysis.items || [];

      if (freshItems.length > 0) {
        const newItems = freshItems.map((fi, idx) => {
          const unitType = fi.unit_type === 'piece' ? 'piece' : 'weight';
          const qty = unitType === 'piece' ? Math.max(1, Number(fi.quantity) || 1) : null;
          const gpp = unitType === 'piece' ? Math.max(1, Number(fi.grams_per_piece) || 50) : null;
          const g =
            unitType === 'piece'
              ? qty * gpp
              : Math.max(5, Math.round(Number(fi.estimated_grams) || 100));

          return {
            id: Date.now() + idx,
            name: fi.name || `Item ${idx + 1}`,
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
            isNew: false, // Food names are read-only for existing items
            dirty: false,
          };
        });

        setItemsList(newItems);
        setIsLegacyBlob(false);
      }
    } catch (err) {
      Alert.alert('Re-Analysis Error', err?.message || String(err) || 'Failed to re-analyze food.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save changes to Firestore
  const handleSave = async () => {
    if (isSubmittingRef.current || saving) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Meal title cannot be empty.');
      return;
    }
    if (itemsList.length === 0) {
      Alert.alert('Validation Error', 'Meal must contain at least one food item.');
      return;
    }

    isSubmittingRef.current = true;
    setSaving(true);
    try {
      const totalGrams = itemsList.reduce((acc, i) => acc + (parseFloat(i.grams) || 0), 0);
      const totalCals = itemsList.reduce((acc, i) => acc + (Number(i.calories) || 0), 0);
      const totalProtein = itemsList.reduce((acc, i) => acc + (Number(i.protein) || 0), 0);
      const totalCarbs = itemsList.reduce((acc, i) => acc + (Number(i.carbs) || 0), 0);
      const totalFat = itemsList.reduce((acc, i) => acc + (Number(i.fat) || 0), 0);
      const totalFiber = itemsList.reduce((acc, i) => acc + (Number(i.fiber) || 0), 0);

      // Clean formatted items array
      const formattedItems = itemsList.map((it) => ({
        id: it.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: (it.name || '').trim() || 'Food Item',
        grams: String(Math.round(parseFloat(it.grams) || 0)),
        calories: Math.round(Number(it.calories) || 0),
        protein: Math.round(Number(it.protein) || 0),
        carbs: Math.round(Number(it.carbs) || 0),
        fat: Math.round(Number(it.fat) || 0),
        fiber: Math.round(Number(it.fiber) || 0),
        unit_type: it.unit_type || 'weight',
        quantity: it.quantity ?? null,
        gramsPerPiece: it.gramsPerPiece ?? null,
        origGrams: it.origGrams || Math.round(parseFloat(it.grams) || 0),
        origCals: it.origCals || Math.round(Number(it.calories) || 0),
        origProtein: it.origProtein || Math.round(Number(it.protein) || 0),
        origCarbs: it.origCarbs || Math.round(Number(it.carbs) || 0),
        origFat: it.origFat || Math.round(Number(it.fat) || 0),
        origFiber: it.origFiber || Math.round(Number(it.fiber) || 0),
      }));

      const updatedData = {
        name: trimmedName,
        meal_type: mealType,
        grams_estimate: Math.round(totalGrams),
        calories: totalCals,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        fiber: totalFiber,
        items: formattedItems,
      };

      const updated = await updateFoodLog(item.id, updatedData);

      if (onSaved) {
        onSaved(
          updated || {
            ...item,
            ...updatedData,
          }
        );
      }
      onClose();
    } catch (err) {
      Alert.alert('Save Error', err?.message || String(err) || 'Failed to save changes.');
    } finally {
      isSubmittingRef.current = false;
      setSaving(false);
    }
  };

  // Combined totals calculation across ALL items
  const totalGrams = itemsList.reduce((acc, i) => acc + (parseFloat(i.grams) || 0), 0);
  const totalCals = itemsList.reduce((acc, i) => acc + (Number(i.calories) || 0), 0);
  const totalProtein = itemsList.reduce((acc, i) => acc + (Number(i.protein) || 0), 0);
  const totalCarbs = itemsList.reduce((acc, i) => acc + (Number(i.carbs) || 0), 0);
  const totalFat = itemsList.reduce((acc, i) => acc + (Number(i.fat) || 0), 0);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View
        style={[
          styles.overlay,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)' },
        ]}
      >
        <View style={[glassStyles.modalContent, styles.sheet]}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.editIconBadge,
                  {
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                  },
                ]}
              >
                <Ionicons name="pencil-outline" size={18} color={isDark ? '#34D399' : '#059669'} />
              </View>
              <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
                Edit Food Entry
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>

          {isAnalyzing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.loadingTitle, { color: themeColors.textPrimary }]}>
                Re-Analyzing Food Portions…
              </Text>
              <Text style={[styles.loadingSub, { color: themeColors.textSecondary }]}>
                {statusMsg}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)',
                  },
                ]}
              >
                <View style={styles.reviewHead}>
                  <Ionicons name="create-outline" size={19} color={isDark ? '#34D399' : '#059669'} />
                  <Text style={[styles.reviewTitle, { color: themeColors.textPrimary }]}>
                    Review Individual Food Portions
                  </Text>
                </View>
                <Text style={[styles.reviewSub, { color: themeColors.textSecondary }]}>
                  Adjust portion weight for each item below before saving.
                </Text>

                {/* Legacy Combined Blob Banner */}
                {isLegacyBlob && (
                  <TouchableOpacity
                    style={[
                      styles.legacyBanner,
                      {
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.10)',
                        borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
                      },
                    ]}
                    onPress={handleReAnalyzeAll}

                  >
                    <Ionicons name="sparkles" size={16} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.legacyBannerTitle, { color: isDark ? '#FBBF24' : '#D97706' }]}>
                        Combined Meal Entry Detected
                      </Text>
                      <Text style={[styles.legacyBannerSub, { color: themeColors.textSecondary }]}>
                        Tap here to automatically split into individual food cards with separate weights.
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Meal Title Input */}
                <Text style={[styles.fieldLabel, { color: themeColors.textPrimary }]}>
                  Meal Title
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeColors.textPrimary,
                      backgroundColor: themeColors.inputBg,
                      borderColor: themeColors.inputBorder,
                    },
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Meal Title"
                  placeholderTextColor={themeColors.placeholder}
                />

                {/* Meal Type Selector */}
                <Text style={[styles.fieldLabel, { color: themeColors.textPrimary, marginTop: 12 }]}>
                  Meal Type
                </Text>
                <View style={styles.mealRow}>
                  {MEAL_TYPES.map((t) => {
                    const isSelected = mealType === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          styles.mealPill,
                          {
                            backgroundColor: isSelected
                              ? `${t.color}22`
                              : isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : 'rgba(0, 0, 0, 0.04)',
                            borderColor: isSelected
                              ? t.color
                              : isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.08)',
                          },
                        ]}
                        onPress={() => setMealType(t.key)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={t.icon}
                          size={13}
                          color={isSelected ? t.color : themeColors.textMuted}
                        />
                        <Text
                          style={[
                            styles.mealText,
                            { color: isSelected ? t.color : themeColors.textSecondary },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Food Items Breakdown */}
                <View style={styles.itemsSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeaderLabel, { color: isDark ? '#34D399' : '#059669' }]}>
                      FOOD ITEMS ({itemsList.length})
                    </Text>
                    <Text style={[styles.sectionHint, { color: themeColors.textMuted }]}>
                      Edit portion weight, then Re-analyze
                    </Text>
                  </View>

                  {itemsList.map((itemObj) => (
                    <View
                      key={itemObj.id}
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.03)',
                          borderColor: themeColors.cardBorderSubtle,
                        },
                      ]}
                    >
                      {/* Food Name Row */}
                      <View style={styles.itemNameRow}>
                        <Ionicons
                          name="restaurant-outline"
                          size={15}
                          color={isDark ? '#34D399' : '#059669'}
                        />
                        {itemObj.isNew ? (
                          <TextInput
                            style={[
                              styles.itemNameInput,
                              {
                                color: themeColors.textPrimary,
                                backgroundColor: themeColors.inputBg,
                                borderColor: themeColors.inputBorder,
                              },
                            ]}
                            value={itemObj.name}
                            onChangeText={(txt) => handleItemNameChange(itemObj.id, txt)}
                            placeholder="Food name (e.g. Cooked Chicken)"
                            placeholderTextColor={themeColors.placeholder}
                          />
                        ) : (
                          <View style={styles.lockedNameContainer}>
                            <Text
                              style={[
                                styles.lockedNameText,
                                { color: themeColors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {itemObj.name}
                            </Text>
                            <View
                              style={[
                                styles.lockBadge,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.05)',
                                },
                              ]}
                            >
                              <Ionicons name="lock-closed" size={11} color={themeColors.textMuted} />
                            </View>
                          </View>
                        )}
                        {itemObj.dirty && <View style={styles.dirtyDot} />}
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(itemObj.id)}
                          style={styles.deleteBtn}
                        >
                          <Ionicons name="close" size={16} color="#F87171" />
                        </TouchableOpacity>
                      </View>

                      {/* Portion Weight / Piece Row */}
                      {itemObj.unit_type === 'piece' ? (
                        <View style={styles.pieceRow}>
                          <View style={styles.pieceField}>
                            <Text style={[styles.pieceLabel, { color: themeColors.textSecondary }]}>
                              Qty
                            </Text>
                            <View style={styles.gramBox}>
                              <TextInput
                                style={[
                                  styles.gramInput,
                                  {
                                    color: isDark ? '#34D399' : '#059669',
                                    backgroundColor: themeColors.inputBg,
                                    borderColor: themeColors.inputBorder,
                                  },
                                ]}
                                keyboardType="numeric"
                                value={String(itemObj.quantity ?? 1)}
                                onChangeText={(t) => handleItemQtyChange(itemObj.id, t)}
                                onBlur={() => handleItemQtyBlur(itemObj.id)}
                              />
                              <Text style={[styles.gramUnit, { color: themeColors.textSecondary }]}>
                                pcs
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.pieceMult, { color: themeColors.textMuted }]}>×</Text>
                          <View style={styles.pieceField}>
                            <Text style={[styles.pieceLabel, { color: themeColors.textSecondary }]}>
                              g / piece
                            </Text>
                            <View style={styles.gramBox}>
                              <Text style={[styles.gramInputText, { color: themeColors.textSecondary }]}>
                                {itemObj.gramsPerPiece ?? 50}g
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.pieceTotalBox,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(16, 185, 129, 0.10)',
                                borderColor: isDark
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : 'rgba(16, 185, 129, 0.25)',
                              },
                            ]}
                          >
                            <Text style={[styles.pieceTotalLabel, { color: themeColors.textSecondary }]}>
                              Total
                            </Text>
                            <Text style={[styles.pieceTotalVal, { color: isDark ? '#34D399' : '#059669' }]}>
                              {Math.round(parseFloat(itemObj.grams) || 0)}g
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.itemGramRow}>
                          <Text style={[styles.itemGramLabel, { color: themeColors.textSecondary }]}>
                            Portion weight:
                          </Text>
                          <View style={styles.gramBox}>
                            <TextInput
                              style={[
                                styles.gramInput,
                                {
                                  color: isDark ? '#34D399' : '#059669',
                                  backgroundColor: themeColors.inputBg,
                                  borderColor: themeColors.inputBorder,
                                },
                              ]}
                              keyboardType="numeric"
                              value={itemObj.grams}
                              onChangeText={(txt) => handleItemGramsChange(itemObj.id, txt)}
                              onBlur={() => handleItemGramsBlur(itemObj.id)}
                            />
                            <Text style={[styles.gramUnit, { color: themeColors.textSecondary }]}>
                              g
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Item Macro Tags */}
                      <View style={styles.itemMacroPills}>
                        <Text
                          style={[
                            styles.macroPillCal,
                            {
                              backgroundColor: isDark
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'rgba(16, 185, 129, 0.12)',
                              color: isDark ? '#34D399' : '#059669',
                            },
                          ]}
                        >
                          {itemObj.calories} kcal
                        </Text>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              color: themeColors.textSecondary,
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(0, 0, 0, 0.05)',
                            },
                          ]}
                        >
                          P: {itemObj.protein}g
                        </Text>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              color: themeColors.textSecondary,
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(0, 0, 0, 0.05)',
                            },
                          ]}
                        >
                          C: {itemObj.carbs}g
                        </Text>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              color: themeColors.textSecondary,
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(0, 0, 0, 0.05)',
                            },
                          ]}
                        >
                          F: {itemObj.fat}g
                        </Text>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              color: themeColors.textSecondary,
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(0, 0, 0, 0.05)',
                            },
                          ]}
                        >
                          Fib: {itemObj.fiber}g
                        </Text>
                      </View>
                    </View>
                  ))}

                  {/* Add Missed Item Button */}
                  <TouchableOpacity
                    style={[
                      styles.addItemBtn,
                      {
                        backgroundColor: isDark
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(16, 185, 129, 0.10)',
                        borderColor: isDark
                          ? 'rgba(16, 185, 129, 0.35)'
                          : 'rgba(16, 185, 129, 0.25)',
                      },
                    ]}
                    onPress={handleAddItem}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={16}
                      color={isDark ? '#34D399' : '#059669'}
                    />
                    <Text
                      style={[
                        styles.addItemText,
                        { color: isDark ? '#34D399' : '#059669' },
                      ]}
                    >
                      Add a missed food item
                    </Text>
                  </TouchableOpacity>

                  {/* Re-analyze All Items Button */}
                  <TouchableOpacity
                    style={styles.reAnalyzeAllBtn}
                    onPress={handleReAnalyzeAll}
                  >
                    <Ionicons name="sync-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.reAnalyzeAllText}>
                      {itemsList.length === 1 ? 'Re-analyze & Split Items' : 'Re-analyze all items'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Scale Entire Meal */}
                <Text style={[styles.fieldLabel, { color: themeColors.textPrimary }]}>
                  Scale Entire Meal
                </Text>
                <View style={styles.multRow}>
                  {[0.5, 1.0, 1.5, 2.0].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.multBtn,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.05)',
                        },
                      ]}
                      onPress={() => applyGlobalMultiplier(m)}
                    >
                      <Text style={[styles.multText, { color: themeColors.textPrimary }]}>
                        {m}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Combined Meal Totals Summary */}
                <View
                  style={[
                    styles.totalsCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.03)',
                    },
                  ]}
                >
                  <Text style={[styles.totalsTitle, { color: themeColors.textPrimary }]}>
                    Combined Meal Totals
                  </Text>
                  <View style={styles.totalsRow}>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: themeColors.textPrimary }]}>
                        {Math.round(totalGrams)}g
                      </Text>
                      <Text style={[styles.totalStatSub, { color: themeColors.textSecondary }]}>
                        Total Weight
                      </Text>
                    </View>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: isDark ? '#34D399' : '#059669' }]}>
                        {totalCals}
                      </Text>
                      <Text style={[styles.totalStatSub, { color: themeColors.textSecondary }]}>
                        Calories
                      </Text>
                    </View>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: themeColors.protein }]}>
                        {totalProtein}g
                      </Text>
                      <Text style={[styles.totalStatSub, { color: themeColors.textSecondary }]}>
                        Protein
                      </Text>
                    </View>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: themeColors.carbs }]}>
                        {totalCarbs}g
                      </Text>
                      <Text style={[styles.totalStatSub, { color: themeColors.textSecondary }]}>
                        Carbs
                      </Text>
                    </View>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: themeColors.fat }]}>
                        {totalFat}g
                      </Text>
                      <Text style={[styles.totalStatSub, { color: themeColors.textSecondary }]}>
                        Fat
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>Confirm & Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '94%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },

  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: { fontSize: 16, fontWeight: '700' },
  loadingSub: { fontSize: 12 },

  scroll: { marginBottom: 8 },
  reviewCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  reviewTitle: { fontSize: 15, fontWeight: '700' },
  reviewSub: { fontSize: 12, marginBottom: 12 },

  legacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  legacyBannerTitle: { fontSize: 12, fontWeight: '800' },
  legacyBannerSub: { fontSize: 11, marginTop: 2 },

  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  mealRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  mealPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
  },
  mealText: { fontSize: 11, fontWeight: '600' },

  itemsSection: { gap: 10, marginVertical: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  sectionHint: { fontSize: 10 },

  itemCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemNameInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  lockedNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockedNameText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  lockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dirtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  deleteBtn: { padding: 4 },

  itemGramRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemGramLabel: { fontSize: 12, fontWeight: '500' },
  gramBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gramInput: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 65,
    textAlign: 'center',
  },
  gramInputText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gramUnit: { fontSize: 12 },

  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pieceField: { gap: 3 },
  pieceLabel: { fontSize: 10 },
  pieceMult: { fontSize: 16, marginTop: 12 },
  pieceTotalBox: {
    marginLeft: 'auto',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  pieceTotalLabel: { fontSize: 9 },
  pieceTotalVal: { fontSize: 13, fontWeight: '800' },

  itemMacroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  macroPillCal: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  macroPill: {
    fontSize: 11,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },

  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    borderStyle: 'dashed',
  },
  addItemText: { fontSize: 12, fontWeight: '700' },

  reAnalyzeAllBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  reAnalyzeAllText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  multRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 12 },
  multBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  multText: { fontSize: 12, fontWeight: '700' },

  totalsCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  totalsTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  totalStat: { alignItems: 'center' },
  totalStatNum: { fontSize: 14, fontWeight: '800' },
  totalStatSub: { fontSize: 9, marginTop: 2 },

  saveBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
