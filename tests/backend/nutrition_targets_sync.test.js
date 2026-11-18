/**
 * Integration coverage for saved, date-effective metabolic targets.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.SQLITE_FILE = path.join(os.tmpdir(), `fitmaster-target-sync-${process.pid}.sqlite`);

const db = require('../../backend/src/config/database');
const userService = require('../../backend/src/services/user.service');
const nutritionService = require('../../backend/src/services/nutrition.service');
const progressService = require('../../backend/src/services/progress.service');
const { computeNutritionTargets } = require('../../backend/src/utils/calculations');

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('profile save synchronizes targets and retains prior-date targets', async () => {
  await db.testConnection();
  const suffix = `${process.pid}-${Date.now()}`;
  const inserted = await db.query(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ['Target Sync Test', `target-sync-${suffix}@example.test`, 'test-hash']
  );
  const userId = inserted.insertId;
  const today = localDate();
  const yesterday = '2020-01-01';

  const originalProfile = {
    age: 32,
    gender: 'female',
    height_cm: 168,
    weight_kg: 68,
    activity_level: 'lightly_active',
    fitness_goal: 'weight_maintenance'
  };
  const previousTargets = computeNutritionTargets(originalProfile);

  await db.query(
    `INSERT INTO user_profiles (user_id, age, gender, height_cm, weight_kg, activity_level, fitness_goal)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, ...Object.values(originalProfile)]
  );
  await db.query(
    `INSERT INTO nutrition_goals
     (user_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      previousTargets.daily_calories,
      previousTargets.protein_g,
      previousTargets.carbs_g,
      previousTargets.fat_g,
      previousTargets.water_ml,
      previousTargets.bmi,
      previousTargets.bmr,
      previousTargets.tdee,
      `${yesterday} 12:00:00`
    ]
  );

  const updatedProfile = {
    ...originalProfile,
    activity_level: 'very_active',
    fitness_goal: 'lean_muscle_gain'
  };
  const saved = await userService.updateUserProfile(userId, updatedProfile);
  const profileRead = await userService.getUserProfile(userId);
  const goalsRead = await nutritionService.getUserGoals(userId);
  const dailyRead = await progressService.getDailyProgress(userId, today);
  const historicalProfile = await userService.getUserProfile(userId, yesterday);
  const historicalDaily = await progressService.getDailyProgress(userId, yesterday);

  assert.deepEqual(
    [profileRead.goal.daily_calories, profileRead.goal.protein_g, profileRead.goal.carbs_g, profileRead.goal.fat_g],
    [saved.goals.daily_calories, saved.goals.protein_g, saved.goals.carbs_g, saved.goals.fat_g]
  );
  assert.deepEqual(
    [goalsRead.daily_calories, goalsRead.protein_g, goalsRead.carbs_g, goalsRead.fat_g],
    [saved.goals.daily_calories, saved.goals.protein_g, saved.goals.carbs_g, saved.goals.fat_g]
  );
  assert.deepEqual(
    [dailyRead.calories.target, dailyRead.macros.protein.target, dailyRead.macros.carbs.target, dailyRead.macros.fat.target],
    [saved.goals.daily_calories, saved.goals.protein_g, saved.goals.carbs_g, saved.goals.fat_g]
  );
  assert.deepEqual(
    [historicalProfile.goal.daily_calories, historicalProfile.goal.protein_g, historicalProfile.goal.carbs_g, historicalProfile.goal.fat_g],
    [previousTargets.daily_calories, previousTargets.protein_g, previousTargets.carbs_g, previousTargets.fat_g]
  );
  assert.deepEqual(
    [historicalDaily.calories.target, historicalDaily.macros.protein.target, historicalDaily.macros.carbs.target, historicalDaily.macros.fat.target],
    [previousTargets.daily_calories, previousTargets.protein_g, previousTargets.carbs_g, previousTargets.fat_g]
  );

  const secondUpdateProfile = { ...updatedProfile, activity_level: 'extra_active' };
  const secondSaved = await userService.updateUserProfile(userId, secondUpdateProfile);
  const afterSameDayEdit = await userService.getUserProfile(userId);
  const priorDateAfterEdit = await userService.getUserProfile(userId, yesterday);
  assert.deepEqual(
    [afterSameDayEdit.goal.daily_calories, afterSameDayEdit.goal.protein_g, afterSameDayEdit.goal.carbs_g, afterSameDayEdit.goal.fat_g],
    [secondSaved.goals.daily_calories, secondSaved.goals.protein_g, secondSaved.goals.carbs_g, secondSaved.goals.fat_g]
  );
  assert.deepEqual(
    [priorDateAfterEdit.goal.daily_calories, priorDateAfterEdit.goal.protein_g, priorDateAfterEdit.goal.carbs_g, priorDateAfterEdit.goal.fat_g],
    [previousTargets.daily_calories, previousTargets.protein_g, previousTargets.carbs_g, previousTargets.fat_g]
  );

  await db.query('DELETE FROM users WHERE user_id = ?', [userId]);
});