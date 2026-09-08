# 🥗 NutriTracker AI

> **Intelligent AI-Powered Nutrition, Macro & Workout Companion**  
> Built with Expo, React Native, Firebase, and Google Gemini Multimodal AI.

---

## 📌 Overview

**NutriTracker AI** is an advanced mobile and web application designed to simplify meal tracking, macro estimation, workout logging, and health analytics. Leveraging Google Gemini 3.x vision & natural language models, NutriTracker AI eliminates manual food entry by instantly parsing meal photos or text descriptions into itemized macro breakdowns.

---

## 📱 App Preview

<table align="center">
  <tr>
    <td align="center" width="33%">
      <img src="mobile/assets/screenshots/home.png" alt="Home Dashboard" width="100%" /><br />
      <sub><b>Home Dashboard</b></sub>
    </td>
    <td align="center" width="33%">
      <img src="mobile/assets/screenshots/foodlog.png" alt="AI Meal Scanner" width="100%" /><br />
      <sub><b>AI Meal Scanner</b></sub>
    </td>
    <td align="center" width="33%">
      <img src="mobile/assets/screenshots/progress.png" alt="Progress Analytics" width="100%" /><br />
      <sub><b>Progress Analytics</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="mobile/assets/screenshots/onboarding.png" alt="Onboarding Flow" width="100%" /><br />
      <sub><b>Onboarding Flow</b></sub>
    </td>
    <td align="center" width="33%">
      <img src="mobile/assets/screenshots/workout.png" alt="Workout Logger" width="100%" /><br />
      <sub><b>Workout Logger</b></sub>
    </td>
    <td align="center" width="33%">
      <img src="mobile/assets/screenshots/summary.png" alt="Weekly Summary" width="100%" /><br />
      <sub><b>Weekly Summary</b></sub>
    </td>
  </tr>
</table>

---

## 🚀 Workspace Structure

```
NutriTracker AI/
├── mobile/                  # Expo / React Native cross-platform application
│   ├── assets/              # App branding assets & splash screens
│   ├── src/                 # Application codebase (screens, components, services, context)
│   ├── app.json             # Expo app configuration
│   ├── capacitor.config.json# Capacitor native config
│   ├── package.json         # Dependencies & scripts
│   └── README.md            # Detailed mobile app documentation
└── README.md                # Project repository overview
```

---

## ⚡ Quick Start

```bash
# 1. Navigate to the mobile application directory
cd mobile

# 2. Install dependencies
npm install

# 3. Configure environment variables (.env)
cp .env.example .env
# Set EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# 4. Launch development server
npx expo start
```

For complete feature descriptions, architecture details, and configuration instructions, please refer to [mobile/README.md](file:///c:/Users/Tejas/Desktop/NutriTracker%20AI/mobile/README.md).
