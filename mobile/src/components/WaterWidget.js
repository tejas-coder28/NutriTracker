import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getWaterForDate, setWaterForDate } from '../services/database';
import { getLocalDateStr } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './primitives/GlassCard';
import LiquidButton from './primitives/LiquidButton';
import NeuInset from './primitives/NeuInset';
import Icon from './ui/Icon';

export default function WaterWidget({ dateStr, waterGoal = 8, onWaterUpdated }) {
  const { tokens, isDark } = useTheme();
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

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
  const iconsToShow = Math.min(12, Math.max(goal, 8));

  const waterColor = tokens.macros.water;
  const waterGlow = tokens.macros.waterGlow;

  return (
    <GlassCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.12)',
                borderColor: isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(14, 165, 233, 0.25)',
              },
            ]}
          >
            <Icon name="water" size={18} color={waterColor} />
          </View>
          <View>
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
              style={[styles.title, { color: tokens.text.primary }]}
            >
              Water Intake
            </Text>
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
              style={[styles.subText, { color: tokens.text.secondary }]}
            >
              {glasses} of {goal} glasses ({pct}%)
            </Text>
          </View>
        </View>

        {/* Stepper Controls */}
        <View style={styles.controlsRow}>
          {/* Neumorphic Minus Stepper */}
          <TouchableOpacity
            style={[
              styles.stepperBtn,
              {
                backgroundColor: tokens.neumorphic.inset,
                borderColor: tokens.neumorphic.border,
                opacity: glasses === 0 ? 0.35 : 1,
              },
            ]}
            onPress={() => handleAddGlass(-1)}
            disabled={glasses === 0}
          >
            <Icon name="remove" size={15} color={tokens.text.primary} />
          </TouchableOpacity>

          {/* Liquid Glass +1 Button */}
          <LiquidButton
            size="sm"
            onPress={() => handleAddGlass(1)}
            icon="add"
            style={styles.addBtn}
          >
            +1 Glass
          </LiquidButton>
        </View>
      </View>

      {/* Inset Progress Bar */}
      <NeuInset radius={4} style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: waterColor,
              ...(Platform.OS === 'web' ? {
                boxShadow: `0 0 10px ${waterGlow}`,
                transition: 'width 0.4s ease',
              } : {}),
            },
          ]}
        />
      </NeuInset>

      {/* Neumorphic Droplets Row */}
      <View style={styles.dropletRow}>
        {Array.from({ length: iconsToShow }).map((_, idx) => {
          const isFilled = idx < glasses;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.75}
              style={[
                styles.dropletSlot,
                {
                  backgroundColor: isFilled
                    ? (isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(14, 165, 233, 0.20)')
                    : tokens.neumorphic.inset,
                  borderColor: isFilled ? waterColor : tokens.neumorphic.border,
                  ...(isFilled && Platform.OS === 'web'
                    ? { boxShadow: `0 0 8px ${waterGlow}` }
                    : {}),
                },
              ]}
              onPress={() => handleAddGlass(isFilled && idx === glasses - 1 ? -1 : (idx + 1) - glasses)}
            >
              <Icon
                name={isFilled ? 'water' : 'water-outline'}
                size={18}
                color={isFilled ? waterColor : tokens.text.muted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.15,
  },
  subText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'SpaceGrotesk_500Medium',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  addBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 34,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  dropletRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  dropletSlot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
