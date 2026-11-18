const { body, validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

const chatValidationRules = [
  body('message')
    .isString().withMessage('Message must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Message cannot be empty.')
    .isLength({ max: 1200 }).withMessage('Message must be 1200 characters or fewer.'),
  body('history')
    .optional()
    .isArray({ max: 8 }).withMessage('Conversation history may contain at most 8 messages.'),
  body('history.*.role')
    .if(body('history').exists())
    .isIn(['user', 'assistant']).withMessage('History roles must be user or assistant.'),
  body('history.*.content')
    .if(body('history').exists())
    .isString().withMessage('History message content must be text.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 1200 }).withMessage('History messages must contain 1 to 1200 characters.')
];

function validateChatRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 422, 'Invalid chat request.', errors.array().map(({ path, msg }) => ({ field: path, message: msg })));
  }

  const history = req.body.history || [];
  const totalHistoryLength = history.reduce((total, entry) => total + entry.content.length, 0);
  if (totalHistoryLength > 6000) {
    return sendError(res, 422, 'Invalid chat request.', [{ field: 'history', message: 'Conversation history is too long.' }]);
  }

  req.body.history = history.slice(-6);
  next();
}

module.exports = { chatValidationRules, validateChatRequest };