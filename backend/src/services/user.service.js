/**
 * FitMaster AI – User Profile Service
 * Manages user profile retrieval, updates, and automatic synchronization with nutrition targets.
 */

const db = require('../config/database');
const { computeNutritionTargets } = require('../utils/calculations');
const { saveCurrentGoals } = require('./goal-history.service');

/**
 * Get profile and associated goals for a user
 * @param {number} userId
 */
async function getUserProfile(userId, date) {
  const users = await db.query(
    'SELECT user_id, name, email, created_at FROM users WHERE user_id = ?',
    [userId]
  );

  if (!users || users.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const user = users[0];

  const profiles = await db.query(
    'SELECT profile_id, user_id, age, gender, height_cm, weight_kg, activity_level, fitness_goal, updated_at FROM user_profiles WHERE user_id = ?',
    [userId]
  );

  const profile = profiles[0] || null;

  const goals = await db.query(
    'SELECT goal_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee, calculated_at FROM nutrition_goals WHERE user_id = ?',
    [userId]
  );

  let goal = goals[0] || null;
  if (date && goal && String(goal.calculated_at || '').slice(0, 10) > date) {
    const historicalGoals = await db.query(
      `SELECT history_id AS goal_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee, effective_from AS calculated_at
       FROM nutrition_goals_history
       WHERE user_id = ? AND effective_from <= ?
       ORDER BY effective_from DESC, history_id DESC LIMIT 1`,
      [userId, date]
    );
    goal = historicalGoals[0] || null;
  }

  return {
    user,
    profile,
    goal
  };
}

/**
 * Upsert user profile and automatically recalculate metabolic goals
 * @param {number} userId
 * @param {Object} profileData
 */
async function updateUserProfile(userId, profileData) {
  const { age, gender, height_cm, weight_kg, activity_level, fitness_goal } = profileData;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check if profile exists
    const [existing] = await connection.query(
      'SELECT profile_id FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE user_profiles 
         SET age = ?, gender = ?, height_cm = ?, weight_kg = ?, activity_level = ?, fitness_goal = ? 
         WHERE user_id = ?`,
        [age, gender, height_cm, weight_kg, activity_level, fitness_goal, userId]
      );
    } else {
      await connection.query(
        `INSERT INTO user_profiles (user_id, age, gender, height_cm, weight_kg, activity_level, fitness_goal) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, age, gender, height_cm, weight_kg, activity_level, fitness_goal]
      );
    }

    // Automatically recalculate nutrition goals using Mifflin-St Jeor
    const targets = computeNutritionTargets({
      age,
      gender,
      height_cm,
      weight_kg,
      activity_level,
      fitness_goal
    });

    await saveCurrentGoals(connection, userId, targets);

    // Record weight in weight_history for progress tracking
    await connection.query(
      `INSERT INTO weight_history (user_id, recorded_date, weight_kg, notes) 
       VALUES (?, CURDATE(), ?, 'Profile update weigh-in') 
       ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
      [userId, weight_kg]
    );

    await connection.commit();

    return {
      profile: {
        userId,
        age,
        gender,
        height_cm,
        weight_kg,
        activity_level,
        fitness_goal
      },
      goals: targets
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile
};
