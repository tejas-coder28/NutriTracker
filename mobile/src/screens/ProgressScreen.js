import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAllWeightLogs, insertWeightLog, deleteWeightLog, getWorkoutLogsForWeek } from '../services/database';
import { calculateUserMacros } from '../services/macroCalculator';
import WeightChart from '../components/WeightChart';
import WorkoutChart from '../components/WorkoutChart';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';
import { getLocalDateStr, addDaysToDateStr } from '../utils/dateUtils';

export default function ProgressScreen() {
  const { user } = useAuth();
  const { isDark, themeColors, glassStyles } = useTheme();
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
      {/* PopUp Modal */}
      <PopUpModal
        visible={popUpConfig.visible}
        title={popUpConfig.title}
        message={popUpConfig.message}
        icon={popUpConfig.icon}
        type={popUpConfig.type}
        onClose={() => setPopUpConfig({ ...popUpConfig, visible: false })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.metricsRow}>
          <View style={[glassStyles.card, styles.metricCard]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Current Weight</Text>
            <Text style={[styles.metricValue, { color: themeColors.textPrimary }]}>{currentWeight} <Text style={[styles.unitText, { color: themeColors.textSecondary }]}>kg</Text></Text>
            <Text style={[styles.metricSub, { color: themeColors.textMuted }]}>Start: {startWeight}kg</Text>
          </View>
          <View style={[glassStyles.card, styles.metricCard]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Target Goal</Text>
            <Text style={[styles.metricValue, { color: themeColors.primary }]}>{targetWeight} <Text style={[styles.unitText, { color: themeColors.textSecondary }]}>kg</Text></Text>
            <Text style={[styles.metricSub, { color: themeColors.textMuted }]}>Net: {netChange > 0 ? `+${netChange}` : netChange}kg</Text>
          </View>
        </View>

        <View style={styles.timelineBanner}>
          <View style={styles.timelineIconCircle}><Ionicons name="flag-outline" size={21} color="#FBBF24" /></View>
          <View style={styles.timelineInfo}>
            <Text style={[styles.timelineTitle, { color: themeColors.textSecondary }]}>Goal Completion Projection</Text>
            <Text style={[styles.timelineDateText, { color: themeColors.textPrimary }]}>Estimated Date: <Text style={styles.highlightDate}>{estimatedDate}</Text></Text>
            <Text style={[styles.timelineSubText, { color: themeColors.textSecondary }]}>~{weeksRemaining} weeks remaining</Text>
          </View>
        </View>

        {safety.is_clamped && (
          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={19} color="#60A5FA" />
            <Text style={[styles.safetyText, { color: isDark ? '#93C5FD' : '#2563EB' }]}>{safety.warning}</Text>
          </View>
        )}

        {/* Weekly Workout Trend Chart Card */}
        <View style={[glassStyles.card, styles.chartCard]}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: themeColors.textPrimary }]}>Weekly Workout Trend</Text>
              <Text style={[styles.chartSub, { color: themeColors.textSecondary }]}>
                7-day totals: {Math.round(totalWeeklyBurn)} kcal • {totalWeeklyMin} mins
              </Text>
            </View>
            <View style={[styles.metricToggleRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: themeColors.cardBorderSubtle }]}>
              <TouchableOpacity
                style={[styles.toggleChip, workoutMetric === 'calories' && styles.activeToggleChip]}
                onPress={() => setWorkoutMetric('calories')}
              >
                <Text style={[styles.toggleChipText, { color: workoutMetric === 'calories' ? '#FFFFFF' : themeColors.textSecondary }]}>kcal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChip, workoutMetric === 'minutes' && styles.activeToggleChip]}
                onPress={() => setWorkoutMetric('minutes')}
              >
                <Text style={[styles.toggleChipText, { color: workoutMetric === 'minutes' ? '#FFFFFF' : themeColors.textSecondary }]}>mins</Text>
              </TouchableOpacity>
            </View>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#60A5FA" style={{ marginVertical: 38 }} />
          ) : (
            <WorkoutChart weeklyLogs={weeklyWorkouts} metric={workoutMetric} />
          )}
        </View>

        {/* Weight Trajectory Chart Card */}
        <View style={[glassStyles.card, styles.chartCard]}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: themeColors.textPrimary }]}>Weight Trajectory & Projection</Text>
              <Text style={[styles.chartSub, { color: themeColors.textSecondary }]}>Actual vs projected goal timeline</Text>
            </View>
            <TouchableOpacity style={styles.logBtn} onPress={() => setLogModalVisible(true)}>
              <Ionicons name="add" size={15} color="#FFFFFF" />
              <Text style={styles.logBtnText}>Log Weight</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#818CF8" style={{ marginVertical: 38 }} />
          ) : (
            <WeightChart logs={logs} targetWeight={targetWeight} projectedTrend={projectedTrend} />
          )}
        </View>

        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Weight History</Text>
          {logs.length > 0 ? (
            [...logs].reverse().map(log => (
              <View key={log.id} style={[glassStyles.cardSubtle, styles.historyRow]}>
                <View style={styles.historyLeft}>
                  <Ionicons name="scale-outline" size={19} color={themeColors.protein} />
                  <View>
                    <Text style={[styles.historyWeight, { color: themeColors.textPrimary }]}>{log.weight} kg</Text>
                    <Text style={[styles.historyDate, { color: themeColors.textSecondary }]}>{log.logged_at}{log.notes ? ` • ${log.notes}` : ''}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDeleteWeight(log.id)}>
                  <Ionicons name="trash-outline" size={17} color="#F87171" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={[glassStyles.cardSubtle, styles.emptyCard]}><Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No weight entries yet.</Text></View>
          )}
        </View>
      </ScrollView>

      <Modal visible={logModalVisible} animationType="fade" transparent onRequestClose={() => setLogModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)' }]}>
          <View style={[glassStyles.modalContent, styles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Log Weight</Text>
              <TouchableOpacity onPress={() => setLogModalVisible(false)}><Ionicons name="close" size={23} color={themeColors.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: themeColors.textPrimary }]}>Weight (kg)</Text>
            <TextInput style={[glassStyles.input, { color: themeColors.textPrimary }]} placeholder="e.g. 74.5" placeholderTextColor={themeColors.placeholder} keyboardType="numeric" value={newWeight} onChangeText={setNewWeight} />
            <Text style={[styles.fieldLabel, { color: themeColors.textPrimary }]}>Notes (optional)</Text>
            <TextInput style={[glassStyles.input, { color: themeColors.textPrimary }]} placeholder="Morning weigh-in" placeholderTextColor={themeColors.placeholder} value={weightNote} onChangeText={setWeightNote} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddWeight} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Weight</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    padding: 15,
  },
  metricLabel: { fontSize: 12, fontWeight: '600' },
  metricValue: { fontSize: 21, fontWeight: '800', marginTop: 4 },
  unitText: { fontSize: 11, fontWeight: '500' },
  metricSub: { fontSize: 11, marginTop: 3 },
  timelineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 13,
    gap: 13,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } : {}),
  },
  timelineIconCircle: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.25)', justifyContent: 'center', alignItems: 'center' },
  timelineInfo: { flex: 1 },
  timelineTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  timelineDateText: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  highlightDate: { color: '#FBBF24' },
  timelineSubText: { fontSize: 11, marginTop: 2 },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: 16,
    padding: 11,
    marginBottom: 14,
    gap: 9,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } : {}),
  },
  safetyText: { fontSize: 11, flex: 1, lineHeight: 15 },
  chartCard: {
    borderRadius: 22,
    padding: 17,
    marginBottom: 18,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  chartTitle: { fontSize: 15, fontWeight: '700' },
  chartSub: { fontSize: 11 },
  metricToggleRow: { flexDirection: 'row', borderRadius: 10, padding: 2, borderWidth: 1 },
  toggleChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  activeToggleChip: { backgroundColor: '#3B82F6' },
  toggleChipText: { fontSize: 11, fontWeight: '600' },
  activeToggleText: { color: '#FFFFFF', fontWeight: '700' },
  logBtn: { backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, gap: 3 },
  logBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  historySection: { gap: 9 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  historyRow: {
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  historyWeight: { fontSize: 14, fontWeight: '700' },
  historyDate: { fontSize: 11 },
  emptyCard: { padding: 18, borderRadius: 16, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    gap: 11,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  saveBtn: { backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 7 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
