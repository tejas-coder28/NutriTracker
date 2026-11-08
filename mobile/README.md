# NutriTracker AI — Mobile App (Expo SDK 53 + React 19)

Cross-platform mobile application for **NutriTracker AI**, supporting iOS, Android, and Web.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in this directory:
```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
# Web browser
npm run web

# Android emulator / connected device
npm run android

# iOS simulator
npm run ios

# Expo Metro bundler
npm start
```

### 4. Build for Android (Capacitor)
```bash
# Export production web bundle
npm run build

# Sync assets with native Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

For complete documentation, architecture overview, and full feature details, see the main [Root README](../README.md).
