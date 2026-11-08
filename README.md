# NutriTracker AI 🥑🤖

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2053-black?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.79.6-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20API-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Firebase](https://img.shields.io/badge/Backend-Firebase%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Capacitor](https://img.shields.io/badge/Mobile-Capacitor%20Android-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Node.js](https://img.shields.io/badge/Optional%20API-Node.js%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

**NutriTracker AI** is an intelligent, cross-platform personal nutrition and fitness companion built with **React Native (Expo SDK 53)**, **React 19**, **Google Gemini GenAI**, and **Firebase Firestore / SQLite**. 

It transforms meal tracking from tedious manual data entry into an effortless experience: snap a picture or type a natural sentence (e.g. *"2 rotis with 250g grilled chicken breast and a cup of curd"*), and NutriTracker AI instantly analyzes the ingredients, decomposes portion sizes, and computes macro & micronutrient totals with high precision.

---

## 🌟 Key Highlights

- 📸 **Multimodal Food Logging (Text & Vision)**: Log meals via camera photo or natural language. Powered by Gemini with smart multi-item ingredient decomposition and piece-vs-weight unit conversion.
- 🔄 **Intelligent Model Fallback Chain**: Never hit quota limits. Seamlessly cascades across models (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-3-flash`, `gemini-3.5-flash`, etc.) to automatically absorb `429` rate limits and `503` temporary outages.
- 🧠 **AI Smart Coach & Dynamic Nudges**: Context-aware recommendations generated throughout the day based on your current net calorie balance, hydration, workout logs, and fitness goal.
- 🏋️‍♂️ **Workout Tracking & Net Calorie Balancing**: Log exercise sessions with MET-based calorie burn calculations. Calculates real-time **Net Calories = Consumed − Burned**.
- 💧 **Visual Hydration Tracker**: Daily water widget with glass counter, animated progress, and personalized daily goals.
- 🎯 **Scientific Macro Target Engine**: Calculates Mifflin-St Jeor BMR & TDEE with automated goals for **Fat Loss** (with minimum safe intake clamping), **Lean Muscle Gain / Bulking**, and **Maintenance**.
- 📈 **Weight Trajectory & Trend Analytics**: Interactive SVG graphs comparing actual progress against projected trajectory targets with velocity badges.
- 🔥 **Streaks & Milestone Gamification**: Motivational logging streaks with animated fire badge, trophy milestones (Day 1 to 60+), and automatic Sunday weekly summary recaps.
- 📑 **Excel (.xlsx) Export & Native Sharing**: Generate detailed spreadsheets of your nutrition history and share directly via iOS/Android share sheets or browser downloads.
- 🎨 **Glassmorphism Design System**: Modern dark & light mode styling featuring frosted-glass elements, fluid ambient glows, and responsive haptics.

---

## 📱 Features Walkthrough

### 1. Multimodal AI Meal Logging & Portion Breakdown
- **Natural Language Parsing**: Describe complex multi-item meals naturally.
- **Vision Recognition**: Take a photo or pick from your device gallery.
- **Itemized Food Deconstruction**: Automatically splits meals into individual components (e.g., *"Chicken Curry"* + *"Basmati Rice"*).
- **Dual Unit Modes**:
  - `piece`: Discrete food units (e.g., 2 eggs, 3 rotis, 1 banana) with auto-calculated gram weights per piece.
  - `weight`: Mass-measured items (e.g., 200g Greek yogurt, 150g rice).
- **Interactive Review Modal**: Tweak individual quantities, piece weights, or nutrient numbers before saving.

### 2. Workout & Calorie Burn Tracker
- **Built-in Activity Presets**: Walking, Running, Cycling, Strength Training, HIIT, Swimming, Yoga, and more.
- **Custom Presets**: Save and reuse your own favorite workout configurations.
- **MET-Based Energy Expenditure**: Estimates calorie burn accurately using exercise intensity and current body weight.
- **Dashboard Net Calorie Integration**: Burned calories directly offset food intake on your daily macro rings.

### 3. Smart Health Coach & Adaptive Nudges
- Evaluates real-time health context:
  - Fitness goal (*Fat Loss*, *Muscle Gain*, *Maintenance*)
  - Current time of day (Morning, Afternoon, Evening)
  - Remaining net calories & macros
  - Completed workouts & recovery status
  - Water consumption pace
- Delivers concise, friendly, single-sentence coaching nudges with automatic rule-based fallbacks.

### 4. Precision Nutrition Calculator
- **Mifflin-St Jeor Formulation**: Computes exact Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE).
- **Goal Adaptations**:
  - **Fat Loss**: Configurable velocity (0.25 to 1.0 kg/week) with mandatory metabolic safety floors (1,200 kcal for women, 1,500 kcal for men).
  - **Muscle Gain**: Calibrated calorie surplus for lean muscle mass development.
  - **Maintenance**: Calorie balance aligned with daily expenditure.
- **Macro Distribution**:
  - High protein baseline (2.0g per kg of bodyweight)
  - Healthy fats target (~25% of caloric budget)
  - Dietary fiber minimum (~14g per 1,000 kcal)
  - Carbohydrates absorbing remaining caloric needs

### 5. Hydration & Daily Habits
- **Water Widget**: Quick one-tap glass logging (+/-) with intuitive glass visuals.
- **Streak System**: Tracks consecutive days of logging meals and workouts.
- **Milestone Showcase**: Unlockable badges for 1-day, 3-day, 7-day, 14-day, 30-day, and 60-day logging consistency.
- **Weekly Summary Review**: Automatically pops up on Sundays with weekly macro averages and consistency achievements.

### 6. Excel Report Generation
- Exports complete food logs to `.xlsx` formatted files.
- Includes Date, Meal Type, Food Name, Grams, Calories, Protein, Carbs, Fat, Fiber, and Log Source.
- Web: Triggers instant direct file download.
- Mobile: Writes to local cache and opens the native OS share dialog.

---

## 🏗️ System Architecture

NutriTracker AI supports a **cloud-first architecture** with Firebase/Firestore for multi-device sync, with Capacitor for native Android packaging, alongside an optional standalone Express + SQLite backend.

```
┌─────────────────────────────────────────────────────────────┐
│                      NutriTracker AI                        │
│             React Native (Expo SDK 53) Client               │
│               [Android / iOS / Web Browser]                 │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
    ┌──────────────────────┐       ┌──────────────────────┐
    │   Google Gemini AI   │       │  Firebase Firestore  │
    │   Multimodal Engine  │       │  & Authentication    │
    │                      │       │                      │
    │  • 3.1-flash-lite    │       │  • /users/{uid}      │
    │  • 3.5-flash-lite    │       │  • /food_logs        │
    │  • 3-flash / 3.5     │       │  • /workout_logs     │
    │  • Auto Fallback 429 │       │  • /weight_logs      │
    └──────────────────────┘       │  • /water_logs       │
                                   └──────────────────────┘
                                               │
                                   ┌───────────┴──────────┐
                                   │  Optional Backend    │
                                   │  (Node.js + Express) │
                                   │  • SQLite Storage    │
                                   │  • Image Uploads     │
                                   └──────────────────────┘
```

---

## 📁 Repository Structure

```
NutriTracker AI/
├── mobile/                        # React Native / Expo Frontend App
│   ├── android/                   # Generated native Android project
│   ├── scripts/                   # Utility & project reset scripts
│   ├── src/
│   │   ├── components/            # Reusable UI & Widget components
│   │   │   ├── AddFoodModal.js    # AI Text, Camera Photo & Manual logger
│   │   │   ├── EditFoodModal.js   # Food entry editor with dynamic recalculation
│   │   │   ├── LogWorkoutModal.js # Workout logging & custom preset manager
│   │   │   ├── MacroProgressRing.js # Interactive SVG calorie & macro rings
│   │   │   ├── SmartSuggestionCard.js # AI coach nudge widget
│   │   │   ├── WaterWidget.js     # Hydration tracker component
│   │   │   ├── WeightChart.js     # SVG weight trajectory chart
│   │   │   ├── WorkoutChart.js    # Weekly workout volume graph
│   │   │   └── StreakBadge.js     # Streak counter and milestone badges
│   │   ├── config/                # Firebase & API configurations
│   │   ├── context/               # AuthContext & ThemeContext
│   │   ├── navigation/            # AppNavigator & Bottom Navigation Bar
│   │   ├── screens/
│   │   │   ├── AuthScreen.js      # Sign In / Sign Up screen
│   │   │   ├── HomeScreen.js      # Main dashboard with rings, nudges & logs
│   │   │   ├── FoodLogScreen.js   # Daily meal journal & date navigation
│   │   │   ├── ProgressScreen.js  # Weight & workout trajectory analysis
│   │   │   ├── ProfileScreen.js   # User stats, rate velocity & appearance
│   │   │   └── OnboardingScreen.js # Initial profile setup wizard
│   │   ├── services/
│   │   │   ├── aiService.js       # Client Gemini SDK & resilient fallback chain
│   │   │   ├── database.cloud.js  # Firestore cloud database operations
│   │   │   ├── exportService.js   # Excel .xlsx generation & native sharing
│   │   │   ├── macroCalculator.js # Mifflin-St Jeor math & pace projections
│   │   │   └── workoutService.js  # MET energy formulas & streak calculations
│   │   └── utils/                 # Date and formatting helpers
│   ├── app.json                   # Expo project configuration
│   ├── capacitor.config.json      # Capacitor Android configuration
│   ├── firestore.rules            # Firebase Firestore security rules
│   └── package.json
│
├── backend/                       # Optional Express + SQLite Backend API
│   ├── middleware/                # JWT Authentication middleware
│   ├── routes/                    # API Route Handlers (auth, food, workout, water)
│   ├── services/                  # Backend AI & macro services
│   ├── db.js                      # SQLite database schema & connection wrapper
│   ├── server.js                  # Express entry point
│   └── package.json
│
├── deploy/                        # Deployment configurations & documentation
│   ├── DEPLOYMENT.md              # VPS setup guide (Ubuntu, Nginx, PM2, SSL)
│   ├── backup.sh                  # Database backup automation script
│   └── nginx.conf                 # Sample reverse proxy configuration
│
└── README.md                      # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `20.x` or higher
- **npm** or **yarn**
- **Google Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/)
- **Expo Go App** (optional): For running directly on physical iOS/Android devices
- **Android Studio** (optional): For building native Android APKs via Capacitor

---

### Setup Mobile Application

1. **Navigate to the mobile directory**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `mobile/` directory:
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**:
   ```bash
   # Start Expo development server
   npm start

   # Run directly in web browser
   npm run web

   # Run on Android emulator / device
   npm run android

   # Run on iOS simulator
   npm run ios
   ```

---

### Building for Android (Capacitor)

NutriTracker AI can be built into a native Android APK using Capacitor:

1. **Export the web assets**:
   ```bash
   cd mobile
   npm run build
   ```

2. **Sync with Capacitor Android**:
   ```bash
   npx cap sync android
   ```

3. **Open and build in Android Studio**:
   ```bash
   npx cap open android
   ```
   In Android Studio, select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate the release or debug APK.

---

### Setup Backend Server (Optional)

If you wish to run the self-contained Node.js + SQLite REST backend:

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**:
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   Configure your `.env` values:
   ```env
   PORT=5000
   JWT_SECRET=your_secure_random_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   DB_PATH=./nutritrack.sqlite
   UPLOADS_DIR=./uploads
   ```

3. **Start the backend server**:
   ```bash
   # Development mode with watch
   npm run dev

   # Production mode
   npm start
   ```
   The backend will start at `http://localhost:5000`, creating `nutritrack.sqlite` and the `./uploads` directory automatically.

---

## 🔒 Security & Firestore Rules

To secure cloud data so each user can strictly access only their own records, deploy the provided rules to your Firebase console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Deploy via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 🌐 Production VPS Deployment

Refer to [`deploy/DEPLOYMENT.md`](./deploy/DEPLOYMENT.md) for full step-by-step instructions on hosting the backend on an Ubuntu VPS with:
- **PM2** process supervisor for zero-downtime restarts
- **Nginx** reverse proxy
- **Let's Encrypt SSL** (Certbot)
- **Automated cron SQLite backups** to protect user logs

---

## 🧮 Scientific Reference

- **Mifflin-St Jeor Equation**:
  $$\text{BMR (Men)} = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age} + 5$$
  $$\text{BMR (Women)} = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age} - 161$$
- **Physical Activity Multipliers**:
  - Sedentary: $1.200$
  - Lightly Active: $1.375$
  - Moderately Active: $1.550$
  - Very Active: $1.725$
  - Extremely Active: $1.900$
- **Energy Equivalencies**: $1\text{ kg body fat} \approx 7,700\text{ kcal}$.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
