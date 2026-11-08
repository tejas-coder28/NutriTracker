import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

export default function GradientRing({
  size = 196,
  strokeWidth = 14,
  progress = 0, // 0 to 100
  color,
  gradientStart,
  gradientEnd,
  value = 0,
  target = 2000,
  label = 'kcal left',
  subtext,
  style,
}) {
  const { tokens, isDark } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (circumference * clampedProgress) / 100;

  const startColor = gradientStart || color || tokens.heroGradientStart;
  const endColor = gradientEnd || color || tokens.heroGradientEnd;
  const trackColor = tokens.neumorphic.inset;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={startColor} />
            <Stop offset="100%" stopColor={endColor} />
          </LinearGradient>
        </Defs>

        {/* Inset background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Ambient glow stroke under the main arc */}
        {clampedProgress > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={startColor}
            strokeWidth={strokeWidth + 4}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            opacity={isDark ? 0.28 : 0.15}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}

        {/* Main active gradient progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Glass center readout */}
      <View
        style={[
          styles.glassCenter,
          {
            width: size - strokeWidth * 2 - 12,
            height: size - strokeWidth * 2 - 12,
            borderRadius: (size - strokeWidth * 2 - 12) / 2,
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
          style={[styles.value, { color: tokens.text.primary }]}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
          style={[styles.label, { color: tokens.text.secondary }]}
        >
          {label}
        </Text>
        {subtext && (
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.subtext, { color: tokens.text.secondary }]}
          >
            {subtext}
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 2,
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  subtext: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 2,
  },
});

