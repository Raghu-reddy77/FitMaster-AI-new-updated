/**
 * Isolated integration tests for authenticated progress history.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.SQLITE_FILE = path.join(os.tmpdir(), `fitmaster-progress-history-${process.pid}.sqlite`);

const db = require('../../backend/src/config/database');
const userService = require('../../backend/src/services/user.service');
const progressService = require('../../backend/src/services/progress.service');

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('only explicit authenticated weigh-ins appear in chronological history', async () => {
  await db.testConnection();
  const suffix = `${process.pid}-${Date.now()}`;
  const createUser = async (label) => {
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [label, `${label.toLowerCase().replace(/\s+/g, '-')}-${suffix}@example.test`, 'test-hash']
    );
    return result.insertId;
  };

  const userId = await createUser('History Owner');
  const otherUserId = await createUser('Other Account');
  const profile = {
    age: 30,
    gender: 'other',
    height_cm: 172,
    weight_kg: 74,
    activity_level: 'moderately_active',
    fitness_goal: 'weight_maintenance'
  };

  await userService.updateUserProfile(userId, profile);
  assert.deepEqual(await progressService.getWeightHistory(userId), [], 'new account has no weigh-ins after profile creation');

  await progressService.logWeight(userId, 73.5, '2026-11-15', 'first explicit entry');
  let history = await progressService.getWeightHistory(userId);
  assert.equal(history.length, 1);
  assert.equal(history[0].recorded_date, '2026-11-15');
  assert.equal(history[0].weight_kg, 73.5);

  await progressService.logWeight(userId, 72.8, '2026-11-17', 'later entry');
  await progressService.logWeight(userId, 74.1, '2026-11-16', 'middle entry submitted out of order');
  await progressService.logWeight(otherUserId, 99, '2026-11-17', 'belongs to other account');

  history = await progressService.getWeightHistory(userId);
  assert.deepEqual(history.map((entry) => entry.recorded_date), ['2026-11-15', '2026-11-16', '2026-11-17']);
  assert.deepEqual(history.map((entry) => entry.weight_kg), [73.5, 74.1, 72.8]);
  assert.ok(history.every((entry) => entry.user_id === userId), 'history is isolated to the authenticated user');

  const today = localDate();
  await db.query(
    `INSERT INTO meals (user_id, meal_date, meal_type, total_calories, total_protein, total_carbs, total_fat, total_fibre)
     VALUES (?, ?, 'breakfast', ?, ?, ?, ?, ?)`,
    [userId, today, 420, 22, 48, 14, 6]
  );
  await db.query(
    `INSERT INTO meals (user_id, meal_date, meal_type, total_calories, total_protein, total_carbs, total_fat, total_fibre)
     VALUES (?, ?, 'breakfast', ?, ?, ?, ?, ?)`,
    [otherUserId, today, 900, 50, 100, 25, 8]
  );
  const nutritionHistory = await progressService.getWeeklyProgress(userId, today);
  assert.equal(nutritionHistory.length, 1, 'days without actual meals or hydration are not represented as historical points');
  assert.deepEqual(
    [nutritionHistory[0].calories, nutritionHistory[0].protein, nutritionHistory[0].carbs, nutritionHistory[0].fat],
    [420, 22, 48, 14]
  );
  assert.equal(nutritionHistory[0].has_meals, true);

  // Re-fetching, as on refresh or relogin, must return only the persisted rows.
  assert.deepEqual(await progressService.getWeightHistory(userId), history);

  const updateCount = history.length;
  await userService.updateUserProfile(userId, { ...profile, weight_kg: 71.2, fitness_goal: 'weight_loss' });
  history = await progressService.getWeightHistory(userId);
  assert.equal(history.length, updateCount, 'editing profile must not create another measurement');
  assert.equal(history.at(-1).weight_kg, 72.8);

  await progressService.logWeight(userId, 72.4, '2026-11-17', 'same-day correction');
  history = await progressService.getWeightHistory(userId);
  assert.equal(history.length, updateCount, 'same-day submission updates one record without relying on schema uniqueness');
  assert.equal(history.at(-1).weight_kg, 72.4);

  const removedId = history[1].weight_id;
  await progressService.deleteWeight(userId, removedId);
  history = await progressService.getWeightHistory(userId);
  assert.deepEqual(history.map((entry) => entry.recorded_date), ['2026-11-15', '2026-11-17']);
  assert.equal((await progressService.getWeightHistory(otherUserId)).length, 1, 'deletion cannot affect another user');

  await assert.rejects(() => progressService.logWeight(userId, 71, '2026-02-30'), /valid YYYY-MM-DD/);
  await db.query('DELETE FROM users WHERE user_id IN (?, ?)', [userId, otherUserId]);
});