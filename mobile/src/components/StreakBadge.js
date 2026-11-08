import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MILESTONE_BADGES } from '../services/workoutService';
import { useTheme } from '../context/ThemeContext';
import Icon from './ui/Icon';

export function DashboardStreakBadge({ streak = 0, longest = 0 }) {
  const { tokens, isDark } = useTheme();

  // 7-dot week indicator (dots lit up according to streak modulo 7 or min 7)
  const activeDots = Math.min(7, Math.max(0, streak));

  return (
    <View
      style={[
        styles.streakPill,
        {
          backgroundColor: tokens.liquidGlass.fill,
          borderColor: isDark ? 'rgba(255, 184, 0, 0.35)' : 'rgba(224, 154, 0, 0.28)',
          ...(Platform.OS === 'web' ? {
            backdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
            WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
            boxShadow: `0 4px 14px ${isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(224, 154, 0, 0.12)'}`,
          } : {
            shadowColor: tokens.macros.carbs,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
          }),
        },
      ]}
    >
      <View style={styles.topRow}>
        <Icon name="flame" size={17} color={tokens.macros.carbs} />
        <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.streakText, { color: tokens.text.primary }]}>
          <Text style={[styles.streakNum, { color: tokens.macros.carbs }]}>{streak}</Text> day streak
        </Text>
        {longest > streak && streak > 0 && (
          <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.longestSub, { color: tokens.text.secondary }]}> (Best: {longest}d)</Text>
        )}
      </View>

      {/* 7-dot week row */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
          const isFilled = idx < activeDots;
          return (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: isFilled ? tokens.macros.carbs : tokens.neumorphic.inset,
                  borderColor: isFilled ? tokens.macros.carbs : tokens.neumorphic.border,
                  ...(isFilled && Platform.OS === 'web'
                    ? { boxShadow: `0 0 6px ${tokens.macros.carbsGlow}` }
                    : {}),
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

export function MilestoneBadgesGrid({ currentStreak = 0, longestStreak = 0 }) {
  const { tokens, isDark } = useTheme();
  const maxReached = Math.max(currentStreak, longestStreak);

  return (
    <View
      style={[
        styles.badgesContainer,
        {
          backgroundColor: tokens.glass.fill,
          borderColor: tokens.glass.border,
          borderRadius: tokens.radii.lg,
          ...(Platform.OS === 'web' ? {
            backdropFilter: `blur(${tokens.glass.blur}px)`,
            WebkitBackdropFilter: `blur(${tokens.glass.blur}px)`,
            boxShadow: isDark
              ? '0 12px 36px 0 rgba(0, 0, 0, 0.45)'
              : '0 8px 28px 0 rgba(15, 23, 42, 0.08)',
          } : {}),
        },
      ]}
    >
      <View style={styles.badgesHeader}>
        <Icon name="trophy-outline" size={19} color={tokens.macros.carbs} />
        <Text style={[styles.badgesTitle, { color: tokens.text.primary }]}>Milestone Badges</Text>
      </View>
      <Text style={[styles.badgesSub, { color: tokens.text.secondary }]}>
        Earn badges by maintaining consecutive meal & workout log streaks.
      </Text>

      {/* Even 3-Column Square Grid */}
      <View style={styles.grid}>
        {MILESTONE_BADGES.map((badge) => {
          const unlocked = maxReached >= badge.minStreak;
          const badgeAccent = badge.color || tokens.primary;

          return (
            <View
              key={badge.id}
              style={[
                styles.badgeCard,
                {
                  borderRadius: tokens.radii.md,
                  backgroundColor: unlocked
                    ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.85)')
                    : tokens.neumorphic.inset,
                  borderColor: unlocked
                    ? (isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.12)')
                    : tokens.neumorphic.border,
                  ...(unlocked && Platform.OS === 'web' ? {
                    boxShadow: `0 4px 16px ${badgeAccent}25`,
                  } : {}),
                },
              ]}
            >
              <View
                style={[
                  styles.badgeIconCircle,
                  {
                    backgroundColor: unlocked
                      ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)')
                      : tokens.neumorphic.inset,
                  },
                ]}
              >
                <Icon
                  name={unlocked ? badge.icon : 'lock-closed-outline'}
                  size={20}
                  color={unlocked ? badgeAccent : tokens.text.muted}
                />
              </View>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.badgeName,
                  { color: unlocked ? tokens.text.primary : tokens.text.secondary },
                ]}
                numberOfLines={1}
              >
                {badge.name}
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.badgeDesc, { color: tokens.text.secondary }]}
                numberOfLines={2}
              >
                {badge.desc}
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.reqText,
                  { color: unlocked ? tokens.semantics.success : tokens.text.secondary },
                ]}
              >
                {unlocked ? 'Unlocked ✓' : `${badge.minStreak}d req.`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  streakPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  streakNum: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  longestSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
    paddingLeft: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  badgesContainer: {
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  badgesSub: {
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 17,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '31%', // Exactly 3 columns with even margins
    minHeight: 140,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 4,
  },
  badgeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  badgeDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  reqText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
