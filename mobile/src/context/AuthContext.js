/**
 * AuthContext — Firebase Authentication + Firestore profile management.
 *
 * Auth is handled by Firebase Auth (email/password + Google Sign-In).
 * The user profile (name, weight, goals, etc.) lives in Firestore under /users/{uid}.
 * All app data (food logs, workouts, water, streaks) is also keyed by uid.
 *
 * This means ANY device that signs in with the same credentials sees identical data.
 *
 * Google Sign-In uses @capacitor-firebase/authentication for native Android flow,
 * then credentials the result into the Firebase Web SDK.
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';

import { auth } from '../config/firebase';
import { getLocalUser, createLocalUser, updateLocalUser } from '../services/database';
import { calculateUserMacros } from '../services/macroCalculator';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // merged Firebase + Firestore profile
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [authError, setAuthError] = useState(null);

  // ── Listen to Firebase Auth state changes ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadFirestoreProfile(firebaseUser);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const loadFirestoreProfile = async (firebaseUser) => {
    try {
      setIsLoading(true);
      const profile = await getLocalUser(firebaseUser.email);
      if (profile) {
        // Merge firebase email/uid with Firestore doc
        const merged = { ...profile, email: firebaseUser.email, uid: firebaseUser.uid };
        setUser(merged);
        if (merged.pin) setIsLocked(true);
      } else {
        // No Firestore doc yet — brand-new user (Google Sign-In or edge case).
        // Seed a minimal doc with has_completed_onboarding: false so the
        // onboarding gate in AppNavigator fires reliably.
        const macros = calculateUserMacros({ weight: 75, target_weight: 70, height: 175, age: 25, gender: 'male', activity_level: 'moderate', goal_type: 'fat_loss', fat_loss_rate: 0.5 });
        const created = await createLocalUser({
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          ...macros,
          has_completed_onboarding: false,
        });
        setUser({ ...created, email: firebaseUser.email, uid: firebaseUser.uid });
      }
    } catch (e) {
      console.error('[Firebase] loadFirestoreProfile error:', e.code, e.message);
      setAuthError(
        e.code === 'permission-denied'
          ? 'Firestore permission denied. Update your security rules in the Firebase Console.'
          : `Failed to load profile: ${e.message}`
      );
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (userData) => {
    setAuthError(null);
    try {
      const cleanEmail = (userData.email || '').trim().toLowerCase();
      if (!cleanEmail) throw new Error('Email address is required.');
      if (!userData.password) throw new Error('Password is required.');

      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, userData.password);
      const firebaseUser = credential.user;

      const macros = calculateUserMacros({
        weight: userData.weight || 75,
        target_weight: userData.target_weight || 70,
        height: userData.height || 175,
        age: userData.age || 25,
        gender: userData.gender || 'male',
        activity_level: userData.activity_level || 'moderate',
        goal_type: userData.goal_type || 'fat_loss',
        fat_loss_rate: userData.fat_loss_rate || 0.5,
      });

      const profile = await createLocalUser({
        name: userData.name || 'User',
        email: cleanEmail,
        uid: firebaseUser.uid,
        age: userData.age || 25,
        gender: userData.gender || 'male',
        height: userData.height || 175,
        weight: userData.weight || 75,
        target_calories: macros.target_calories,
        target_protein: macros.target_protein,
        target_carbs: macros.target_carbs,
        target_fat: macros.target_fat,
        target_fiber: macros.target_fiber,
        has_completed_onboarding: false,
      });

      const merged = { ...profile, email: cleanEmail, uid: firebaseUser.uid };
      setUser(merged);
      setIsLocked(false);
      return merged;
    } catch (err) {
      let msg = err.message || 'Registration failed.';
      if (err.code === 'auth/email-already-in-use') msg = 'An account with this email already exists. Please log in.';
      if (err.code === 'auth/weak-password') msg = 'Password is too weak. Use at least 6 characters.';
      if (err.code === 'auth/invalid-email') msg = 'Invalid email address format.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) throw new Error('Please enter both email and password.');
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      // onAuthStateChanged fires and calls loadFirestoreProfile automatically
    } catch (err) {
      let msg = err.message || 'Login failed.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = 'No account found with this email. Please register first.';
      if (err.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
      if (err.code === 'auth/invalid-email') msg = 'Invalid email address format.';
      if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Please try again later.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  const GOOGLE_WEB_CLIENT_ID = '659175129139-bupep3j5v236kp1qf876c1pf4qr1jq5t.apps.googleusercontent.com';

  /**
   * On native Android/iOS: Uses @capacitor-firebase/authentication to trigger the
   * native system Google Sign-In dialog, retrieves an idToken, then credentials it into
   * the Firebase Web SDK via signInWithCredential.
   *
   * On web browser ONLY: Uses the Firebase Web SDK popup flow.
   */
  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform() || platform === 'android' || platform === 'ios';
      console.log('[GoogleSignIn] Platform:', platform, 'isNative:', isNative);

      let firebaseUser;

      if (isNative) {
        // ── Native Android/iOS path (STRICTLY NATIVE — NO WEB POPUPS) ─────────
        console.log('[GoogleSignIn] Invoking native FirebaseAuthentication.signInWithGoogle...');

        let result;
        try {
          result = await FirebaseAuthentication.signInWithGoogle({
            scopes: ['email', 'profile'],
            useCredentialManager: true,
          });
        } catch (nativeErr) {
          console.error('[GoogleSignIn Native Error]:', nativeErr);
          throw nativeErr;
        }

        console.log('[GoogleSignIn] Native sign-in result received:', result ? 'SUCCESS' : 'NULL');

        const idToken = result?.credential?.idToken;
        if (!idToken) {
          throw new Error('Google Sign-In was cancelled or failed to return a valid ID token.');
        }

        // Check if this Google email already has an Email/Password account
        const googleEmail = result?.additionalUserInfo?.profile?.email || result?.user?.email;
        if (googleEmail) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, googleEmail);
            if (methods.length > 0 && !methods.includes(GoogleAuthProvider.PROVIDER_ID)) {
              await FirebaseAuthentication.signOut().catch(() => {});
              throw new Error(
                `An account with ${googleEmail} already exists using Email & Password. Please log in with your password instead.`
              );
            }
          } catch (e) {
            if (e.message && e.message.includes('already exists')) throw e;
          }
        }

        // Credential into Firebase Web SDK
        const googleCredential = GoogleAuthProvider.credential(idToken);
        const userCred = await signInWithCredential(auth, googleCredential);
        firebaseUser = userCred.user;
      } else {
        // ── Web Browser path ONLY (Desktop / Web Dev) ────────────────────────
        console.log('[GoogleSignIn] Executing web browser signInWithPopup...');
        const { signInWithPopup } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        firebaseUser = userCred.user;
      }

      // onAuthStateChanged will fire and handle Firestore profile creation/loading
      return firebaseUser;
    } catch (err) {
      console.error('[GoogleSignIn Error]:', err);
      const rawMsg = err?.message || err?.code || String(err);

      let userMsg = rawMsg;
      if (
        err?.code === 'ERR_CANCELED' ||
        rawMsg.includes('canceled') ||
        rawMsg.includes('cancelled') ||
        rawMsg.includes('12501')
      ) {
        userMsg = 'Google Sign-In was cancelled.';
      } else if (rawMsg.includes('10:') || rawMsg.includes('DEVELOPER_ERROR') || rawMsg === '10') {
        userMsg = 'Google Sign-In Developer Error (10). Please verify Android SHA-1 fingerprint & package name (com.nutritracker.app) in Firebase Console.';
      }

      setAuthError(userMsg);
      throw new Error(userMsg);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      const platform = Capacitor.getPlatform();
      if (Capacitor.isNativePlatform() || platform === 'android' || platform === 'ios') {
        await FirebaseAuthentication.signOut().catch(() => {});
      }
      await signOut(auth);
      setUser(null);
      setIsLocked(false);
    } catch (e) {
      setUser(null);
    }
  };

  // ── Update Profile ────────────────────────────────────────────────────────
  const updateUserProfile = async (profileData) => {
    const macros = calculateUserMacros({
      weight: profileData.weight ?? user?.weight ?? 75,
      target_weight: profileData.target_weight ?? user?.target_weight ?? 70,
      height: profileData.height ?? user?.height ?? 175,
      age: profileData.age ?? user?.age ?? 25,
      gender: profileData.gender ?? user?.gender ?? 'male',
      activity_level: profileData.activity_level ?? user?.activity_level ?? 'moderate',
      goal_type: profileData.goal_type ?? user?.goal_type ?? 'fat_loss',
      fat_loss_rate: profileData.fat_loss_rate ?? user?.fat_loss_rate ?? 0.5,
    });

    const updated = await updateLocalUser({
      ...profileData,
      target_calories: macros.target_calories,
      target_protein: macros.target_protein,
      target_carbs: macros.target_carbs,
      target_fat: macros.target_fat,
      target_fiber: macros.target_fiber,
    });

    const merged = { ...updated, email: user?.email, uid: user?.uid };
    setUser(merged);
    return { user: merged, calculated: macros };
  };

  // ── Biometrics ────────────────────────────────────────────────────────────
  const authenticateWithBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return {
          success: false,
          message: 'Biometric hardware is not available or not enrolled on this device.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with Biometrics - NutriTrack AI',
        fallbackLabel: 'Use Device Passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        setIsLocked(false);
        return { success: true, message: 'Biometric authentication successful!' };
      }
      return { success: false, message: result.error || 'Biometric authentication cancelled.' };
    } catch (err) {
      return { success: false, message: err.message || 'Biometric verification failed.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLocked,
        authError,
        login,
        register,
        logout,
        signInWithGoogle,
        updateUserProfile,
        refreshUser: () => auth.currentUser && loadFirestoreProfile(auth.currentUser),
        authenticateWithBiometrics,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Returns true only when the user has explicitly completed onboarding.
 *
 * Relies solely on the `has_completed_onboarding` field stored in Firestore.
 * This field is set to `false` (or 0) on account creation (both Email/Password
 * and Google Sign-In) and set to `true` when the user submits OnboardingScreen.
 *
 * The old field-by-field fallback has been removed because it incorrectly
 * returned `true` for Google Sign-In users whose Firestore doc was seeded
 * with default values for weight/height/etc., causing onboarding to be skipped.
 */
export const isUserOnboarded = (user) => {
  if (!user) return false;
  const flag = user.has_completed_onboarding;
  // Treat boolean true OR integer 1 as onboarded (handles legacy data)
  if (flag === true || flag === 1) return true;
  // Everything else (false, 0, null, undefined, missing) → not onboarded
  return false;
};

export const useAuth = () => useContext(AuthContext);
