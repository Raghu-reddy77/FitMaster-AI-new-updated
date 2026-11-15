/**
 * FitMaster AI – User Profile Service
 * Manages user profile retrieval, updates, and automatic synchronization with nutrition targets.
 */

const db = require('../config/database');
const { computeNutritionTargets } = require('../utils/calculations');

/**
 * Get profile and associated goals for a user
 * @param {number} userId
 */
async function getUserProfile(userId) {
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

  const goal = goals[0] || null;

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

    const [existingGoal] = await connection.query(
      'SELECT goal_id FROM nutrition_goals WHERE user_id = ?',
      [userId]
    );

    if (existingGoal.length > 0) {
      // Snapshot old goals before overwriting (for historical tracking)
      const [oldGoal] = await connection.query(
        'SELECT daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee FROM nutrition_goals WHERE user_id = ?',
        [userId]
      );
      if (oldGoal.length > 0) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        await connection.query(
          `INSERT INTO nutrition_goals_history (user_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee, effective_from)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, oldGoal[0].daily_calories, oldGoal[0].protein_g, oldGoal[0].carbs_g, oldGoal[0].fat_g,
           oldGoal[0].water_ml, oldGoal[0].bmi, oldGoal[0].bmr, oldGoal[0].tdee, todayStr]
        );
      }
      await connection.query(
        `UPDATE nutrition_goals 
         SET daily_calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, water_ml = ?, bmi = ?, bmr = ?, tdee = ? 
         WHERE user_id = ?`,
        [
          targets.daily_calories,
          targets.protein_g,
          targets.carbs_g,
          targets.fat_g,
          targets.water_ml,
          targets.bmi,
          targets.bmr,
          targets.tdee,
          userId
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO nutrition_goals (user_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          targets.daily_calories,
          targets.protein_g,
          targets.carbs_g,
          targets.fat_g,
          targets.water_ml,
          targets.bmi,
          targets.bmr,
          targets.tdee
        ]
      );
    }

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
