import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateSmartSuggestion } from '../services/aiService';
import { getLocalDateStr } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './primitives/GlassCard';
import Icon from './ui/Icon';

const CACHE_KEY = 'NUTRITRACK_SMART_NUDGE_CACHE';

export default function SmartSuggestionCard({
  netCalories = 0,
  targetCalories = 2000,
  workoutCount = 0,
  burnedCalories = 0,
  waterGlasses = 0,
  waterGoal = 8,
  goalType = 'fat_loss',
}) {
  const { tokens, isDark } = useTheme();
  const [suggestion, setSuggestion] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const todayStr = getLocalDateStr();
  const stateHash = `${todayStr}_${netCalories}_${workoutCount}_${waterGlasses}_${goalType}`;

  useEffect(() => {
    loadOrFetchSuggestion();
  }, [stateHash]);

  const loadOrFetchSuggestion = async () => {
    try {
      setLoading(true);

      const cachedDataRaw = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedDataRaw) {
        const cached = JSON.parse(cachedDataRaw);
        if (cached.stateHash === stateHash && cached.text) {
          setSuggestion(cached.text);
          setLoading(false);
          return;
        }
      }

      const text = await generateSmartSuggestion({
        netCalories,
        targetCalories,
        workoutCount,
        burnedCalories,
        waterGlasses,
        waterGoal,
        hourOfDay: new Date().getHours(),
        goalType,
      });

      setSuggestion(text);

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ text, date: todayStr, stateHash })
      );
    } catch (e) {
      console.error('Smart suggestion error:', e);
      setSuggestion("Stay consistent with your daily nutrition and activity to hit your goals!");
    } finally {
      setLoading(false);
    }
  };

  if (dismissed || !suggestion) return null;

  return (
    <GlassCard
      style={[
        styles.card,
        {
          borderColor: isDark ? 'rgba(255, 184, 0, 0.35)' : 'rgba(224, 154, 0, 0.28)',
          ...(Platform.OS === 'web' ? {
            boxShadow: `0 4px 20px ${isDark ? 'rgba(255, 184, 0, 0.12)' : 'rgba(224, 154, 0, 0.08)'}`,
          } : {}),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isDark ? 'rgba(255, 184, 0, 0.18)' : 'rgba(224, 154, 0, 0.12)',
                borderColor: isDark ? 'rgba(255, 184, 0, 0.40)' : 'rgba(224, 154, 0, 0.25)',
              },
            ]}
          >
            <Icon name="sparkles" size={15} color={tokens.macros.carbs} />
          </View>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.title, { color: tokens.macros.carbs }]}
          >
            AI Smart Nudge
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={[styles.closeBtn, Platform.OS === 'web' && { outlineStyle: 'none', cursor: 'pointer' }]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss Nudge"
        >
          <Icon name="close" size={17} color={tokens.text.secondary} />
        </TouchableOpacity>
      </View>

      <Text
        allowFontScaling={true}
        maxFontSizeMultiplier={1.3}
        style={[styles.suggestionText, { color: tokens.text.primary }]}
      >
        {suggestion}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    marginBottom: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closeBtn: {
    padding: 4,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
});
