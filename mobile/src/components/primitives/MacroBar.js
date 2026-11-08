import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function MacroBar({
  label,
  value = 0,
  target = 100,
  color,
  glowColor,
  unit = 'g',
  style,
}) {
  const { tokens, isDark } = useTheme();

  const numVal = Math.round(Number(value) || 0);
  const numTarget = Math.max(1, Math.round(Number(target) || 100));
  const pct = Math.min(100, Math.max(0, Math.round((numVal / numTarget) * 100)));
  const remaining = Math.max(0, numTarget - numVal);

  const barColor = color || tokens.primary;
  const barGlow = glowColor || (barColor + '55');

  return (
    <View style={[styles.container, style]}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.labelCol}>
          <View style={[styles.colorDot, { backgroundColor: barColor }]} />
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.labelText, { color: tokens.text.primary }]}
          >
            {label}
          </Text>
        </View>

        <View style={styles.valCol}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.valText, { color: barColor }]}
          >
            {numVal}
            <Text style={[styles.targetSub, { color: tokens.text.secondary }]}>
              {' '}/ {numTarget}{unit}
            </Text>
          </Text>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.remainingText, { color: tokens.text.secondary }]}
          >
            ({remaining}{unit} left)
          </Text>
        </View>
      </View>

      {/* Inset Neumorphic Track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: tokens.neumorphic.inset,
            borderColor: tokens.neumorphic.border,
            ...(Platform.OS === 'web' ? {
              boxShadow: isDark
                ? 'inset 0 2px 4px rgba(0, 0, 0, 0.6)'
                : 'inset 0 2px 4px rgba(197, 206, 218, 0.65)',
            } : {}),
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: barColor,
              ...(Platform.OS === 'web' ? {
                boxShadow: `0 0 10px ${barGlow}`,
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              } : {
                shadowColor: barColor,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 2,
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  labelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  valCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  valText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  targetSub: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'SpaceGrotesk_500Medium',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});

