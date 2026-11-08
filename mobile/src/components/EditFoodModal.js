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
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { updateFoodLog } from '../services/database';
import { analyzeTextWithGemini } from '../services/aiService';
import { useTheme } from '../context/ThemeContext';
import LiquidButton from './primitives/LiquidButton';
import Icon from './ui/Icon';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch',     label: 'Lunch',     icon: 'fast-food-outline' },
  { key: 'dinner',    label: 'Dinner',    icon: 'restaurant-outline' },
  { key: 'snack',     label: 'Snack',     icon: 'nutrition-outline' },
];

export default function EditFoodModal({ visible, item, onClose, onSaved }) {
  const { isDark, tokens } = useTheme();

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

  // Piece quantity handler
  const handleItemQtyChange = (id, rawText) => {
    setItemsList((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const qty = parseInt(rawText, 10);
        const gpp = typeof it.gramsPerPiece === 'number' ? it.gramsPerPiece : 50;
        if (!isNaN(qty) && qty > 0) {
          const newG = qty * gpp;
          const scale = it.origGrams > 0 ? newG / it.origGrams : 1;
          return {
            ...it,
            quantity: rawText,
            grams: String(newG),
            calories: Math.round(it.origCals * scale),
            protein: Math.round(it.origProtein * scale),
            carbs: Math.round(it.origCarbs * scale),
            fat: Math.round(it.origFat * scale),
            fiber: Math.round(it.origFiber * scale),
            dirty: true,
          };
        }
        return { ...it, quantity: rawText, dirty: true };
      })
    );
  };

  const handleItemQtyBlur = (id) => {
    setItemsList((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const clamped = Math.max(1, parseInt(it.quantity, 10) || 1);
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
        isNew: true,
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
            isNew: false,
            dirty: false,
          };
        });

        setItemsList(newItems);
        setIsLegacyBlob(false);
      }
    } catch (err) {
      Alert.alert('Analysis Failed', err.message || 'Could not re-analyze items with Gemini.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit and save updated meal
  const handleSave = async () => {
    if (isSubmittingRef.current || saving) return;

    if (!editName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for this meal.');
      return;
    }

    if (itemsList.length === 0) {
      Alert.alert('Items Required', 'Meal must have at least one food item.');
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

      const updatedPayload = {
        name: editName.trim(),
        meal_type: mealType,
        grams_estimate: Math.round(totalGrams),
        calories: totalCals,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        fiber: totalFiber,
        items: itemsList,
      };

      const result = await updateFoodLog(item.id, updatedPayload);

      if (onSaved) {
        onSaved(result || { ...item, ...updatedPayload });
      }
      handleClose();
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Failed to update food entry.');
    } finally {
      isSubmittingRef.current = false;
      setSaving(false);
    }
  };

  const totalGrams = itemsList.reduce((acc, i) => acc + (parseFloat(i.grams) || 0), 0);
  const totalCals = itemsList.reduce((acc, i) => acc + (Number(i.calories) || 0), 0);
  const totalProtein = itemsList.reduce((acc, i) => acc + (Number(i.protein) || 0), 0);
  const totalCarbs = itemsList.reduce((acc, i) => acc + (Number(i.carbs) || 0), 0);
  const totalFat = itemsList.reduce((acc, i) => acc + (Number(i.fat) || 0), 0);

  const isWeb = Platform.OS === 'web';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(15,23,42,0.45)' }]}>
        <View
          style={[
            styles.sheet,
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
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.18)' }]} />
          </View>

          {/* Specular line */}
          <View style={[styles.specularLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)' }]} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.editIconBadge,
                  {
                    backgroundColor: isDark ? 'rgba(16, 232, 160, 0.15)' : 'rgba(0, 179, 119, 0.12)',
                    borderColor: tokens.colors.primary,
                  },
                ]}
              >
                <Icon name="pencil" size={16} color={tokens.colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: tokens.colors.textPrimary }]}>Edit Meal Entry</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[
                styles.modalCloseBtn,
                {
                  backgroundColor: tokens.liquidGlass.fill,
                  borderColor: tokens.liquidGlass.rim,
                }
              ]}
            >
              <Icon name="close" size={20} color={tokens.text.primary} />
            </TouchableOpacity>
          </View>

          {isAnalyzing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.colors.primary} />
              <Text style={[styles.loadingTitle, { color: tokens.colors.textPrimary }]}>Analyzing with Gemini…</Text>
              <Text style={[styles.loadingSub, { color: tokens.colors.textSecondary }]}>{statusMsg}</Text>
            </View>
          ) : (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: tokens.colors.neuBase,
                    borderColor: tokens.colors.cardBorderSubtle,
                  },
                ]}
              >
                <View style={styles.reviewHead}>
                  <Icon name="create-outline" size={18} color={tokens.colors.primary} />
                  <Text style={[styles.reviewTitle, { color: tokens.colors.textPrimary }]}>
                    Review Individual Food Portions
                  </Text>
                </View>
                <Text style={[styles.reviewSub, { color: tokens.colors.textSecondary }]}>
                  Adjust portion weight for each item below before saving.
                </Text>

                {/* Legacy Combined Blob Banner */}
                {isLegacyBlob && (
                  <TouchableOpacity
                    style={[
                      styles.legacyBanner,
                      {
                        backgroundColor: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(224, 154, 0, 0.12)',
                        borderColor: tokens.colors.warning,
                      },
                    ]}
                    onPress={handleReAnalyzeAll}
                  >
                    <Icon name="sparkles" size={16} color={tokens.colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.legacyBannerTitle, { color: tokens.colors.warning }]}>
                        Combined Meal Entry Detected
                      </Text>
                      <Text style={[styles.legacyBannerSub, { color: tokens.colors.textSecondary }]}>
                        Tap here to automatically split into individual food cards with separate weights.
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Meal Title Input */}
                <Text style={[styles.fieldLabel, { color: tokens.colors.textPrimary }]}>
                  Meal Title
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: tokens.colors.textPrimary,
                      backgroundColor: tokens.colors.inputBg,
                      borderColor: tokens.colors.inputBorder,
                    },
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Meal Title"
                  placeholderTextColor={tokens.colors.placeholder}
                />

                {/* Meal Type Selector */}
                <Text style={[styles.fieldLabel, { color: tokens.colors.textPrimary, marginTop: 12 }]}>
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
                              ? (isDark ? 'rgba(16, 232, 160, 0.18)' : 'rgba(0, 179, 119, 0.14)')
                              : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)'),
                            borderColor: isSelected
                              ? tokens.colors.primary
                              : tokens.colors.cardBorderSubtle,
                            ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
                          },
                        ]}
                        onPress={() => setMealType(t.key)}
                        activeOpacity={0.75}
                      >
                        <Icon
                          name={t.icon}
                          size={13}
                          color={isSelected ? tokens.colors.primary : tokens.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.mealText,
                            { color: isSelected ? tokens.colors.primary : tokens.colors.textSecondary },
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
                    <Text style={[styles.sectionHeaderLabel, { color: tokens.colors.primary }]}>
                      FOOD ITEMS ({itemsList.length})
                    </Text>
                    <Text style={[styles.sectionHint, { color: tokens.colors.textSecondary }]}>
                      Edit portion weight, then Re-analyze
                    </Text>
                  </View>

                  {itemsList.map((itemObj) => (
                    <View
                      key={itemObj.id}
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
                          borderColor: tokens.colors.cardBorderSubtle,
                        },
                      ]}
                    >
                      {/* Food Name Row */}
                      <View style={styles.itemNameRow}>
                        <Icon
                          name="restaurant-outline"
                          size={15}
                          color={tokens.colors.primary}
                        />
                        {itemObj.isNew ? (
                          <TextInput
                            style={[
                              styles.itemNameInput,
                              {
                                color: tokens.colors.textPrimary,
                                backgroundColor: tokens.colors.inputBg,
                                borderColor: tokens.colors.inputBorder,
                              },
                            ]}
                            value={itemObj.name}
                            onChangeText={(txt) => handleItemNameChange(itemObj.id, txt)}
                            placeholder="Food name (e.g. Cooked Chicken)"
                            placeholderTextColor={tokens.colors.placeholder}
                          />
                        ) : (
                          <View style={styles.lockedNameContainer}>
                            <Text
                              style={[
                                styles.lockedNameText,
                                { color: tokens.colors.textPrimary },
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
                                    : 'rgba(15, 23, 42, 0.05)',
                                },
                              ]}
                            >
                              <Icon name="lock-closed" size={11} color={tokens.colors.textMuted} />
                            </View>
                          </View>
                        )}
                        {itemObj.dirty && <View style={[styles.dirtyDot, { backgroundColor: tokens.colors.warning }]} />}
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(itemObj.id)}
                          style={styles.deleteBtn}
                        >
                          <Icon name="close" size={16} color={tokens.colors.danger} />
                        </TouchableOpacity>
                      </View>

                      {/* Portion Weight / Piece Row */}
                      {itemObj.unit_type === 'piece' ? (
                        <View style={styles.pieceRow}>
                          <View style={styles.pieceField}>
                            <Text style={[styles.pieceLabel, { color: tokens.colors.textSecondary }]}>
                              Qty
                            </Text>
                            <View style={styles.gramBox}>
                              <TextInput
                                style={[
                                  styles.gramInput,
                                  {
                                    color: tokens.colors.primary,
                                    backgroundColor: tokens.colors.inputBg,
                                    borderColor: tokens.colors.inputBorder,
                                  },
                                ]}
                                keyboardType="numeric"
                                value={String(itemObj.quantity ?? 1)}
                                onChangeText={(t) => handleItemQtyChange(itemObj.id, t)}
                                onBlur={() => handleItemQtyBlur(itemObj.id)}
                              />
                              <Text style={[styles.gramUnit, { color: tokens.colors.textSecondary }]}>
                                pcs
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.pieceMult, { color: tokens.colors.textSecondary }]}>×</Text>
                          <View style={styles.pieceField}>
                            <Text style={[styles.pieceLabel, { color: tokens.colors.textSecondary }]}>
                              g / piece
                            </Text>
                            <View style={styles.gramBox}>
                              <Text style={[styles.gramInputText, { color: tokens.colors.textSecondary }]}>
                                {itemObj.gramsPerPiece ?? 50}g
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.pieceTotalBox,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(16, 232, 160, 0.15)'
                                  : 'rgba(0, 179, 119, 0.12)',
                                borderColor: tokens.colors.primary,
                              },
                            ]}
                          >
                            <Text style={[styles.pieceTotalLabel, { color: tokens.colors.textSecondary }]}>
                              Total
                            </Text>
                            <Text style={[styles.pieceTotalVal, { color: tokens.colors.primary }]}>
                              {Math.round(parseFloat(itemObj.grams) || 0)}g
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.itemGramRow}>
                          <Text style={[styles.itemGramLabel, { color: tokens.colors.textSecondary }]}>
                            Portion weight:
                          </Text>
                          <View style={styles.gramBox}>
                            <TextInput
                              style={[
                                styles.gramInput,
                                {
                                  color: tokens.colors.primary,
                                  backgroundColor: tokens.colors.inputBg,
                                  borderColor: tokens.colors.inputBorder,
                                },
                              ]}
                              keyboardType="numeric"
                              value={itemObj.grams}
                              onChangeText={(txt) => handleItemGramsChange(itemObj.id, txt)}
                              onBlur={() => handleItemGramsBlur(itemObj.id)}
                            />
                            <Text style={[styles.gramUnit, { color: tokens.colors.textSecondary }]}>
                              g
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Item Macro Tags */}
                      <View style={styles.itemMacroPills}>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              backgroundColor: isDark ? 'rgba(255, 77, 77, 0.18)' : 'rgba(224, 58, 58, 0.12)',
                              color: tokens.colors.calories,
                            },
                          ]}
                        >
                          {itemObj.calories} kcal
                        </Text>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              color: tokens.colors.protein,
                              backgroundColor: isDark ? 'rgba(0, 210, 255, 0.15)' : 'rgba(0, 144, 200, 0.12)',
                            },
                          ]}
                        >
                          P: {itemObj.protein}g
                        </Text>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              color: tokens.colors.carbs,
                              backgroundColor: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(224, 154, 0, 0.12)',
                            },
                          ]}
                        >
                          C: {itemObj.carbs}g
                        </Text>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              color: tokens.colors.fats,
                              backgroundColor: isDark ? 'rgba(255, 45, 120, 0.15)' : 'rgba(224, 36, 94, 0.12)',
                            },
                          ]}
                        >
                          F: {itemObj.fat}g
                        </Text>
                        <Text
                          style={[
                            styles.macroPill,
                            {
                              color: tokens.colors.fiber,
                              backgroundColor: isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(34, 165, 89, 0.12)',
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
                        backgroundColor: isDark ? 'rgba(16, 232, 160, 0.12)' : 'rgba(0, 179, 119, 0.08)',
                        borderColor: tokens.colors.primary,
                      },
                    ]}
                    onPress={handleAddItem}
                  >
                    <Icon name="add-circle-outline" size={16} color={tokens.colors.primary} />
                    <Text style={[styles.addItemText, { color: tokens.colors.primary }]}>
                      Add a missed food item
                    </Text>
                  </TouchableOpacity>

                  {/* Re-analyze All Items Button */}
                  <TouchableOpacity
                    style={[
                      styles.reAnalyzeAllBtn,
                      {
                        backgroundColor: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)',
                        borderColor: tokens.colors.accentViolet,
                      },
                    ]}
                    onPress={handleReAnalyzeAll}
                  >
                    <Icon name="sync-outline" size={15} color={tokens.colors.accentViolet} />
                    <Text style={[styles.reAnalyzeAllText, { color: tokens.colors.accentViolet }]}>
                      {itemsList.length === 1 ? 'Re-analyze & Split Items' : 'Re-analyze all items'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Scale Entire Meal */}
                <Text style={[styles.fieldLabel, { color: tokens.colors.textPrimary }]}>
                  Scale Entire Meal
                </Text>
                <View style={styles.multRow}>
                  {[0.5, 1.0, 1.5, 2.0].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.multBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)',
                          borderColor: tokens.colors.cardBorderSubtle,
                        },
                      ]}
                      onPress={() => applyGlobalMultiplier(m)}
                    >
                      <Text style={[styles.multText, { color: tokens.colors.textPrimary }]}>
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
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
                      borderColor: tokens.colors.cardBorderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.totalsTitle, { color: tokens.colors.textPrimary }]}>
                    Combined Meal Totals
                  </Text>
                  <View style={styles.totalsRow}>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: tokens.colors.textPrimary }]}>
                        {Math.round(totalGrams)}g
                      </Text>
                      <Text style={[styles.totalStatSub, { color: tokens.colors.textSecondary }]}>
                        Total Weight
                      </Text>
                    </View>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: tokens.colors.calories }]}>
                        {totalCals}
                      </Text>
                      <Text style={[styles.totalStatSub, { color: tokens.colors.textSecondary }]}>
                        Calories
                      </Text>
                    </View>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: tokens.colors.protein }]}>
                        {totalProtein}g
                      </Text>
                      <Text style={[styles.totalStatSub, { color: tokens.colors.textSecondary }]}>
                        Protein
                      </Text>
                    </View>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: tokens.colors.carbs }]}>
                        {totalCarbs}g
                      </Text>
                      <Text style={[styles.totalStatSub, { color: tokens.colors.textSecondary }]}>
                        Carbs
                      </Text>
                    </View>
                    <View style={styles.totalStat}>
                      <Text style={[styles.totalStatNum, { color: tokens.colors.fats }]}>
                        {totalFat}g
                      </Text>
                      <Text style={[styles.totalStatSub, { color: tokens.colors.textSecondary }]}>
                        Fat
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Save Button */}
                <View style={styles.modalBtnWrap}>
                  <LiquidButton
                    title={saving ? 'Saving...' : 'Confirm & Save Changes'}
                    icon="checkmark-circle"
                    onPress={handleSave}
                    disabled={saving}
                    variant="primary"
                    shimmer
                  />
                </View>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '94%',
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
  legacyBannerTitle: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  legacyBannerSub: { fontSize: 12, marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' },

  fieldLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 6 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
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
  mealText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },

  itemsSection: { gap: 10, marginVertical: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.6 },
  sectionHint: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },

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
    fontFamily: 'PlusJakartaSans_600SemiBold',
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
    fontFamily: 'PlusJakartaSans_700Bold',
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
  },
  deleteBtn: { padding: 4 },

  itemGramRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemGramLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  gramBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gramInput: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
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
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  gramUnit: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },

  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pieceField: { gap: 3 },
  pieceLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  pieceMult: { fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', marginTop: 12 },
  pieceTotalBox: {
    marginLeft: 'auto',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  pieceTotalLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  pieceTotalVal: { fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },

  itemMacroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  macroPill: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 8,
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
  addItemText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },

  reAnalyzeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  reAnalyzeAllText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },

  multRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 12 },
  multBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  multText: { fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },

  totalsCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  totalsTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  totalStat: { alignItems: 'center' },
  totalStatNum: { fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  totalStatSub: { fontSize: 12, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 },
  modalBtnWrap: { marginTop: 8, marginBottom: 6 },
});
