const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const foodRoutes = require('./routes/food');
const weightRoutes = require('./routes/weight');
const dashboardRoutes = require('./routes/dashboard');
const workoutRoutes = require('./routes/workout');
const waterRoutes = require('./routes/water');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(config.UPLOADS_DIR));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NutriTrack AI Backend',
    timestamp: new Date().toISOString(),
    ai_configured: Boolean(config.GEMINI_API_KEY)
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/water', waterRoutes);

// Global 404
app.use((req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
async function start() {
  try {
    await initDb();
    app.listen(config.PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 NutriTrack AI Server running on port ${config.PORT}`);
      console.log(`🌐 Base URL: http://localhost:${config.PORT}`);
      console.log(`📁 Uploads Directory: ${config.UPLOADS_DIR}`);
      console.log(`🤖 Gemini Model: ${config.GEMINI_MODEL}`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
