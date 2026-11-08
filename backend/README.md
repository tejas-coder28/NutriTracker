# NutriTracker AI — Backend API (Node.js + Express + SQLite)

A lightweight, self-contained REST API backend for **NutriTracker AI**, providing JWT authentication, SQLite local storage, Google Gemini server-side AI food analysis, and file uploads.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=5000
JWT_SECRET=your-secure-random-jwt-secret
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DB_PATH=./nutritrack.sqlite
UPLOADS_DIR=./uploads
```

### 3. Start the Server
```bash
# Development mode (Node watch mode)
npm run dev

# Production mode
npm start
```

The server initializes the database (`nutritrack.sqlite`) and starts on `http://localhost:5000`.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check and Gemini configuration status |
| `POST` | `/api/auth/register` | No | Register a new user with email & password |
| `POST` | `/api/auth/login` | No | Authenticate user and obtain JWT token |
| `GET` | `/api/auth/me` | Bearer | Get current authenticated user details |
| `GET` | `/api/user/profile` | Bearer | Retrieve full user profile & calculated targets |
| `PUT` | `/api/user/profile` | Bearer | Update user attributes (age, weight, height, goal) |
| `GET` | `/api/dashboard/today` | Bearer | Get today's food, workout, and water summaries |
| `GET` | `/api/food/logs?date=YYYY-MM-DD` | Bearer | Fetch food logs for a specific date |
| `POST` | `/api/food/log` | Bearer | Log a food entry (manual or AI-analyzed) |
| `POST` | `/api/food/analyze` | Bearer | Analyze text description or image with Gemini |
| `DELETE` | `/api/food/:id` | Bearer | Delete a food log entry |
| `GET` | `/api/workout/logs?date=YYYY-MM-DD` | Bearer | Fetch workout logs for a date |
| `POST` | `/api/workout/log` | Bearer | Log workout with duration and intensity |
| `DELETE` | `/api/workout/:id` | Bearer | Delete a workout log entry |
| `GET` | `/api/workout/presets` | Bearer | Get user custom workout presets |
| `POST` | `/api/workout/presets` | Bearer | Create a new custom workout preset |
| `GET` | `/api/water?date=YYYY-MM-DD` | Bearer | Get water glass count for a date |
| `POST` | `/api/water` | Bearer | Set or update water glass count for a date |
| `GET` | `/api/weight/logs` | Bearer | Fetch weight history |
| `POST` | `/api/weight/log` | Bearer | Log a new weight entry |
| `DELETE` | `/api/weight/:id` | Bearer | Delete a weight log entry |

---

## 🗄️ Database Tables (SQLite)

- `users`: User profiles, credentials (bcrypt), body metrics, and calculated macro goals
- `food_logs`: Logged food items, meal types, gram estimates, macros, image URLs, and sources
- `weight_logs`: Historical weight weigh-in entries and optional notes
- `workout_logs`: Logged exercises, intensity, duration, and calories burned
- `water_logs`: Daily glass intake counters
- `custom_presets`: User-defined workout configurations
- `favorite_meals`: Quick-access saved meals

---

## 🧪 Tests

Run the Gemini multi-tier fallback test:
```bash
node tests/aiService.fallback.test.js
```

