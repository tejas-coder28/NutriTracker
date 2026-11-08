const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const config = require('../config');
const { calculateUserMacros } = require('../services/macroCalculator');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, age = 25, gender = 'male', height = 175, weight = 75, target_weight = 70, activity_level = 'moderate', goal_type = 'fat_loss', fat_loss_rate = 0.5 } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await query.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const parsedWeight = parseFloat(weight) || 75;
    const parsedTargetWeight = parseFloat(target_weight) || 70;
    const parsedHeight = parseFloat(height) || 175;
    const parsedAge = parseInt(age) || 25;
    const parsedRate = parseFloat(fat_loss_rate) || 0.5;

    // Calculate initial target macros
    const userParams = {
      weight: parsedWeight,
      target_weight: parsedTargetWeight,
      height: parsedHeight,
      age: parsedAge,
      gender,
      activity_level,
      goal_type,
      fat_loss_rate: parsedRate
    };
    const macros = calculateUserMacros(userParams);

    const result = await query.run(
      `INSERT INTO users (
        email, password, name, age, gender, height, weight, target_weight, activity_level, goal_type, fat_loss_rate,
        target_calories, target_protein, target_carbs, target_fat, target_fiber
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email.toLowerCase().trim(),
        hashedPassword,
        name.trim(),
        parsedAge,
        gender,
        parsedHeight,
        parsedWeight,
        parsedTargetWeight,
        activity_level,
        goal_type,
        parsedRate,
        macros.target_calories,
        macros.target_protein,
        macros.target_carbs,
        macros.target_fat,
        macros.target_fiber
      ]
    );

    const userId = result.lastID;

    // Record initial weight log
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    await query.run('INSERT INTO weight_logs (user_id, weight, logged_at, notes) VALUES (?, ?, ?, ?)', [
      userId, parsedWeight, today, 'Initial setup weight'
    ]);


    const token = jwt.sign({ id: userId, email: email.toLowerCase().trim() }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    });

    const userProfile = await query.get(
      'SELECT id, email, name, age, gender, height, weight, target_weight, activity_level, goal_type, fat_loss_rate, target_calories, target_protein, target_carbs, target_fat, target_fiber, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: userProfile
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await query.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    });

    const { password: _, ...userProfile } = user;

    res.json({
      message: 'Logged in successfully',
      token,
      user: userProfile
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = await query.get(
      'SELECT id, email, name, age, gender, height, weight, target_weight, activity_level, goal_type, fat_loss_rate, target_calories, target_protein, target_carbs, target_fat, target_fiber, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data.' });
  }
});

module.exports = router;
