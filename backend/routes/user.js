const express = require('express');
const { query } = require('../db');
const { calculateUserMacros, getRateOptionsPreview } = require('../services/macroCalculator');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// GET /api/user/profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await query.get(
      'SELECT id, email, name, age, gender, height, weight, target_weight, activity_level, goal_type, fat_loss_rate, target_calories, target_protein, target_carbs, target_fat, target_fiber, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const calculated = calculateUserMacros(user);
    const rateOptions = getRateOptionsPreview(user);

    res.json({
      user,
      calculated,
      rateOptions
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// POST /api/user/preview-rates (Public or Auth rate option live calculation)
router.post('/preview-rates', async (req, res) => {
  try {
    const {
      height = 175,
      weight = 75,
      target_weight = 70,
      age = 25,
      gender = 'male',
      activity_level = 'moderate',
      goal_type = 'fat_loss'
    } = req.body;

    const userStats = {
      height: parseFloat(height) || 175,
      weight: parseFloat(weight) || 75,
      target_weight: parseFloat(target_weight) || 70,
      age: parseInt(age) || 25,
      gender,
      activity_level,
      goal_type
    };

    const rateOptions = getRateOptionsPreview(userStats);

    res.json({
      stats: userStats,
      rateOptions
    });
  } catch (error) {
    console.error('Preview rates error:', error);
    res.status(500).json({ error: 'Failed to compute rate option previews.' });
  }
});

// PUT /api/user/profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentUser = await query.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const name = req.body.name !== undefined ? req.body.name : currentUser.name;
    const age = req.body.age !== undefined ? parseInt(req.body.age) : currentUser.age;
    const gender = req.body.gender !== undefined ? req.body.gender : currentUser.gender;
    const height = req.body.height !== undefined ? parseFloat(req.body.height) : currentUser.height;
    const weight = req.body.weight !== undefined ? parseFloat(req.body.weight) : currentUser.weight;
    const target_weight = req.body.target_weight !== undefined ? parseFloat(req.body.target_weight) : (currentUser.target_weight || 70);
    const activity_level = req.body.activity_level !== undefined ? req.body.activity_level : currentUser.activity_level;
    const goal_type = req.body.goal_type !== undefined ? req.body.goal_type : currentUser.goal_type;
    const fat_loss_rate = req.body.fat_loss_rate !== undefined ? parseFloat(req.body.fat_loss_rate) : currentUser.fat_loss_rate;

    // Recalculate target macros & goal timeline
    const newMacros = calculateUserMacros({
      weight,
      target_weight,
      height,
      age,
      gender,
      activity_level,
      goal_type,
      fat_loss_rate
    });

    await query.run(
      `UPDATE users SET
        name = ?, age = ?, gender = ?, height = ?, weight = ?, target_weight = ?,
        activity_level = ?, goal_type = ?, fat_loss_rate = ?,
        target_calories = ?, target_protein = ?, target_carbs = ?, target_fat = ?, target_fiber = ?
      WHERE id = ?`,
      [
        name, age, gender, height, weight, target_weight,
        activity_level, goal_type, fat_loss_rate,
        newMacros.target_calories, newMacros.target_protein, newMacros.target_carbs, newMacros.target_fat, newMacros.target_fiber,
        userId
      ]
    );

    // If weight changed, auto insert into weight_logs
    if (weight !== currentUser.weight) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const day = String(new Date().getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      await query.run(
        'INSERT INTO weight_logs (user_id, weight, logged_at, notes) VALUES (?, ?, ?, ?)',
        [userId, weight, today, 'Updated from profile settings']
      );
    }


    const updatedUser = await query.get(
      'SELECT id, email, name, age, gender, height, weight, target_weight, activity_level, goal_type, fat_loss_rate, target_calories, target_protein, target_carbs, target_fat, target_fiber, created_at FROM users WHERE id = ?',
      [userId]
    );

    const rateOptions = getRateOptionsPreview(updatedUser);

    res.json({
      message: 'Profile updated and target macros recalculated.',
      user: updatedUser,
      calculated: newMacros,
      rateOptions
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
