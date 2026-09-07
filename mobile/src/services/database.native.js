/**
 * database.native.js — Platform override for native builds.
 *
 * Metro bundler automatically loads this file instead of database.js on
 * native (iOS/Android) Expo Go builds. Previously this pointed to SQLite,
 * which meant ALL data was stored device-locally and never reached Firestore.
 *
 * Fix: unconditionally re-export everything from the Firestore cloud layer.
 * All reads and writes now go to Firebase Firestore, keyed by auth UID.
 */
export * from './database.cloud';
