import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  getFoodLogsForDate, deleteFoodLog,
  getWorkoutLogsForDate, deleteWorkoutLog
} from '../services/database';
import { checkAndUpdateStreak } from '../services/workoutService';
import { exportLogsAsExcel } from '../services/exportService';
import MacroProgressRing from '../components/MacroProgressRing';
import FoodLogItem from '../components/FoodLogItem';
import WorkoutItem from '../components/WorkoutItem';
import AddFoodModal from '../components/AddFoodModal';
import EditFoodModal from '../components/EditFoodModal';
import LogWorkoutModal from '../components/LogWorkoutModal';
import EditWorkoutModal from '../components/EditWorkoutModal';
import WaterWidget from '../components/WaterWidget';
import SmartSuggestionCard from '../components/SmartSuggestionCard';
import WeeklySummaryModal from '../components/WeeklySummaryModal';
import { DashboardStreakBadge } from '../components/StreakBadge';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';

import { getLocalDateStr } from '../utils/dateUtils';

export default function HomeScreen() {
  const { user, updateUserProfile } = useAuth();
  const { isDark, themeColors, glassStyles } = useTheme();
  const [logsData, setLogsData] = useState(null);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(true);

  // Edit food & workout state
  const [editingFoodItem, setEditingFoodItem] = useState(null);
  const [editFoodModalVisible, setEditFoodModalVisible] = useState(false);
  const [editingWorkoutItem, setEditingWorkoutItem] = useState(null);
  const [editWorkoutModalVisible, setEditWorkoutModalVisible] = useState(false);

  // PopUp Modal state
  const [popUpConfig, setPopUpConfig] = useState({ visible: false, title: '', message: '', icon: 'checkmark-circle', type: 'success' });

  const today = getLocalDateStr();


  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const foodData = await getFoodLogsForDate(today);
      const workouts = await getWorkoutLogsForDate(today);

      setLogsData(foodData);
      setWorkoutLogs(workouts || []);

      // Check and update streak
      await checkAndUpdateStreak(user, foodData?.logs?.length || 0, workouts?.length || 0);
    } catch (err) {
      console.error('HomeScreen fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Food handlers
  const handleEditFood = (item) => {
    setEditingFoodItem(item);
    setEditFoodModalVisible(true);
  };

  const handleFoodUpdated = (updatedEntry) => {
    fetchDashboard();
    setPopUpConfig({
      visible: true,
      title: 'Meal Updated!',
      message: `Done! ${updatedEntry?.name || 'Meal'} (${Math.round(updatedEntry?.calories || 0)} kcal) updated.`,
      icon: 'pencil-outline',
      type: 'success'
    });
  };

  const handleDeleteFood = async (id) => {
    try {
      await deleteFoodLog(id);
      fetchDashboard();
      setPopUpConfig({
        visible: true,
        title: 'Entry Deleted',
        message: 'Done! The food entry has been removed from today\'s log.',
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

  const handleFoodAdded = (logEntry) => {
    setLogsData(prev => {
      const existingLogs = prev?.logs || [];
      if (existingLogs.some(l => l.id === logEntry.id)) return prev;

      const updatedLogs = [logEntry, ...existingLogs];
      const prevTotals = prev?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      const updatedTotals = {
        calories: Math.round(prevTotals.calories + (Number(logEntry.calories) || 0)),
        protein: Math.round(prevTotals.protein + (Number(logEntry.protein) || 0)),
        carbs: Math.round(prevTotals.carbs + (Number(logEntry.carbs) || 0)),
        fat: Math.round(prevTotals.fat + (Number(logEntry.fat) || 0)),
        fiber: Math.round(prevTotals.fiber + (Number(logEntry.fiber) || 0)),
      };

      return {
        date: prev?.date || today,
        logs: updatedLogs,
        totals: updatedTotals,
      };
    });

    setPopUpConfig({
      visible: true,
      title: 'Meal Logged!',
      message: `Done! Added ${logEntry?.name || 'Meal'} (${Math.round(logEntry?.calories || 0)} kcal) to today's log.`,
      icon: 'sparkles',
      type: 'success'
    });
  };

  const handleFoodSavedSuccess = (tempId, savedEntry) => {
    setLogsData(prev => {
      if (!prev) return prev;
      const updatedLogs = (prev.logs || []).map(l => (l.id === tempId ? savedEntry : l));
      return { ...prev, logs: updatedLogs };
    });
    checkAndUpdateStreak(user, (logsData?.logs?.length || 0) + 1, workoutLogs?.length || 0);
  };

  const handleFoodSaveError = (tempId, err) => {
    setLogsData(prev => {
      if (!prev) return prev;
      const failedEntry = (prev.logs || []).find(l => l.id === tempId);
      const updatedLogs = (prev.logs || []).filter(l => l.id !== tempId);
      const prevTotals = prev.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      const updatedTotals = failedEntry ? {
        calories: Math.max(0, Math.round(prevTotals.calories - (Number(failedEntry.calories) || 0))),
        protein: Math.max(0, Math.round(prevTotals.protein - (Number(failedEntry.protein) || 0))),
        carbs: Math.max(0, Math.round(prevTotals.carbs - (Number(failedEntry.carbs) || 0))),
        fat: Math.max(0, Math.round(prevTotals.fat - (Number(failedEntry.fat) || 0))),
        fiber: Math.max(0, Math.round(prevTotals.fiber - (Number(failedEntry.fiber) || 0))),
      } : prevTotals;

      return { ...prev, logs: updatedLogs, totals: updatedTotals };
    });

    setPopUpConfig({
      visible: true,
      title: 'Save Failed',
      message: err?.message || 'Could not save meal log. Entry removed.',
      icon: 'alert-circle',
      type: 'danger'
    });
  };

  // Workout handlers
  const handleEditWorkout = (item) => {
    setEditingWorkoutItem(item);
    setEditWorkoutModalVisible(true);
  };

  const handleWorkoutUpdated = (updatedEntry) => {
    fetchDashboard();
    setPopUpConfig({
      visible: true,
      title: 'Workout Updated!',
      message: `Done! ${updatedEntry?.workout_type} (${updatedEntry?.duration_min}m • ${Math.round(updatedEntry?.calories_burned || 0)} kcal) updated.`,
      icon: 'fitness-outline',
      type: 'success'
    });
  };

  const handleDeleteWorkout = async (id) => {
    try {
      await deleteWorkoutLog(id);
      fetchDashboard();
      setPopUpConfig({
        visible: true,
        title: 'Workout Deleted',
        message: 'The workout session has been removed.',
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

  const handleWorkoutAdded = (entry) => {
    fetchDashboard();
    setPopUpConfig({
      visible: true,
      title: 'Workout Logged!',
      message: `Great sweat! Logged ${entry?.workout_type} (${entry?.duration_min} min • ${Math.round(entry?.calories_burned || 0)} kcal burned).`,
      icon: 'flame-outline',
      type: 'success'
    });
  };

  const handleExportCsv = async () => {
    try {
      await exportLogsAsExcel(user);
      const rawName = (user?.name || 'User').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      setPopUpConfig({
        visible: true,
        title: 'Excel Report Ready',
        message: `Done! Exported logs as ${rawName}_report.xlsx.`,
        icon: 'document-text-outline',
        type: 'success'
      });
    } catch (err) {
      setPopUpConfig({
        visible: true,
        title: 'Export Error',
        message: err.message,
        icon: 'alert-circle',
        type: 'danger'
      });
    }
  };

  if (loading && !refreshing && !logsData) {
    return (
      <AmbientBackground style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading today's dashboard…</Text>
      </AmbientBackground>
    );
  }

  const consumed = logsData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const burnedCalories = workoutLogs.reduce((acc, w) => acc + (Number(w.calories_burned) || 0), 0);
  const workoutMinutes = workoutLogs.reduce((acc, w) => acc + (Number(w.duration_min) || 0), 0);
  const netCalories = Math.max(0, consumed.calories - Math.round(burnedCalories));

  const targets = {
    calories: user?.target_calories || 2000,
    protein: user?.target_protein || 150,
    carbs: user?.target_carbs || 200,
    fat: user?.target_fat || 60,
    fiber: user?.target_fiber || 30,
  };

  const pct = (v, t) => Math.min(100, t > 0 ? Math.round((v / t) * 100) : 0);
  const remainingCals = Math.max(0, targets.calories - netCalories);
  const exceededCals = Math.max(0, netCalories - targets.calories);

  return (
    <AmbientBackground style={styles.container}>
      {/* Universal PopUp Modal */}
      <PopUpModal
        visible={popUpConfig.visible}
        title={popUpConfig.title}
        message={popUpConfig.message}
        icon={popUpConfig.icon}
        type={popUpConfig.type}
        onClose={() => setPopUpConfig({ ...popUpConfig, visible: false })}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} tintColor="#10B981" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingText, { color: themeColors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{user?.name || 'Athlete'}</Text>
          </View>
          <View style={styles.headerActions}>
            <DashboardStreakBadge streak={user?.streak_current || 0} longest={user?.streak_longest || 0} />
            <TouchableOpacity style={[glassStyles.cardSubtle, styles.csvBtn, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)', borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)' }]} onPress={handleExportCsv}>
              <Ionicons name="document-text-outline" size={15} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {reminderVisible && (
          <View style={[
            styles.reminderBanner,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.10)',
              borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.25)',
            }
          ]}>
            <Ionicons name="notifications-outline" size={18} color={isDark ? '#FBBF24' : '#D97706'} />
            <Text style={[styles.reminderText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
              <Text style={{ fontWeight: '700' }}>Reminder:</Text> Log both food & workouts daily to maintain your 🔥 streak!
            </Text>
            <TouchableOpacity onPress={() => setReminderVisible(false)}>
              <Ionicons name="close-circle" size={17} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Macro & Burn Calorie Ring Card */}
        <View style={[glassStyles.card, styles.mainRingCard]}>
          <View style={styles.ringRow}>
            <MacroProgressRing
              size={148}
              strokeWidth={13}
              progress={pct(netCalories, targets.calories)}
              color={exceededCals > 0 ? '#F87171' : themeColors.primary}
              value={netCalories}
              target={targets.calories}
              label="Net Cals"
              unit="kcal"
            />
            <View style={styles.ringInfoCol}>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>{remainingCals}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Remaining (net)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#F87171' }]}>{Math.round(burnedCalories)}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Burned (kcal)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, exceededCals > 0 ? { color: '#F87171' } : { color: themeColors.textPrimary }]}>
                  {consumed.calories}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Consumed (kcal)</Text>
              </View>
            </View>
          </View>

          {/* Workout Summary Line */}
          {workoutLogs.length > 0 && (
            <View style={styles.workoutSummaryLine}>
              <Ionicons name="fitness-outline" size={15} color={themeColors.primary} />
              <Text style={[styles.workoutSummaryText, { color: themeColors.primary }]}>
                🏃 {workoutMinutes} min • {Math.round(burnedCalories)} kcal burned today
              </Text>
            </View>
          )}

          <View style={styles.macrosGrid}>
            {[
              ['Protein', consumed.protein, targets.protein, themeColors.protein],
              ['Carbs', consumed.carbs, targets.carbs, themeColors.carbs],
              ['Fats', consumed.fat, targets.fat, themeColors.fat],
              ['Fiber', consumed.fiber, targets.fiber, themeColors.fiber],
            ].map(([label, val, tgt, color]) => (
              <View key={label} style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={[styles.macroTitle, { color: themeColors.textSecondary }]}>{label}</Text>
                  <Text style={[styles.macroValue, { color }]}>{val} / {tgt}g</Text>
                </View>
                <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]}>
                  <View style={[styles.progressBarFill, { width: `${pct(val, tgt)}%`, backgroundColor: color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Smart AI Nudge Card */}
        <SmartSuggestionCard
          netCalories={netCalories}
          targetCalories={targets.calories}
          workoutCount={workoutLogs.length}
          burnedCalories={burnedCalories}
          waterGlasses={0}
          waterGoal={user?.water_goal || 8}
          goalType={user?.goal_type || 'fat_loss'}
        />

        {/* Water Intake Widget */}
        <WaterWidget waterGoal={user?.water_goal || 8} dateStr={today} />


        {/* Quick Action Bars */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={[glassStyles.cardSubtle, styles.quickAddBar, { flex: 1, borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)' }]} onPress={() => setFoodModalVisible(true)}>
            <View style={styles.addIconCircle}><Ionicons name="restaurant" size={18} color="#fff" /></View>
            <View>
              <Text style={[styles.quickAddTitle, { color: themeColors.textPrimary }]}>+ Add Food</Text>
              <Text style={[styles.quickAddSub, { color: themeColors.textSecondary }]}>AI scan & text</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[glassStyles.cardSubtle, styles.quickAddBar, { flex: 1, borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.25)' }]} onPress={() => setWorkoutModalVisible(true)}>
            <View style={[styles.addIconCircle, { backgroundColor: '#3B82F6' }]}><Ionicons name="fitness" size={18} color="#fff" /></View>
            <View>
              <Text style={[styles.quickAddTitle, { color: themeColors.textPrimary }]}>+ Log Workout</Text>
              <Text style={[styles.quickAddSub, { color: themeColors.textSecondary }]}>Track burn & MET</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Workouts Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Today's Workouts</Text>
          <TouchableOpacity style={[styles.addInlineBtn, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)' }]} onPress={() => setWorkoutModalVisible(true)}>
            <Ionicons name="add" size={14} color={themeColors.primary} />
            <Text style={[styles.addInlineText, { color: themeColors.primary }]}>Log Workout</Text>
          </TouchableOpacity>
        </View>

        {workoutLogs.length > 0 ? (
          workoutLogs.map(item => (
            <WorkoutItem
              key={item.id}
              item={item}
              onDelete={handleDeleteWorkout}
              onEdit={handleEditWorkout}
            />
          ))
        ) : (
          <View style={[glassStyles.cardSubtle, styles.emptyCard]}>
            <Ionicons name="fitness-outline" size={30} color={themeColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No workouts logged today</Text>
            <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>Tap "+ Log Workout" to add a workout session & earn streak points!</Text>
          </View>
        )}

        {/* Today's Food Log Section */}
        <View style={[styles.sectionHeader, { marginTop: 14 }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Today's Food Log</Text>
          <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>{logsData?.logs?.length || 0} items</Text>
        </View>

        {logsData?.logs?.length > 0 ? (
          logsData.logs.map(item => <FoodLogItem key={item.id} item={item} onDelete={handleDeleteFood} onEdit={handleEditFood} />)
        ) : (
          <View style={[glassStyles.cardSubtle, styles.emptyCard]}>
            <Ionicons name="restaurant-outline" size={30} color={themeColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No food logged today</Text>
            <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>Snap a photo or describe your meal to start tracking!</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Camera Button */}
      <TouchableOpacity style={styles.fabButton} onPress={() => setFoodModalVisible(true)}>
        <Ionicons name="camera" size={25} color="#fff" />
      </TouchableOpacity>

      {/* Modals */}
      <AddFoodModal
        visible={foodModalVisible}
        onClose={() => setFoodModalVisible(false)}
        onFoodAdded={handleFoodAdded}
        onFoodSavedSuccess={handleFoodSavedSuccess}
        onFoodSaveError={handleFoodSaveError}
      />
      <EditFoodModal
        visible={editFoodModalVisible}
        item={editingFoodItem}
        onClose={() => setEditFoodModalVisible(false)}
        onSaved={handleFoodUpdated}
      />
      <LogWorkoutModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
        userWeight={user?.weight}
        onWorkoutAdded={handleWorkoutAdded}
      />
      <EditWorkoutModal
        visible={editWorkoutModalVisible}
        item={editingWorkoutItem}
        onClose={() => setEditWorkoutModalVisible(false)}
        userWeight={user?.weight}
        onSaved={handleWorkoutUpdated}
      />
      <WeeklySummaryModal user={user} />
    </AmbientBackground>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greetingText: { fontSize: 13 },
  userName: { fontSize: 22, fontWeight: '800' },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } : {}),
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    gap: 9,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } : {}),
  },
  reminderText: { fontSize: 11, flex: 1, lineHeight: 16 },
  mainRingCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 },
  ringInfoCol: { gap: 10 },
  statBox: { alignItems: 'flex-start' },
  statNumber: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  workoutSummaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    padding: 9,
    marginBottom: 14,
    borderWidth: 1,
  },
  workoutSummaryText: { fontSize: 12, fontWeight: '600' },
  macrosGrid: { gap: 11 },
  macroCard: { gap: 5 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  macroTitle: { fontSize: 12, fontWeight: '600' },
  macroValue: { fontSize: 12, fontWeight: '700' },
  progressBarTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickAddBar: {
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  quickAddBarWorkout: {
  },
  addIconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  quickAddTitle: { fontSize: 13, fontWeight: '700' },
  quickAddSub: { fontSize: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCount: { fontSize: 12 },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  addInlineText: { fontSize: 11, fontWeight: '700' },
  emptyCard: {
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', marginTop: 7 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  fabButton: {
    position: 'absolute',
    bottom: 22,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.5)',
    } : {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    }),
  },
});
