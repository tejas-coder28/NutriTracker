import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/ui/Icon';
import {
  getFoodLogsForDate, deleteFoodLog,
  getWorkoutLogsForDate, deleteWorkoutLog
} from '../services/database';
import { checkAndUpdateStreak } from '../services/workoutService';
import { exportLogsAsExcel } from '../services/exportService';

import GlassCard from '../components/primitives/GlassCard';
import LiquidButton from '../components/primitives/LiquidButton';
import NeuRaised from '../components/primitives/NeuRaised';
import MacroBar from '../components/primitives/MacroBar';
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
  const { isDark, tokens } = useTheme();
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
        message: 'Done! The workout has been removed from today\'s log.',
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

  const handleWorkoutAdded = () => {
    fetchDashboard();
    setPopUpConfig({
      visible: true,
      title: 'Workout Logged!',
      message: 'Done! Your workout has been saved and your net calories have been updated.',
      icon: 'fitness-outline',
      type: 'success'
    });
  };

  const handleExportCsv = async () => {
    try {
      const fileUri = await exportLogsAsExcel(user);
      setPopUpConfig({
        visible: true,
        title: 'Report Exported!',
        message: Platform.OS === 'web'
          ? `Excel report saved as: ${fileUri}`
          : 'Your Excel nutrition report is ready in the share sheet.',
        icon: 'document-text-outline',
        type: 'success'
      });
    } catch (err) {
      setPopUpConfig({
        visible: true,
        title: 'Export Failed',
        message: err.message || 'Could not export logs.',
        icon: 'alert-circle',
        type: 'warning'
      });
    }
  };

  if (loading && !refreshing && !logsData) {
    return (
      <AmbientBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={[styles.loadingText, { color: tokens.text.secondary }]}>Loading your dashboard...</Text>
        </View>
      </AmbientBackground>
    );
  }

  // Compute stats
  const consumed = logsData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const burnedCalories = workoutLogs.reduce((acc, w) => acc + (Number(w.calories_burned) || 0), 0);
  const workoutMinutes = workoutLogs.reduce((acc, w) => acc + (Number(w.duration_min) || 0), 0);

  const netCalories = Math.max(0, Math.round(consumed.calories - burnedCalories));

  const targets = {
    calories: user?.target_calories || 2000,
    protein: user?.target_protein || 150,
    carbs: user?.target_carbs || 200,
    fat: user?.target_fat || 60,
    fiber: user?.target_fiber || 30
  };

  const remainingCals = Math.max(0, targets.calories - netCalories);
  const exceededCals = Math.max(0, netCalories - targets.calories);
  const pct = (c, t) => Math.min(100, Math.round((c / t) * 100));

  return (
    <AmbientBackground>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDashboard(); }}
            tintColor={tokens.primary}
          />
        }
      >
        <View style={styles.contentWrap}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greetingText, { color: tokens.text.secondary }]}>Welcome back,</Text>
              <Text style={[styles.userName, { color: tokens.text.primary }]}>{user?.name || 'Athlete'}</Text>
            </View>
            <View style={styles.headerActions}>
              <DashboardStreakBadge streak={user?.streak_current || 0} longest={user?.streak_longest || 0} />
              <TouchableOpacity
                style={[
                  styles.csvBtn,
                  {
                    backgroundColor: tokens.neumorphic.inset,
                    borderColor: tokens.neumorphic.border,
                  },
                ]}
                onPress={handleExportCsv}
                accessibilityLabel="Export Excel Nutrition Report"
              >
                <Icon name="document-text-outline" size={16} color={tokens.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Slimmer Reminder Banner */}
          {reminderVisible && (
            <GlassCard
              style={[
                styles.reminderBanner,
                {
                  borderColor: isDark ? 'rgba(255, 184, 0, 0.35)' : 'rgba(224, 154, 0, 0.25)',
                },
              ]}
            >
              <Icon name="notifications-outline" size={17} color={tokens.macros.carbs} />
              <Text style={[styles.reminderText, { color: tokens.text.primary }]}>
                <Text style={{ fontWeight: '700', color: tokens.macros.carbs }}>Reminder:</Text> Log both food & workouts daily to maintain your 🔥 streak!
              </Text>
              <TouchableOpacity onPress={() => setReminderVisible(false)} style={styles.reminderClose}>
                <Icon name="close-circle" size={16} color={tokens.text.muted} />
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* Hero Calorie Ring & Macro Card */}
          <GlassCard style={styles.mainRingCard}>
            <View style={styles.ringRow}>
              {/* Hero Calorie Progress Ring */}
              <MacroProgressRing
                size={180}
                strokeWidth={14}
                progress={pct(netCalories, targets.calories)}
                color={exceededCals > 0 ? tokens.semantics.danger : tokens.primary}
                value={netCalories}
                target={targets.calories}
                label="Net Cals"
                unit="kcal"
                sublabel={exceededCals > 0 ? 'Over Target' : 'In Deficit'}
              />

              {/* 3 Compact Neumorphic Stat Chips */}
              <View style={styles.ringInfoCol}>
                <NeuRaised radius={14} style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: tokens.text.primary }]}>
                    {remainingCals}
                  </Text>
                  <Text style={[styles.statLabel, { color: tokens.text.secondary }]}>
                    Remaining (net)
                  </Text>
                </NeuRaised>

                <NeuRaised radius={14} style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: tokens.macros.calories }]}>
                    {Math.round(burnedCalories)}
                  </Text>
                  <Text style={[styles.statLabel, { color: tokens.text.secondary }]}>
                    Burned (kcal)
                  </Text>
                </NeuRaised>

                <NeuRaised radius={14} style={styles.statBox}>
                  <Text
                    style={[
                      styles.statNumber,
                      exceededCals > 0 ? { color: tokens.semantics.danger } : { color: tokens.text.primary },
                    ]}
                  >
                    {consumed.calories}
                  </Text>
                  <Text style={[styles.statLabel, { color: tokens.text.secondary }]}>
                    Consumed (kcal)
                  </Text>
                </NeuRaised>
              </View>
            </View>

            {/* Workout Summary Line */}
            {workoutLogs.length > 0 && (
              <View
                style={[
                  styles.workoutSummaryLine,
                  {
                    backgroundColor: tokens.neumorphic.inset,
                    borderColor: tokens.neumorphic.border,
                  },
                ]}
              >
                <Icon name="fitness-outline" size={15} color={tokens.primary} />
                <Text style={[styles.workoutSummaryText, { color: tokens.primary }]}>
                  🏃 {workoutMinutes} min • {Math.round(burnedCalories)} kcal burned today
                </Text>
              </View>
            )}

            {/* Inset Neumorphic Macro Progress Bars */}
            <View style={styles.macrosGrid}>
              <MacroBar
                label="Protein"
                value={consumed.protein}
                target={targets.protein}
                color={tokens.macros.protein}
                glowColor={tokens.macros.proteinGlow}
              />
              <MacroBar
                label="Carbs"
                value={consumed.carbs}
                target={targets.carbs}
                color={tokens.macros.carbs}
                glowColor={tokens.macros.carbsGlow}
              />
              <MacroBar
                label="Fats"
                value={consumed.fat}
                target={targets.fat}
                color={tokens.macros.fat}
                glowColor={tokens.macros.fatGlow}
              />
              <MacroBar
                label="Fiber"
                value={consumed.fiber}
                target={targets.fiber}
                color={tokens.macros.fiber}
                glowColor={tokens.macros.fiberGlow}
              />
            </View>
          </GlassCard>

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
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.quickAddBar,
                {
                  backgroundColor: tokens.glass.fill,
                  borderColor: isDark ? 'rgba(16, 232, 160, 0.35)' : 'rgba(0, 179, 119, 0.25)',
                },
              ]}
              onPress={() => setFoodModalVisible(true)}
            >
              <View style={[styles.addIconCircle, { backgroundColor: tokens.primary }]}>
                <Icon name="restaurant" size={18} color={tokens.text.primaryInverted} />
              </View>
              <View>
                <Text style={[styles.quickAddTitle, { color: tokens.text.primary }]}>+ Add Food</Text>
                <Text style={[styles.quickAddSub, { color: tokens.text.secondary }]}>AI scan & text</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.quickAddBar,
                {
                  backgroundColor: tokens.glass.fill,
                  borderColor: isDark ? 'rgba(0, 210, 255, 0.35)' : 'rgba(0, 144, 200, 0.25)',
                },
              ]}
              onPress={() => setWorkoutModalVisible(true)}
            >
              <View style={[styles.addIconCircle, { backgroundColor: tokens.macros.protein }]}>
                <Icon name="fitness" size={18} color={tokens.text.primaryInverted} />
              </View>
              <View>
                <Text style={[styles.quickAddTitle, { color: tokens.text.primary }]}>+ Log Workout</Text>
                <Text style={[styles.quickAddSub, { color: tokens.text.secondary }]}>Track burn & MET</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Today's Workouts Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: tokens.text.primary }]}>Today's Workouts</Text>
            <TouchableOpacity
              style={[
                styles.addInlineBtn,
                {
                  backgroundColor: tokens.neumorphic.inset,
                  borderColor: tokens.neumorphic.border,
                },
              ]}
              onPress={() => setWorkoutModalVisible(true)}
            >
              <Icon name="add" size={14} color={tokens.primary} />
              <Text style={[styles.addInlineText, { color: tokens.primary }]}>Log Workout</Text>
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
            <GlassCard subtle style={styles.emptyCard}>
              <Icon name="fitness-outline" size={30} color={tokens.text.muted} />
              <Text style={[styles.emptyTitle, { color: tokens.text.primary }]}>No workouts logged today</Text>
              <Text style={[styles.emptySub, { color: tokens.text.secondary }]}>
                Tap "+ Log Workout" to add a workout session & earn streak points!
              </Text>
            </GlassCard>
          )}

          {/* Today's Food Log Section */}
          <View style={[styles.sectionHeader, { marginTop: 14 }]}>
            <Text style={[styles.sectionTitle, { color: tokens.text.primary }]}>Today's Food Log</Text>
            <Text style={[styles.sectionCount, { color: tokens.text.secondary }]}>
              {logsData?.logs?.length || 0} items
            </Text>
          </View>

          {logsData?.logs?.length > 0 ? (
            logsData.logs.map(item => (
              <FoodLogItem
                key={item.id}
                item={item}
                onDelete={handleDeleteFood}
                onEdit={handleEditFood}
              />
            ))
          ) : (
            <GlassCard subtle style={styles.emptyCard}>
              <Icon name="restaurant-outline" size={30} color={tokens.text.muted} />
              <Text style={[styles.emptyTitle, { color: tokens.text.primary }]}>No food logged today</Text>
              <Text style={[styles.emptySub, { color: tokens.text.secondary }]}>
                Snap a photo or describe your meal to start tracking!
              </Text>
            </GlassCard>
          )}
        </View>
      </ScrollView>

      {/* Floating Liquid-Glass Camera Button (FAB) */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.fabButton,
          {
            backgroundColor: tokens.primary,
            ...(Platform.OS === 'web' ? {
              boxShadow: `0 8px 24px ${tokens.primaryGlow}`,
            } : {
              shadowColor: tokens.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.45,
              shadowRadius: 10,
              elevation: 8,
            }),
          },
        ]}
        onPress={() => {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
          setFoodModalVisible(true);
        }}
        accessibilityLabel="Log Food with Camera or Text"
      >
        <Icon name="camera" size={24} color={tokens.text.primaryInverted} />
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
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  scrollContent: {
    padding: 16,
    paddingBottom: 120, // Extra padding so FAB and tab bar never overlap content
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 520, // Centered responsive layout for Web and tablet
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greetingText: { fontSize: 13, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  csvBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  reminderText: { fontSize: 12, flex: 1, lineHeight: 17 },
  reminderClose: { padding: 2 },
  mainRingCard: {
    padding: 18,
    marginBottom: 16,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  ringInfoCol: {
    flex: 1,
    gap: 8,
  },
  statBox: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    width: '100%',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 1,
  },
  workoutSummaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    padding: 8,
    marginBottom: 14,
    borderWidth: 1,
  },
  workoutSummaryText: { fontSize: 12, fontWeight: '700' },
  macrosGrid: { gap: 6 },
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  quickAddBar: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  quickAddSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.15,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  addInlineText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  emptyCard: {
    padding: 22,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', marginTop: 7 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 19, fontFamily: 'PlusJakartaSans_500Medium' },
  fabButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 76 : 84, // elevated nicely above the floating nav bar
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
