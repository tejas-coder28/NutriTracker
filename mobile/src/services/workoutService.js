/**
 * Workout & Streak Service
 * Calculates MET calorie burn, updates user streaks, manages milestone badges and presets.
 */
import { updateLocalUser } from './database';
import { getLocalDateStr, addDaysToDateStr } from '../utils/dateUtils';

export const WORKOUT_TYPES = [

  { id: 'Walking', label: 'Walking', icon: 'walk-outline', mets: { light: 2.5, moderate: 3.5, intense: 5.0 } },
  { id: 'Running', label: 'Running', icon: 'fitness-outline', mets: { light: 6.0, moderate: 9.0, intense: 11.5 } },
  { id: 'Cycling', label: 'Cycling', icon: 'bicycle-outline', mets: { light: 4.0, moderate: 7.0, intense: 10.0 } },
  { id: 'Swimming', label: 'Swimming', icon: 'water-outline', mets: { light: 5.0, moderate: 7.0, intense: 9.5 } },
  { id: 'Weight Training', label: 'Weight Training', icon: 'barbell-outline', mets: { light: 3.0, moderate: 4.5, intense: 6.0 } },
  { id: 'Yoga', label: 'Yoga', icon: 'body-outline', mets: { light: 2.5, moderate: 3.0, intense: 4.0 } },
  { id: 'HIIT', label: 'HIIT', icon: 'flame-outline', mets: { light: 7.0, moderate: 9.0, intense: 12.0 } },
  { id: 'Sports', label: 'Sports', icon: 'football-outline', mets: { light: 5.0, moderate: 7.0, intense: 10.0 } },
  { id: 'Other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline', mets: { light: 3.5, moderate: 5.0, intense: 7.0 } },
];

export const WORKOUT_PRESETS = [
  { title: '30m Morning Walk', type: 'Walking', duration_min: 30, intensity: 'moderate' },
  { title: '45m Weight Session', type: 'Weight Training', duration_min: 45, intensity: 'moderate' },
  { title: '30m Cardio Run', type: 'Running', duration_min: 30, intensity: 'moderate' },
  { title: '20m Quick HIIT', type: 'HIIT', duration_min: 20, intensity: 'intense' },
  { title: '30m Yoga Flow', type: 'Yoga', duration_min: 30, intensity: 'light' },
  { title: '45m Outdoor Cycling', type: 'Cycling', duration_min: 45, intensity: 'moderate' },
];

export const MILESTONE_BADGES = [
  { id: 3, title: '3-Day Spark', icon: 'flame-outline', desc: 'Logged food & workout for 3 consecutive days', minStreak: 3, color: '#F59E0B' },
  { id: 7, title: '7-Day Warrior', icon: 'trophy-outline', desc: 'Maintained a 1-week fitness streak!', minStreak: 7, color: '#10B981' },
  { id: 14, title: '14-Day Machine', icon: 'flash-outline', desc: '2 solid weeks of consistent logging', minStreak: 14, color: '#3B82F6' },
  { id: 30, title: '30-Day Master', icon: 'ribbon-outline', desc: '1 month of consistent dedication!', minStreak: 30, color: '#8B5CF6' },
  { id: 60, title: '60-Day Titan', icon: 'medal-outline', desc: '2 full months of healthy living', minStreak: 60, color: '#EC4899' },
  { id: 100, title: '100-Day Legend', icon: 'star-outline', desc: 'Century club! Peak health lifestyle', minStreak: 100, color: '#EF4444' },
];

/**
 * Calculates calories burned using MET formula:
 * Calories burned = MET × weight (kg) × duration (hours)
 */
export function calculateCaloriesBurned(workoutType, durationMin, intensity = 'moderate', userWeight = 75) {
  const workout = WORKOUT_TYPES.find(w => w.id === workoutType) || WORKOUT_TYPES[0];
  const met = workout.mets[intensity] || workout.mets.moderate || 3.5;
  const hours = Math.max(0, durationMin) / 60;
  const weight = Math.max(30, Number(userWeight) || 75);
  return Math.round(met * weight * hours);
}

/**
 * Checks and updates the user's streak based on today's logs.
 * A streak day requires at least 1 food log AND at least 1 workout log.
 */
export async function checkAndUpdateStreak(user, todayFoodCount, todayWorkoutCount) {
  if (!user) return user;

  const todayStr = getLocalDateStr();
  const yesterdayStr = addDaysToDateStr(todayStr, -1);

  const hasFood = todayFoodCount > 0;

  const hasWorkout = todayWorkoutCount > 0;
  const isTodayComplete = hasFood && hasWorkout;

  let currentStreak = user.streak_current || 0;
  let longestStreak = user.streak_longest || 0;
  let lastCreditedDate = user.streak_last_date || null;

  if (isTodayComplete) {
    if (lastCreditedDate === todayStr) {
      // Already credited for today, no change
      return user;
    } else if (lastCreditedDate === yesterdayStr) {
      // Continued streak from yesterday
      currentStreak += 1;
    } else if (!lastCreditedDate || lastCreditedDate < yesterdayStr) {
      // Streak broken or starting new
      currentStreak = 1;
    }
    lastCreditedDate = todayStr;
  } else {
    // Today not complete yet
    // Check if yesterday or earlier was missed to reset current streak preview
    if (lastCreditedDate && lastCreditedDate < yesterdayStr) {
      currentStreak = 0;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Update in DB if anything changed
  if (
    currentStreak !== user.streak_current ||
    longestStreak !== user.streak_longest ||
    lastCreditedDate !== user.streak_last_date
  ) {
    const updatedUser = await updateLocalUser({
      streak_current: currentStreak,
      streak_longest: longestStreak,
      streak_last_date: lastCreditedDate,
    });
    return updatedUser;
  }

  return user;
}
