import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllFoodLogs, getWorkoutLogsForWeek, getAllWeightLogs } from '../services/database';
import { getLocalDateStr, addDaysToDateStr } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';
import LiquidButton from './primitives/LiquidButton';
import Icon from './ui/Icon';

const LAST_SHOWN_KEY = 'NUTRITRACK_WEEKLY_SUMMARY_LAST_WEEK';

export default function WeeklySummaryModal({ user }) {
  const { isDark, tokens } = useTheme();
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

    const allFood = await getAllFoodLogs();
    const weeklyFood = (allFood || []).filter(f => f.logged_at >= startStr && f.logged_at <= endStr);
    const totalConsumed = weeklyFood.reduce((acc, f) => acc + (Number(f.calories) || 0), 0);

    const weeklyWorkouts = await getWorkoutLogsForWeek(startStr, endStr);
    const totalBurned = (weeklyWorkouts || []).reduce((acc, w) => acc + (Number(w.calories_burned) || 0), 0);
    const totalMinutes = (weeklyWorkouts || []).reduce((acc, w) => acc + (Number(w.duration_min) || 0), 0);
    const workoutCount = (weeklyWorkouts || []).length;

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

  const isWeb = Platform.OS === 'web';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => setVisible(false)}>
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,23,42,0.45)' }]}>
        <View
          style={[
            s.card,
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

          {/* Top specular highlight */}
          <View style={[s.specularLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)' }]} />

          <View style={s.header}>
            <View style={s.headerLeft}>
              <View
                style={[
                  s.iconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(224, 154, 0, 0.12)',
                    borderColor: tokens.colors.warning,
                  }
                ]}
              >
                <Icon name="trophy" size={22} color={tokens.colors.warning} />
              </View>
              <View>
                <Text style={[s.headerTitle, { color: tokens.colors.textPrimary }]}>Weekly Health Summary</Text>
                <Text style={[s.headerSub, { color: tokens.colors.textSecondary }]}>{summaryData.startDateStr} to {summaryData.endDateStr}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setVisible(false)}
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

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            {/* Calories Grid */}
            <View style={s.grid}>
              <View
                style={[
                  s.statBox,
                  {
                    backgroundColor: tokens.colors.neuBase,
                    borderColor: tokens.colors.cardBorderSubtle,
                  }
                ]}
              >
                <Icon name="restaurant-outline" size={18} color={tokens.colors.primary} />
                <Text style={[s.statVal, { color: tokens.colors.textPrimary }]}>{summaryData.totalConsumed}</Text>
                <Text style={[s.statLbl, { color: tokens.colors.textSecondary }]}>Kcal Consumed</Text>
              </View>

              <View
                style={[
                  s.statBox,
                  {
                    backgroundColor: tokens.colors.neuBase,
                    borderColor: tokens.colors.cardBorderSubtle,
                  }
                ]}
              >
                <Icon name="flame-outline" size={18} color={tokens.colors.calories} />
                <Text style={[s.statVal, { color: tokens.colors.calories }]}>{summaryData.totalBurned}</Text>
                <Text style={[s.statLbl, { color: tokens.colors.textSecondary }]}>Kcal Burned</Text>
              </View>
            </View>

            {/* Workouts Row */}
            <View
              style={[
                s.rowCard,
                {
                  backgroundColor: tokens.colors.neuBase,
                  borderColor: tokens.colors.cardBorderSubtle,
                }
              ]}
            >
              <View style={s.rowLeft}>
                <Icon name="fitness-outline" size={20} color={tokens.colors.protein} />
                <View>
                  <Text style={[s.rowTitle, { color: tokens.colors.textPrimary }]}>{summaryData.workoutCount} Workout Sessions</Text>
                  <Text style={[s.rowSub, { color: tokens.colors.textSecondary }]}>{summaryData.totalMinutes} total active minutes</Text>
                </View>
              </View>
              <Text style={[s.rowBadge, { color: tokens.colors.protein }]}>{summaryData.totalMinutes}m</Text>
            </View>

            {/* Weight Trend Row */}
            <View
              style={[
                s.rowCard,
                {
                  backgroundColor: tokens.colors.neuBase,
                  borderColor: tokens.colors.cardBorderSubtle,
                }
              ]}
            >
              <View style={s.rowLeft}>
                <Icon name="scale-outline" size={20} color={tokens.colors.primary} />
                <View>
                  <Text style={[s.rowTitle, { color: tokens.colors.textPrimary }]}>Weight Trajectory</Text>
                  <Text style={[s.rowSub, { color: tokens.colors.textSecondary }]}>{summaryData.weightTrendStr}</Text>
                </View>
              </View>
            </View>

            {/* Streak Banner */}
            <View
              style={[
                s.streakBanner,
                {
                  backgroundColor: isDark ? 'rgba(255, 184, 0, 0.12)' : 'rgba(224, 154, 0, 0.10)',
                  borderColor: tokens.colors.warning,
                }
              ]}
            >
              <Icon name="flame" size={24} color={tokens.colors.warning} />
              <View style={s.streakInfo}>
                <Text style={[s.streakTitle, { color: tokens.colors.warning }]}>{summaryData.streak} Day Active Streak!</Text>
                <Text style={[s.streakSub, { color: tokens.colors.textSecondary }]}>Best overall streak: {summaryData.longestStreak} days</Text>
              </View>
            </View>
          </ScrollView>

          <View style={s.btnWrap}>
            <LiquidButton
              title="Awesome, Got It!"
              icon="checkmark-circle"
              onPress={() => setVisible(false)}
              variant="primary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 28,
    padding: 22,
    maxHeight: '85%',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 20,
  },
  specularLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.15 },
  headerSub: { fontSize: 12, marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' },
  content: { marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 16, padding: 14, gap: 4, borderWidth: 1 },
  statVal: { fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  statLbl: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  rowCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  rowSub: { fontSize: 12, marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' },
  rowBadge: { fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold', fontVariant: ['tabular-nums'] },
  streakBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, borderWidth: 1, marginTop: 4 },
  streakInfo: { flex: 1 },
  streakTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  streakSub: { fontSize: 12, marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' },
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
  btnWrap: { marginTop: 4 },
});
