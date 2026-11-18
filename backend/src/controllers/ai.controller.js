const aiService = require('../services/ai.service');
const aiChatService = require('../services/ai-chat.service');
const { sendSuccess } = require('../utils/response');

async function chat(req, res, next) {
  try {
    const result = await aiChatService.generateChatReply(req.user.userId, req.body);
    return sendSuccess(res, 200, 'Assistant response generated successfully.', {
      reply: result.reply,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

async function getRecommendations(req, res, next) {
  try {
    const userId = req.user.userId;
    const result = await aiService.generateRecommendations(userId);
    return sendSuccess(res, 200, 'AI recommendations generated successfully.', result);
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const userId = req.user.userId;
    const history = await aiService.getRecommendationHistory(userId);
    return sendSuccess(res, 200, 'AI recommendations history retrieved.', history);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  chat,
  getRecommendations,
  getHistory
};
