/**
 * FitMaster AI – Custom Food Routes
 * Mounted at /api/foods/custom (registered BEFORE the generic food routes in index.js)
 */

const express = require('express');
const router = express.Router();
const customFoodController = require('../controllers/customFood.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.use(authenticateToken);

// Estimation endpoint (no ID param, must be declared before /:id routes)
router.post('/estimate', customFoodController.estimateNutrition);

// CRUD
router.get('/', customFoodController.listCustomFoods);
router.post('/', customFoodController.createCustomFood);
router.put('/:id', customFoodController.updateCustomFood);
router.delete('/:id', customFoodController.deleteCustomFood);

module.exports = router;

