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

// POST /api/workout/log
router.post('/log', authenticateUser, async (req, res) => {
  try {
    const { workout_type, duration_min = 30, intensity = 'moderate', calories_burned = 0, logged_at } = req.body;
    const userId = req.user.id;

    if (!workout_type) {
      return res.status(400).json({ error: 'Workout type is required.' });
    }

    const dateStr = logged_at || getLocalDateStr();

    const result = await query.run(
      `INSERT INTO workout_logs (user_id, workout_type, duration_min, intensity, calories_burned, logged_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, workout_type, parseInt(duration_min) || 30, intensity, parseFloat(calories_burned) || 0, dateStr]
    );

    const logEntry = await query.get('SELECT * FROM workout_logs WHERE id = ?', [result.lastID]);
    res.status(201).json({ message: 'Workout logged successfully', item: logEntry });
  } catch (error) {
    console.error('Workout log error:', error);
    res.status(500).json({ error: 'Failed to log workout.' });
  }
});

// GET /api/workout/logs
router.get('/logs', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const dateStr = req.query.date || getLocalDateStr();

    const logs = await query.all(
      'SELECT * FROM workout_logs WHERE user_id = ? AND logged_at = ? ORDER BY id DESC',
      [userId, dateStr]
    );

    res.json({ logs });
  } catch (error) {
    console.error('Get workout logs error:', error);
    res.status(500).json({ error: 'Failed to fetch workout logs.' });
  }
});

// DELETE /api/workout/log/:id
router.delete('/log/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    await query.run('DELETE FROM workout_logs WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ message: 'Workout log deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout log.' });
  }
});

// Custom Presets
router.get('/presets', authenticateUser, async (req, res) => {
  try {
    const presets = await query.all('SELECT * FROM custom_presets WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    res.json({ presets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom presets.' });
  }
});

router.post('/preset', authenticateUser, async (req, res) => {
  try {
    const { title, workout_type, duration_min = 30, intensity = 'moderate' } = req.body;
    const result = await query.run(
      `INSERT INTO custom_presets (user_id, title, workout_type, duration_min, intensity) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, title, workout_type, duration_min, intensity]
    );
    const item = await query.get('SELECT * FROM custom_presets WHERE id = ?', [result.lastID]);
    res.status(201).json({ message: 'Preset created', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save preset.' });
  }
});

router.delete('/preset/:id', authenticateUser, async (req, res) => {
  try {
    await query.run('DELETE FROM custom_presets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Preset deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete preset.' });
  }
});

module.exports = router;
