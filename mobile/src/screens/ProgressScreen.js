import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/ui/Icon';
import { getAllWeightLogs, insertWeightLog, deleteWeightLog, getWorkoutLogsForWeek } from '../services/database';
import { calculateUserMacros } from '../services/macroCalculator';
import WeightChart from '../components/WeightChart';
import WorkoutChart from '../components/WorkoutChart';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';
import GlassCard from '../components/primitives/GlassCard';
import LiquidButton from '../components/primitives/LiquidButton';
import LiquidPill from '../components/primitives/LiquidPill';
import NeuSegmented from '../components/primitives/NeuSegmented';
import NeuInset from '../components/primitives/NeuInset';
import { getLocalDateStr, addDaysToDateStr } from '../utils/dateUtils';

export default function ProgressScreen() {
  const { user } = useAuth();
  const { tokens, isDark } = useTheme();
  const [weightData, setWeightData] = useState(null);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState([]);
  const [workoutMetric, setWorkoutMetric] = useState('calories'); // 'calories' | 'minutes'
  const [loading, setLoading] = useState(true);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [weightNote, setWeightNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // PopUp Modal state
  const [popUpConfig, setPopUpConfig] = useState({ visible: false, title: '', message: '', icon: 'checkmark-circle', type: 'success' });

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const logs = await getAllWeightLogs();
      setWeightData(logs);

      // Fetch last 7 days workout logs
      const endStr = getLocalDateStr();
      const startStr = addDaysToDateStr(endStr, -6);

      const wLogs = await getWorkoutLogsForWeek(startStr, endStr);
      setWeeklyWorkouts(wLogs || []);
    } catch (err) {
      console.error('Fetch progress data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async () => {
    if (!newWeight || isNaN(parseFloat(newWeight))) {
      setPopUpConfig({
        visible: true,
        title: 'Invalid Input',
        message: 'Please enter a valid numeric weight in kg (e.g. 74.5).',
        icon: 'alert-circle',
        type: 'warning'
      });
      return;
    }
    try {
      setSubmitting(true);
      await insertWeightLog(parseFloat(newWeight), weightNote);
      setNewWeight(''); setWeightNote('');
      setLogModalVisible(false);
      fetchLogs();
      setPopUpConfig({
        visible: true,
        title: 'Weight Logged!',
        message: `Done! ${parseFloat(newWeight)} kg logged. Your trajectory progress chart has been updated.`,
        icon: 'scale-outline',
        type: 'success'
      });
    } catch (err) {
      setPopUpConfig({
        visible: true,
        title: 'Error',
        message: err.message,
        icon: 'alert-circle',
        type: 'danger'
      });
    } finally { setSubmitting(false); }
  };

  const handleDeleteWeight = async (id) => {
    try {
      await deleteWeightLog(id);
      fetchLogs();
      setPopUpConfig({
        visible: true,
        title: 'Entry Deleted',
        message: 'Done! Weight log entry removed.',
        icon: 'trash-outline',
        type: 'warning'
      });
    } catch (err) {
      setPopUpConfig({
        visible: true,
        title: 'Error',
        message: err.message,
        icon: 'alert-circle',
        type: 'danger'
      });
    }
  };

  const logs = weightData || [];
  const currentWeight = logs.length > 0 ? logs[logs.length - 1].weight : (user?.weight || 75);
  const startWeight = logs.length > 0 ? logs[0].weight : (user?.weight || 75);
  const netChange = Math.round((currentWeight - startWeight) * 10) / 10;
  const targetWeight = user?.target_weight || 70;

  // Calculate visual progress from start to target without changing computed values
  const totalJourney = Math.abs(targetWeight - startWeight) || 1;
  const coveredJourney = Math.abs(currentWeight - startWeight);
  const progressRatio = Math.min(100, Math.max(0, Math.round((coveredJourney / totalJourney) * 100)));

  const macros = user ? calculateUserMacros({ ...user, weight: currentWeight }) : null;
  const timeline = macros?.timeline || {};
  const safety = macros?.safety || {};
  const projectedTrend = timeline.projected_trend || [];
  const estimatedDate = timeline.estimated_target_date || 'N/A';
  const weeksRemaining = timeline.weeks_to_target || 0;

  const totalWeeklyBurn = weeklyWorkouts.reduce((acc, w) => acc + (Number(w.calories_burned) || 0), 0);
  const totalWeeklyMin = weeklyWorkouts.reduce((acc, w) => acc + (Number(w.duration_min) || 0), 0);

  return (
    <AmbientBackground style={styles.container}>
      <PopUpModal
        visible={popUpConfig.visible}
        title={popUpConfig.title}
        message={popUpConfig.message}
        icon={popUpConfig.icon}
        type={popUpConfig.type}
        onClose={() => setPopUpConfig({ ...popUpConfig, visible: false })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrap}>
          {/* Top Weight Metric Cards */}
          <View style={styles.metricsRow}>
            <GlassCard style={styles.metricCard}>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.metricLabel, { color: tokens.text.secondary }]}>Current Weight</Text>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.metricValue, { color: tokens.text.primary }]}>
                {currentWeight} <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.unitText, { color: tokens.text.secondary }]}>kg</Text>
              </Text>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.metricSub, { color: tokens.text.secondary }]}>
                Start: {startWeight} kg
              </Text>
            </GlassCard>

            <GlassCard style={styles.metricCard}>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.metricLabel, { color: tokens.text.secondary }]}>Target Goal</Text>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.metricValue, { color: tokens.primary }]}>
                {targetWeight} <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.unitText, { color: tokens.text.secondary }]}>kg</Text>
              </Text>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.metricSub, { color: tokens.text.secondary }]}>
                Net: {netChange > 0 ? `+${netChange}` : netChange} kg
              </Text>
            </GlassCard>
          </View>

          {/* Visual Goal Journey Progress Track */}
          <GlassCard subtle style={styles.journeyCard}>
            <View style={styles.journeyHeader}>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.journeyLabel, { color: tokens.text.secondary }]}>
                Weight Journey ({startWeight}kg → {targetWeight}kg)
              </Text>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.journeyPct, { color: tokens.primary }]}>
                {progressRatio}% to goal
              </Text>
            </View>
            <NeuInset radius={5} style={styles.journeyTrack}>
              <View style={[styles.journeyFill, { width: `${progressRatio}%`, backgroundColor: tokens.primary }]} />
            </NeuInset>
          </GlassCard>

          {/* Goal Projection Banner */}
          <GlassCard style={styles.timelineBanner}>
            <View style={[styles.timelineIconCircle, { backgroundColor: isDark ? 'rgba(255, 184, 0, 0.20)' : 'rgba(224, 154, 0, 0.14)' }]}>
              <Icon name="flag-outline" size={20} color={tokens.macros.carbs} />
            </View>
            <View style={styles.timelineInfo}>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.timelineTitle, { color: tokens.text.secondary }]}>
                Goal Completion Projection
              </Text>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.timelineDateText, { color: tokens.text.primary }]}>
                Target Date: <Text style={{ color: tokens.macros.carbs }}>{estimatedDate}</Text>
              </Text>
              <View style={{ marginTop: 4 }}>
                <LiquidPill color={tokens.macros.carbs}>
                  ~{weeksRemaining} weeks remaining
                </LiquidPill>
              </View>
            </View>
          </GlassCard>

          {safety.is_clamped && (
            <GlassCard subtle style={styles.safetyCard}>
              <Icon name="shield-checkmark-outline" size={19} color={tokens.macros.protein} />
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.safetyText, { color: tokens.macros.protein }]}>{safety.warning}</Text>
            </GlassCard>
          )}

          {/* Weekly Workout Trend Chart Card */}
          <GlassCard style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.chartTitle, { color: tokens.text.primary }]}>Weekly Workout Trend</Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.chartSub, { color: tokens.text.secondary }]}>
                  7-day totals: {Math.round(totalWeeklyBurn)} kcal • {totalWeeklyMin} mins
                </Text>
              </View>
              <NeuSegmented
                options={[
                  { value: 'calories', label: 'kcal' },
                  { value: 'minutes', label: 'mins' },
                ]}
                value={workoutMetric}
                onChange={setWorkoutMetric}
                style={{ width: 130 }}
              />
            </View>
            {loading ? (
              <ActivityIndicator size="large" color={tokens.primary} style={{ marginVertical: 38 }} />
            ) : (
              <WorkoutChart weeklyLogs={weeklyWorkouts} metric={workoutMetric} />
            )}
          </GlassCard>

          {/* Weight Trajectory Chart Card */}
          <GlassCard style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.chartTitle, { color: tokens.text.primary }]}>Weight Trajectory & Projection</Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.chartSub, { color: tokens.text.secondary }]}>Actual vs projected timeline</Text>
              </View>
              <LiquidButton
                size="sm"
                onPress={() => setLogModalVisible(true)}
                icon="add"
              >
                Log Weight
              </LiquidButton>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color={tokens.primary} style={{ marginVertical: 38 }} />
            ) : (
              <WeightChart logs={logs} targetWeight={targetWeight} projectedTrend={projectedTrend} />
            )}
          </GlassCard>

          {/* Weight History Section */}
          <View style={styles.historySection}>
            <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.sectionTitle, { color: tokens.text.primary }]}>Weight History</Text>
            {logs.length > 0 ? (
              [...logs].reverse().map(log => (
                <GlassCard subtle key={log.id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Icon name="scale-outline" size={19} color={tokens.macros.protein} />
                    <View>
                      <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.historyWeight, { color: tokens.text.primary }]}>{log.weight} kg</Text>
                      <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.historyDate, { color: tokens.text.secondary }]}>
                        {log.logged_at}{log.notes ? ` • ${log.notes}` : ''}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteWeight(log.id)}
                    style={[styles.deleteBtn, { backgroundColor: tokens.neumorphic.inset }]}
                  >
                    <Icon name="trash-outline" size={16} color={tokens.semantics.danger} />
                  </TouchableOpacity>
                </GlassCard>
              ))
            ) : (
              <GlassCard subtle style={styles.emptyCard}>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.emptyText, { color: tokens.text.secondary }]}>No weight entries yet.</Text>
              </GlassCard>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Log Weight Modal */}
      <Modal visible={logModalVisible} animationType="fade" transparent onRequestClose={() => setLogModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)' }]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: tokens.liquidGlass.fill,
                borderColor: tokens.liquidGlass.rim,
                ...(Platform.OS === 'web' ? {
                  backdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
                  WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
                } : {}),
              },
            ]}
          >
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.modalTitle, { color: tokens.text.primary }]}>Log Weight</Text>
              <TouchableOpacity
                onPress={() => setLogModalVisible(false)}
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

            <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: tokens.text.primary }]}>Weight (kg)</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: tokens.input.bg,
                  borderColor: tokens.input.border,
                  color: tokens.text.primary,
                },
              ]}
              placeholder="e.g. 74.5"
              placeholderTextColor={tokens.input.placeholder}
              keyboardType="numeric"
              value={newWeight}
              onChangeText={setNewWeight}
            />

            <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.fieldLabel, { color: tokens.text.primary }]}>Notes (optional)</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: tokens.input.bg,
                  borderColor: tokens.input.border,
                  color: tokens.text.primary,
                },
              ]}
              placeholder="Morning weigh-in"
              placeholderTextColor={tokens.input.placeholder}
              value={weightNote}
              onChangeText={setWeightNote}
            />

            <LiquidButton
              onPress={handleAddWeight}
              disabled={submitting}
              style={{ marginTop: 10 }}
            >
              {submitting ? 'Saving...' : 'Save Weight'}
            </LiquidButton>
          </View>
        </View>
      </Modal>
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
  },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: {
    flex: 1,
    padding: 15,
  },
  metricLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  metricValue: { fontSize: 24, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', marginTop: 4, fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  unitText: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  metricSub: { fontSize: 12, fontWeight: '500', fontFamily: 'SpaceGrotesk_500Medium', marginTop: 4, fontVariant: ['tabular-nums'] },
  journeyCard: {
    padding: 14,
    marginBottom: 14,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  journeyLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  journeyPct: { fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  journeyTrack: { height: 8, borderRadius: 4 },
  journeyFill: { height: '100%', borderRadius: 4 },
  timelineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 14,
    gap: 13,
  },
  timelineIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineInfo: { flex: 1 },
  timelineTitle: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  timelineDateText: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 14,
    gap: 9,
  },
  safetyText: { fontSize: 12, flex: 1, lineHeight: 17, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium' },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.15 },
  chartSub: { fontSize: 12, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 },
  historySection: { gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.15, marginBottom: 6 },
  historyRow: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  historyWeight: { fontSize: 15, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  historyDate: { fontSize: 12, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 },
  deleteBtn: {
    padding: 7,
    borderRadius: 8,
  },
  emptyCard: { padding: 18, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.4)',
    alignSelf: 'center',
    marginBottom: 6,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.15 },
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
  fieldLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', marginTop: 4 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
});
