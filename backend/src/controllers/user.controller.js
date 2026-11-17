const userService = require('../services/user.service');
const { sendSuccess } = require('../utils/response');

async function getProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const profile = await userService.getUserProfile(userId, req.query.date);
    return sendSuccess(res, 200, 'User profile retrieved successfully.', profile);
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const profileData = req.body;
    const result = await userService.updateUserProfile(userId, profileData);
    return sendSuccess(res, 200, 'User profile updated and nutrition goals recalculated successfully.', result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile
};
