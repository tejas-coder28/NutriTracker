import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function GlassCard({ children, style, subtle = false, ...props }) {
  const { tokens, isDark } = useTheme();

  const fill = subtle ? tokens.glass.fillSubtle : tokens.glass.fill;
  const blur = subtle ? tokens.glass.blur * 0.75 : tokens.glass.blur;
  const radius = subtle ? tokens.radii.md : tokens.radii.lg;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: fill,
          borderColor: tokens.glass.border,
          borderRadius: radius,
          ...(Platform.OS === 'web' ? {
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            boxShadow: isDark
              ? '0 12px 36px 0 rgba(0, 0, 0, 0.45)'
              : '0 8px 28px 0 rgba(15, 23, 42, 0.08)',
          } : {
            shadowColor: tokens.glass.shadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 16,
            elevation: 4,
          }),
        },
        style,
      ]}
      {...props}
    >
      {/* Specular inner top highlight line */}
      <View
        pointerEvents="none"
        style={[
          styles.highlightLine,
          {
            backgroundColor: tokens.glass.highlight,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  highlightLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
});
