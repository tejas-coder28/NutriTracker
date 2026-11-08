import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { WORKOUT_TYPES, calculateCaloriesBurned } from '../services/workoutService';
import { updateWorkoutLog } from '../services/database';
import { useTheme } from '../context/ThemeContext';
import LiquidButton from './primitives/LiquidButton';
import Icon from './ui/Icon';

export default function EditWorkoutModal({ visible, item, onClose, userWeight, onSaved }) {
  const { isDark, tokens } = useTheme();
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

  const isWeb = Platform.OS === 'web';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
                <Icon name="pencil" size={18} color={tokens.colors.primary} />
              </View>
              <Text style={[s.headerTitle, { color: tokens.colors.textPrimary }]}>Edit Workout</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
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
                    <Icon name={w.icon} size={18} color={isSelected ? tokens.colors.primary : tokens.colors.textMuted} />
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
                <Icon name="flame" size={24} color={tokens.colors.calories} />
                <View>
                  <Text style={[s.burnTitle, { color: tokens.colors.textPrimary }]}>Updated Calorie Burn</Text>
                  <Text style={[s.burnSub, { color: tokens.colors.textSecondary }]}>{workoutType} • {durationMin || 0}m</Text>
                </View>
              </View>
              <Text style={[s.burnVal, { color: tokens.colors.calories }]}>
                {estimatedBurn} <Text style={[s.burnUnit, { color: tokens.colors.textSecondary }]}>kcal</Text>
              </Text>
            </View>

            <View style={s.buttonWrap}>
              <LiquidButton
                title="Update Workout"
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
    maxHeight: '88%',
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
  scroll: { marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 12, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '31%', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1 },
  typeText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center' },
  rowTwo: { flexDirection: 'row', gap: 12, marginTop: 4 },
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
