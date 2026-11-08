import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function NeuRaised({
  children,
  onPress,
  style,
  radius,
  active = false,
  ...props
}) {
  const { tokens, isDark } = useTheme();

  const borderRadius = radius || tokens.radii.md;
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.container,
        {
          backgroundColor: active
            ? (isDark ? 'rgba(16, 232, 160, 0.15)' : 'rgba(0, 179, 119, 0.12)')
            : tokens.neumorphic.raised,
          borderColor: active ? tokens.primary : tokens.neumorphic.border,
          borderRadius,
          ...(Platform.OS === 'web' ? {
            boxShadow: `-3px -3px 7px ${tokens.neu.lightShadow}, 3px 3px 8px ${tokens.neu.darkShadow}`,
            cursor: onPress ? 'pointer' : 'default',
          } : {
            shadowColor: tokens.colors.glassShadow,
            shadowOffset: { width: 2, height: 3 },
            shadowOpacity: isDark ? 0.35 : 0.12,
            shadowRadius: 5,
            elevation: 3,
          }),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
