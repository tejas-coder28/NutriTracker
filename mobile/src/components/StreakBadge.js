import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MILESTONE_BADGES } from '../services/workoutService';
import { useTheme } from '../context/ThemeContext';

export function DashboardStreakBadge({ streak = 0, longest = 0 }) {
  const { isDark, themeColors } = useTheme();

  return (
    <View style={[
      s.streakPill,
      {
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(217, 119, 6, 0.12)',
        borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(217, 119, 6, 0.28)',
      }
    ]}>
      <Ionicons name="flame" size={16} color={isDark ? '#FBBF24' : '#D97706'} />
      <Text style={[s.streakText, { color: isDark ? '#FBBF24' : '#D97706' }]}>
        <Text style={[s.streakNum, { color: isDark ? '#F59E0B' : '#B45309' }]}>{streak}</Text> day streak
      </Text>
      {longest > streak && streak > 0 && (
        <Text style={[s.longestSub, { color: themeColors.textSecondary }]}> (Best: {longest}d)</Text>
      )}
    </View>
  );
}

export function MilestoneBadgesGrid({ currentStreak = 0, longestStreak = 0 }) {
  const { isDark, themeColors, glassStyles } = useTheme();
  const maxReached = Math.max(currentStreak, longestStreak);

  return (
    <View style={[glassStyles.card, s.badgesContainer]}>
      <View style={s.badgesHeader}>
        <Ionicons name="trophy-outline" size={18} color={isDark ? '#FBBF24' : '#D97706'} />
        <Text style={[s.badgesTitle, { color: themeColors.textPrimary }]}>Milestone Badges</Text>
      </View>
      <Text style={[s.badgesSub, { color: themeColors.textSecondary }]}>
        Earn badges by maintaining consecutive meal & workout log streaks.
      </Text>

      <View style={s.grid}>
        {MILESTONE_BADGES.map(badge => {
          const unlocked = maxReached >= badge.minStreak;
          return (
            <View
              key={badge.id}
              style={[
                s.badgeCard,
                unlocked
                  ? { borderColor: badge.color + '60', backgroundColor: badge.color + (isDark ? '18' : '15') }
                  : { borderColor: themeColors.cardBorderSubtle, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' }
              ]}
            >
              <View style={[s.badgeIconCircle, unlocked ? { backgroundColor: badge.color + (isDark ? '30' : '20') } : { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }]}>
                <Ionicons
                  name={unlocked ? badge.icon : 'lock-closed-outline'}
                  size={20}
                  color={unlocked ? badge.color : themeColors.textMuted}
                />
              </View>
              <Text style={[s.badgeName, { color: unlocked ? themeColors.textPrimary : themeColors.textMuted }]}>
                {badge.name}
              </Text>
              <Text style={[s.badgeDesc, { color: themeColors.textSecondary }]} numberOfLines={2}>
                {badge.desc}
              </Text>
              <Text style={[s.reqText, { color: unlocked ? (isDark ? '#34D399' : '#059669') : themeColors.textMuted }]}>
                {unlocked ? 'Unlocked ✓' : `${badge.minStreak}d streak req.`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } : {}),
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  streakNum: {
    fontSize: 14,
    fontWeight: '900',
  },
  longestSub: {
    fontSize: 10,
  },
  badgesContainer: {
    borderRadius: 20,
    padding: 17,
    gap: 6,
  },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgesTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgesSub: {
    fontSize: 11,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '48%',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    gap: 5,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } : {}),
  },
  badgeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justify: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  reqText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});
