const express = require('express');
const { query } = require('../db');
const { calculateUserMacros } = require('../services/macroCalculator');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/weight/logs

router.get('/logs', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await query.get(
      'SELECT weight, target_weight, height, age, gender, activity_level, goal_type, fat_loss_rate FROM users WHERE id = ?',
      [userId]
    );

    const logs = await query.all(
      'SELECT id, weight, logged_at, notes, created_at FROM weight_logs WHERE user_id = ? ORDER BY logged_at ASC, id ASC',
      [userId]
    );

    const startWeight = logs.length > 0 ? logs[0].weight : user.weight;
    const currentWeight = logs.length > 0 ? logs[logs.length - 1].weight : user.weight;
    const totalChange = Math.round((currentWeight - startWeight) * 10) / 10;
    const targetWeight = user.target_weight || 70;

    const calculations = calculateUserMacros({
      ...user,
      weight: currentWeight,
      target_weight: targetWeight
    });

    res.json({
      logs,
      summary: {
        start_weight: startWeight,
        current_weight: currentWeight,
        target_weight: targetWeight,
        total_change: totalChange,
        fat_loss_rate: user.fat_loss_rate
      },
      timeline: calculations.timeline,
      safety: calculations.safety
    });
  } catch (error) {
    console.error('Fetch weight logs error:', error);
    res.status(500).json({ error: 'Failed to fetch weight logs.' });
  }
});

// POST /api/weight/log
router.post('/log', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { weight, logged_at, notes = '' } = req.body;

    if (!weight || isNaN(parseFloat(weight))) {
      return res.status(400).json({ error: 'Valid weight value is required.' });
    }

    const parsedWeight = parseFloat(weight);
    const date = logged_at || getLocalDateStr();
    if (date > getLocalDateStr()) {
      return res.status(400).json({ error: 'Cannot log entries for future dates.' });
    }


    const result = await query.run(
      'INSERT INTO weight_logs (user_id, weight, logged_at, notes) VALUES (?, ?, ?, ?)',
      [userId, parsedWeight, date, notes]
    );

    // Update user profile current weight and recalculate macro targets
    const currentUser = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    const updatedMacros = calculateUserMacros({
      ...currentUser,
      weight: parsedWeight
    });

    await query.run(
      `UPDATE users SET
        weight = ?,
        target_calories = ?, target_protein = ?, target_carbs = ?, target_fat = ?, target_fiber = ?
      WHERE id = ?`,
      [
        parsedWeight,
        updatedMacros.target_calories, updatedMacros.target_protein, updatedMacros.target_carbs, updatedMacros.target_fat, updatedMacros.target_fiber,
        userId
      ]
    );

    const newLog = await query.get('SELECT * FROM weight_logs WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: 'Weight logged successfully',
      log: newLog,
      updated_macros: updatedMacros
    });
  } catch (error) {
    console.error('Log weight error:', error);
    res.status(500).json({ error: 'Failed to log weight.' });
  }
});

// DELETE /api/weight/log/:id
router.delete('/log/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const logId = req.params.id;

    await query.run('DELETE FROM weight_logs WHERE id = ? AND user_id = ?', [logId, userId]);
    res.json({ message: 'Weight log entry deleted.' });
  } catch (error) {
    console.error('Delete weight log error:', error);
    res.status(500).json({ error: 'Failed to delete weight log entry.' });
  }
});

module.exports = router;
