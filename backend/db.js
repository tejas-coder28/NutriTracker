const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Ensure database directory exists
const dbDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure uploads directory exists
if (!fs.existsSync(config.UPLOADS_DIR)) {
  fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
}

const db = new sqlite3.Database(config.DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', config.DB_PATH);
  }
});

// Promisified helper functions
const query = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initialize schema
async function initDb() {
  await query.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      age INTEGER DEFAULT 25,
      gender TEXT DEFAULT 'male',
      height REAL DEFAULT 175,
      weight REAL DEFAULT 75,
      activity_level TEXT DEFAULT 'moderate',
      goal_type TEXT DEFAULT 'fat_loss',
      fat_loss_rate REAL DEFAULT 0.5,
      target_weight REAL DEFAULT 70,
      target_calories INTEGER DEFAULT 2000,
      target_protein INTEGER DEFAULT 150,
      target_carbs INTEGER DEFAULT 200,
      target_fat INTEGER DEFAULT 60,
      target_fiber INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query.run(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      logged_at DATE NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await query.run(`
    CREATE TABLE IF NOT EXISTS food_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      meal_type TEXT DEFAULT 'snack',
      grams_estimate REAL DEFAULT 200,
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      fiber REAL NOT NULL DEFAULT 0,
      image_url TEXT,
      ai_raw_response TEXT,
      source TEXT DEFAULT 'text',
      logged_at DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Stretch goal: Favorite Meals table
  await query.run(`
    CREATE TABLE IF NOT EXISTS favorite_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      meal_type TEXT DEFAULT 'snack',
      grams_estimate REAL DEFAULT 200,
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      fiber REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Workout logs table
  await query.run(`
    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      workout_type TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 30,
      intensity TEXT DEFAULT 'moderate',
      calories_burned REAL DEFAULT 0,
      logged_at DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Water logs table
  await query.run(`
    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      glasses INTEGER NOT NULL DEFAULT 0,
      logged_date DATE NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, logged_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Custom workout presets table
  await query.run(`
    CREATE TABLE IF NOT EXISTS custom_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      workout_type TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 30,
      intensity TEXT DEFAULT 'moderate',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await query.run(`CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, logged_at);`);
  await query.run(`CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, logged_at);`);
  await query.run(`CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, logged_at);`);

  // Safe migrations for schema updates
  try { await query.run(`ALTER TABLE users ADD COLUMN target_weight REAL DEFAULT 70;`); } catch (e) {}
  try { await query.run(`ALTER TABLE food_logs ADD COLUMN grams_estimate REAL DEFAULT 200;`); } catch (e) {}
  try { await query.run(`ALTER TABLE food_logs ADD COLUMN source TEXT DEFAULT 'text';`); } catch (e) {}

  console.log('Database tables initialized successfully.');
}

module.exports = {
  db,
  query,
  initDb
};
