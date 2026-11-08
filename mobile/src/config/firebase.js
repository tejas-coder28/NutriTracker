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

const firebaseConfig = {
  apiKey: "AIzaSyA6Y0o74H8kL_BN3qsRGuPMy5k71P21-AY",
  authDomain: "nutritracker-6aa92.firebaseapp.com",
  projectId: "nutritracker-6aa92",
  storageBucket: "nutritracker-6aa92.firebasestorage.app",
  messagingSenderId: "659175129139",
  appId: "1:659175129139:web:42a84e9c6451c723a16346",
  measurementId: "G-SBW9TYRNRQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Persist auth session in localStorage so Capacitor WebView
// remembers the user after the app is closed and reopened.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase persistence setup failed:', err.message);
});
