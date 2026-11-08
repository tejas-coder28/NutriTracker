import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import Icon from './Icon';

export default function NeuSwitch({ value, onToggle, style }) {
  const { tokens, isDark } = useTheme();
  const isOn = value !== undefined ? value : isDark; // true = dark/moon, false = light/sun

  const animX = useRef(new Animated.Value(isOn ? 26 : 2)).current;

  useEffect(() => {
    Animated.spring(animX, {
      toValue: isOn ? 26 : 2,
      useNativeDriver: true,
      speed: 24,
      bounciness: 4,
    }).start();
  }, [isOn]);

  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    if (onToggle) onToggle(!isOn);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn }}
      accessibilityLabel="Toggle Dark / Light Theme"
      style={[
        styles.track,
        {
          backgroundColor: tokens.neumorphic.inset,
          borderColor: tokens.neumorphic.border,
          ...(Platform.OS === 'web' ? {
            boxShadow: isDark
              ? 'inset 0 2px 4px rgba(0,0,0,0.6)'
              : 'inset 0 2px 4px rgba(197,206,218,0.7)',
            outlineStyle: 'none',
            cursor: 'pointer',
          } : {}),
        },
        style,
      ]}
    >
      {/* Background Icons */}
      <View style={styles.iconRow}>
        <Icon name="sunny" size={13} color={isDark ? tokens.text.muted : tokens.semantics.warning} />
        <Icon name="moon" size={12} color={isDark ? tokens.primary : tokens.text.muted} />
      </View>

      {/* Raised sliding knob */}
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: tokens.neumorphic.raised,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            transform: [{ translateX: animX }],
            ...(Platform.OS === 'web' ? {
              boxShadow: isDark
                ? `-1px -1px 3px ${tokens.neu.lightShadow}, 2px 2px 4px ${tokens.neu.darkShadow}`
                : `-2px -2px 4px ${tokens.neu.lightShadow}, 2px 2px 4px ${tokens.neu.darkShadow}`,
            } : {
              shadowColor: tokens.colors.glassShadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3,
              elevation: 3,
            }),
          },
        ]}
      >
        <Icon
          name={isOn ? 'moon' : 'sunny'}
          size={12}
          color={isOn ? tokens.primary : tokens.semantics.warning}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 54,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  knob: {
    position: 'absolute',
    top: 2,
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
