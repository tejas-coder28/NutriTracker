import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { WORKOUT_TYPES } from '../services/workoutService';
import { formatLoggedTime } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './primitives/GlassCard';
import Icon from './ui/Icon';

export default function WorkoutItem({ item, onDelete, onEdit }) {
  const { tokens, isDark } = useTheme();
  const workoutInfo = WORKOUT_TYPES.find(w => w.id === item.workout_type) || { icon: 'fitness-outline', label: item.workout_type };
  const timeStr = formatLoggedTime(item.created_at || item.logged_time);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.leftCol}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark ? 'rgba(16, 232, 160, 0.15)' : 'rgba(0, 179, 119, 0.12)',
              borderColor: isDark ? 'rgba(16, 232, 160, 0.35)' : 'rgba(0, 179, 119, 0.25)',
            },
          ]}
        >
          <Icon name={workoutInfo.icon} size={20} color={tokens.primary} />
        </View>
        <View style={styles.textGroup}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.workoutName, { color: tokens.text.primary }]}
          >
            {item.workout_type}
          </Text>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.workoutMeta, { color: tokens.text.secondary }]}
          >
            {item.duration_min} min • {item.intensity || 'moderate'}{timeStr ? ` • ${timeStr}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <View
          style={[
            styles.burnBadge,
            {
              backgroundColor: isDark ? 'rgba(255, 77, 77, 0.15)' : 'rgba(224, 58, 58, 0.12)',
              borderColor: isDark ? 'rgba(255, 77, 77, 0.35)' : 'rgba(224, 58, 58, 0.25)',
            },
          ]}
        >
          <Icon name="flame" size={13} color={tokens.macros.calories} />
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.burnText, { color: tokens.macros.calories }]}
          >
            {Math.round(item.calories_burned || 0)} kcal
          </Text>
        </View>

        <View style={styles.actionsRow}>
          {onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(item)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: tokens.neumorphic.inset,
                  borderColor: tokens.neumorphic.border,
                  ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
                },
              ]}
            >
              <Icon name="pencil" size={15} color={tokens.macros.protein} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(item.id)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: tokens.neumorphic.inset,
                  borderColor: tokens.neumorphic.border,
                  ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
                },
              ]}
            >
              <Icon name="trash-outline" size={15} color={tokens.semantics.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  textGroup: {
    flex: 1,
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '700',
  },
  workoutMeta: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  burnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  burnText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    padding: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
});
