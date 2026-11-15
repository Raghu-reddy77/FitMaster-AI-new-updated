const progressService = require('../services/progress.service');
const { sendSuccess } = require('../utils/response');

async function getDaily(req, res, next) {
  try {
    const userId = req.user.userId;
    const { date } = req.query;
    const result = await progressService.getDailyProgress(userId, date);
    return sendSuccess(res, 200, 'Daily progress retrieved successfully.', result);
  } catch (error) {
    next(error);
  }
}

async function getWeekly(req, res, next) {
  try {
    const userId = req.user.userId;
    const { end_date } = req.query;
    const result = await progressService.getWeeklyProgress(userId, end_date);
    return sendSuccess(res, 200, 'Weekly progress retrieved successfully.', result);
  } catch (error) {
    next(error);
  }
}

async function getMonthly(req, res, next) {
  try {
    const userId = req.user.userId;
    const { end_date } = req.query;
    const result = await progressService.getMonthlyProgress(userId, end_date);
    return sendSuccess(res, 200, 'Monthly progress retrieved successfully.', result);
  } catch (error) {
    next(error);
  }
}

async function logWeight(req, res, next) {
  try {
    const userId = req.user.userId;
    const { weight_kg, recorded_date, notes } = req.body;
    const result = await progressService.logWeight(userId, weight_kg, recorded_date, notes);
    return sendSuccess(res, 201, 'Weight entry recorded successfully.', result);
  } catch (error) {
    next(error);
  }
}

async function getWeight(req, res, next) {
  try {
    const userId = req.user.userId;
    const result = await progressService.getWeightHistory(userId);
    return sendSuccess(res, 200, 'Weight history retrieved.', result);
  } catch (error) {
    next(error);
  }
}

async function deleteWeight(req, res, next) {
  try {
    const userId = req.user.userId;
    const weightId = parseInt(req.params.id, 10);
    const result = await progressService.deleteWeight(userId, weightId);
    return sendSuccess(res, 200, 'Weight entry deleted successfully.', result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDaily,
  getWeekly,
  getMonthly,
  logWeight,
  getWeight,
  deleteWeight
};
