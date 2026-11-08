import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from './Icon';

export default function LiquidPill({
  children,
  title,
  icon,
  active = false,
  color,
  onPress,
  style,
  textStyle,
  iconSize = 14,
  ...props
}) {
  const { tokens, isDark } = useTheme();

  const accentColor = color || tokens.primary;
  const bg = active
    ? (isDark ? 'rgba(16, 232, 160, 0.20)' : 'rgba(0, 179, 119, 0.15)')
    : tokens.liquidGlass.fill;

  const borderColor = active
    ? accentColor
    : tokens.liquidGlass.rim;

  const textColor = active
    ? (isDark ? accentColor : tokens.text.primary)
    : tokens.text.secondary;

  const Wrapper = onPress ? TouchableOpacity : View;

  const label = children !== undefined ? children : title;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return <View style={styles.icon}>{icon}</View>;
    }
    if (typeof icon === 'string') {
      return (
        <View style={styles.icon}>
          <Icon name={icon} size={iconSize} color={textColor} />
        </View>
      );
    }
    return null;
  };

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderColor,
          borderRadius: tokens.radii.full,
          ...(Platform.OS === 'web' ? {
            backdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
            WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
            boxShadow: active
              ? `0 2px 10px ${accentColor}33`
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            cursor: onPress ? 'pointer' : 'default',
            userSelect: 'none',
            outlineStyle: 'none',
          } : {
            shadowColor: active ? accentColor : tokens.colors.glassShadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: active ? 0.25 : 0.08,
            shadowRadius: 4,
            elevation: 2,
          }),
        },
        style,
      ]}
      {...props}
    >
      {/* Specular highlight */}
      <View
        pointerEvents="none"
        style={[
          styles.specular,
          { backgroundColor: tokens.liquidGlass.specularHighlight },
        ]}
      />
      {renderIcon()}
      {label !== undefined && label !== null && (
        typeof label === 'string' ? (
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[
              styles.label,
              { color: textColor, fontFamily: 'PlusJakartaSans_600SemiBold' },
              textStyle,
            ]}
          >
            {label}
          </Text>
        ) : (
          label
        )
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    gap: 6,
    alignSelf: 'flex-start',
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
    opacity: 0.5,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
