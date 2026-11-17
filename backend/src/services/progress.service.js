/**
 * FitMaster AI – Progress & Analytics Service
 * Aggregates daily, weekly (7-day), and monthly (30-day) consumption records,
 * compares against personalized targets, and manages weight trajectories.
 */

const db = require('../config/database');
const { getUserGoals } = require('./nutrition.service');
const { getWaterByDate } = require('./water.service');

/**
 * Get unified daily progress metrics
 * @param {number} userId
 * @param {string} date
 */
async function getDailyProgress(userId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const goals = await getUserGoals(userId, targetDate);

  // Meal totals
  const mealSummary = await db.query(
    `SELECT 
       COALESCE(SUM(total_calories), 0) AS consumed_calories,
       COALESCE(SUM(total_protein), 0) AS consumed_protein,
       COALESCE(SUM(total_carbs), 0) AS consumed_carbs,
       COALESCE(SUM(total_fat), 0) AS consumed_fat,
       COALESCE(SUM(total_fibre), 0) AS consumed_fibre,
       COUNT(meal_id) AS total_meals
     FROM meals 
     WHERE user_id = ? AND meal_date = ?`,
    [userId, targetDate]
  );

  const summary = mealSummary[0];
  const consumedCalories = parseFloat(summary.consumed_calories);
  const consumedProtein = parseFloat(summary.consumed_protein);
  const consumedCarbs = parseFloat(summary.consumed_carbs);
  const consumedFat = parseFloat(summary.consumed_fat);

  const targetCalories = goals ? parseFloat(goals.daily_calories) : 2000;
  const targetProtein = goals ? parseFloat(goals.protein_g) : 150;
  const targetCarbs = goals ? parseFloat(goals.carbs_g) : 250;
  const targetFat = goals ? parseFloat(goals.fat_g) : 65;

  const waterStatus = await getWaterByDate(userId, targetDate);

  return {
    date: targetDate,
    calories: {
      target: targetCalories,
      consumed: consumedCalories,
      remaining: Math.max(0, targetCalories - consumedCalories),
      percentage: targetCalories > 0 ? Math.min(100, Math.round((consumedCalories / targetCalories) * 100)) : 0
    },
    macros: {
      protein: {
        target: targetProtein,
        consumed: consumedProtein,
        remaining: Math.max(0, targetProtein - consumedProtein),
        percentage: targetProtein > 0 ? Math.min(100, Math.round((consumedProtein / targetProtein) * 100)) : 0
      },
      carbs: {
        target: targetCarbs,
        consumed: consumedCarbs,
        remaining: Math.max(0, targetCarbs - consumedCarbs),
        percentage: targetCarbs > 0 ? Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100)) : 0
      },
      fat: {
        target: targetFat,
        consumed: consumedFat,
        remaining: Math.max(0, targetFat - consumedFat),
        percentage: targetFat > 0 ? Math.min(100, Math.round((consumedFat / targetFat) * 100)) : 0
      }
    },
    water: {
      target: waterStatus.target_ml,
      consumed: waterStatus.consumed_ml,
      remaining: waterStatus.remaining_ml,
      percentage: waterStatus.percentage
    }
  };
}

/**
 * Get 7-day weekly intake history
 * @param {number} userId
 * @param {string} endDate
 */
async function getWeeklyProgress(userId, endDate) {
  const targetEnd = endDate || new Date().toISOString().split('T')[0];
  const endDateObj = new Date(targetEnd);

  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDateObj);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  const startDate = dates[0];

  const mealRows = await db.query(
    `SELECT meal_date, 
            SUM(total_calories) AS calories, 
            SUM(total_protein) AS protein,
            SUM(total_carbs) AS carbs,
            SUM(total_fat) AS fat
     FROM meals 
     WHERE user_id = ? AND meal_date >= ? AND meal_date <= ?
     GROUP BY meal_date`,
    [userId, startDate, targetEnd]
  );

  const waterRows = await db.query(
    `SELECT intake_date, SUM(amount_ml) AS water
     FROM water_intake
     WHERE user_id = ? AND intake_date >= ? AND intake_date <= ?
     GROUP BY intake_date`,
    [userId, startDate, targetEnd]
  );

  const mealMap = new Map();
  mealRows.forEach((r) => mealMap.set(r.meal_date, r));

  const waterMap = new Map();
  waterRows.forEach((r) => waterMap.set(r.intake_date, r.water));

  return Promise.all(dates.map(async (day_date) => {
    const m = mealMap.get(day_date) || {};
    const goals = await getUserGoals(userId, day_date);
    return {
      day_date,
      calories: Number(m.calories) || 0,
      protein: Number(m.protein) || 0,
      carbs: Number(m.carbs) || 0,
      fat: Number(m.fat) || 0,
      water: Number(waterMap.get(day_date)) || 0,
      targets: goals ? {
        daily_calories: Number(goals.daily_calories),
        protein_g: Number(goals.protein_g),
        carbs_g: Number(goals.carbs_g),
        fat_g: Number(goals.fat_g),
        water_ml: Number(goals.water_ml)
      } : null
    };
  }));
}

/**
 * Get 30-day monthly trend aggregation
 * @param {number} userId
 * @param {string} endDate
 */
async function getMonthlyProgress(userId, endDate) {
  const targetEnd = endDate || new Date().toISOString().split('T')[0];
  const endDateObj = new Date(targetEnd);
  const startDateObj = new Date(endDateObj);
  startDateObj.setDate(startDateObj.getDate() - 30);
  const startDate = startDateObj.toISOString().split('T')[0];

  const rows = await db.query(
    `SELECT 
       meal_date,
       SUM(total_calories) AS calories,
       SUM(total_protein) AS protein,
       SUM(total_carbs) AS carbs,
       SUM(total_fat) AS fat
     FROM meals 
     WHERE user_id = ? AND meal_date >= ? AND meal_date <= ?
     GROUP BY meal_date
     ORDER BY meal_date ASC`,
    [userId, startDate, targetEnd]
  );

  return rows;
}

/**
 * Log a weight check-in
 * @param {number} userId
 * @param {number} weightKg
 * @param {string} recordedDate
 * @param {string} notes
 */
async function logWeight(userId, weightKg, recordedDate, notes = '') {
  const date = recordedDate || new Date().toISOString().split('T')[0];

  await db.query(
    `INSERT INTO weight_history (user_id, recorded_date, weight_kg, notes) 
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg), notes = VALUES(notes)`,
    [userId, date, parseFloat(weightKg), notes]
  );

  return await getWeightHistory(userId);
}

/**
 * Fetch weight progress history
 * @param {number} userId
 * @param {number} limit
 */
async function getWeightHistory(userId, limit = 30) {
  const history = await db.query(
    `SELECT weight_id, user_id, recorded_date, weight_kg, notes, created_at 
     FROM weight_history 
     WHERE user_id = ? 
     ORDER BY recorded_date ASC 
     LIMIT ?`,
    [userId, parseInt(limit, 10) || 30]
  );
  return history;
}

/**
 * Delete a weight history entry
 * @param {number} userId
 * @param {number} weightId
 */
async function deleteWeight(userId, weightId) {
  const result = await db.query(
    'DELETE FROM weight_history WHERE weight_id = ? AND user_id = ?',
    [weightId, userId]
  );

  if (result.affectedRows === 0) {
    const error = new Error('Weight entry not found or unauthorized.');
    error.statusCode = 404;
    throw error;
  }

  return { message: 'Weight entry deleted successfully.' };
}

module.exports = {
  getDailyProgress,
  getWeeklyProgress,
  getMonthlyProgress,
  logWeight,
  getWeightHistory,
  deleteWeight
};
