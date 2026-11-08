const express = require('express');
const { query } = require('../db');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/water
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const dateStr = req.query.date || getLocalDateStr();
    const row = await query.get('SELECT glasses, logged_date FROM water_logs WHERE user_id = ? AND logged_date = ?', [userId, dateStr]);
    res.json(row || { glasses: 0, logged_date: dateStr });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch water log.' });
  }
});

// POST /api/water
router.post('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { glasses = 0, date } = req.body;
    const dateStr = date || getLocalDateStr();
    const safeGlasses = Math.max(0, parseInt(glasses) || 0);

    const existing = await query.get('SELECT id FROM water_logs WHERE user_id = ? AND logged_date = ?', [userId, dateStr]);
    if (existing) {
      await query.run('UPDATE water_logs SET glasses = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND logged_date = ?', [safeGlasses, userId, dateStr]);
    } else {
      await query.run('INSERT INTO water_logs (user_id, glasses, logged_date) VALUES (?, ?, ?)', [userId, safeGlasses, dateStr]);
    }

    res.json({ glasses: safeGlasses, logged_date: dateStr });
  } catch (error) {
    console.error('Water log error:', error);
    res.status(500).json({ error: 'Failed to update water log.' });
  }
});

module.exports = router;
