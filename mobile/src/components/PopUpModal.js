import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function PopUpModal({ visible, title, message, icon = 'checkmark-circle', type = 'success', onClose }) {
  const { isDark, themeColors, glassStyles } = useTheme();
  if (!visible) return null;

  const iconColors = {
    success: '#10B981',
    info: '#3B82F6',
    warning: '#F59E0B',
    danger: '#EF4444'
  };

  const accentColor = iconColors[type] || '#10B981';

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(9, 9, 11, 0.75)' : 'rgba(0, 0, 0, 0.4)' }]}>
        <View style={[glassStyles.modalContent, styles.modalCard, { borderColor: `${accentColor}50` }]}>
          <View style={[styles.iconRing, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}40` }]}>
            <Ionicons name={icon} size={36} color={accentColor} />
          </View>

          <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title || 'Success'}</Text>
          {message ? <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text> : null}

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: accentColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    borderWidth: 1.5,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
