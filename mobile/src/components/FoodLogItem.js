import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatLoggedTime } from '../utils/dateUtils';
import GlassCard from './primitives/GlassCard';
import Icon from './ui/Icon';

const mealIcons = {
  breakfast: 'sunny-outline',
  lunch: 'fast-food-outline',
  dinner: 'restaurant-outline',
  snack: 'nutrition-outline'
};

export default function FoodLogItem({ item, onDelete, onEdit }) {
  const { tokens, isDark } = useTheme();

  const mealColors = {
    breakfast: tokens.meals.breakfast,
    lunch: tokens.meals.lunch,
    dinner: tokens.meals.dinner,
    snack: tokens.meals.snack,
  };

  const iconName = mealIcons[item.meal_type] || 'restaurant-outline';
  const accentColor = mealColors[item.meal_type] || tokens.meals.lunch;
  const localImageUri = item.image_path || item.image_url || null;
  const timeStr = formatLoggedTime(item.created_at || item.logged_time);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.leftContainer}>
        {localImageUri ? (
          <Image
            source={{ uri: localImageUri }}
            style={[styles.imageThumbnail, { borderColor: tokens.glass.border }]}
          />
        ) : (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark ? `${accentColor}25` : `${accentColor}18`,
                borderColor: `${accentColor}40`,
              },
            ]}
          >
            <Icon name={iconName} size={20} color={accentColor} />
          </View>
        )}
        <View style={styles.infoContainer}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.foodName, { color: tokens.text.primary }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={styles.mealBadgeRow}>
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
              style={[styles.mealBadge, { color: accentColor }]}
            >
              {(item.meal_type || 'snack').toUpperCase()}{timeStr ? ` • ${timeStr}` : ''}
            </Text>
            <View style={[styles.macroPill, { borderColor: tokens.neumorphic.border, backgroundColor: tokens.neumorphic.inset }]}>
              <View style={[styles.macroDot, { backgroundColor: tokens.macros.protein }]} />
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.macroPillText, { color: tokens.text.secondary }]}
              >
                {Math.round(item.protein || 0)}g
              </Text>
            </View>
            <View style={[styles.macroPill, { borderColor: tokens.neumorphic.border, backgroundColor: tokens.neumorphic.inset }]}>
              <View style={[styles.macroDot, { backgroundColor: tokens.macros.carbs }]} />
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.macroPillText, { color: tokens.text.secondary }]}
              >
                {Math.round(item.carbs || 0)}g
              </Text>
            </View>
            <View style={[styles.macroPill, { borderColor: tokens.neumorphic.border, backgroundColor: tokens.neumorphic.inset }]}>
              <View style={[styles.macroDot, { backgroundColor: tokens.macros.fat }]} />
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.macroPillText, { color: tokens.text.secondary }]}
              >
                {Math.round(item.fat || 0)}g
              </Text>
            </View>
            {item.fiber > 0 && (
              <View style={[styles.macroPill, { borderColor: tokens.neumorphic.border, backgroundColor: tokens.neumorphic.inset }]}>
                <View style={[styles.macroDot, { backgroundColor: tokens.macros.fiber }]} />
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.macroPillText, { color: tokens.text.secondary }]}
                >
                  {Math.round(item.fiber)}g
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rightContainer}>
        <View style={styles.calorieContainer}>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.calorieText, { color: tokens.primary }]}
          >
            {Math.round(item.calories || 0)}
          </Text>
          <Text
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
            style={[styles.calorieUnit, { color: tokens.text.secondary }]}
          >
            kcal
          </Text>
        </View>
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={[
              styles.actionButton,
              {
                backgroundColor: tokens.neumorphic.inset,
                borderColor: tokens.neumorphic.border,
                ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
              },
            ]}
          >
            <Icon name="pencil-outline" size={16} color={tokens.macros.protein} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={[
              styles.actionButton,
              {
                backgroundColor: tokens.neumorphic.inset,
                borderColor: tokens.neumorphic.border,
                ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
              },
            ]}
          >
            <Icon name="trash-outline" size={16} color={tokens.semantics.danger} />
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 13,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  infoContainer: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 4,
  },
  mealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  mealBadge: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.6,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  macroDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  macroPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calorieContainer: {
    alignItems: 'flex-end',
  },
  calorieText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  calorieUnit: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  actionButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
