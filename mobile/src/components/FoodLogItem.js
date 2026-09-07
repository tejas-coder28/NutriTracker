import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatLoggedTime } from '../utils/dateUtils';

const mealIcons = {
  breakfast: 'sunny-outline',
  lunch: 'fast-food-outline',
  dinner: 'restaurant-outline',
  snack: 'nutrition-outline'
};

export default function FoodLogItem({ item, onDelete, onEdit }) {
  const { isDark, themeColors, glassStyles } = useTheme();

  const mealColors = {
    breakfast: themeColors.mealBreakfast,
    lunch: themeColors.mealLunch,
    dinner: themeColors.mealDinner,
    snack: themeColors.mealSnack,
  };

  const iconName = mealIcons[item.meal_type] || 'restaurant-outline';
  const accentColor = mealColors[item.meal_type] || themeColors.mealLunch;
  const localImageUri = item.image_path || item.image_data || item.image_url || null;
  const timeStr = formatLoggedTime(item.created_at || item.logged_time);

  return (
    <View style={[glassStyles.card, styles.card]}>
      <View style={styles.leftContainer}>
        {localImageUri ? (
          <Image source={{ uri: localImageUri }} style={styles.imageThumbnail} />
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}25`, borderColor: `${accentColor}40` }]}>
            <Ionicons name={iconName} size={22} color={accentColor} />
          </View>
        )}
        <View style={styles.infoContainer}>
          <Text style={[styles.foodName, { color: themeColors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <View style={styles.mealBadgeRow}>
            <Text style={[styles.mealBadge, { color: accentColor }]}>
              {(item.meal_type || 'snack').toUpperCase()}{timeStr ? ` • ${timeStr}` : ''}
            </Text>
            <Text style={[styles.macroPill, { color: themeColors.textSecondary, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: themeColors.cardBorderSubtle }]}>
              P: {Math.round(item.protein || 0)}g
            </Text>
            <Text style={[styles.macroPill, { color: themeColors.textSecondary, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: themeColors.cardBorderSubtle }]}>
              C: {Math.round(item.carbs || 0)}g
            </Text>
            <Text style={[styles.macroPill, { color: themeColors.textSecondary, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: themeColors.cardBorderSubtle }]}>
              F: {Math.round(item.fat || 0)}g
            </Text>
            {(item.fiber > 0) && (
              <Text style={[styles.macroPill, { color: themeColors.textSecondary, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: themeColors.cardBorderSubtle }]}>
                Fib: {Math.round(item.fiber)}g
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rightContainer}>
        <View style={styles.calorieContainer}>
          <Text style={[styles.calorieText, { color: themeColors.primary }]}>{Math.round(item.calories || 0)}</Text>
          <Text style={[styles.calorieUnit, { color: themeColors.textSecondary }]}>kcal</Text>
        </View>
        {onEdit && (
          <TouchableOpacity onPress={() => onEdit(item)} style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderColor: themeColors.cardBorderSubtle }]}>
            <Ionicons name="pencil-outline" size={18} color={themeColors.protein} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(item.id)} style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderColor: themeColors.cardBorderSubtle }]}>
            <Ionicons name="trash-outline" size={18} color="#F87171" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  imageThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  infoContainer: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  mealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  mealBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  macroPill: {
    fontSize: 11,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calorieContainer: {
    alignItems: 'flex-end',
  },
  calorieText: {
    fontSize: 16,
    fontWeight: '800',
  },
  calorieUnit: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
