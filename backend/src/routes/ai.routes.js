const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authenticateToken = require('../middleware/auth.middleware');
const createAiChatRateLimiter = require('../middleware/ai-chat-rate-limit');
const { chatValidationRules, validateChatRequest } = require('../validators/ai-chat.validator');

router.use(authenticateToken);

router.post('/chat', createAiChatRateLimiter(), chatValidationRules, validateChatRequest, aiController.chat);
router.post('/recommendations', aiController.getRecommendations);
router.get('/recommendations/history', aiController.getHistory);

module.exports = router;
