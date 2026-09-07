import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WORKOUT_TYPES, WORKOUT_PRESETS, calculateCaloriesBurned } from '../services/workoutService';
import { insertWorkoutLog, getCustomPresets, insertCustomPreset, deleteCustomPreset } from '../services/database';
import { useTheme } from '../context/ThemeContext';

export default function LogWorkoutModal({ visible, onClose, userWeight, onWorkoutAdded, onPromptAddWeight }) {
  const { isDark, themeColors, glassStyles } = useTheme();
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

  const executeDeletePreset = async (id) => {
    try {
      await deleteCustomPreset(id);
      setUserPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete preset.');
    }
  };

  const handleDeletePreset = (id, title, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Remove "${title}" from your saved presets?`);
      if (confirmed) {
        executeDeletePreset(id);
      }
    } else {
      Alert.alert('Delete Preset', `Remove "${title}" from your saved presets?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => executeDeletePreset(id),
        },
      ]);
    }
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

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => { resetForm(); onClose(); }}>
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)' }]}>
        <View style={[glassStyles.modalContent, s.sheet]}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Ionicons name="fitness-outline" size={22} color={themeColors.primary} />
              <Text style={[s.headerTitle, { color: themeColors.textPrimary }]}>Log Workout</Text>
            </View>
            <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
              <Ionicons name="close" size={24} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
            {/* Presets Header */}
            <View style={s.presetHeaderRow}>
              <Text style={[s.sectionLabel, { color: themeColors.textPrimary }]}>Workout Presets</Text>
              <TouchableOpacity style={s.addPresetLink} onPress={() => setShowSavePreset(!showSavePreset)}>
                <Ionicons name={showSavePreset ? 'close' : 'add-circle-outline'} size={15} color={isDark ? '#34D399' : '#059669'} />
                <Text style={[s.addPresetLinkText, { color: isDark ? '#34D399' : '#059669' }]}>{showSavePreset ? 'Cancel' : '+ Save Preset'}</Text>
              </TouchableOpacity>
            </View>

            {/* Save Custom Preset Input Box */}
            {showSavePreset && (
              <View style={[glassStyles.cardSubtle, s.savePresetBox]}>
                <Text style={[s.savePresetTitle, { color: themeColors.textPrimary }]}>Save current configuration as preset</Text>
                <View style={s.savePresetRow}>
                  <TextInput
                    style={[glassStyles.input, s.savePresetInput, { color: themeColors.textPrimary }]}
                    placeholder="e.g. Gym Day, Evening Run"
                    placeholderTextColor={themeColors.placeholder}
                    value={presetTitleInput}
                    onChangeText={setPresetTitleInput}
                  />
                  <TouchableOpacity style={s.savePresetConfirmBtn} onPress={handleSaveCustomPreset}>
                    <Text style={s.savePresetConfirmText}>Save</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[s.savePresetSub, { color: themeColors.textSecondary }]}>
                  Saves: {workoutType} • {durationMin} min • {intensity}
                </Text>
              </View>
            )}

            {/* Scrollable Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.presetScroll}>
              {/* User Saved Custom Presets */}
              {userPresets.map((preset) => (
                <View
                  key={`custom_${preset.id}`}
                  style={[s.presetChip, s.customPresetChip, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)', borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)' }]}
                >
                  <TouchableOpacity
                    style={s.presetMainClick}
                    onPress={() => handleSelectPreset(preset)}
                  >
                    <Ionicons name="bookmark" size={13} color={isDark ? '#34D399' : '#059669'} />
                    <Text style={[s.presetText, { color: isDark ? '#34D399' : '#059669', fontWeight: '700' }]}>{preset.title}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.presetTrashIcon}
                    onPress={(e) => handleDeletePreset(preset.id, preset.title, e)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={15} color={isDark ? '#F87171' : '#EF4444'} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Standard Built-In Presets */}
              {WORKOUT_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={`sys_${idx}`}
                  style={[s.presetChip, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)' }]}
                  onPress={() => handleSelectPreset(preset)}
                >
                  <Ionicons name="flash-outline" size={13} color={isDark ? '#FBBF24' : '#D97706'} />
                  <Text style={[s.presetText, { color: themeColors.textPrimary }]}>{preset.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Select Workout Type */}
            <Text style={[s.sectionLabel, { color: themeColors.textPrimary }]}>Workout Type</Text>
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
                          ? (isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)')
                          : (isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)'),
                        borderColor: isSelected ? '#10B981' : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'),
                      }
                    ]}
                    onPress={() => setWorkoutType(w.id)}
                  >
                    <Ionicons name={w.icon} size={20} color={isSelected ? (isDark ? '#34D399' : '#059669') : themeColors.textMuted} />
                    <Text style={[s.typeText, { color: isSelected ? (isDark ? '#34D399' : '#059669') : themeColors.textSecondary }, isSelected && { fontWeight: '700' }]}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Duration & Intensity Inputs */}
            <View style={s.rowTwo}>
              <View style={s.halfCol}>
                <Text style={[s.sectionLabel, { color: themeColors.textPrimary }]}>Duration (minutes)</Text>
                <View style={[glassStyles.input, s.inputBox]}>
                  <TextInput
                    style={[s.input, { color: themeColors.textPrimary }]}
                    keyboardType="numeric"
                    value={durationMin}
                    onChangeText={setDurationMin}
                    placeholder="30"
                    placeholderTextColor={themeColors.placeholder}
                  />
                  <Text style={[s.inputUnit, { color: themeColors.textSecondary }]}>min</Text>
                </View>
              </View>

              <View style={s.halfCol}>
                <Text style={[s.sectionLabel, { color: themeColors.textPrimary }]}>Intensity</Text>
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
                              ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)')
                              : (isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)'),
                            borderColor: isSelected ? '#10B981' : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'),
                          }
                        ]}
                        onPress={() => setIntensity(lvl)}
                      >
                        <Text style={[s.intensityText, { color: isSelected ? (isDark ? '#34D399' : '#059669') : themeColors.textSecondary }, isSelected && { fontWeight: '700' }]}>
                          {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Calorie Burn Preview */}
            <View style={[glassStyles.cardSubtle, s.burnCard]}>
              <View style={s.burnLeft}>
                <Ionicons name="flame" size={26} color={isDark ? '#F87171' : '#DC2626'} />
                <View>
                  <Text style={[s.burnTitle, { color: themeColors.textPrimary }]}>Estimated Burn</Text>
                  <Text style={[s.burnSub, { color: themeColors.textSecondary }]}>
                    MET calc ({workoutType}, {durationMin || 0}m, {intensity})
                  </Text>
                </View>
              </View>
              <Text style={[s.burnVal, { color: isDark ? '#F87171' : '#DC2626' }]}>{estimatedBurn} <Text style={[s.burnUnit, { color: themeColors.textSecondary }]}>kcal</Text></Text>
            </View>

            {!userWeight && (
              <View style={[s.weightNotice, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.10)', borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(217, 119, 6, 0.20)' }]}>
                <Ionicons name="information-circle-outline" size={16} color={isDark ? '#FBBF24' : '#D97706'} />
                <Text style={[s.weightNoticeText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                  Using default weight (75kg). Update weight in Profile for precision.
                </Text>
              </View>
            )}

            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Save Workout</Text>
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '90%',
    padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { marginBottom: 8 },
  presetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600' },
  addPresetLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPresetLinkText: { fontSize: 12, fontWeight: '700' },
  savePresetBox: { borderRadius: 16, padding: 12, marginBottom: 10, gap: 6 },
  savePresetTitle: { fontSize: 12, fontWeight: '700' },
  savePresetRow: { flexDirection: 'row', gap: 8 },
  savePresetInput: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 },
  savePresetConfirmBtn: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  savePresetConfirmText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  savePresetSub: { fontSize: 10 },
  presetScroll: { flexDirection: 'row', marginBottom: 12 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  customPresetChip: { borderWidth: 1 },
  presetMainClick: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  presetText: { fontSize: 12, fontWeight: '600' },
  customPresetText: { color: '#34D399' },
  presetTrashIcon: { marginLeft: 4, padding: 2 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  typeCard: { width: '31%', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1 },
  selectedTypeCard: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: '#10B981' },
  typeText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  selectedTypeText: { fontWeight: '700' },
  rowTwo: { flexDirection: 'row', gap: 12, marginTop: 4 },
  halfCol: { flex: 1 },
  inputBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 0 },
  input: { flex: 1, fontSize: 16, fontWeight: '700', paddingVertical: 10 },
  inputUnit: { fontSize: 12, fontWeight: '600' },
  intensityRow: { flexDirection: 'column', gap: 4 },
  intensityChip: { borderRadius: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1 },
  selectedIntensityChip: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' },
  intensityText: { fontSize: 11, fontWeight: '600' },
  selectedIntensityText: { fontWeight: '700' },
  burnCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 18, padding: 14, marginTop: 16 },
  burnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  burnTitle: { fontSize: 14, fontWeight: '700' },
  burnSub: { fontSize: 11 },
  burnVal: { fontSize: 20, fontWeight: '800' },
  burnUnit: { fontSize: 12, fontWeight: '500' },
  weightNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12, marginTop: 12, borderWidth: 1 },
  weightNoticeText: { fontSize: 11, flex: 1 },
  saveBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 18, marginBottom: 16 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
