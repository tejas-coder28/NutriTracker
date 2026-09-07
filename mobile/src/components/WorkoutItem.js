import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WORKOUT_TYPES } from '../services/workoutService';
import { formatLoggedTime } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';

export default function WorkoutItem({ item, onDelete, onEdit }) {
  const { isDark, themeColors, glassStyles } = useTheme();
  const workoutInfo = WORKOUT_TYPES.find(w => w.id === item.workout_type) || { icon: 'fitness-outline', label: item.workout_type };
  const timeStr = formatLoggedTime(item.created_at || item.logged_time);

  return (
    <View style={[glassStyles.card, styles.card]}>
      <View style={styles.leftCol}>
        <View style={styles.iconCircle}>
          <Ionicons name={workoutInfo.icon} size={20} color="#10B981" />
        </View>
        <View style={styles.textGroup}>
          <Text style={[styles.workoutName, { color: themeColors.textPrimary }]}>{item.workout_type}</Text>
          <Text style={[styles.workoutMeta, { color: themeColors.textSecondary }]}>
            {item.duration_min} min • {item.intensity || 'moderate'}{timeStr ? ` • ${timeStr}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <View style={styles.burnBadge}>
          <Ionicons name="flame" size={14} color="#F87171" />
          <Text style={styles.burnText}>{Math.round(item.calories_burned || 0)} kcal</Text>
        </View>

        <View style={styles.actionsRow}>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(item)} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderColor: themeColors.cardBorderSubtle }]}>
              <Ionicons name="pencil" size={16} color={themeColors.protein} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(item.id)} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderColor: themeColors.cardBorderSubtle }]}>
              <Ionicons name="trash-outline" size={16} color="#F87171" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  burnText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
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
