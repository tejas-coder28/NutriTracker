/**
 * Firebase Configuration — NutriTracker AI
 * -----------------------------------------------------------------
 * Auth uses browserLocalPersistence so that the Capacitor WebView
 * remembers the signed-in user across app restarts. Without this,
 * auth.currentUser is null on every cold launch, causing all
 * Firestore calls to silently fail with "Not authenticated".
 *
 * Firestore Security Rules (paste in Firebase Console):
 *
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /users/{uid}/{document=**} {
 *         allow read, write: if request.auth != null && request.auth.uid == uid;
 *       }
 *     }
 *   }
 * -----------------------------------------------------------------
 */

import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "nutritracker-6aa92.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "nutritracker-6aa92",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "nutritracker-6aa92.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Persist auth session in localStorage so Capacitor WebView
// remembers the user after the app is closed and reopened.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase persistence setup failed:', err.message);
});
