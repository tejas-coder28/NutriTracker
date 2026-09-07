import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getRateOptionsPreview } from '../services/macroCalculator';
import { MilestoneBadgesGrid } from '../components/StreakBadge';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';

export default function ProfileScreen() {
  const { user, updateUserProfile, logout } = useAuth();
  const { theme, isDark, setTheme, themeColors, glassStyles } = useTheme();
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



  return (
    <AmbientBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* PopUp Modal */}
        <PopUpModal
          visible={modalConfig.visible}
          title={modalConfig.title}
          message={modalConfig.message}
          icon={modalConfig.icon}
          type={modalConfig.type}
          onClose={() => setModalConfig({ ...modalConfig, visible: false })}
        />

        {/* Preferences & Theme Section */}
        <View style={[glassStyles.card, styles.sectionCard]}>
          <View style={styles.headerBetween}>
            <View style={styles.iconTitleRow}>
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={20} color={isDark ? "#818CF8" : "#F59E0B"} />
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>App Preferences</Text>
            </View>
            <Text style={[styles.themeStatusBadge, { color: isDark ? '#818CF8' : '#F59E0B' }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Appearance Theme</Text>
            <View style={styles.pickerRow}>
              <TouchableOpacity
                style={[
                  glassStyles.cardSubtle,
                  styles.miniBtn,
                  isDark && { backgroundColor: 'rgba(129, 140, 248, 0.25)', borderColor: '#818CF8' }
                ]}
                onPress={() => setTheme('dark')}
                activeOpacity={0.75}
              >
                <Ionicons name="moon" size={15} color={isDark ? "#818CF8" : themeColors.textMuted} />
                <Text style={isDark ? [styles.activeMiniText, { color: '#818CF8' }] : [styles.miniText, { color: themeColors.textMuted }]}>
                  Dark Theme
                </Text>
                {isDark && <Ionicons name="checkmark-circle" size={13} color="#818CF8" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  glassStyles.cardSubtle,
                  styles.miniBtn,
                  !isDark && { backgroundColor: 'rgba(245, 158, 11, 0.25)', borderColor: '#F59E0B' }
                ]}
                onPress={() => setTheme('light')}
                activeOpacity={0.75}
              >
                <Ionicons name="sunny" size={15} color={!isDark ? "#F59E0B" : themeColors.textMuted} />
                <Text style={!isDark ? [styles.activeMiniText, { color: '#D97706' }] : [styles.miniText, { color: themeColors.textMuted }]}>
                  Light Theme
                </Text>
                {!isDark && <Ionicons name="checkmark-circle" size={13} color="#F59E0B" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Macro Overview */}
        <View style={[glassStyles.card, styles.macroCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={19} color={themeColors.primary} />
            <Text style={[styles.cardHeaderTitle, { color: themeColors.textPrimary }]}>Current Targets</Text>
          </View>
          <View style={styles.targetsGrid}>
            {[
              [user?.target_calories || 2000, 'Calories', themeColors.primary],
              [`${user?.target_protein || 150}g`, 'Protein', themeColors.protein],
              [`${user?.target_carbs || 200}g`, 'Carbs', themeColors.carbs],
              [`${user?.target_fat || 60}g`, 'Fats', themeColors.fat],
            ].map(([val, label, color]) => (
              <View key={label} style={[glassStyles.cardSubtle, styles.targetPill]}>
                <Text style={[styles.targetVal, { color }]}>{val}</Text>
                <Text style={[styles.targetSub, { color: themeColors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Milestone Badges Section */}
        <MilestoneBadgesGrid
          currentStreak={user?.streak_current || 0}
          longestStreak={user?.streak_longest || 0}
        />

        {/* Account Info & Physical Attributes */}
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
                value={user?.email || 'user@nutritrack.ai'}
                editable={false}
                selectTextOnFocus={false}
              />
              <Ionicons name="lock-closed" size={14} color={themeColors.textMuted} />
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[glassStyles.input, { color: themeColors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholderTextColor={themeColors.placeholder}
            />
          </View>

          <View style={styles.rowTwo}>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Age</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }]}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Sex</Text>
              <View style={styles.pickerRow}>
                {['male','female'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      glassStyles.cardSubtle,
                      styles.miniBtn,
                      gender === g && styles.activeMiniBtn
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.miniText, { color: gender === g ? (isDark ? '#34D399' : '#059669') : themeColors.textSecondary }, gender === g && { fontWeight: '700' }]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.rowTwo}>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Height (cm)</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }]}
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Current Weight (kg)</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }]}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
          </View>

          <View style={styles.rowTwo}>
            <View style={styles.halfCol}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Target Weight (kg)</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }]}
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

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Activity Level</Text>
            <View style={styles.activityGrid}>
              {[['sedentary','Sedentary (1.2)'],['light','Light (1.375)'],['moderate','Moderate (1.55)'],['active','Active (1.725)'],['very_active','Very Active (1.9)']].map(([id,title]) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    glassStyles.cardSubtle,
                    styles.activityChip,
                    activityLevel === id && styles.activeActivityChip
                  ]}
                  onPress={() => setActivityLevel(id)}
                >
                  <Text style={[styles.activityText, { color: activityLevel === id ? (isDark ? '#34D399' : '#059669') : themeColors.textSecondary }, activityLevel === id && { fontWeight: '700' }]}>
                    {title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Dynamic Goal Pace Section (Weight Gain / Fat Loss / Maintenance) */}
        <View style={[glassStyles.card, styles.sectionCard]}>
          <View style={styles.headerBetween}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              {autoGoalType === 'muscle_gain'
                ? 'Weight Gain Pace'
                : autoGoalType === 'maintenance'
                ? 'Maintenance Goal'
                : 'Fat Loss Pace'}
            </Text>
            {previewLoading && <ActivityIndicator size="small" color="#10B981" />}
          </View>
          <Text style={[styles.sectionSub, { color: themeColors.textSecondary }]}>
            Live preview — select a pace to apply.
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
                      {autoGoalType === 'maintenance' ? 'Maintenance' : `${opt.rate} kg/week`}
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
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save & Recalculate Targets</Text>}
          </TouchableOpacity>
        </View>



        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#F87171" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100, gap: 14 },
  macroCard: {
    borderRadius: 22,
    padding: 17,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 13 },
  cardHeaderTitle: { fontSize: 14, fontWeight: '700' },
  targetsGrid: { flexDirection: 'row', gap: 8 },
  targetPill: {
    flex: 1,
    borderRadius: 14,
    padding: 9,
    alignItems: 'center',
  },
  targetVal: { fontSize: 15, fontWeight: '800' },
  targetSub: { fontSize: 10, marginTop: 2 },
  sectionCard: {
    borderRadius: 22,
    padding: 17,
    gap: 11,
  },
  iconTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionSub: { fontSize: 11, marginBottom: 2 },
  headerBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  themeStatusBadge: { fontSize: 11, fontWeight: '700' },
  fieldGroup: { gap: 5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600' },
  readOnlyBadge: { fontSize: 10, color: '#34D399', fontWeight: '600' },
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    opacity: 0.88,
  },
  emailInputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  rowTwo: { flexDirection: 'row', gap: 11 },
  halfCol: { flex: 1, gap: 5 },
  pickerRow: { flexDirection: 'row', gap: 6 },
  miniBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMiniText: { fontSize: 12, fontWeight: '700' },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activityChip: {
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  activeActivityChip: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' },
  activityText: { fontSize: 11 },
  activeActivityText: { fontWeight: '700' },
  rateOptionCard: {
    borderRadius: 16,
    padding: 13,
    gap: 8,
  },
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
  saveBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } : {}),
  },
  logoutText: { color: '#F87171', fontSize: 14, fontWeight: '700' },
});
