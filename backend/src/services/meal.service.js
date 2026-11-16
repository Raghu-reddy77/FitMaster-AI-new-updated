/**
 * FitMaster AI – Meal Logging Service
 * Coordinates meal tracking across Breakfast, Lunch, Dinner, and Snacks slots with dynamic nutritional scaling.
 */

const db = require('../config/database');
const { getFoodById, scaleNutrition } = require('./food.service');
const { getCustomFoodById } = require('./customFood.service');

/**
 * Retrieve all logged meals and items for a specific user and date
 * @param {number} userId
 * @param {string} date - 'YYYY-MM-DD'
 */
async function getMealsByDate(userId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const meals = await db.query(
    `SELECT meal_id, user_id, meal_date, meal_type, total_calories, 
            total_protein, total_carbs, total_fat, total_fibre, created_at 
     FROM meals 
     WHERE user_id = ? AND meal_date = ? 
     ORDER BY CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 WHEN 'snacks' THEN 4 ELSE 5 END`,
    [userId, targetDate]
  );

  if (meals.length === 0) {
    return {
      date: targetDate,
      meals: [],
      daily_totals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fibre: 0
      }
    };
  }

  // Fetch items for all these meals — handle both regular foods and custom foods
  const mealIds = meals.map((m) => m.meal_id);
  const placeholders = mealIds.map(() => '?').join(',');

  // Regular food items (food_id NOT NULL)
  const regularItems = await db.query(
    `SELECT mi.meal_item_id, mi.meal_id, mi.food_id, mi.custom_food_id, mi.quantity_grams,
            mi.calories, mi.protein, mi.carbs, mi.fat, mi.fibre,
            f.food_name, f.category, f.serving_size, f.source
     FROM meal_items mi
     JOIN foods f ON mi.food_id = f.food_id
     WHERE mi.meal_id IN (${placeholders}) AND mi.food_id IS NOT NULL`,
    mealIds
  );

  // Custom food items (custom_food_id NOT NULL, food_id NULL)
  const customItems = await db.query(
    `SELECT mi.meal_item_id, mi.meal_id, mi.food_id, mi.custom_food_id, mi.quantity_grams,
            mi.calories, mi.protein, mi.carbs, mi.fat, mi.fibre,
            cf.food_name, 'Custom' AS category, cf.serving_size, 'Custom Food' AS source
     FROM meal_items mi
     JOIN custom_foods cf ON mi.custom_food_id = cf.custom_food_id
     WHERE mi.meal_id IN (${placeholders}) AND mi.food_id IS NULL`,
    mealIds
  );

  const items = [...regularItems, ...customItems];

  // Group items by meal
  const itemsByMealId = {};
  for (const item of items) {
    if (!itemsByMealId[item.meal_id]) itemsByMealId[item.meal_id] = [];
    itemsByMealId[item.meal_id].push(item);
  }

  let dayCalories = 0;
  let dayProtein = 0;
  let dayCarbs = 0;
  let dayFat = 0;
  let dayFibre = 0;

  const populatedMeals = meals.map((meal) => {
    dayCalories += Number(meal.total_calories || 0);
    dayProtein += Number(meal.total_protein || 0);
    dayCarbs += Number(meal.total_carbs || 0);
    dayFat += Number(meal.total_fat || 0);
    dayFibre += Number(meal.total_fibre || 0);

    return {
      ...meal,
      items: itemsByMealId[meal.meal_id] || []
    };
  });

  return {
    date: targetDate,
    meals: populatedMeals,
    daily_totals: {
      calories: Number(dayCalories.toFixed(2)),
      protein: Number(dayProtein.toFixed(2)),
      carbs: Number(dayCarbs.toFixed(2)),
      fat: Number(dayFat.toFixed(2)),
      fibre: Number(dayFibre.toFixed(2))
    }
  };
}

/**
 * Log a meal with items
 * @param {number} userId
 * @param {Object} mealData - { meal_date, meal_type, items: [ { food_id, quantity_grams } ] }
 */
async function logMeal(userId, mealData) {
  const { meal_date, meal_type, items } = mealData;
  const targetDate = meal_date || new Date().toISOString().split('T')[0];

  if (!items || items.length === 0) {
    const error = new Error('A meal must contain at least one food item.');
    error.statusCode = 400;
    throw error;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Calculate scaled nutrition for each item
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFibre = 0;

    const computedItems = [];
    for (const itm of items) {
      let scaled;

      if (itm.custom_food_id) {
        // Custom food — look up from custom_foods, ownership-verified
        const customFood = await getCustomFoodById(userId, itm.custom_food_id);
        const grams = parseFloat(itm.quantity_grams);
        const mult = grams / 100;
        scaled = {
          food_id: null,
          custom_food_id: customFood.custom_food_id,
          food_name: customFood.food_name,
          quantity_grams: grams,
          calories: Number((customFood.calories_per_100g * mult).toFixed(2)),
          protein:  Number((customFood.protein_per_100g  * mult).toFixed(2)),
          carbs:    Number((customFood.carbs_per_100g    * mult).toFixed(2)),
          fat:      Number((customFood.fat_per_100g      * mult).toFixed(2)),
          fibre:    Number((customFood.fibre_per_100g    * mult).toFixed(2))
        };
      } else {
        // Regular food from foods table
        const food = await getFoodById(itm.food_id);
        scaled = scaleNutrition(food, parseFloat(itm.quantity_grams));
        scaled.custom_food_id = null;
      }

      totalCalories += scaled.calories;
      totalProtein  += scaled.protein;
      totalCarbs    += scaled.carbs;
      totalFat      += scaled.fat;
      totalFibre    += scaled.fibre;

      computedItems.push(scaled);
    }

    // 2. Insert meal header
    const [mealResult] = await connection.query(
      `INSERT INTO meals (user_id, meal_date, meal_type, total_calories, total_protein, total_carbs, total_fat, total_fibre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        targetDate,
        meal_type,
        Number(totalCalories.toFixed(2)),
        Number(totalProtein.toFixed(2)),
        Number(totalCarbs.toFixed(2)),
        Number(totalFat.toFixed(2)),
        Number(totalFibre.toFixed(2))
      ]
    );

    const mealId = mealResult.insertId;

    // 3. Insert all meal items
    for (const scaled of computedItems) {
      await connection.query(
        `INSERT INTO meal_items (meal_id, food_id, custom_food_id, quantity_grams, calories, protein, carbs, fat, fibre)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mealId,
          scaled.food_id || null,
          scaled.custom_food_id || null,
          scaled.quantity_grams,
          scaled.calories,
          scaled.protein,
          scaled.carbs,
          scaled.fat,
          scaled.fibre
        ]
      );
    }

    await connection.commit();

    return {
      meal_id: mealId,
      user_id: userId,
      meal_date: targetDate,
      meal_type,
      total_calories: Number(totalCalories.toFixed(2)),
      total_protein: Number(totalProtein.toFixed(2)),
      total_carbs: Number(totalCarbs.toFixed(2)),
      total_fat: Number(totalFat.toFixed(2)),
      total_fibre: Number(totalFibre.toFixed(2)),
      items: computedItems
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Delete a logged meal and cascade to its items
 * @param {number} userId
 * @param {number} mealId
 */
async function deleteMeal(userId, mealId) {
  const result = await db.query(
    'DELETE FROM meals WHERE meal_id = ? AND user_id = ?',
    [mealId, userId]
  );

  if (result.affectedRows === 0) {
    const error = new Error('Meal record not found or unauthorized.');
    error.statusCode = 404;
    throw error;
  }

  return { message: 'Meal entry successfully deleted.' };
}

module.exports = {
  getMealsByDate,
  logMeal,
  deleteMeal
};
