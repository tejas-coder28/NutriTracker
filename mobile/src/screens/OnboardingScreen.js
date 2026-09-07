import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getRateOptionsPreview } from '../services/macroCalculator';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';

export default function OnboardingScreen() {
  const { user, updateUserProfile, logout } = useAuth();
  const { isDark, themeColors, glassStyles } = useTheme();
  const [loading, setLoading] = useState(false);

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [height, setHeight] = useState(user?.height ? String(user.height) : '');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '');
  const [targetWeight, setTargetWeight] = useState(user?.target_weight ? String(user.target_weight) : '');
  const [activityLevel, setActivityLevel] = useState(user?.activity_level || 'moderate');
  const [fatLossRate, setFatLossRate] = useState(user?.fat_loss_rate ? String(user.fat_loss_rate) : '0.5');
  const [waterGoal, setWaterGoal] = useState(user?.water_goal ? String(user.water_goal) : '8');

  const [ratePreviews, setRatePreviews] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // PopUp Modal state
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    icon: 'checkmark-circle',
    type: 'success'
  });

  const currW = parseFloat(weight) || 75;
  const targW = parseFloat(targetWeight) || 70;
  const diff = targW - currW;
  const autoGoalType = diff > 0.5 ? 'muscle_gain' : diff < -0.5 ? 'fat_loss' : 'maintenance';

  useEffect(() => {
    refreshRatePreviews();
  }, [height, weight, targetWeight, age, gender, activityLevel]);

  const refreshRatePreviews = () => {
    setPreviewLoading(true);
    try {
      const opts = getRateOptionsPreview({
        height: parseFloat(height) || 175,
        weight: currW,
        target_weight: targW,
        age: parseInt(age) || 25,
        gender: gender || 'male',
        activity_level: activityLevel || 'moderate',
        goal_type: autoGoalType,
      });
      setRatePreviews(opts);
    } catch (e) {
      console.error('Rate preview error:', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Form Validation
  const isNameValid = name.trim().length > 0;
  const isAgeValid = age !== '' && !isNaN(Number(age)) && Number(age) > 0 && Number(age) < 120;
  const isGenderValid = gender === 'male' || gender === 'female';
  const isHeightValid = height !== '' && !isNaN(Number(height)) && Number(height) > 30 && Number(height) < 300;
  const isWeightValid = weight !== '' && !isNaN(Number(weight)) && Number(weight) > 10 && Number(weight) < 500;
  const isTargetWeightValid = targetWeight !== '' && !isNaN(Number(targetWeight)) && Number(targetWeight) > 10 && Number(targetWeight) < 500;
  const isActivityValid = Boolean(activityLevel);
  const isFatLossRateValid = fatLossRate !== '' && !isNaN(Number(fatLossRate));

  const isFormValid = Boolean(
    isNameValid &&
    isAgeValid &&
    isGenderValid &&
    isHeightValid &&
    isWeightValid &&
    isTargetWeightValid &&
    isActivityValid &&
    isFatLossRateValid
  );

  const handleSaveOnboarding = async () => {
    if (!isFormValid) return;
    try {
      setLoading(true);
      await updateUserProfile({
        name: name.trim(),
        age: parseInt(age),
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        target_weight: parseFloat(targetWeight),
        activity_level: activityLevel,
        goal_type: autoGoalType,
        fat_loss_rate: parseFloat(fatLossRate),
        water_goal: Math.max(1, parseInt(waterGoal) || 8),
        has_completed_onboarding: true,
      });
    } catch (err) {
      setModalConfig({
        visible: true,
        title: 'Setup Failed',
        message: err.message || 'Unable to save profile attributes.',
        icon: 'alert-circle',
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AmbientBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <PopUpModal
          visible={modalConfig.visible}
          title={modalConfig.title}
          message={modalConfig.message}
          icon={modalConfig.icon}
          type={modalConfig.type}
          onClose={() => setModalConfig({ ...modalConfig, visible: false })}
        />

        {/* Onboarding Welcome Header */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
            <Ionicons name="sparkles" size={26} color="#10B981" />
          </View>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Welcome to NutriTrack AI 👋</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Step 1 of 1 • Complete your physical profile to calculate personalized daily calorie and macro targets.
          </Text>
        </View>

        {/* Mandatory Setup Info Notice */}
        <View style={[styles.noticeBanner, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
          <Ionicons name="information-circle-outline" size={20} color="#10B981" />
          <Text style={[styles.noticeText, { color: themeColors.textPrimary }]}>
            Required Setup: All physical attributes and fat loss pace must be filled to unlock your personalized dashboard.
          </Text>
        </View>

        {/* Account Info & Physical Attributes Card */}
        <View style={[glassStyles.card, styles.sectionCard]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Account & Physical Attributes</Text>

          {/* Email Address Read-Only Field */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Email Address</Text>
              <Text style={styles.readOnlyBadge}>Authenticated Account</Text>
            </View>
            <View style={[glassStyles.input, styles.emailInputWrapper]}>
              <Ionicons name="mail-outline" size={18} color={themeColors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.emailInputText, { color: themeColors.textPrimary }]}
                value={user?.email || ''}
                editable={false}
                selectTextOnFocus={false}
              />
              <Ionicons name="lock-closed" size={14} color={themeColors.textMuted} />
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Full Name *</Text>
            <TextInput
              style={[glassStyles.input, { color: themeColors.textPrimary }, !isNameValid && name !== '' && styles.invalidInput]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={themeColors.placeholder}
            />
          </View>

          {/* Age & Sex */}
          <View style={styles.rowTwo}>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Age *</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }, !isAgeValid && age !== '' && styles.invalidInput]}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                placeholder="25"
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Sex *</Text>
              <View style={styles.pickerRow}>
                {['male', 'female'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      glassStyles.cardSubtle,
                      styles.miniBtn,
                      gender === g && styles.activeMiniBtn
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.miniText,
                        { color: gender === g ? (isDark ? '#34D399' : '#059669') : themeColors.textSecondary },
                        gender === g && { fontWeight: '700' }
                      ]}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Height & Weight */}
          <View style={styles.rowTwo}>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Height (cm) *</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }, !isHeightValid && height !== '' && styles.invalidInput]}
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
                placeholder="175"
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Current Weight (kg) *</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }, !isWeightValid && weight !== '' && styles.invalidInput]}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                placeholder="75"
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
          </View>

          {/* Target Weight & Water Goal */}
          <View style={styles.rowTwo}>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Target Weight (kg) *</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }, !isTargetWeightValid && targetWeight !== '' && styles.invalidInput]}
                keyboardType="numeric"
                value={targetWeight}
                onChangeText={setTargetWeight}
                placeholder="70"
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Daily Water (glasses)</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }]}
                keyboardType="numeric"
                value={waterGoal}
                onChangeText={setWaterGoal}
                placeholder="8"
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
          </View>

          {/* Activity Level */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Activity Level *</Text>
            <View style={styles.activityGrid}>
              {[
                ['sedentary', 'Sedentary (1.2)'],
                ['light', 'Light (1.375)'],
                ['moderate', 'Moderate (1.55)'],
                ['active', 'Active (1.725)'],
                ['very_active', 'Very Active (1.9)'],
              ].map(([id, title]) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    glassStyles.cardSubtle,
                    styles.activityChip,
                    activityLevel === id && styles.activeActivityChip
                  ]}
                  onPress={() => setActivityLevel(id)}
                >
                  <Text
                    style={[
                      styles.activityText,
                      { color: activityLevel === id ? (isDark ? '#34D399' : '#059669') : themeColors.textSecondary },
                      activityLevel === id && { fontWeight: '700' }
                    ]}
                  >
                    {title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Dynamic Goal Pace Card (Weight Gain / Fat Loss / Maintenance) */}
        <View style={[glassStyles.card, styles.sectionCard]}>
          <View style={styles.headerBetween}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              {autoGoalType === 'muscle_gain'
                ? 'Weight Gain Pace *'
                : autoGoalType === 'maintenance'
                ? 'Maintenance Goal *'
                : 'Fat Loss Pace *'}
            </Text>
            {previewLoading && <ActivityIndicator size="small" color="#10B981" />}
          </View>
          <Text style={[styles.sectionSub, { color: themeColors.textSecondary }]}>
            {autoGoalType === 'muscle_gain'
              ? 'Select your target weight gain pace per week to calculate daily calorie surplus & macros.'
              : autoGoalType === 'maintenance'
              ? 'Target weight matches current weight — daily calories set to maintenance TDEE.'
              : 'Select your target pace per week to calculate daily calories.'}
          </Text>

          {ratePreviews.map((opt) => {
            const isSelected = String(fatLossRate) === String(opt.rate);
            return (
              <TouchableOpacity
                key={opt.rate}
                style={[
                  glassStyles.cardSubtle,
                  styles.rateOptionCard,
                  isSelected && styles.rateOptionCardSelected,
                  opt.is_aggressive && styles.rateOptionCardAggressive,
                ]}
                onPress={() => setFatLossRate(String(opt.rate))}
              >
                <View style={styles.rateCardTop}>
                  <View>
                    <Text style={[styles.ratePaceText, { color: themeColors.textPrimary }]}>
                      {autoGoalType === 'maintenance'
                        ? 'Maintenance'
                        : `${opt.rate} kg/week`}
                    </Text>
                    <Text style={[styles.rateBadgeText, { color: themeColors.textSecondary }]}>
                      {opt.badge}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'radio-button-off'}
                    size={21}
                    color={isSelected ? '#10B981' : themeColors.textMuted}
                  />
                </View>
                <View
                  style={[
                    styles.rateMetricsRow,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(0, 0, 0, 0.04)',
                    },
                  ]}
                >
                  <View style={styles.rateMetric}>
                    <Text style={styles.rateMetricVal}>{opt.target_calories} kcal</Text>
                    <Text style={[styles.rateMetricLbl, { color: themeColors.textMuted }]}>
                      Daily Target
                    </Text>
                  </View>
                  <View style={styles.rateMetric}>
                    <Text style={styles.rateMetricVal}>
                      {autoGoalType === 'maintenance' ? 'Ongoing' : `~${opt.weeks_to_target}wks`}
                    </Text>
                    <Text style={[styles.rateMetricLbl, { color: themeColors.textMuted }]}>
                      Duration
                    </Text>
                  </View>
                  <View style={styles.rateMetric}>
                    <Text style={styles.rateMetricVal}>
                      {autoGoalType === 'maintenance' ? 'Maintain' : opt.estimated_date}
                    </Text>
                    <Text style={[styles.rateMetricLbl, { color: themeColors.textMuted }]}>
                      Est. Date
                    </Text>
                  </View>
                </View>
                {opt.warning && (
                  <View style={styles.warningFlag}>
                    <Ionicons name="warning-outline" size={13} color="#FBBF24" />
                    <Text style={styles.warningText}>{opt.warning}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {!isFormValid && (
            <View style={styles.validationHint}>
              <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
              <Text style={styles.validationHintText}>
                Please fill in all required fields (Name, Age, Height, Current Weight, Target Weight, Activity & Goal Pace) to continue.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, (!isFormValid || loading) && styles.disabledSaveBtn]}
            onPress={handleSaveOnboarding}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Text style={styles.saveBtnText}>Save & Recalculate Targets</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Log Out Option */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#F87171" />
          <Text style={styles.logoutText}>Log Out / Switch Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60, gap: 14 },
  header: { alignItems: 'center', marginTop: 10, marginBottom: 6 },
  badge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 4, textAlign: 'center', lineHeight: 18 },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  noticeText: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 },
  sectionCard: { borderRadius: 22, padding: 18, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSub: { fontSize: 12, marginBottom: 2 },
  headerBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600' },
  readOnlyBadge: { fontSize: 10, color: '#34D399', fontWeight: '600' },
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    opacity: 0.85,
  },
  emailInputText: { flex: 1, fontSize: 14, fontWeight: '500' },
  invalidInput: { borderColor: '#EF4444' },
  rowTwo: { flexDirection: 'row', gap: 11 },
  halfCol: { flex: 1, gap: 6 },
  pickerRow: { flexDirection: 'row', gap: 6 },
  miniBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMiniBtn: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' },
  miniText: { fontSize: 12 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activityChip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  activeActivityChip: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' },
  activityText: { fontSize: 11 },
  rateOptionCard: { borderRadius: 16, padding: 13, gap: 8 },
  rateOptionCardSelected: { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  rateOptionCardAggressive: { borderColor: 'rgba(245, 158, 11, 0.4)' },
  rateCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratePaceText: { fontSize: 14, fontWeight: '700' },
  rateBadgeText: { fontSize: 11 },
  rateMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 10, padding: 9 },
  rateMetric: { alignItems: 'center' },
  rateMetricVal: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  rateMetricLbl: { fontSize: 9, marginTop: 2 },
  warningFlag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: 7, borderRadius: 8 },
  warningText: { color: '#FBBF24', fontSize: 10, flex: 1 },
  validationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  validationHintText: { color: '#F59E0B', fontSize: 11, flex: 1, lineHeight: 15, fontWeight: '500' },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabledSaveBtn: { opacity: 0.45 },
  saveBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 4,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } : {}),
  },
  logoutText: { color: '#F87171', fontSize: 14, fontWeight: '700' },
});
