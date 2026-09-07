import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WORKOUT_TYPES, calculateCaloriesBurned } from '../services/workoutService';
import { updateWorkoutLog } from '../services/database';
import { useTheme } from '../context/ThemeContext';

export default function EditWorkoutModal({ visible, item, onClose, userWeight, onSaved }) {
  const { isDark, themeColors, glassStyles } = useTheme();
  const [workoutType, setWorkoutType] = useState('Walking');
  const [durationMin, setDurationMin] = useState('30');
  const [intensity, setIntensity] = useState('moderate');
  const [estimatedBurn, setEstimatedBurn] = useState(0);

  useEffect(() => {
    if (item) {
      setWorkoutType(item.workout_type || 'Walking');
      setDurationMin(String(item.duration_min || 30));
      setIntensity(item.intensity || 'moderate');
    }
  }, [item]);

  useEffect(() => {
    const dur = parseInt(durationMin) || 0;
    const burn = calculateCaloriesBurned(workoutType, dur, intensity, userWeight || 75);
    setEstimatedBurn(burn);
  }, [workoutType, durationMin, intensity, userWeight]);

  if (!item) return null;

  const handleSave = async () => {
    const dur = parseInt(durationMin);
    if (!dur || dur <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in minutes.');
      return;
    }

    const burn = calculateCaloriesBurned(workoutType, dur, intensity, userWeight || 75);

    try {
      const updated = await updateWorkoutLog(item.id, {
        workout_type: workoutType,
        duration_min: dur,
        intensity: intensity,
        calories_burned: burn,
      });

      if (onSaved) onSaved(updated || { ...item, workout_type: workoutType, duration_min: dur, intensity, calories_burned: burn });
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update workout.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)' }]}>
        <View style={[glassStyles.modalContent, s.sheet]}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Ionicons name="pencil" size={20} color={isDark ? '#34D399' : '#059669'} />
              <Text style={[s.headerTitle, { color: themeColors.textPrimary }]}>Edit Workout</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
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
                    <Ionicons name={w.icon} size={18} color={isSelected ? (isDark ? '#34D399' : '#059669') : themeColors.textMuted} />
                    <Text style={[s.typeText, { color: isSelected ? (isDark ? '#34D399' : '#059669') : themeColors.textSecondary }, isSelected && { fontWeight: '700' }]}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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

            <View style={[glassStyles.cardSubtle, s.burnCard]}>
              <View style={s.burnLeft}>
                <Ionicons name="flame" size={24} color={isDark ? '#F87171' : '#DC2626'} />
                <View>
                  <Text style={[s.burnTitle, { color: themeColors.textPrimary }]}>Updated Calorie Burn</Text>
                  <Text style={[s.burnSub, { color: themeColors.textSecondary }]}>{workoutType} • {durationMin || 0}m</Text>
                </View>
              </View>
              <Text style={[s.burnVal, { color: isDark ? '#F87171' : '#DC2626' }]}>{estimatedBurn} <Text style={[s.burnUnit, { color: themeColors.textSecondary }]}>kcal</Text></Text>
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Update Workout</Text>
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
    maxHeight: '88%',
    padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '31%', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1 },
  selectedTypeCard: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: '#10B981' },
  typeText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  selectedTypeText: { fontWeight: '700' },
  rowTwo: { flexDirection: 'row', gap: 12, marginTop: 4 },
  halfCol: { flex: 1 },
  inputBox: { borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 0 },
  input: { flex: 1, fontSize: 16, fontWeight: '700', paddingVertical: 10 },
  inputUnit: { fontSize: 12, fontWeight: '600' },
  intensityRow: { flexDirection: 'column', gap: 4 },
  intensityChip: { borderRadius: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1 },
  selectedIntensityChip: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' },
  intensityText: { fontSize: 11, fontWeight: '600' },
  selectedIntensityText: { fontWeight: '700' },
  burnCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)', marginTop: 16 },
  burnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  burnTitle: { fontSize: 14, fontWeight: '700' },
  burnSub: { fontSize: 11 },
  burnVal: { fontSize: 20, fontWeight: '800' },
  burnUnit: { fontSize: 12, fontWeight: '500' },
  saveBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 18, marginBottom: 16 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
