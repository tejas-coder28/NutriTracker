import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getRateOptionsPreview } from '../services/macroCalculator';
import { MilestoneBadgesGrid } from '../components/StreakBadge';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';
import GlassCard from '../components/primitives/GlassCard';
import LiquidButton from '../components/primitives/LiquidButton';
import NeuSwitch from '../components/primitives/NeuSwitch';
import NeuInset from '../components/primitives/NeuInset';
import NeuSegmented from '../components/primitives/NeuSegmented';
import Icon from '../components/ui/Icon';

export default function ProfileScreen() {
  const { user, updateUserProfile, logout } = useAuth();
  const { theme, isDark, setTheme, toggleTheme, tokens } = useTheme();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(String(user?.age || '25'));
  const [gender, setGender] = useState(user?.gender || 'male');
  const [height, setHeight] = useState(String(user?.height || '175'));
  const [weight, setWeight] = useState(String(user?.weight || '75'));
  const [targetWeight, setTargetWeight] = useState(String(user?.target_weight || '70'));
  const [activityLevel, setActivityLevel] = useState(user?.activity_level || 'moderate');
  const [fatLossRate, setFatLossRate] = useState(String(user?.fat_loss_rate || '0.5'));
  const [waterGoal, setWaterGoal] = useState(String(user?.water_goal || '8'));

  const [ratePreviews, setRatePreviews] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // PopUp Modal state
  const [modalConfig, setModalConfig] = useState({ visible: false, title: '', message: '', icon: 'checkmark-circle', type: 'success' });

  const currW = parseFloat(weight) || 75;
  const targW = parseFloat(targetWeight) || 70;
  const diff = targW - currW;
  const autoGoalType = diff > 0.5 ? 'muscle_gain' : diff < -0.5 ? 'fat_loss' : 'maintenance';

  useEffect(() => { refreshRatePreviews(); }, [height, weight, targetWeight, age, gender, activityLevel]);

  const refreshRatePreviews = () => {
    setPreviewLoading(true);
    try {
      const opts = getRateOptionsPreview({
        height: parseFloat(height) || 175,
        weight: currW,
        target_weight: targW,
        age: parseInt(age) || 25,
        gender,
        activity_level: activityLevel,
        goal_type: autoGoalType,
      });
      setRatePreviews(opts);
    } catch (e) { console.error('Rate preview error:', e); }
    finally { setPreviewLoading(false); }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const res = await updateUserProfile({
        name, age: parseInt(age) || 25, gender,
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
        title: 'Profile & Goals Updated!',
        message: `Done! Your profile and target values have been updated (${newCal} kcal/day target).`,
        icon: 'sparkles',
        type: 'success'
      });
    } catch (err) {
      setModalConfig({
        visible: true,
        title: 'Save Failed',
        message: err.message || 'Unable to update profile settings.',
        icon: 'alert-circle',
        type: 'danger'
      });
    } finally { setLoading(false); }
  };

  const initials = (name || user?.name || 'A')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
          {/* Avatar + Name Header Card with NeuSwitch */}
          <GlassCard style={styles.profileHeaderCard}>
            <View style={styles.profileHeaderRow}>
              {/* Avatar Circle */}
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: isDark ? 'rgba(16, 232, 160, 0.20)' : 'rgba(0, 179, 119, 0.15)',
                    borderColor: tokens.primary,
                  },
                ]}
              >
                <Text style={[styles.avatarText, { color: tokens.primary }]}>{initials}</Text>
              </View>

              {/* User Info */}
              <View style={styles.headerInfo}>
                <Text style={[styles.profileName, { color: tokens.text.primary }]}>
                  {user?.name || 'Athlete'}
                </Text>
                <Text style={[styles.profileEmail, { color: tokens.text.secondary }]}>
                  {user?.email || 'user@nutritrack.ai'}
                </Text>
              </View>

              {/* Compact Tactile Sun/Moon NeuSwitch */}
              <View style={styles.switchWrapper}>
                <NeuSwitch value={isDark} onToggle={toggleTheme} />
              </View>
            </View>
          </GlassCard>

          {/* Current Targets — 4 Glass Tiles with Macro-Colored Icons */}
          <GlassCard style={styles.targetsCard}>
            <View style={styles.cardHeader}>
              <Icon name="sparkles" size={17} color={tokens.primary} />
              <Text style={[styles.cardHeaderTitle, { color: tokens.text.primary }]}>Current Targets</Text>
            </View>
            <View style={styles.targetsGrid}>
              {[
                { val: `${user?.target_calories || 2000}`, label: 'Calories', icon: 'flame', color: tokens.macros.calories },
                { val: `${user?.target_protein || 150}g`, label: 'Protein', icon: 'barbell', color: tokens.macros.protein },
                { val: `${user?.target_carbs || 200}g`, label: 'Carbs', icon: 'nutrition', color: tokens.macros.carbs },
                { val: `${user?.target_fat || 60}g`, label: 'Fats', icon: 'leaf', color: tokens.macros.fat },
              ].map(t => (
                <GlassCard key={t.label} subtle style={styles.targetTile}>
                  <Icon name={t.icon} size={16} color={t.color} />
                  <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.targetVal, { color: t.color }]}>{t.val}</Text>
                  <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.targetSub, { color: tokens.text.secondary }]}>{t.label}</Text>
                </GlassCard>
              ))}
            </View>
          </GlassCard>

          {/* Milestone Badges Section (3-column square grid) */}
          <MilestoneBadgesGrid
            currentStreak={user?.streak_current || 0}
            longestStreak={user?.streak_longest || 0}
          />

          {/* Account Info & Physical Attributes */}
          <GlassCard style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: tokens.text.primary }]}>
              Physical Attributes
            </Text>

            {/* Email Address Read-Only Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Email Address</Text>
                <Text style={[styles.readOnlyBadge, { color: tokens.primary }]}>Verified Account</Text>
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
              <Text style={[styles.label, { color: tokens.text.secondary }]}>Full Name</Text>
              <TextInput
                style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                value={name}
                onChangeText={setName}
                placeholderTextColor={tokens.input.placeholder}
              />
            </View>

            <View style={styles.rowTwo}>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Age</Text>
                <TextInput
                  style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  placeholderTextColor={tokens.input.placeholder}
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Sex</Text>
                <View style={styles.pickerRow}>
                  {['male', 'female'].map(g => (
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
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Height (cm)</Text>
                <TextInput
                  style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                  placeholderTextColor={tokens.input.placeholder}
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Current Weight (kg)</Text>
                <TextInput
                  style={[styles.inputFieldSolo, { backgroundColor: tokens.input.bg, borderColor: tokens.input.border, color: tokens.text.primary }]}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  placeholderTextColor={tokens.input.placeholder}
                />
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={styles.halfCol}>
                <Text style={[styles.label, { color: tokens.text.secondary }]}>Target Weight (kg)</Text>
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
              <Text style={[styles.label, { color: tokens.text.secondary }]}>Activity Level</Text>
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
              Live preview — select a pace to apply.
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

            <LiquidButton
              onPress={handleSaveProfile}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Recalculating...' : 'Save & Recalculate Targets'}
            </LiquidButton>
          </GlassCard>

          {/* Logout Button */}
          <LiquidButton
            variant="danger"
            onPress={logout}
            icon="log-out-outline"
            style={{ marginBottom: 20 }}
          >
            Log Out
          </LiquidButton>
        </View>
      </ScrollView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 520,
    gap: 14,
  },
  profileHeaderCard: {
    padding: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
  },
  headerInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  switchWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetsCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  targetsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  targetTile: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  targetVal: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  targetSub: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  sectionCard: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.15,
  },
  sectionSub: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  headerBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  readOnlyBadge: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  inputFieldSolo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 11,
  },
  halfCol: {
    flex: 1,
    gap: 5,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    fontSize: 13,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activityChip: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  activityText: {
    fontSize: 12,
  },
  rateOptionCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  rateCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratePaceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  rateMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 10,
    padding: 8,
  },
  rateMetric: {
    alignItems: 'center',
  },
  rateMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rateMetricLbl: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  warningFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});
