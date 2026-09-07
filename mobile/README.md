# 🥗 NutriTracker AI

> **Your Intelligent AI-Powered Nutrition, Macro & Workout Companion**  
> Powered by Expo, React Native, Firebase, and Google Gemini Multimodal AI.

---

## 📌 Overview

**NutriTracker AI** is a state-of-the-art mobile and web application designed to simplify diet tracking, macro calculations, workout logging, and fitness progress monitoring. Using Google Gemini 3.x vision & natural language models, NutriTracker AI eliminates manual entry hassle by instantly analyzing meal photos or plain text descriptions, identifying individual ingredients/dishes with portion estimates, and calculating exact macronutrients (calories, protein, carbs, fat, fiber).

Whether your goal is **Fat Loss**, **Lean Muscle Gain (Bulking)**, or **Maintenance**, NutriTracker AI uses scientifically validated formulas (Mifflin-St Jeor) to build personalized targets with safety floors, rate recommendations, interactive trend projections, and real-time AI smart nudges.

---

## 🌟 Key Features

### 📸 1. Multimodal AI Meal Logging
* **Photo Scanning**: Snap a picture of any meal. Google Gemini identifies food items, estimates total and per-item portion weights in grams or piece counts (e.g., 2 Rotis @ 40g each + 300g Chicken Breast), and computes full macro breakdowns.
* **Natural Language Text Logging**: Describe meals in plain text (e.g., *"3 egg whites, 2 slices of whole wheat toast with peanut butter"*), and get instant itemized nutritional parsing.
* **Smart Model Fallback System**: Seamless multi-tiered model failover (`gemini-3.1-flash-lite` ➔ `gemini-3.5-flash-lite` ➔ `gemini-3-flash` ➔ etc.) with automatic rate-limit (429) & service overload (503) handling.
* **Itemized Portion Editing**: Adjust serving quantities, piece counts, gram weights, and macros for every individual component within a logged meal.

### 🎯 2. Precision Macro Engine & Pace Customization
* **Mifflin-St Jeor Formula**: Calculates exact Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) based on age, gender, height, weight, and activity level.
* **Goal-Tailored Targets**: Protein targeted at `2.0g / kg`, Fats at `25%` total calories, Fiber at `14g per 1000 kcal`, with Carbs absorbing remaining energy.
* **Safety Deficit Clamping**: Protects user health by enforcing minimum calorie floors (1200 kcal/day for females, 1500 kcal/day for males) and warning against unsafe deficit rates.
* **Interactive Weight Rate Options**: Visual cards presenting options from gradual (0.25 kg/wk) to aggressive (1.0 kg/wk) with projected target achievement dates and trendlines.

### 🤖 3. Real-Time Smart AI Coach Nudges
* Dynamic dashboard card generating personalized, 1-sentence actionable advice based on current time of day, net calorie status, workout logs, water intake, and personal fitness goals.

### 🏋️ 4. Workout & MET Calorie Burn Tracker
* Log activities across multiple exercise types (Walking, Running, Cycling, Swimming, Weight Training, Yoga, HIIT, Sports).
* Accurate calorie burn estimation using Metabolic Equivalent of Task (MET) values tailored to intensity and body weight.
* Convenient 1-tap quick preset workouts.

### 💧 5. Hydration & Streak Gamification
* Daily water intake widget with progress tracking against personalized goals.
* Streak tracking system rewarding daily completion of both nutrition and workout logging.
* Unlockable milestone badges (3-Day Spark, 7-Day Warrior, 14-Day Machine, 30-Day Master, 60-Day Titan, 100-Day Legend).

### 📊 6. Analytics & Excel Export
* Interactive weight trend charts and workout calorie burn visualizers.
* Weekly summary modal with performance score, compliance rate, and net energy balance.
* **1-Click Excel Export**: Download or share a full `.xlsx` report (`{Username}_report.xlsx`) containing formatted date, meal type, food names, gram estimates, macros, and logging source using `xlsx` and `expo-sharing`.

### 🔒 7. Cloud Sync & Security
* Multi-platform authentication via Firebase (Email/Password & Native Google Sign-In).
* Cloud Firestore integration ensuring real-time sync across devices.
* Biometric Authentication (Face ID / Fingerprint) & PIN lock protection options.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [React Native](https://reactnative.dev/) `0.79.6`, [Expo SDK](https://expo.dev/) `53.0.27`, [Expo Router](https://docs.expo.dev/router/introduction/) `5.1.11` |
| **AI Integration** | [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini 3.x Multimodal APIs) |
| **Authentication** | [Firebase Auth](https://firebase.google.com/docs/auth), [@capacitor-firebase/authentication](https://github.com/capawesome-team/capacitor-plugins) |
| **Database & Cloud** | [Firebase Cloud Firestore](https://firebase.google.com/docs/firestore), [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) |
| **UI & Styling** | Expo Vector Icons, React Native Reanimated, Expo Glass Effect, Custom Dark/Light Design Tokens |
| **Native Bridge** | [Capacitor](https://capacitorjs.com/) `8.5.0` (Android & iOS Native Layer) |
| **Reporting** | SheetJS `xlsx`, Expo FileSystem, Expo Sharing |

---

## 📁 Directory Structure

```
mobile/
├── assets/                  # Icons, splash screens, adaptive icons
├── scripts/                 # Build & project setup utilities
├── src/
│   ├── app/                 # Expo Router root entry points & layouts
│   ├── components/          # Reusable UI components
│   │   ├── AddFoodModal.js           # Multi-mode food logging modal (Camera, Text, Manual)
│   │   ├── EditFoodModal.js          # Itemized portion & macro editor modal
│   │   ├── LogWorkoutModal.js        # MET workout logging modal
│   │   ├── MacroProgressRing.js      # Circular macro visualization component
│   │   ├── SmartSuggestionCard.js    # AI Smart Coach nudge banner
│   │   ├── StreakBadge.js            # Daily streak & badge progress display
│   │   ├── WaterWidget.js            # Hydration tracker component
│   │   ├── WeightChart.js            # SVG weight progress chart
│   │   └── WeeklySummaryModal.js     # Weekly stats & analytics modal
│   ├── config/              # API endpoints & Firebase SDK configuration
│   ├── constants/           # App colors, themes, layout dimensions
│   ├── context/             # Global AuthContext & ThemeContext state providers
│   ├── hooks/               # Custom React hooks
│   ├── navigation/          # Navigation stack & screen routing definitions
│   ├── screens/             # Application screen views
│   │   ├── AuthScreen.js             # Sign In, Sign Up, Google Auth
│   │   ├── FoodLogScreen.js          # Detailed food diary & multi-item parser
│   │   ├── HomeScreen.js             # Main user dashboard & daily summary
│   │   ├── OnboardingScreen.js       # Interactive user onboarding & target wizard
│   │   ├── ProfileScreen.js          # User settings, security, PIN & target editing
│   │   └── ProgressScreen.js         # Analytics, charts, Excel export
│   ├── services/            # Core business logic services
│   │   ├── aiService.js              # Google Gemini AI multimodal integration & fallback chain
│   │   ├── database.cloud.js         # Cloud Firestore data persistence layer
│   │   ├── exportService.js          # Excel report export (.xlsx) engine
│   │   ├── macroCalculator.js        # BMR, TDEE, macro ratios & deficit clamping
│   │   ├── storageService.js         # Unified storage interface
│   │   └── workoutService.js         # MET workout calculations & streak evaluator
│   └── utils/               # Date utilities, formatters, validation helpers
├── .env.example             # Template for required environment variables
├── app.json                 # Expo app configuration manifest
├── capacitor.config.json    # Capacitor native container configuration
├── package.json             # App dependencies & scripts
└── tsconfig.json            # TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js** `v18+` or `v20+`
* **npm** or **yarn**
* **Expo Go** app on your iOS/Android device OR an Android Emulator / iOS Simulator

### 1. Clone & Install Dependencies

```bash
# Navigate to the mobile project directory
cd mobile

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create a `.env` file inside the `mobile/` directory based on `.env.example`:

```env
# On-Device Gemini API Key (Get yours from Google AI Studio: https://aistudio.google.com)
EXPO_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

*(Optional)* Configure your Firebase credentials in `src/config/firebase.js` if deploying your own Cloud Firestore backend.

### 3. Start Development Server

```bash
# Start the Expo development server
npx expo start
```

From the terminal prompt, you can:
* Press `a` to launch on **Android Emulator**
* Press `i` to launch on **iOS Simulator**
* Press `w` to launch in **Web Browser**
* Scan the QR code with **Expo Go** on your mobile device

---

## 📜 NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | Runs `npx expo start` to launch Expo Metro bundler |
| `npm run android` | Starts Metro bundler and opens the app on an Android device/emulator |
| `npm run ios` | Starts Metro bundler and opens the app on an iOS simulator |
| `npm run web` | Starts Metro bundler and opens the app in a web browser |
| `npm run build` | Exports the app static bundle for web (`npx expo export -p web`) |
| `npm run lint` | Runs Expo linter checks |
| `npm run reset-project` | Resets starter template code (if applicable) |

---

## 🔒 Security & Privacy

* User data, daily logs, and profiles are scoped by user UID in Cloud Firestore with standard access security rules.
* Optional device biometric authentication (Fingerprint / Face ID via `expo-local-authentication`) and PIN screen locking safeguard sensitive fitness data.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

