import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function NeuInset({ children, style, radius, ...props }) {
  const { tokens, isDark } = useTheme();

  const borderRadius = radius || tokens.radii.md;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.neumorphic.inset,
          borderColor: tokens.neumorphic.border,
          borderRadius,
          ...(Platform.OS === 'web' ? {
            boxShadow: isDark
              ? 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.6), inset 0 1px 2px 0 rgba(0, 0, 0, 0.4)'
              : 'inset 0 2px 4px 0 rgba(197, 206, 218, 0.6), inset 0 -1px 2px 0 rgba(255, 255, 255, 0.9)',
          } : {}),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});

