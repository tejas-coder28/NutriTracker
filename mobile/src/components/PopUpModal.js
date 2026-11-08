import React from 'react';
import { View, Text, StyleSheet, Modal, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './ui/Icon';
import LiquidButton from './primitives/LiquidButton';

export default function PopUpModal({ visible, title, message, icon = 'checkmark-circle', type = 'success', onClose }) {
  const { isDark, tokens } = useTheme();
  if (!visible) return null;

  const iconColors = {
    success: tokens.semantics.success,
    info: tokens.semantics.info,
    warning: tokens.semantics.warning,
    danger: tokens.semantics.danger,
  };

  const accentColor = iconColors[type] || tokens.primary;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(4, 4, 6, 0.75)' : 'rgba(15, 23, 42, 0.45)' }]}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: tokens.liquidGlass.fill,
              borderColor: accentColor,
              ...(Platform.OS === 'web' ? {
                backdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
                WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
                boxShadow: isDark
                  ? `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px ${accentColor}33`
                  : '0 16px 48px rgba(15, 23, 42, 0.18)',
              } : {}),
            },
          ]}
        >
          <View style={[styles.iconRing, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }]}>
            <Icon name={icon} size={34} color={accentColor} />
          </View>

          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.title, { color: tokens.text.primary, fontFamily: 'PlusJakartaSans_700Bold' }]}
          >
            {title || 'Success'}
          </Text>
          {message ? (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
              style={[styles.message, { color: tokens.text.secondary, fontFamily: 'PlusJakartaSans_500Medium' }]}
            >
              {message}
            </Text>
          ) : null}

          <LiquidButton
            onPress={onClose}
            title="Done"
            style={{ width: '100%', backgroundColor: accentColor }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
});
