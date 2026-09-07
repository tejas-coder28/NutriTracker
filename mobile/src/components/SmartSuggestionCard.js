import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateSmartSuggestion } from '../services/aiService';
import { getLocalDateStr } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark, themeColors, glassStyles } = useTheme();
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

      // Check cache first
      const cachedDataRaw = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedDataRaw) {
        const cached = JSON.parse(cachedDataRaw);
        if (cached.stateHash === stateHash && cached.text) {
          setSuggestion(cached.text);
          setLoading(false);
          return;
        }
      }

      // Generate new suggestion using Gemini / fallback
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

      // Save to cache
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
    <View style={[glassStyles.card, s.card]}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <View style={[s.iconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.12)', borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.30)' }]}>
            <Ionicons name="sparkles" size={16} color={isDark ? '#FBBF24' : '#D97706'} />
          </View>
          <Text style={[s.title, { color: isDark ? '#FBBF24' : '#D97706' }]}>Smart AI Nudge</Text>
        </View>

        <TouchableOpacity onPress={() => setDismissed(true)} style={s.closeBtn}>
          <Ionicons name="close" size={18} color={themeColors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[s.suggestionText, { color: themeColors.textPrimary }]}>{suggestion}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 15,
    borderColor: 'rgba(245, 158, 11, 0.35)',
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
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 3,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
});
