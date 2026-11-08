const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'nutritrack-super-secret-jwt-key-2026',
  JWT_EXPIRES_IN: '30d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, 'nutritrack.sqlite'),
  UPLOADS_DIR: process.env.UPLOADS_DIR || path.join(__dirname, 'uploads'),
};
