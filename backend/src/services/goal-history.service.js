/**
 * Shared persistence for the current nutrition targets and their dated history.
 */

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromTimestamp(value) {
  if (!value) return localDateString();
  if (value instanceof Date) return localDateString(value);
  return String(value).slice(0, 10);
}

async function saveCurrentGoals(connection, userId, targets) {
  const [existingGoals] = await connection.query(
    `SELECT goal_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee, calculated_at
     FROM nutrition_goals WHERE user_id = ?`,
    [userId]
  );

  const values = [
    targets.daily_calories,
    targets.protein_g,
    targets.carbs_g,
    targets.fat_g,
    targets.water_ml,
    targets.bmi,
    targets.bmr,
    targets.tdee
  ];

  if (existingGoals.length) {
    const previous = existingGoals[0];
    const effectiveFrom = dateFromTimestamp(previous.calculated_at);

    if (effectiveFrom < localDateString()) {
      // Keep one snapshot per user/date without replacing previous dates.
      await connection.query(
        'DELETE FROM nutrition_goals_history WHERE user_id = ? AND effective_from = ?',
        [userId, effectiveFrom]
      );
      await connection.query(
        `INSERT INTO nutrition_goals_history
         (user_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee, effective_from)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          previous.daily_calories,
          previous.protein_g,
          previous.carbs_g,
          previous.fat_g,
          previous.water_ml,
          previous.bmi,
          previous.bmr,
          previous.tdee,
          effectiveFrom
        ]
      );
    }

    await connection.query(
      `UPDATE nutrition_goals
        SET daily_calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, water_ml = ?, bmi = ?, bmr = ?, tdee = ?, calculated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [...values, userId]
    );
    return;
  }

  await connection.query(
    `INSERT INTO nutrition_goals
     (user_id, daily_calories, protein_g, carbs_g, fat_g, water_ml, bmi, bmr, tdee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, ...values]
  );
}

module.exports = { saveCurrentGoals, localDateString };