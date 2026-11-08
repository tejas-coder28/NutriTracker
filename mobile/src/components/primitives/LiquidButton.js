import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Animated, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import Icon from './Icon';

export default function LiquidButton({
  children,
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'glass' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  disabled = false,
  style,
  textStyle,
  icon,
  ...props
}) {
  const { tokens, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const handlePress = (e) => {
    if (disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    if (onPress) onPress(e);
  };

  // Variant backgrounds
  let bg = tokens.primary;
  let textColor = tokens.text.primaryInverted;
  let borderColor = 'transparent';
  let glowShadow = tokens.primaryGlow;

  if (variant === 'secondary' || variant === 'glass') {
    bg = tokens.liquidGlass.fill;
    textColor = tokens.text.primary;
    borderColor = tokens.liquidGlass.rim;
    glowShadow = 'transparent';
  } else if (variant === 'danger') {
    bg = tokens.semantics.danger;
    textColor = tokens.colors.dangerText;
    borderColor = 'transparent';
    glowShadow = tokens.macros.caloriesGlow;
  }

  // Size padding
  const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const paddingHorizontal = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 20 : 18;

  const label = children !== undefined ? children : title;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return <View style={styles.iconSlot}>{icon}</View>;
    }
    if (typeof icon === 'string') {
      return (
        <View style={styles.iconSlot}>
          <Icon name={icon} size={iconSize} color={textColor} />
        </View>
      );
    }
    return null;
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, disabled && { opacity: 0.5 }]}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        style={[
          styles.button,
          {
            backgroundColor: bg,
            borderColor,
            borderWidth: borderColor !== 'transparent' ? 1 : 0,
            borderRadius: tokens.radii.full,
            paddingVertical,
            paddingHorizontal,
            minHeight: 44, // WCAG minimum touch target
            ...(Platform.OS === 'web' ? {
              backdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
              WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
              boxShadow: variant === 'primary'
                ? `0 8px 24px ${glowShadow}`
                : isDark
                ? '0 4px 16px rgba(0, 0, 0, 0.4)'
                : '0 4px 14px rgba(15, 23, 42, 0.08)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              outlineStyle: 'none',
            } : {
              shadowColor: variant === 'primary' ? tokens.primary : tokens.colors.glassShadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: variant === 'primary' ? 0.35 : 0.15,
              shadowRadius: 10,
              elevation: 4,
            }),
          },
          style,
        ]}
        {...props}
      >
        {/* Specular top highlight */}
        <View
          pointerEvents="none"
          style={[
            styles.specularHighlight,
            { backgroundColor: tokens.liquidGlass.specularHighlight },
          ]}
        />
        <View style={styles.contentRow}>
          {renderIcon()}
          {label !== undefined && label !== null && (
            typeof label === 'string' ? (
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.text,
                  {
                    color: textColor,
                    fontSize,
                    fontFamily: 'PlusJakartaSans_700Bold',
                  },
                  textStyle,
                ]}
              >
                {label}
              </Text>
            ) : (
              label
            )
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: '12%',
    right: '12%',
    height: 1.5,
    borderRadius: 1,
    opacity: 0.65,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
