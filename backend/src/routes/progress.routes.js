const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/daily', progressController.getDaily);
router.get('/weekly', progressController.getWeekly);
router.get('/monthly', progressController.getMonthly);
router.get('/weight', progressController.getWeight);
router.post('/weight', progressController.logWeight);
router.delete('/weight/:id', progressController.deleteWeight);

module.exports = router;
