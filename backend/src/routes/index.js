const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const nutritionRoutes = require('./nutrition.routes');
const foodRoutes = require('./food.routes');
const mealRoutes = require('./meal.routes');
const waterRoutes = require('./water.routes');
const progressRoutes = require('./progress.routes');
const aiRoutes = require('./ai.routes');
const analyticsRoutes = require('./analytics.routes');

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'FitMaster AI Node.js Backend Gateway',
    timestamp: new Date().toISOString()
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/nutrition', nutritionRoutes);
router.use('/foods', foodRoutes);
router.use('/meals', mealRoutes);
router.use('/water', waterRoutes);
router.use('/progress', progressRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
