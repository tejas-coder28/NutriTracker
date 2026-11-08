import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ThemedText({
  variant = 'body',
  tone = 'primary',
  color,
  style,
  children,
  numberOfLines,
  ...props
}) {
  const { tokens } = useTheme();

  // Resolve typography variant style
  const typographyStyle = tokens.typography[variant] || tokens.typography.body;

  // Resolve color
  let resolvedColor = color;
  if (!resolvedColor) {
    switch (tone) {
      case 'secondary':
      case 'muted': // Auto-mapped to secondary for >= 4.5:1 contrast requirement
        resolvedColor = tokens.text.secondary;
        break;
      case 'accent':
        resolvedColor = tokens.primary;
        break;
      case 'danger':
        resolvedColor = tokens.semantics.danger;
        break;
      case 'warning':
        resolvedColor = tokens.semantics.warning;
        break;
      case 'calories':
        resolvedColor = tokens.macros.calories;
        break;
      case 'protein':
        resolvedColor = tokens.macros.protein;
        break;
      case 'carbs':
        resolvedColor = tokens.macros.carbs;
        break;
      case 'fat':
        resolvedColor = tokens.macros.fat;
        break;
      case 'fiber':
        resolvedColor = tokens.macros.fiber;
        break;
      case 'water':
        resolvedColor = tokens.macros.water;
        break;
      case 'inverse':
        resolvedColor = tokens.text.primaryInverted;
        break;
      case 'primary':
      default:
        resolvedColor = tokens.text.primary;
        break;
    }
  }

  // Flatten styles to enforce minimum 12px font size rule
  const flattened = StyleSheet.flatten([typographyStyle, { color: resolvedColor }, style]);
  if (flattened && typeof flattened.fontSize === 'number' && flattened.fontSize < 12) {
    flattened.fontSize = 12;
  }

  return (
    <Text
      allowFontScaling={true}
      maxFontSizeMultiplier={1.3}
      numberOfLines={numberOfLines}
      style={flattened}
      {...props}
    >
      {children}
    </Text>
  );
}

