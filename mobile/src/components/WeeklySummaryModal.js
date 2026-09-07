import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllFoodLogs, getWorkoutLogsForWeek, getAllWeightLogs } from '../services/database';
import { getLocalDateStr, addDaysToDateStr } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';

const LAST_SHOWN_KEY = 'NUTRITRACK_WEEKLY_SUMMARY_LAST_WEEK';

export default function WeeklySummaryModal({ user }) {
  const { isDark, themeColors, glassStyles } = useTheme();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    checkAndLoadSummary();
  }, []);

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const checkAndLoadSummary = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentWeek = getWeekNumber(now);
      const weekId = `${currentYear}-W${currentWeek}`;

      // Show on Sunday or early week if not shown yet for this week
      const isSunday = now.getDay() === 0;

      const lastShownWeek = await AsyncStorage.getItem(LAST_SHOWN_KEY);

      if (lastShownWeek === weekId) {
        // Already shown for this week
        return;
      }

      if (isSunday || !lastShownWeek || lastShownWeek !== weekId) {
        await buildSummaryData();
        await AsyncStorage.setItem(LAST_SHOWN_KEY, weekId);
        setVisible(true);
      }
    } catch (err) {
      console.error('Check weekly summary error:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildSummaryData = async () => {
    const endStr = getLocalDateStr();
    const startStr = addDaysToDateStr(endStr, -6);

    // Fetch food logs for week

    const allFood = await getAllFoodLogs();
    const weeklyFood = (allFood || []).filter(f => f.logged_at >= startStr && f.logged_at <= endStr);
    const totalConsumed = weeklyFood.reduce((acc, f) => acc + (Number(f.calories) || 0), 0);

    // Fetch workout logs for week
    const weeklyWorkouts = await getWorkoutLogsForWeek(startStr, endStr);
    const totalBurned = (weeklyWorkouts || []).reduce((acc, w) => acc + (Number(w.calories_burned) || 0), 0);
    const totalMinutes = (weeklyWorkouts || []).reduce((acc, w) => acc + (Number(w.duration_min) || 0), 0);
    const workoutCount = (weeklyWorkouts || []).length;

    // Fetch weight history
    const allWeight = await getAllWeightLogs();
    let weightTrendStr = 'No weight logged this week';
    if (allWeight && allWeight.length > 0) {
      const latest = allWeight[allWeight.length - 1];
      const previous = allWeight.length > 1 ? allWeight[allWeight.length - 2] : null;
      if (previous) {
        const diff = Math.round((latest.weight - previous.weight) * 10) / 10;
        weightTrendStr = `${latest.weight} kg (${diff > 0 ? '+' + diff : diff} kg)`;
      } else {
        weightTrendStr = `${latest.weight} kg logged`;
      }
    }

    setSummaryData({
      startDateStr: startStr,
      endDateStr: endStr,
      totalConsumed: Math.round(totalConsumed),
      totalBurned: Math.round(totalBurned),
      workoutCount,
      totalMinutes,
      weightTrendStr,
      streak: user?.streak_current || 0,
      longestStreak: user?.streak_longest || 0,
    });
  };

  if (!visible || !summaryData) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => setVisible(false)}>
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)' }]}>
        <View style={[glassStyles.modalContent, s.card]}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.iconCircle}>
                <Ionicons name="trophy" size={22} color="#F59E0B" />
              </View>
              <View>
                <Text style={[s.headerTitle, { color: themeColors.textPrimary }]}>Weekly Health Summary</Text>
                <Text style={[s.headerSub, { color: themeColors.textSecondary }]}>{summaryData.startDateStr} to {summaryData.endDateStr}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setVisible(false)} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            {/* Calories Grid */}
            <View style={s.grid}>
              <View style={[glassStyles.cardSubtle, s.statBox]}>
                <Ionicons name="restaurant-outline" size={18} color="#10B981" />
                <Text style={[s.statVal, { color: themeColors.textPrimary }]}>{summaryData.totalConsumed}</Text>
                <Text style={[s.statLbl, { color: themeColors.textSecondary }]}>Kcal Consumed</Text>
              </View>

              <View style={[glassStyles.cardSubtle, s.statBox]}>
                <Ionicons name="flame-outline" size={18} color="#EF4444" />
                <Text style={[s.statVal, { color: '#EF4444' }]}>{summaryData.totalBurned}</Text>
                <Text style={[s.statLbl, { color: themeColors.textSecondary }]}>Kcal Burned</Text>
              </View>
            </View>

            {/* Workouts Row */}
            <View style={[glassStyles.cardSubtle, s.rowCard]}>
              <View style={s.rowLeft}>
                <Ionicons name="fitness-outline" size={20} color="#3B82F6" />
                <View>
                  <Text style={[s.rowTitle, { color: themeColors.textPrimary }]}>{summaryData.workoutCount} Workout Sessions</Text>
                  <Text style={[s.rowSub, { color: themeColors.textSecondary }]}>{summaryData.totalMinutes} total active minutes</Text>
                </View>
              </View>
              <Text style={s.rowBadge}>{summaryData.totalMinutes}m</Text>
            </View>

            {/* Weight Trend Row */}
            <View style={[glassStyles.cardSubtle, s.rowCard]}>
              <View style={s.rowLeft}>
                <Ionicons name="scale-outline" size={20} color="#6366F1" />
                <View>
                  <Text style={[s.rowTitle, { color: themeColors.textPrimary }]}>Weight Trajectory</Text>
                  <Text style={[s.rowSub, { color: themeColors.textSecondary }]}>{summaryData.weightTrendStr}</Text>
                </View>
              </View>
            </View>

            {/* Streak Banner */}
            <View style={s.streakBanner}>
              <Ionicons name="flame" size={24} color="#F59E0B" />
              <View style={s.streakInfo}>
                <Text style={s.streakTitle}>{summaryData.streak} Day Active Streak!</Text>
                <Text style={[s.streakSub, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Best overall streak: {summaryData.longestStreak} days</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={s.dismissBtn} onPress={() => setVisible(false)}>
            <Text style={s.dismissBtnText}>Awesome, Got It!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', borderRadius: 24, padding: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F59E0B18', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B40' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 4 },
  content: { marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 16, padding: 14, gap: 4 },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11 },
  rowCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 11, marginTop: 2 },
  rowBadge: { color: '#3B82F6', fontSize: 14, fontWeight: '800' },
  streakBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F59E0B15', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F59E0B40', marginTop: 4 },
  streakInfo: { flex: 1 },
  streakTitle: { color: '#F59E0B', fontSize: 14, fontWeight: '800' },
  streakSub: { fontSize: 11, marginTop: 2 },
  dismissBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  dismissBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
