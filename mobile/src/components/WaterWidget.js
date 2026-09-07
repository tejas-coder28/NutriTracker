import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWaterForDate, setWaterForDate } from '../services/database';
import { getLocalDateStr } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';

export default function WaterWidget({ dateStr, waterGoal = 8, onWaterUpdated }) {
  const { isDark, themeColors, glassStyles } = useTheme();
  const [glasses, setGlasses] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = dateStr || getLocalDateStr();

  useEffect(() => {
    fetchWater();
  }, [today]);

  const fetchWater = async () => {
    try {
      setLoading(true);
      const data = await getWaterForDate(today);
      setGlasses(data?.glasses || 0);
    } catch (e) {
      console.error('Fetch water error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGlass = async (delta) => {
    const nextVal = Math.max(0, glasses + delta);
    setGlasses(nextVal);
    try {
      await setWaterForDate(today, nextVal);
      if (onWaterUpdated) onWaterUpdated(nextVal);
    } catch (e) {
      console.error('Set water error:', e);
    }
  };

  const goal = Math.max(1, Number(waterGoal) || 8);
  const pct = Math.min(100, Math.round((glasses / goal) * 100));

  // Render up to goal glasses
  const iconsToShow = Math.min(12, Math.max(goal, 8));

  return (
    <View style={[glassStyles.card, s.card]}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <View style={s.iconWrap}>
            <Ionicons name="water" size={18} color="#60A5FA" />
          </View>
          <View>
            <Text style={[s.title, { color: themeColors.textPrimary }]}>Water Intake</Text>
            <Text style={[s.subText, { color: themeColors.textSecondary }]}>{glasses} of {goal} glasses ({pct}%)</Text>
          </View>
        </View>

        <View style={s.controlsRow}>
          <TouchableOpacity
            style={[s.miniBtn, glasses === 0 && { opacity: 0.3 }]}
            onPress={() => handleAddGlass(-1)}
            disabled={glasses === 0}
          >
            <Ionicons name="remove" size={16} color={glasses === 0 ? themeColors.textMuted : '#60A5FA'} />
          </TouchableOpacity>

          <TouchableOpacity style={s.addBtn} onPress={() => handleAddGlass(1)}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnText}>+1 Glass</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]}>
        <View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>

      {/* Glass Icons Grid */}
      <View style={s.glassRow}>
        {Array.from({ length: iconsToShow }).map((_, idx) => {
          const isFilled = idx < glasses;
          return (
            <TouchableOpacity
              key={idx}
              style={s.glassIconTouch}
              onPress={() => handleAddGlass(isFilled && idx === glasses - 1 ? -1 : (idx + 1) - glasses)}
            >
              <Ionicons
                name={isFilled ? 'water' : 'water-outline'}
                size={22}
                color={isFilled ? '#60A5FA' : themeColors.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    marginBottom: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subText: {
    fontSize: 12,
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  miniBtnDisabled: {
    opacity: 0.3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
    borderRadius: 3,
  },
  glassRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  glassIconTouch: {
    padding: 2,
  },
});
