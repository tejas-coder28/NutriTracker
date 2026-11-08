const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const config = require('../config');
const { analyzeFoodText, analyzeFoodImage } = require('../services/aiService');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isFutureDate(dateStr) {
  return dateStr > getLocalDateStr();
}

// Multer Storage setup per user folder: /uploads/{user_id}/

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user ? req.user.id : 'guest';
    const userDir = path.join(config.UPLOADS_DIR, String(userId));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'food-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/food/log-text
router.post('/log-text', authenticateUser, async (req, res) => {
  try {
    const { description, meal_type = 'snack', date } = req.body;
    const userId = req.user.id;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Food description is required.' });
    }

    const loggedAt = date || getLocalDateStr();
    if (isFutureDate(loggedAt)) {
      return res.status(400).json({ error: 'Cannot log entries for future dates.' });
    }
    const aiResult = await analyzeFoodText(description);

    const dbResult = await query.run(
      `INSERT INTO food_logs (
        user_id, name, meal_type, grams_estimate, calories, protein, carbs, fat, fiber, ai_raw_response, source, logged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        aiResult.name,
        meal_type,
        aiResult.estimated_grams || 200,
        aiResult.calories,
        aiResult.protein,
        aiResult.carbs,
        aiResult.fat,
        aiResult.fiber,
        aiResult.raw,
        'text',
        loggedAt
      ]
    );

    const logEntry = await query.get('SELECT * FROM food_logs WHERE id = ?', [dbResult.lastID]);

    res.status(201).json({
      message: 'Food logged successfully',
      item: logEntry,
      ai_analysis: aiResult
    });
  } catch (error) {
    console.error('Log text error:', error.message || error);
    // Surface the real AI error (e.g. quota/model failure) to the client
    const isAiError = error.message && error.message.includes('Gemini');
    res.status(503).json({
      error: isAiError
        ? error.message
        : 'Failed to analyze and log food. Please try again.',
    });
  }
});

// POST /api/food/log-photo
router.post('/log-photo', authenticateUser, upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { meal_type = 'snack', note = '', date } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Photo file is required.' });
    }

    const imagePath = req.file.path;
    const mimeType = req.file.mimetype || 'image/jpeg';
    const relativeImageUrl = `/uploads/${userId}/${req.file.filename}`;
    const loggedAt = date || getLocalDateStr();
    if (isFutureDate(loggedAt)) {
      return res.status(400).json({ error: 'Cannot log entries for future dates.' });
    }

    const aiResult = await analyzeFoodImage(imagePath, mimeType, note);

    const dbResult = await query.run(
      `INSERT INTO food_logs (
        user_id, name, meal_type, grams_estimate, calories, protein, carbs, fat, fiber, image_url, ai_raw_response, source, logged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        aiResult.name,
        meal_type,
        aiResult.estimated_grams || 250,
        aiResult.calories,
        aiResult.protein,
        aiResult.carbs,
        aiResult.fat,
        aiResult.fiber,
        relativeImageUrl,
        aiResult.raw,
        'camera',
        loggedAt
      ]
    );

    const logEntry = await query.get('SELECT * FROM food_logs WHERE id = ?', [dbResult.lastID]);

    res.status(201).json({
      message: 'Food photo logged successfully',
      item: logEntry,
      ai_analysis: aiResult
    });
  } catch (error) {
    console.error('Log photo error:', error.message || error);
    const isAiError = error.message && error.message.includes('Gemini');
    res.status(503).json({
      error: isAiError
        ? error.message
        : 'Failed to process photo and log food. Please try again.',
    });
  }
});

// POST /api/food/log-manual
router.post('/log-manual', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, meal_type = 'snack', grams_estimate = 200, calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, date } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Meal name is required.' });
    }

    const loggedAt = date || getLocalDateStr();
    if (isFutureDate(loggedAt)) {
      return res.status(400).json({ error: 'Cannot log entries for future dates.' });
    }

    const dbResult = await query.run(
      `INSERT INTO food_logs (
        user_id, name, meal_type, grams_estimate, calories, protein, carbs, fat, fiber, source, logged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        meal_type,
        parseFloat(grams_estimate) || 200,
        parseFloat(calories) || 0,
        parseFloat(protein) || 0,
        parseFloat(carbs) || 0,
        parseFloat(fat) || 0,
        parseFloat(fiber) || 0,
        'manual',
        loggedAt
      ]
    );

    const logEntry = await query.get('SELECT * FROM food_logs WHERE id = ?', [dbResult.lastID]);

    res.status(201).json({
      message: 'Manual entry added',
      item: logEntry
    });
  } catch (error) {
    console.error('Log manual error:', error);
    res.status(500).json({ error: 'Failed to log manual entry.' });
  }
});

// PUT /api/food/log/:id (Edit food log entry)
router.put('/log/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const logId = req.params.id;

    const existing = await query.get('SELECT * FROM food_logs WHERE id = ? AND user_id = ?', [logId, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Food log entry not found.' });
    }

    const {
      name = existing.name,
      meal_type = existing.meal_type,
      grams_estimate = existing.grams_estimate,
      calories = existing.calories,
      protein = existing.protein,
      carbs = existing.carbs,
      fat = existing.fat,
      fiber = existing.fiber
    } = req.body;

    await query.run(
      `UPDATE food_logs SET
        name = ?, meal_type = ?, grams_estimate = ?, calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?
      WHERE id = ? AND user_id = ?`,
      [
        name,
        meal_type,
        parseFloat(grams_estimate) || existing.grams_estimate,
        parseFloat(calories) || existing.calories,
        parseFloat(protein) || existing.protein,
        parseFloat(carbs) || existing.carbs,
        parseFloat(fat) || existing.fat,
        parseFloat(fiber) || existing.fiber,
        logId,
        userId
      ]
    );

    const updated = await query.get('SELECT * FROM food_logs WHERE id = ?', [logId]);
    res.json({ message: 'Food log updated', item: updated });
  } catch (error) {
    console.error('Edit food log error:', error);
    res.status(500).json({ error: 'Failed to edit food log.' });
  }
});

// GET /api/food/logs
router.get('/logs', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetDate = req.query.date || getLocalDateStr();

    const logs = await query.all(
      'SELECT * FROM food_logs WHERE user_id = ? AND logged_at = ? ORDER BY id DESC',
      [userId, targetDate]
    );

    const totals = logs.reduce((acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      acc.fiber += item.fiber;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    res.json({
      date: targetDate,
      logs,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        fiber: Math.round(totals.fiber)
      }
    });
  } catch (error) {
    console.error('Fetch logs error:', error);
    res.status(500).json({ error: 'Failed to fetch food logs.' });
  }
});

// DELETE /api/food/log/:id
router.delete('/log/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const logId = req.params.id;

    const existing = await query.get('SELECT * FROM food_logs WHERE id = ? AND user_id = ?', [logId, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Log entry not found.' });
    }

    if (existing.image_url) {
      const fullPath = path.join(config.UPLOADS_DIR, existing.image_url.replace('/uploads/', ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await query.run('DELETE FROM food_logs WHERE id = ? AND user_id = ?', [logId, userId]);

    res.json({ message: 'Food log deleted successfully.' });
  } catch (error) {
    console.error('Delete log error:', error);
    res.status(500).json({ error: 'Failed to delete food log.' });
  }
});

// GET /api/food/export-csv (Stretch Goal: CSV Export)
router.get('/export-csv', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await query.all(
      'SELECT id, name, meal_type, grams_estimate, calories, protein, carbs, fat, fiber, source, logged_at FROM food_logs WHERE user_id = ? ORDER BY logged_at DESC',
      [userId]
    );

    let csvContent = 'ID,Date,Meal Type,Food Name,Grams,Calories,Protein(g),Carbs(g),Fat(g),Fiber(g),Source\n';
    logs.forEach(l => {
      csvContent += `${l.id},"${l.logged_at}","${l.meal_type}","${l.name.replace(/"/g, '""')}",${l.grams_estimate},${l.calories},${l.protein},${l.carbs},${l.fat},${l.fiber},"${l.source}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nutritrack_logs_${userId}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

// FAVORITES ENDPOINTS (Stretch Goal)
router.get('/favorites', authenticateUser, async (req, res) => {
  try {
    const favorites = await query.all('SELECT * FROM favorite_meals WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    res.json({ favorites });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites.' });
  }
});

router.post('/favorite', authenticateUser, async (req, res) => {
  try {
    const { name, meal_type = 'snack', grams_estimate = 200, calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0 } = req.body;
    const result = await query.run(
      `INSERT INTO favorite_meals (user_id, name, meal_type, grams_estimate, calories, protein, carbs, fat, fiber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, meal_type, grams_estimate, calories, protein, carbs, fat, fiber]
    );
    const item = await query.get('SELECT * FROM favorite_meals WHERE id = ?', [result.lastID]);
    res.status(201).json({ message: 'Saved to favorites', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save favorite meal.' });
  }
});

router.delete('/favorite/:id', authenticateUser, async (req, res) => {
  try {
    await query.run('DELETE FROM favorite_meals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Favorite deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete favorite.' });
  }
});

module.exports = router;
