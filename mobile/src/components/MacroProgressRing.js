import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

export default function MacroProgressRing({
  size = 180,
  strokeWidth = 14,
  progress = 0, // 0 to 100
  color,
  backgroundColor,
  label = 'Calories',
  value = 0,
  target = 2000,
  unit = 'kcal',
  sublabel,
}) {
  const { tokens, isDark } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (circumference * clampedProgress) / 100;

  const activeColor = color || tokens.primary;
  const trackColor = backgroundColor || tokens.neumorphic.inset;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="macroRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={activeColor} />
            <Stop offset="100%" stopColor={tokens.primaryLight || activeColor} />
          </LinearGradient>
        </Defs>

        {/* Inset background track */}
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Soft glow stroke */}
        {clampedProgress > 0 && (
          <Circle
            stroke={activeColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth + 4}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            opacity={isDark ? 0.3 : 0.15}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}

        {/* Main progress arc */}
        <Circle
          stroke="url(#macroRingGrad)"
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

      {/* Glass center */}
      <View
        style={[
          styles.glassCenter,
          {
            width: size - strokeWidth * 2 - 10,
            height: size - strokeWidth * 2 - 10,
            borderRadius: (size - strokeWidth * 2 - 10) / 2,
            backgroundColor: tokens.liquidGlass.fill,
            borderColor: tokens.liquidGlass.rim,
            ...(Platform.OS === 'web' ? {
              backdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
              WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
            } : {}),
          },
        ]}
      >
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
          style={[styles.valueText, { color: tokens.text.primary }]}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
          style={[styles.targetText, { color: tokens.text.secondary }]}
        >
          / {typeof target === 'number' ? target.toLocaleString() : target} {unit}
        </Text>
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
          style={[styles.labelText, { color: activeColor }]}
        >
          {label}
        </Text>
        {sublabel && (
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.sublabelText, { color: tokens.text.secondary }]}
          >
            {sublabel}
          </Text>
        )}
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
  glassCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 2,
  },
  valueText: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  targetText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sublabelText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 1,
  },
});
