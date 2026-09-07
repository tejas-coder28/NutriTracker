/**
 * Cloud Database Service — Firestore (Firebase)
 * All user data is stored per-account in Firestore under /users/{uid}/...
 * This replaces both database.web.js (AsyncStorage) and database.native.js (SQLite).
 *
 * Data structure:
 *   /users/{uid}                 → profile document
 *   /users/{uid}/food_logs/{id} → food log entries
 *   /users/{uid}/weight_logs/{id}
 *   /users/{uid}/workout_logs/{id}
 *   /users/{uid}/water_logs/{date} → { glasses: N }
 *   /users/{uid}/favorites/{id}
 *   /users/{uid}/custom_presets/{id}
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getLocalDateStr, isFutureDate } from '../utils/dateUtils';
import { compressFoodPhoto, getBase64SizeBytes } from './storageService';

// Firestore field string limit (~1 MB decoded). We cap at 800 KB to be safe.
const FIRESTORE_IMAGE_MAX_DECODED_BYTES = 800 * 1024;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUid() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated. Please log in.');
  return user.uid;
}

function userRef(uid) {
  return doc(db, 'users', uid);
}

function subCol(uid, name) {
  return collection(db, 'users', uid, name);
}

function subDoc(uid, colName, id) {
  return doc(db, 'users', uid, colName, String(id));
}

function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

/**
 * Load profile from Firestore. If email provided, that's the active user's uid via auth.
 */
export async function getLocalUser(email) {
  const uid = getUid();
  const snap = await getDoc(userRef(uid));
  if (snap.exists()) return { id: uid, ...snap.data() };
  return null;
}

/**
 * Write initial profile document to Firestore for a newly registered user.
 */
export async function createLocalUser(profile) {
  const uid = getUid();
  const cleanEmail = profile.email ? profile.email.toLowerCase().trim() : '';

  const userObj = {
    uid,
    name: profile.name || 'User',
    email: cleanEmail,
    age: profile.age || 25,
    gender: profile.gender || 'male',
    height: profile.height || 175,
    weight: profile.weight || 75,
    activity_level: profile.activity_level || 'moderate',
    goal_type: profile.goal_type || 'fat_loss',
    fat_loss_rate: profile.fat_loss_rate || 0.5,
    target_weight: profile.target_weight || 70,
    target_calories: profile.target_calories || 2000,
    target_protein: profile.target_protein || 150,
    target_carbs: profile.target_carbs || 200,
    target_fat: profile.target_fat || 60,
    target_fiber: profile.target_fiber || 30,
    pin: profile.pin || null,
    water_goal: profile.water_goal || 8,
    streak_current: profile.streak_current || 0,
    streak_longest: profile.streak_longest || 0,
    streak_last_date: profile.streak_last_date || null,
    has_completed_onboarding: profile.has_completed_onboarding !== undefined ? profile.has_completed_onboarding : false,
    created_at: new Date().toISOString(),
  };

  await setDoc(userRef(uid), userObj, { merge: true });
  return { id: uid, ...userObj };
}

/**
 * Update specific fields in the user's profile document.
 */
export async function updateLocalUser(profile) {
  const uid = getUid();
  const updates = stripUndefined({ ...profile });
  // Never store password in Firestore — Firebase Auth handles it
  delete updates.password;

  await setDoc(userRef(uid), updates, { merge: true });
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? { id: uid, ...snap.data() } : { id: uid, ...updates };
}

// ─── FOOD LOGS ────────────────────────────────────────────────────────────────

export async function insertFoodLog(entry) {
  const loggedAt = entry.logged_at || getLocalDateStr();
  if (isFutureDate(loggedAt)) throw new Error('Cannot log entries for future dates.');

  const uid = getUid();

  let finalImagePath = entry.image_path || null;
  if (finalImagePath && typeof finalImagePath === 'string') {
    try {
      finalImagePath = await compressFoodPhoto(finalImagePath);
    } catch (compressErr) {
      console.error('[insertFoodLog] Photo compression error:', compressErr);
      throw new Error(compressErr.message || 'Photo too large, please try a smaller image.');
    }

    // Hard guard: reject if still over Firestore limit after compression
    if (finalImagePath) {
      const decodedBytes = getBase64SizeBytes(finalImagePath);
      const base64Bytes = finalImagePath.length;
      console.log(
        `[insertFoodLog] Final image size BEFORE Firestore save: ` +
        `decoded=${(decodedBytes / 1024).toFixed(1)} KB, ` +
        `base64 string length=${(base64Bytes / 1024).toFixed(1)} KB`
      );
      if (decodedBytes > FIRESTORE_IMAGE_MAX_DECODED_BYTES) {
        throw new Error(
          `Compressed photo is still ${(decodedBytes / 1024).toFixed(0)} KB (limit: 800 KB). ` +
          'Please use a smaller image.'
        );
      }
    }
  }

  const newLog = {
    name: entry.name,
    meal_type: entry.meal_type || 'snack',
    grams_estimate: entry.grams_estimate || 200,
    calories: entry.calories || 0,
    protein: entry.protein || 0,
    carbs: entry.carbs || 0,
    fat: entry.fat || 0,
    fiber: entry.fiber || 0,
    image_path: finalImagePath,
    source: entry.source || 'text',
    items: entry.items || null,
    logged_at: loggedAt,
    created_at: entry.created_at || new Date().toISOString(),
  };

  const ref = await addDoc(subCol(uid, 'food_logs'), newLog);
  return { id: ref.id, user_id: uid, ...newLog };
}

export async function updateFoodLog(id, updates) {
  const uid = getUid();
  const ref = subDoc(uid, 'food_logs', id);

  const cleanUpdates = stripUndefined(updates);
  if (cleanUpdates.image_path && typeof cleanUpdates.image_path === 'string') {
    try {
      cleanUpdates.image_path = await compressFoodPhoto(cleanUpdates.image_path);
    } catch (compressErr) {
      console.error('[updateFoodLog] Photo compression error:', compressErr);
      throw new Error(compressErr.message || 'Photo too large, please try a smaller image.');
    }

    // Hard guard before Firestore write
    if (cleanUpdates.image_path) {
      const decodedBytes = getBase64SizeBytes(cleanUpdates.image_path);
      console.log(`[updateFoodLog] Final image size BEFORE save: decoded=${(decodedBytes / 1024).toFixed(1)} KB`);
      if (decodedBytes > FIRESTORE_IMAGE_MAX_DECODED_BYTES) {
        throw new Error(
          `Compressed photo is still ${(decodedBytes / 1024).toFixed(0)} KB (limit: 800 KB). ` +
          'Please use a smaller image.'
        );
      }
    }
  }

  await updateDoc(ref, cleanUpdates);
  const snap = await getDoc(ref);
  return snap.exists() ? { id, ...snap.data() } : null;
}

export async function deleteFoodLog(id) {
  const uid = getUid();
  const ref = subDoc(uid, 'food_logs', id);
  const snap = await getDoc(ref);
  const imagePath = snap.exists() ? snap.data().image_path : null;
  await deleteDoc(ref);
  return imagePath;
}

export async function getFoodLogsForDate(dateStr) {
  const uid = getUid();
  const q = query(subCol(uid, 'food_logs'), where('logged_at', '==', dateStr));
  const snap = await getDocs(q);

  const logs = snap.docs.map(d => ({ id: d.id, user_id: uid, ...d.data() }));
  logs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const totals = logs.reduce(
    (acc, l) => {
      acc.calories += Number(l.calories) || 0;
      acc.protein += Number(l.protein) || 0;
      acc.carbs += Number(l.carbs) || 0;
      acc.fat += Number(l.fat) || 0;
      acc.fiber += Number(l.fiber) || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    date: dateStr,
    logs,
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      fiber: Math.round(totals.fiber),
    }
  };
}

export async function getAllFoodLogs() {
  const uid = getUid();
  const snap = await getDocs(subCol(uid, 'food_logs'));
  const logs = snap.docs.map(d => ({ id: d.id, user_id: uid, ...d.data() }));
  return logs.sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));
}

export async function exportLogsAsCsv() {
  const logs = await getAllFoodLogs();
  let csv = 'ID,Date,Meal Type,Food Name,Grams,Calories,Protein(g),Carbs(g),Fat(g),Fiber(g),Source\n';
  logs.forEach(l => {
    csv += `${l.id},"${l.logged_at}","${l.meal_type}","${(l.name || '').replace(/"/g, '""')}",${l.grams_estimate},${l.calories},${l.protein},${l.carbs},${l.fat},${l.fiber},"${l.source}"\n`;
  });
  return csv;
}

// ─── WEIGHT LOGS ─────────────────────────────────────────────────────────────

export async function insertWeightLog(weight, notes = '') {
  const loggedAt = getLocalDateStr();
  const uid = getUid();
  const ref = await addDoc(subCol(uid, 'weight_logs'), {
    weight,
    notes,
    logged_at: loggedAt,
    created_at: new Date().toISOString(),
  });
  return { id: ref.id, user_id: uid, weight, notes, logged_at: loggedAt };
}

export async function deleteWeightLog(id) {
  const uid = getUid();
  await deleteDoc(subDoc(uid, 'weight_logs', id));
}

export async function getAllWeightLogs() {
  const uid = getUid();
  const snap = await getDocs(subCol(uid, 'weight_logs'));
  const logs = snap.docs.map(d => ({ id: d.id, user_id: uid, ...d.data() }));
  return logs.sort((a, b) => (a.logged_at > b.logged_at ? 1 : -1));
}

// ─── FAVORITES ───────────────────────────────────────────────────────────────

export async function getFavorites() {
  const uid = getUid();
  const snap = await getDocs(subCol(uid, 'favorites'));
  return snap.docs.map(d => ({ id: d.id, user_id: uid, ...d.data() }));
}

export async function insertFavorite(meal) {
  const uid = getUid();
  const ref = await addDoc(subCol(uid, 'favorites'), { ...meal, created_at: new Date().toISOString() });
  return { id: ref.id, user_id: uid, ...meal };
}

export async function deleteFavorite(id) {
  const uid = getUid();
  await deleteDoc(subDoc(uid, 'favorites', id));
}

// ─── WORKOUT LOGS ─────────────────────────────────────────────────────────────

export async function insertWorkoutLog(entry) {
  const loggedAt = entry.logged_at || getLocalDateStr();
  if (isFutureDate(loggedAt)) throw new Error('Cannot log entries for future dates.');

  const uid = getUid();
  const newLog = {
    workout_type: entry.workout_type,
    duration_min: entry.duration_min,
    intensity: entry.intensity || 'moderate',
    calories_burned: entry.calories_burned || 0,
    logged_at: loggedAt,
    created_at: entry.created_at || new Date().toISOString(),
  };

  const ref = await addDoc(subCol(uid, 'workout_logs'), newLog);
  return { id: ref.id, user_id: uid, ...newLog };
}

export async function updateWorkoutLog(id, updates) {
  const uid = getUid();
  const ref = subDoc(uid, 'workout_logs', id);
  await updateDoc(ref, stripUndefined(updates));
  const snap = await getDoc(ref);
  return snap.exists() ? { id, ...snap.data() } : null;
}

export async function deleteWorkoutLog(id) {
  const uid = getUid();
  await deleteDoc(subDoc(uid, 'workout_logs', id));
}

export async function getWorkoutLogsForDate(dateStr) {
  const uid = getUid();
  const q = query(subCol(uid, 'workout_logs'), where('logged_at', '==', dateStr));
  const snap = await getDocs(q);
  const logs = snap.docs.map(d => ({ id: d.id, user_id: uid, ...d.data() }));
  return logs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getWorkoutLogsForWeek(startDate, endDate) {
  const uid = getUid();
  const q = query(
    subCol(uid, 'workout_logs'),
    where('logged_at', '>=', startDate),
    where('logged_at', '<=', endDate)
  );
  const snap = await getDocs(q);
  const logs = snap.docs.map(d => ({ id: d.id, user_id: uid, ...d.data() }));
  return logs.sort((a, b) => (a.logged_at > b.logged_at ? 1 : -1));
}

// ─── WATER LOGS ──────────────────────────────────────────────────────────────

export async function getWaterForDate(dateStr) {
  const uid = getUid();
  const ref = subDoc(uid, 'water_logs', dateStr);
  const snap = await getDoc(ref);
  if (snap.exists()) return { glasses: snap.data().glasses || 0, logged_date: dateStr };
  return { glasses: 0, logged_date: dateStr };
}

export async function setWaterForDate(dateStr, glasses) {
  const uid = getUid();
  const ref = subDoc(uid, 'water_logs', dateStr);
  const safeGlasses = Math.max(0, glasses);
  await setDoc(ref, { glasses: safeGlasses, logged_date: dateStr }, { merge: true });
  return { glasses: safeGlasses, logged_date: dateStr };
}

// ─── CUSTOM PRESETS ───────────────────────────────────────────────────────────

export async function getCustomPresets() {
  const uid = getUid();
  const snap = await getDocs(subCol(uid, 'custom_presets'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function insertCustomPreset(preset) {
  const uid = getUid();
  const newPreset = {
    title: preset.title,
    workout_type: preset.workout_type,
    duration_min: preset.duration_min || 30,
    intensity: preset.intensity || 'moderate',
    created_at: new Date().toISOString(),
  };
  const ref = await addDoc(subCol(uid, 'custom_presets'), newPreset);
  return { id: ref.id, ...newPreset };
}

export async function deleteCustomPreset(id) {
  const uid = getUid();
  await deleteDoc(subDoc(uid, 'custom_presets', id));
}
