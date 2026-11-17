/**
 * FitMaster AI – Nutrition Goal Service
 * Computes, retrieves, and updates personalized metabolic targets.
 */

const db = require('../config/database');
const { computeNutritionTargets } = require('../utils/calculations');
const { saveCurrentGoals } = require('./goal-history.service');

/**
 * Get saved nutrition targets for a user
 * @param {number} userId
 */
async function getUserGoals(userId, date) {
  const goals = await db.query(
    `SELECT goal_id, user_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee, calculated_at 
     FROM nutrition_goals 
     WHERE user_id = ?`,
    [userId]
  );

  if (!goals || goals.length === 0) {
    return null;
  }

  let goal = goals[0];
  if (date && goal && String(goal.calculated_at || '').slice(0, 10) > date) {
    const historicalGoals = await db.query(
      `SELECT history_id AS goal_id, user_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee, effective_from AS calculated_at
       FROM nutrition_goals_history
       WHERE user_id = ? AND effective_from <= ?
       ORDER BY effective_from DESC, history_id DESC LIMIT 1`,
      [userId, date]
    );
    goal = historicalGoals[0] || null;
  }
  return {
    ...goal,
    disclaimer: 'Note: These calculations are estimates based on scientific formulas (Mifflin-St Jeor) and are not medical prescriptions. Individual metabolic needs may vary.'
  };
}

/**
 * Recalculate and persist nutrition goals based on updated or custom attributes
 * @param {number} userId
 * @param {Object} metricsOverride - Optional custom parameters to recalculate
 */
async function calculateGoals(userId, metricsOverride = {}) {
  // Fetch existing profile if overrides are not completely provided
  const profiles = await db.query(
    `SELECT age, gender, height_cm, weight_kg, activity_level, fitness_goal 
     FROM user_profiles 
     WHERE user_id = ?`,
    [userId]
  );

  if ((!profiles || profiles.length === 0) && (!metricsOverride.weight_kg || !metricsOverride.height_cm)) {
    const error = new Error('User profile is not configured. Please complete your profile first.');
    error.statusCode = 400;
    throw error;
  }

  const base = profiles[0] || {};
  const merged = {
    age: metricsOverride.age ?? base.age,
    gender: metricsOverride.gender ?? base.gender,
    height_cm: metricsOverride.height_cm ?? base.height_cm,
    weight_kg: metricsOverride.weight_kg ?? base.weight_kg,
    activity_level: metricsOverride.activity_level ?? base.activity_level,
    fitness_goal: metricsOverride.fitness_goal ?? base.fitness_goal
  };

  if (Object.values(merged).some(value => value === undefined || value === null)) {
    const error = new Error('Complete profile details are required to calculate nutrition goals.');
    error.statusCode = 400;
    throw error;
  }

  const calculated = computeNutritionTargets(merged);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (profiles.length) {
      await connection.query(
        `UPDATE user_profiles SET age = ?, gender = ?, height_cm = ?, weight_kg = ?, activity_level = ?, fitness_goal = ? WHERE user_id = ?`,
        [merged.age, merged.gender, merged.height_cm, merged.weight_kg, merged.activity_level, merged.fitness_goal, userId]
      );
    } else {
      await connection.query(
        `INSERT INTO user_profiles (user_id, age, gender, height_cm, weight_kg, activity_level, fitness_goal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, merged.age, merged.gender, merged.height_cm, merged.weight_kg, merged.activity_level, merged.fitness_goal]
      );
    }
    await saveCurrentGoals(connection, userId, calculated);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return calculated;
}

module.exports = {
  getUserGoals,
  calculateGoals
};
