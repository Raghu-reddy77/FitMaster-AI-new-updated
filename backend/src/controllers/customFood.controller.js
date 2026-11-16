/**
 * FitMaster AI – Custom Food Controller
 * Handles HTTP request/response cycle for user-created custom foods.
 */

const customFoodService = require('../services/customFood.service');

/**
 * GET /api/foods/custom
 * List the authenticated user's custom foods
 */
async function listCustomFoods(req, res, next) {
  try {
    const userId = req.user.userId;
    const foods = await customFoodService.getCustomFoods(userId);
    res.json({ success: true, data: foods, count: foods.length });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/foods/custom
 * Create a new custom food
 */
async function createCustomFood(req, res, next) {
  try {
    const userId = req.user.userId;
    const food = await customFoodService.createCustomFood(userId, req.body);
    res.status(201).json({ success: true, data: food, message: 'Custom food created.' });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/foods/custom/:id
 * Update a custom food (must belong to the authenticated user)
 */
async function updateCustomFood(req, res, next) {
  try {
    const userId = req.user.userId;
    const customFoodId = parseInt(req.params.id, 10);
    const food = await customFoodService.updateCustomFood(userId, customFoodId, req.body);
    res.json({ success: true, data: food, message: 'Custom food updated.' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/foods/custom/:id
 * Delete a custom food (must belong to the authenticated user)
 */
async function deleteCustomFood(req, res, next) {
  try {
    const userId = req.user.userId;
    const customFoodId = parseInt(req.params.id, 10);
    const result = await customFoodService.deleteCustomFood(userId, customFoodId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/foods/estimate
 * Estimate nutrition from food name and/or ingredient list
 * Body: { food_name: string, ingredients: [{ name, quantity_g }] }
 */
async function estimateNutrition(req, res, next) {
  try {
    const { food_name, ingredients } = req.body;
    const result = await customFoodService.estimateNutrition(food_name, ingredients);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCustomFoods,
  createCustomFood,
  updateCustomFood,
  deleteCustomFood,
  estimateNutrition
};

