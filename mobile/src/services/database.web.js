/**
 * database.web.js — Platform override for web builds (including Capacitor).
 *
 * Metro bundler automatically loads this file instead of database.js on
 * web builds. Previously this pointed to AsyncStorage, which meant ALL
 * data was stored device-locally and never reached Firestore.
 *
 * Fix: unconditionally re-export everything from the Firestore cloud layer.
 * All reads and writes now go to Firebase Firestore, keyed by auth UID.
 */
export * from './database.cloud';
