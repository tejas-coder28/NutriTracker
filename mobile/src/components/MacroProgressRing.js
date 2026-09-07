import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

export default function MacroProgressRing({
  size = 140,
  strokeWidth = 12,
  progress = 0, // 0 to 100
  color = '#10B981', // green accent
  backgroundColor,
  label = 'Calories',
  value = 0,
  target = 2000,
  unit = 'kcal'
}) {
  const { isDark, themeColors } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (circumference * clampedProgress) / 100;

  const trackColor = backgroundColor || (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)');

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Track Circle */}
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc Circle */}
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.contentContainer}>
        <Text style={[styles.valueText, { color: themeColors.textPrimary }]}>{value}</Text>
        <Text style={[styles.targetText, { color: themeColors.textSecondary }]}>/ {target} {unit}</Text>
        <Text style={[styles.labelText, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  contentContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 22,
    fontWeight: '800',
  },
  targetText: {
    fontSize: 11,
    marginTop: -2,
    fontWeight: '500',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
