const { sendError } = require('../utils/response');

function createAiChatRateLimiter({ limit = 10, windowMs = 60_000, now = Date.now } = {}) {
  const requestsByClient = new Map();

  return function aiChatRateLimit(req, res, next) {
    const clientId = req.user?.userId ? `user:${req.user.userId}` : `ip:${req.ip}`;
    const currentTime = now();
    const windowStart = currentTime - windowMs;
    const requests = (requestsByClient.get(clientId) || []).filter((timestamp) => timestamp > windowStart);

    if (requests.length >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((requests[0] + windowMs - currentTime) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return sendError(res, 429, 'Too many assistant requests. Please wait a moment and try again.');
    }

    requests.push(currentTime);
    requestsByClient.set(clientId, requests);

    if (requestsByClient.size > 10000) {
      for (const [key, timestamps] of requestsByClient) {
        if (!timestamps.some((timestamp) => timestamp > windowStart)) requestsByClient.delete(key);
      }
    }
    next();
  };
}

module.exports = createAiChatRateLimiter;