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

// GET /api/dashboard/today
router.get('/today', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = req.query.date || getLocalDateStr();


    const user = await query.get(
      'SELECT id, name, weight, height, goal_type, fat_loss_rate, target_calories, target_protein, target_carbs, target_fat, target_fiber FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const todayLogs = await query.all(
      'SELECT * FROM food_logs WHERE user_id = ? AND logged_at = ? ORDER BY id DESC',
      [userId, today]
    );

    const totals = todayLogs.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs;
        acc.fat += item.fat;
        acc.fiber += item.fiber;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

    // Latest weight log
    const latestWeightLog = await query.get(
      'SELECT weight, logged_at FROM weight_logs WHERE user_id = ? ORDER BY logged_at DESC, id DESC LIMIT 1',
      [userId]
    );

    const summary = {
      consumed: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        fiber: Math.round(totals.fiber)
      },
      targets: {
        calories: user.target_calories,
        protein: user.target_protein,
        carbs: user.target_carbs,
        fat: user.target_fat,
        fiber: user.target_fiber
      },
      percentages: {
        calories: Math.min(100, Math.round((totals.calories / user.target_calories) * 100)) || 0,
        protein: Math.min(100, Math.round((totals.protein / user.target_protein) * 100)) || 0,
        carbs: Math.min(100, Math.round((totals.carbs / user.target_carbs) * 100)) || 0,
        fat: Math.min(100, Math.round((totals.fat / user.target_fat) * 100)) || 0,
        fiber: Math.min(100, Math.round((totals.fiber / user.target_fiber) * 100)) || 0
      },
      recent_logs: todayLogs,
      current_weight: latestWeightLog ? latestWeightLog.weight : user.weight,
      last_weighed: latestWeightLog ? latestWeightLog.logged_at : today
    };

    res.json(summary);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard statistics.' });
  }
});

module.exports = router;
