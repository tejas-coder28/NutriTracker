import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import Icon from './Icon';

export default function NeuSegmented({
  options = [], // [{ value: 'login', label: 'Log In', icon?: string }, ...]
  value,
  onChange,
  style,
}) {
  const { tokens, isDark } = useTheme();

  const handleSelect = (val) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    if (onChange) onChange(val);
  };

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: tokens.neumorphic.inset,
          borderColor: tokens.neumorphic.border,
          borderRadius: tokens.radii.full,
          ...(Platform.OS === 'web' ? {
            boxShadow: isDark
              ? 'inset 0 2px 4px rgba(0,0,0,0.6)'
              : 'inset 0 2px 4px rgba(197,206,218,0.7)',
          } : {}),
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.85}
            onPress={() => handleSelect(opt.value)}
            style={[
              styles.segment,
              {
                borderRadius: tokens.radii.full,
                ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
              },
              isSelected && [
                styles.activeSegment,
                {
                  backgroundColor: tokens.neumorphic.raised,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  ...(Platform.OS === 'web' ? {
                    boxShadow: `-2px -2px 5px ${tokens.neu.lightShadow}, 2px 2px 6px ${tokens.neu.darkShadow}`,
                  } : {
                    shadowColor: tokens.colors.glassShadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 3,
                    elevation: 2,
                  }),
                },
              ],
            ]}
          >
            <View style={styles.contentRow}>
              {opt.icon && (
                <Icon
                  name={opt.icon}
                  size={14}
                  color={isSelected ? tokens.text.primary : tokens.text.muted}
                  style={styles.iconSlot}
                />
              )}
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.label,
                  {
                    color: isSelected ? tokens.text.primary : tokens.text.muted,
                    fontWeight: isSelected ? '700' : '500',
                    fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeSegment: {
    zIndex: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
