import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { WORKOUT_TYPES, WORKOUT_PRESETS, calculateCaloriesBurned } from '../services/workoutService';
import { insertWorkoutLog, getCustomPresets, insertCustomPreset, deleteCustomPreset } from '../services/database';
import { useTheme } from '../context/ThemeContext';
import LiquidButton from './primitives/LiquidButton';
import Icon from './ui/Icon';

export default function LogWorkoutModal({ visible, onClose, userWeight, onWorkoutAdded, onPromptAddWeight }) {
  const { isDark, themeColors, tokens } = useTheme();
  const [workoutType, setWorkoutType] = useState('Walking');
  const [durationMin, setDurationMin] = useState('30');
  const [intensity, setIntensity] = useState('moderate');
  const [estimatedBurn, setEstimatedBurn] = useState(0);

  // Custom Presets State
  const [userPresets, setUserPresets] = useState([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetTitleInput, setPresetTitleInput] = useState('');

  useEffect(() => {
    if (visible) {
      loadCustomPresets();
    }
  }, [visible]);

  const loadCustomPresets = async () => {
    try {
      const presets = await getCustomPresets();
      setUserPresets(presets || []);
    } catch (e) {
      console.error('Failed to load custom presets:', e);
    }
  };

  useEffect(() => {
    const dur = parseInt(durationMin) || 0;
    const burn = calculateCaloriesBurned(workoutType, dur, intensity, userWeight || 75);
    setEstimatedBurn(burn);
  }, [workoutType, durationMin, intensity, userWeight]);

  const handleSelectPreset = (preset) => {
    setWorkoutType(preset.workout_type || preset.type || 'Walking');
    setDurationMin(String(preset.duration_min || 30));
    setIntensity(preset.intensity || 'moderate');
  };

  const handleSaveCustomPreset = async () => {
    const title = presetTitleInput.trim();
    if (!title) {
      Alert.alert('Preset Name Required', 'Please enter a name for your custom preset (e.g. "Gym Day").');
      return;
    }

    try {
      const newP = await insertCustomPreset({
        title,
        workout_type: workoutType,
        duration_min: parseInt(durationMin) || 30,
        intensity,
      });

      setUserPresets([newP, ...userPresets]);
      setPresetTitleInput('');
      setShowSavePreset(false);
      Alert.alert('Preset Saved!', `Saved "${title}" to your custom workout presets.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save custom preset.');
    }
  };

  const handleDeletePreset = async (id, title) => {
    Alert.alert('Delete Preset', `Remove "${title}" from your saved presets?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomPreset(id);
          setUserPresets(userPresets.filter(p => p.id !== id));
        }
      }
    ]);
  };

  const handleSave = async () => {
    const dur = parseInt(durationMin);
    if (!dur || dur <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid workout duration in minutes.');
      return;
    }

    if (!userWeight) {
      Alert.alert(
        'Weight Missing',
        'We use your weight to calculate calorie burn accurately. Would you like to set your weight in profile?',
        [
          { text: 'Skip & Use 75kg', onPress: () => saveEntry(75) },
          { text: 'Set Weight', onPress: () => { onClose(); if (onPromptAddWeight) onPromptAddWeight(); } }
        ]
      );
      return;
    }

    await saveEntry(userWeight);
  };

  const saveEntry = async (weightToUse) => {
    const dur = parseInt(durationMin);
    const burn = calculateCaloriesBurned(workoutType, dur, intensity, weightToUse);

    try {
      const entry = await insertWorkoutLog({
        workout_type: workoutType,
        duration_min: dur,
        intensity: intensity,
        calories_burned: burn,
      });

      if (onWorkoutAdded) onWorkoutAdded(entry);
      resetForm();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to log workout.');
    }
  };

  const resetForm = () => {
    setWorkoutType('Walking');
    setDurationMin('30');
    setIntensity('moderate');
    setShowSavePreset(false);
    setPresetTitleInput('');
  };

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

          {/* Specular Highlight Line */}
          <View style={[s.specularLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)' }]} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={[s.iconBox, { backgroundColor: isDark ? 'rgba(16,232,160,0.12)' : 'rgba(0,179,119,0.12)' }]}>
                <Icon name="fitness-outline" size={20} color={tokens.colors.primary} />
              </View>
              <Text style={[s.headerTitle, { color: tokens.colors.textPrimary }]}>Log Workout</Text>
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

          <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Presets Header */}
            <View style={s.presetHeaderRow}>
              <Text style={[s.sectionLabel, { color: tokens.colors.textPrimary }]}>Workout Presets</Text>
              <TouchableOpacity style={s.addPresetLink} onPress={() => setShowSavePreset(!showSavePreset)}>
                <Icon name={showSavePreset ? 'close' : 'add-circle-outline'} size={15} color={tokens.colors.primary} />
                <Text style={[s.addPresetLinkText, { color: tokens.colors.primary }]}>{showSavePreset ? 'Cancel' : '+ Save Preset'}</Text>
              </TouchableOpacity>
            </View>

            {/* Save Custom Preset Input Box */}
            {showSavePreset && (
              <View style={[s.savePresetBox, { backgroundColor: tokens.colors.neuBase, borderColor: tokens.colors.cardBorderSubtle }]}>
                <Text style={[s.savePresetTitle, { color: tokens.colors.textPrimary }]}>Save current configuration as preset</Text>
                <View style={s.savePresetRow}>
                  <TextInput
                    style={[
                      s.savePresetInput,
                      {
                        color: tokens.colors.textPrimary,
                        backgroundColor: tokens.colors.inputBg,
                        borderColor: tokens.colors.inputBorder,
                      }
                    ]}
                    placeholder="e.g. Gym Day, Evening Run"
                    placeholderTextColor={tokens.colors.placeholder}
                    value={presetTitleInput}
                    onChangeText={setPresetTitleInput}
                  />
                  <TouchableOpacity
                    style={[s.savePresetConfirmBtn, { backgroundColor: tokens.colors.primary }]}
                    onPress={handleSaveCustomPreset}
                  >
                    <Text style={[s.savePresetConfirmText, { color: tokens.colors.primaryText }]}>Save</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[s.savePresetSub, { color: tokens.colors.textSecondary }]}>
                  Saves: {workoutType} • {durationMin} min • {intensity}
                </Text>
              </View>
            )}

            {/* Scrollable Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.presetScroll}>
              {/* User Saved Custom Presets */}
              {userPresets.map((preset) => (
                <TouchableOpacity
                  key={`custom_${preset.id}`}
                  style={[
                    s.presetChip,
                    {
                      backgroundColor: isDark ? 'rgba(16, 232, 160, 0.15)' : 'rgba(0, 179, 119, 0.12)',
                      borderColor: tokens.colors.primary,
                    }
                  ]}
                  onPress={() => handleSelectPreset(preset)}
                  onLongPress={() => handleDeletePreset(preset.id, preset.title)}
                >
                  <Icon name="bookmark" size={13} color={tokens.colors.primary} />
                  <Text style={[s.presetText, { color: tokens.colors.primary, fontWeight: '700' }]}>{preset.title}</Text>
                  <TouchableOpacity style={s.presetTrashIcon} onPress={() => handleDeletePreset(preset.id, preset.title)}>
                    <Icon name="close-circle" size={14} color={tokens.colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              {/* Standard Built-In Presets */}
              {WORKOUT_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={`sys_${idx}`}
                  style={[
                    s.presetChip,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)',
                      borderColor: tokens.colors.glassBorder,
                    }
                  ]}
                  onPress={() => handleSelectPreset(preset)}
                >
                  <Icon name="flash-outline" size={13} color={tokens.colors.warning} />
                  <Text style={[s.presetText, { color: tokens.colors.textPrimary }]}>{preset.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Select Workout Type */}
            <Text style={[s.sectionLabel, { color: tokens.colors.textPrimary }]}>Workout Type</Text>
            <View style={s.typeGrid}>
              {WORKOUT_TYPES.map(w => {
                const isSelected = workoutType === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      s.typeCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(16, 232, 160, 0.18)' : 'rgba(0, 179, 119, 0.14)')
                          : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)'),
                        borderColor: isSelected ? tokens.colors.primary : tokens.colors.cardBorderSubtle,
                      }
                    ]}
                    onPress={() => setWorkoutType(w.id)}
                  >
                    <Icon name={w.icon} size={20} color={isSelected ? tokens.colors.primary : tokens.colors.textMuted} />
                    <Text
                      style={[
                        s.typeText,
                        { color: isSelected ? tokens.colors.primary : tokens.colors.textSecondary },
                        isSelected && { fontWeight: '700' }
                      ]}
                    >
                      {w.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Duration & Intensity Inputs */}
            <View style={s.rowTwo}>
              <View style={s.halfCol}>
                <Text style={[s.sectionLabel, { color: tokens.colors.textPrimary }]}>Duration (minutes)</Text>
                <View
                  style={[
                    s.inputBox,
                    {
                      backgroundColor: tokens.colors.inputBg,
                      borderColor: tokens.colors.inputBorder,
                    }
                  ]}
                >
                  <TextInput
                    style={[s.input, { color: tokens.colors.textPrimary }]}
                    keyboardType="numeric"
                    value={durationMin}
                    onChangeText={setDurationMin}
                    placeholder="30"
                    placeholderTextColor={tokens.colors.placeholder}
                  />
                  <Text style={[s.inputUnit, { color: tokens.colors.textSecondary }]}>min</Text>
                </View>
              </View>

              <View style={s.halfCol}>
                <Text style={[s.sectionLabel, { color: tokens.colors.textPrimary }]}>Intensity</Text>
                <View style={s.intensityRow}>
                  {['light', 'moderate', 'intense'].map(lvl => {
                    const isSelected = intensity === lvl;
                    return (
                      <TouchableOpacity
                        key={lvl}
                        style={[
                          s.intensityChip,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(16, 232, 160, 0.20)' : 'rgba(0, 179, 119, 0.14)')
                              : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)'),
                            borderColor: isSelected ? tokens.colors.primary : tokens.colors.cardBorderSubtle,
                          }
                        ]}
                        onPress={() => setIntensity(lvl)}
                      >
                        <Text
                          style={[
                            s.intensityText,
                            { color: isSelected ? tokens.colors.primary : tokens.colors.textSecondary },
                            isSelected && { fontWeight: '700' }
                          ]}
                        >
                          {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Calorie Burn Preview */}
            <View
              style={[
                s.burnCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 77, 77, 0.10)' : 'rgba(224, 58, 58, 0.08)',
                  borderColor: isDark ? 'rgba(255, 77, 77, 0.35)' : 'rgba(224, 58, 58, 0.25)',
                }
              ]}
            >
              <View style={s.burnLeft}>
                <Icon name="flame" size={26} color={tokens.colors.calories} />
                <View>
                  <Text style={[s.burnTitle, { color: tokens.colors.textPrimary }]}>Estimated Burn</Text>
                  <Text style={[s.burnSub, { color: tokens.colors.textSecondary }]}>
                    MET calc ({workoutType}, {durationMin || 0}m, {intensity})
                  </Text>
                </View>
              </View>
              <Text style={[s.burnVal, { color: tokens.colors.calories }]}>
                {estimatedBurn} <Text style={[s.burnUnit, { color: tokens.colors.textSecondary }]}>kcal</Text>
              </Text>
            </View>

            {!userWeight && (
              <View
                style={[
                  s.weightNotice,
                  {
                    backgroundColor: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(224, 154, 0, 0.12)',
                    borderColor: isDark ? 'rgba(255, 184, 0, 0.30)' : 'rgba(224, 154, 0, 0.25)',
                  }
                ]}
              >
                <Icon name="information-circle-outline" size={16} color={tokens.colors.warning} />
                <Text style={[s.weightNoticeText, { color: tokens.colors.warning }]}>
                  Using default weight (75kg). Update weight in Profile for precision.
                </Text>
              </View>
            )}

            <View style={s.buttonWrap}>
              <LiquidButton
                title="Save Workout"
                icon="checkmark-circle"
                onPress={handleSave}
                variant="primary"
                shimmer
              />
            </View>
          </ScrollView>
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
    maxHeight: '90%',
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
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.15 },
  scroll: { marginBottom: 8 },
  presetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  addPresetLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPresetLinkText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  savePresetBox: { borderRadius: 16, padding: 12, marginBottom: 12, gap: 6, borderWidth: 1 },
  savePresetTitle: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  savePresetRow: { flexDirection: 'row', gap: 8 },
  savePresetInput: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', borderWidth: 1 },
  savePresetConfirmBtn: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  savePresetConfirmText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  savePresetSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  presetScroll: { flexDirection: 'row', marginBottom: 14 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  presetText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  presetTrashIcon: { marginLeft: 2 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  typeCard: { width: '31%', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1 },
  typeText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center' },
  rowTwo: { flexDirection: 'row', gap: 12, marginTop: 12 },
  halfCol: { flex: 1 },
  inputBox: { borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'], paddingVertical: 10 },
  inputUnit: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  intensityRow: { flexDirection: 'column', gap: 4, marginTop: 4 },
  intensityChip: { borderRadius: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1 },
  intensityText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  burnCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 18, padding: 14, marginTop: 16, borderWidth: 1 },
  burnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  burnTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  burnSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  burnVal: { fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  burnUnit: { fontSize: 12, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium' },
  weightNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12, marginTop: 12, borderWidth: 1 },
  weightNoticeText: { fontSize: 12, flex: 1, lineHeight: 17, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium' },
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
  buttonWrap: { marginTop: 18, marginBottom: 16 },
});
