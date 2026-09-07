/**
 * Database Router — Cloud-first via Firestore.
 * All operations go through database.cloud.js (Firebase / Firestore).
 * Local SQLite / AsyncStorage are no longer used for primary data.
 */

export {
  getLocalUser,
  createLocalUser,
  updateLocalUser,
  insertFoodLog,
  updateFoodLog,
  deleteFoodLog,
  getFoodLogsForDate,
  getAllFoodLogs,
  exportLogsAsCsv,
  insertWeightLog,
  deleteWeightLog,
  getAllWeightLogs,
  getFavorites,
  insertFavorite,
  deleteFavorite,
  insertWorkoutLog,
  updateWorkoutLog,
  deleteWorkoutLog,
  getWorkoutLogsForDate,
  getWorkoutLogsForWeek,
  getWaterForDate,
  setWaterForDate,
  getCustomPresets,
  insertCustomPreset,
  deleteCustomPreset,
} from './database.cloud';
