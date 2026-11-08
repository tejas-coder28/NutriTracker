import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getRateOptionsPreview } from '../services/macroCalculator';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';
import GlassCard from '../components/primitives/GlassCard';
import LiquidButton from '../components/primitives/LiquidButton';
import NeuInset from '../components/primitives/NeuInset';
import Icon from '../components/ui/Icon';

export default function OnboardingScreen() {
  const { user, updateUserProfile, logout } = useAuth();
  const { isDark, tokens } = useTheme();
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
    type: 'success',
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
      const res = await updateUserProfile({
        name: name.trim(),
        age: parseInt(age) || 25,
        gender,
        height: parseFloat(height) || 175,
        weight: currW,
        target_weight: targW,
        activity_level: activityLevel,
        goal_type: autoGoalType,
        fat_loss_rate: parseFloat(fatLossRate) || 0.5,
        water_goal: Math.max(1, parseInt(waterGoal) || 8),
      });

      const newCal = res?.calculated?.target_calories || user?.target_calories || 2000;
      setModalConfig({
        visible: true,
        title: 'Welcome to NutriTracker AI! 🥑',
        message: `Your personalized nutrition profile has been calculated (${newCal} kcal/day target). Let's start tracking!`,
        icon: 'sparkles',
        type: 'success',
      });
    } catch (err) {
      setModalConfig({
        visible: true,
        title: 'Save Failed',
        message: err.message || 'Unable to save your onboarding setup.',
        icon: 'alert-circle',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AmbientBackground style={styles.container}>
      <PopUpModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        icon={modalConfig.icon}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrap}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isDark ? 'rgba(16, 232, 160, 0.18)' : 'rgba(0, 179, 119, 0.12)',
                  borderColor: tokens.primary,
                },
              ]}
            >
              <Icon name="sparkles" size={26} color={tokens.primary} />
            </View>
            <Text style={[styles.title, { color: tokens.text.primary }]}>Setup Your Profile</Text>
            <Text style={[styles.subtitle, { color: tokens.text.secondary }]}>
              NutriTracker AI uses scientific Mifflin-St Jeor math to calculate your baseline targets.
            </Text>
          </View>

          {/* Mandatory Completion Banner */}
          <GlassCard
            subtle
            style={[
              styles.noticeBanner,
              {
                borderColor: isDark ? 'rgba(255, 184, 0, 0.35)' : 'rgba(224, 154, 0, 0.25)',
              },
            ]}
          >
            <Icon name="information-circle-outline" size={20} color={tokens.macros.carbs} />
            <Text style={[styles.noticeText, { color: tokens.text.primary }]}>
              Please fill in your metrics below to unlock your daily dashboard and macro rings.
            </Text>
          </GlassCard>

          {/* Physical Attributes Form */}
          <GlassCard style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: tokens.text.primary }]}>Physical Metrics</Text>

            {/* Email Address Read-Only */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Email Address</Text>
                <Text style={[styles.readOnlyBadge, { color: tokens.primary }]}>Authenticated Account</Text>
              </View>
              <View style={[styles.inputWrapper, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border }]}>
                <Icon name="mail-outline" size={17} color={tokens.text.muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.inputField, { color: tokens.text.primary }]}
                  value={user?.email || 'user@nutritrack.ai'}
                  editable={false}
                  selectTextOnFocus={false}
                />
                <Icon name="lock-closed" size={14} color={tokens.text.muted} />
              </View>
            </View>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: tokens.text.secondary }]}>Full Name *</Text>
              <TextInput
                style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Tejas Muralidhar"
                placeholderTextColor={tokens.input.placeholder}
              />
            </View>

            <View style={styles.rowTwo}>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Age *</Text>
                <TextInput
                  style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  placeholder="25"
                  placeholderTextColor={tokens.input.placeholder}
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Sex *</Text>
                <View style={styles.pickerRow}>
                  {['male', 'female'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.miniBtn,
                        {
                          backgroundColor: gender === g
                            ? (isDark ? 'rgba(16, 232, 160, 0.20)' : 'rgba(0, 179, 119, 0.15)')
                            : tokens.neumorphic.inset,
                          borderColor: gender === g ? tokens.primary : tokens.neumorphic.border,
                        },
                      ]}
                      onPress={() => setGender(g)}
                    >
                      <Text
                        style={[
                          styles.miniText,
                          {
                            color: gender === g ? tokens.primary : tokens.text.secondary,
                            fontWeight: gender === g ? '700' : '500',
                          },
                        ]}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Height (cm) *</Text>
                <TextInput
                  style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="175"
                  placeholderTextColor={tokens.input.placeholder}
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Current Weight (kg) *</Text>
                <TextInput
                  style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="75"
                  placeholderTextColor={tokens.input.placeholder}
                />
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Target Weight (kg) *</Text>
                <TextInput
                  style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                  keyboardType="numeric"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  placeholder="70"
                  placeholderTextColor={tokens.input.placeholder}
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Daily Water (glasses)</Text>
                <TextInput
                  style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                  keyboardType="numeric"
                  value={waterGoal}
                  onChangeText={setWaterGoal}
                  placeholder="8"
                  placeholderTextColor={tokens.input.placeholder}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: tokens.text.secondary }]}>Activity Level *</Text>
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
                      styles.activityChip,
                      {
                        backgroundColor: activityLevel === id
                          ? (isDark ? 'rgba(16, 232, 160, 0.20)' : 'rgba(0, 179, 119, 0.15)')
                          : tokens.neumorphic.inset,
                        borderColor: activityLevel === id ? tokens.primary : tokens.neumorphic.border,
                      },
                    ]}
                    onPress={() => setActivityLevel(id)}
                  >
                    <Text
                      style={[
                        styles.activityText,
                        {
                          color: activityLevel === id ? tokens.primary : tokens.text.secondary,
                          fontWeight: activityLevel === id ? '700' : '500',
                        },
                      ]}
                    >
                      {title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </GlassCard>

          {/* Goal Pace Selector */}
          <GlassCard style={styles.sectionCard}>
            <View style={styles.headerBetween}>
              <Text style={[styles.sectionTitle, { color: tokens.text.primary }]}>
                {autoGoalType === 'muscle_gain'
                  ? 'Weight Gain Pace'
                  : autoGoalType === 'maintenance'
                  ? 'Maintenance Goal'
                  : 'Fat Loss Pace'}
              </Text>
              {previewLoading && <ActivityIndicator size="small" color={tokens.primary} />}
            </View>
            <Text style={[styles.sectionSub, { color: tokens.text.secondary }]}>
              Select your targeted velocity to generate your daily calorie budget.
            </Text>

            {ratePreviews.map((opt) => {
              const isSelected = String(fatLossRate) === String(opt.rate);
              return (
                <TouchableOpacity
                  key={opt.rate}
                  activeOpacity={0.85}
                  style={[
                    styles.rateOptionCard,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(16, 232, 160, 0.15)' : 'rgba(0, 179, 119, 0.12)')
                        : tokens.neumorphic.inset,
                      borderColor: isSelected ? tokens.primary : tokens.neumorphic.border,
                    },
                  ]}
                  onPress={() => setFatLossRate(String(opt.rate))}
                >
                  <View style={styles.rateCardTop}>
                    <View>
                      <Text style={[styles.ratePaceText, { color: tokens.text.primary }]}>
                        {autoGoalType === 'maintenance' ? 'Maintenance' : `${opt.rate} kg/week`}
                      </Text>
                      <Text style={[styles.rateBadgeText, { color: tokens.text.secondary }]}>
                        {opt.badge}
                      </Text>
                    </View>
                    <Icon
                      name={isSelected ? 'checkmark-circle' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? tokens.primary : tokens.text.muted}
                    />
                  </View>
                  <View style={[styles.rateMetricsRow, { backgroundColor: tokens.liquidGlass.fill }]}>
                    <View style={styles.rateMetric}>
                      <Text
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.3}
                        style={[styles.rateMetricVal, { color: tokens.primary }]}
                      >
                        {opt.target_calories} kcal
                      </Text>
                      <Text
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.3}
                        style={[styles.rateMetricLbl, { color: tokens.text.secondary }]}
                      >
                        Daily Target
                      </Text>
                    </View>
                    <View style={styles.rateMetric}>
                      <Text
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.3}
                        style={[styles.rateMetricVal, { color: tokens.primary }]}
                      >
                        {autoGoalType === 'maintenance' ? 'Ongoing' : `~${opt.weeks_to_target}wks`}
                      </Text>
                      <Text
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.3}
                        style={[styles.rateMetricLbl, { color: tokens.text.secondary }]}
                      >
                        Duration
                      </Text>
                    </View>
                    <View style={styles.rateMetric}>
                      <Text
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.3}
                        style={[styles.rateMetricVal, { color: tokens.primary }]}
                      >
                        {autoGoalType === 'maintenance' ? 'Maintain' : opt.estimated_date}
                      </Text>
                      <Text
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.3}
                        style={[styles.rateMetricLbl, { color: tokens.text.secondary }]}
                      >
                        Est. Date
                      </Text>
                    </View>
                  </View>
                  {opt.warning && (
                    <View
                      style={[
                        styles.warningFlag,
                        {
                          backgroundColor: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(224, 154, 0, 0.12)',
                          borderColor: isDark ? 'rgba(255, 184, 0, 0.35)' : 'rgba(224, 154, 0, 0.25)',
                        },
                      ]}
                    >
                      <Icon name="warning-outline" size={13} color={tokens.macros.carbs} />
                      <Text style={[styles.warningText, { color: tokens.macros.carbs }]}>
                        {opt.warning}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {!isFormValid && (
              <View
                style={[
                  styles.validationHint,
                  {
                    backgroundColor: isDark ? 'rgba(255, 184, 0, 0.12)' : 'rgba(224, 154, 0, 0.10)',
                    borderColor: isDark ? 'rgba(255, 184, 0, 0.30)' : 'rgba(224, 154, 0, 0.25)',
                  },
                ]}
              >
                <Icon name="alert-circle-outline" size={16} color={tokens.macros.carbs} />
                <Text style={[styles.validationHintText, { color: tokens.macros.carbs }]}>
                  Please fill in all required fields (*) with valid numbers.
                </Text>
              </View>
            )}

            <LiquidButton
              onPress={handleSaveOnboarding}
              disabled={loading || !isFormValid}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Calculating Targets...' : 'Complete Setup & Enter Dashboard'}
            </LiquidButton>

            <LiquidButton
              variant="secondary"
              onPress={logout}
              icon="log-out-outline"
              style={{ marginTop: 6 }}
            >
              Sign Out
            </LiquidButton>
          </GlassCard>
        </View>
      </ScrollView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 520,
    gap: 14,
  },
  header: { alignItems: 'center', marginTop: 10, marginBottom: 6 },
  badge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
  },
  title: { fontSize: 24, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.2 },
  subtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4, textAlign: 'center', lineHeight: 19 },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    gap: 10,
  },
  noticeText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1, lineHeight: 17 },
  sectionCard: { padding: 16, gap: 11 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.15 },
  sectionSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginBottom: 2 },
  headerBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldGroup: { gap: 5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  readOnlyBadge: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputField: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
  inputFieldSolo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  rowTwo: { flexDirection: 'row', gap: 11 },
  halfCol: { flex: 1, gap: 5 },
  pickerRow: { flexDirection: 'row', gap: 6 },
  miniBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activityChip: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  activityText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  rateOptionCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  rateCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratePaceText: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  rateBadgeText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 1 },
  rateMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 10,
    padding: 8,
  },
  rateMetric: { alignItems: 'center' },
  rateMetricVal: { fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  rateMetricLbl: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  warningFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    padding: 7,
    borderRadius: 8,
  },
  warningText: { fontSize: 12, flex: 1, lineHeight: 17, fontFamily: 'PlusJakartaSans_500Medium' },
  validationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  validationHintText: { fontSize: 12, flex: 1, lineHeight: 17, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
