/**
 * FitMaster AI – Custom Food Service
 * Handles user-created custom foods. Each custom food is private to its owner (user_id).
 * Nutrition values are always stored per 100g for consistent scaling.
 */

const db = require('../config/database');

/**
 * List all custom foods for a user
 * @param {number} userId
 */
async function getCustomFoods(userId) {
  const rows = await db.query(
    `SELECT custom_food_id, food_name, calories_per_100g, protein_per_100g,
            carbs_per_100g, fat_per_100g, fibre_per_100g,
            serving_size, serving_weight_g, unit, ingredients_json, is_estimated, created_at
     FROM custom_foods
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((r) => ({
    ...r,
    is_estimated: Boolean(r.is_estimated),
    ingredients: r.ingredients_json ? JSON.parse(r.ingredients_json) : []
  }));
}

/**
 * Get a single custom food (must belong to userId)
 * @param {number} userId
 * @param {number} customFoodId
 */
async function getCustomFoodById(userId, customFoodId) {
  const rows = await db.query(
    `SELECT * FROM custom_foods WHERE custom_food_id = ? AND user_id = ?`,
    [customFoodId, userId]
  );
  if (!rows.length) {
    const err = new Error('Custom food not found or access denied.');
    err.statusCode = 404;
    throw err;
  }
  const r = rows[0];
  return {
    ...r,
    is_estimated: Boolean(r.is_estimated),
    ingredients: r.ingredients_json ? JSON.parse(r.ingredients_json) : []
  };
}

/**
 * Create a custom food
 * @param {number} userId
 * @param {Object} data
 */
async function createCustomFood(userId, data) {
  const {
    food_name,
    calories_per_100g = 0,
    protein_per_100g = 0,
    carbs_per_100g = 0,
    fat_per_100g = 0,
    fibre_per_100g = 0,
    serving_size = '100g',
    serving_weight_g = 100,
    unit = 'grams',
    ingredients = [],
    is_estimated = false
  } = data;

  if (!food_name || food_name.trim().length === 0) {
    const err = new Error('Food name is required.');
    err.statusCode = 400;
    throw err;
  }

  const ingredientsJson = ingredients && ingredients.length > 0
    ? JSON.stringify(ingredients)
    : null;

  const result = await db.query(
    `INSERT INTO custom_foods
     (user_id, food_name, calories_per_100g, protein_per_100g, carbs_per_100g,
      fat_per_100g, fibre_per_100g, serving_size, serving_weight_g, unit, ingredients_json, is_estimated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      food_name.trim(),
      Number(calories_per_100g),
      Number(protein_per_100g),
      Number(carbs_per_100g),
      Number(fat_per_100g),
      Number(fibre_per_100g),
      serving_size,
      Number(serving_weight_g),
      unit,
      ingredientsJson,
      is_estimated ? 1 : 0
    ]
  );

  const newId = result.insertId;
  return getCustomFoodById(userId, newId);
}

/**
 * Update a custom food (ownership enforced)
 * @param {number} userId
 * @param {number} customFoodId
 * @param {Object} data
 */
async function updateCustomFood(userId, customFoodId, data) {
  // Verify ownership first
  await getCustomFoodById(userId, customFoodId);

  const {
    food_name,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g,
    fibre_per_100g,
    serving_size,
    serving_weight_g,
    unit,
    ingredients,
    is_estimated
  } = data;

  const ingredientsJson = ingredients && ingredients.length > 0
    ? JSON.stringify(ingredients)
    : null;

  await db.query(
    `UPDATE custom_foods SET
       food_name = COALESCE(?, food_name),
       calories_per_100g = COALESCE(?, calories_per_100g),
       protein_per_100g = COALESCE(?, protein_per_100g),
       carbs_per_100g = COALESCE(?, carbs_per_100g),
       fat_per_100g = COALESCE(?, fat_per_100g),
       fibre_per_100g = COALESCE(?, fibre_per_100g),
       serving_size = COALESCE(?, serving_size),
       serving_weight_g = COALESCE(?, serving_weight_g),
       unit = COALESCE(?, unit),
       ingredients_json = COALESCE(?, ingredients_json),
       is_estimated = COALESCE(?, is_estimated),
       updated_at = CURRENT_TIMESTAMP
     WHERE custom_food_id = ? AND user_id = ?`,
    [
      food_name ? food_name.trim() : null,
      calories_per_100g !== undefined ? Number(calories_per_100g) : null,
      protein_per_100g !== undefined ? Number(protein_per_100g) : null,
      carbs_per_100g !== undefined ? Number(carbs_per_100g) : null,
      fat_per_100g !== undefined ? Number(fat_per_100g) : null,
      fibre_per_100g !== undefined ? Number(fibre_per_100g) : null,
      serving_size || null,
      serving_weight_g !== undefined ? Number(serving_weight_g) : null,
      unit || null,
      ingredientsJson,
      is_estimated !== undefined ? (is_estimated ? 1 : 0) : null,
      customFoodId,
      userId
    ]
  );

  return getCustomFoodById(userId, customFoodId);
}

/**
 * Delete a custom food (ownership enforced)
 * @param {number} userId
 * @param {number} customFoodId
 */
async function deleteCustomFood(userId, customFoodId) {
  const result = await db.query(
    'DELETE FROM custom_foods WHERE custom_food_id = ? AND user_id = ?',
    [customFoodId, userId]
  );

  if (result.affectedRows === 0) {
    const err = new Error('Custom food not found or access denied.');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Custom food deleted.' };
}

/**
 * Estimate nutrition from ingredient names by looking them up in the foods table
 * Returns per-100g values for the combined recipe.
 * @param {string} foodName
 * @param {Array} ingredients - [{ name: string, quantity_g: number }]
 */
async function estimateNutrition(foodName, ingredients = []) {
  // 1. Try exact/fuzzy match of food_name in foods table
  if (foodName) {
    const matches = await db.query(
      `SELECT food_name, calories_per_100g, protein_per_100g, carbs_per_100g,
              fat_per_100g, fibre_per_100g
       FROM foods
       WHERE LOWER(food_name) LIKE ?
       LIMIT 1`,
      [`%${foodName.toLowerCase()}%`]
    );
    if (matches.length > 0) {
      return {
        source: 'database_match',
        matched_food: matches[0].food_name,
        calories_per_100g: matches[0].calories_per_100g,
        protein_per_100g: matches[0].protein_per_100g,
        carbs_per_100g: matches[0].carbs_per_100g,
        fat_per_100g: matches[0].fat_per_100g,
        fibre_per_100g: matches[0].fibre_per_100g,
        is_estimated: false
      };
    }
  }

  // 2. Calculate from ingredients if supplied
  if (ingredients && ingredients.length > 0) {
    let totalWeight = 0;
    let totCal = 0, totP = 0, totC = 0, totF = 0, totFib = 0;
    const notFound = [];

    for (const ing of ingredients) {
      const name = (ing.name || '').trim();
      const qty = Number(ing.quantity_g) || 0;
      if (!name || qty <= 0) continue;

      const rows = await db.query(
        `SELECT food_name, calories_per_100g, protein_per_100g, carbs_per_100g,
                fat_per_100g, fibre_per_100g
         FROM foods WHERE LOWER(food_name) LIKE ? LIMIT 1`,
        [`%${name.toLowerCase()}%`]
      );

      if (rows.length > 0) {
        const mult = qty / 100;
        totCal += rows[0].calories_per_100g * mult;
        totP   += rows[0].protein_per_100g * mult;
        totC   += rows[0].carbs_per_100g * mult;
        totF   += rows[0].fat_per_100g * mult;
        totFib += rows[0].fibre_per_100g * mult;
        totalWeight += qty;
      } else {
        notFound.push(name);
      }
    }

    if (totalWeight > 0) {
      // Convert totals to per-100g
      const scale = 100 / totalWeight;
      return {
        source: 'ingredient_calculation',
        unmatched_ingredients: notFound,
        calories_per_100g: Number((totCal * scale).toFixed(2)),
        protein_per_100g:  Number((totP   * scale).toFixed(2)),
        carbs_per_100g:    Number((totC   * scale).toFixed(2)),
        fat_per_100g:      Number((totF   * scale).toFixed(2)),
        fibre_per_100g:    Number((totFib * scale).toFixed(2)),
        is_estimated: true
      };
    }
  }

  // 3. No data available
  return {
    source: 'manual',
    calories_per_100g: 0,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fat_per_100g: 0,
    fibre_per_100g: 0,
    is_estimated: true,
    message: 'Could not estimate nutrition. Please enter values manually.'
  };
}

module.exports = {
  getCustomFoods,
  getCustomFoodById,
  createCustomFood,
  updateCustomFood,
  deleteCustomFood,
  estimateNutrition
};

