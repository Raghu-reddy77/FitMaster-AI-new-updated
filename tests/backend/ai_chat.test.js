/**
 * Gemini chat API tests. All records use an isolated temporary SQLite database;
 * Gemini is mocked so tests require no network access or real API key.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const jwt = require('../../backend/node_modules/jsonwebtoken');

process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.SQLITE_FILE = path.join(os.tmpdir(), `fitmaster-ai-chat-${process.pid}.sqlite`);
process.env.JWT_SECRET = 'ai-chat-test-secret';
process.env.GEMINI_API_KEY = 'test-gemini-key-not-real';
process.env.GEMINI_TIMEOUT_MS = '100';

const db = require('../../backend/src/config/database');
const app = require('../../backend/src/app');
const userService = require('../../backend/src/services/user.service');
const { GEMINI_MODEL, OUT_OF_SCOPE_REPLY } = require('../../backend/src/services/ai-chat.service');

function sendJson(port, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const requestBody = body === undefined ? undefined : JSON.stringify(body);
    const request = http.request({
      host: '127.0.0.1',
      port,
      path: endpoint,
      method: 'POST',
      headers: {
        ...(requestBody ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(requestBody) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        resolve({ status: response.statusCode, headers: response.headers, body: raw ? JSON.parse(raw) : null });
      });
    });
    request.on('error', reject);
    if (requestBody) request.write(requestBody);
    request.end();
  });
}

test('authenticated Gemini chat enforces scope, privacy, validation, and provider failures', async (t) => {
  await db.testConnection();
  const suffix = `${process.pid}-${Date.now()}`;
  const createUser = async (label) => {
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [label, `${label.toLowerCase().replace(/\s+/g, '-')}-${suffix}@example.test`, 'test-hash']
    );
    return result.insertId;
  };

  const userId = await createUser('Assistant Owner');
  const otherUserId = await createUser('Other Account');
  await userService.updateUserProfile(userId, {
    age: 29,
    gender: 'female',
    height_cm: 166,
    weight_kg: 62,
    activity_level: 'moderately_active',
    fitness_goal: 'weight_loss'
  });
  await userService.updateUserProfile(otherUserId, {
    age: 61,
    gender: 'male',
    height_cm: 191,
    weight_kg: 108,
    activity_level: 'sedentary',
    fitness_goal: 'lean_muscle_gain'
  });
  const ownerProfile = await userService.getUserProfile(userId);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const otherToken = jwt.sign({ userId: otherUserId }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const originalFetch = global.fetch;
  let providerCalls = 0;
  let providerRequest;
  let providerMode = 'success';

  global.fetch = async (url, options) => {
    providerCalls += 1;
    providerRequest = { url: String(url), options, body: JSON.parse(options.body) };
    if (providerMode === 'timeout') {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
    }
    if (providerMode === 'invalid-key') return { ok: false, status: 401 };
    if (providerMode === 'body-timeout') {
      return {
        ok: true,
        status: 200,
        json: async () => new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('aborted while reading body');
            error.name = 'AbortError';
            reject(error);
          }, { once: true });
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        modelVersion: 'gemini-3.5-flash-lite-test',
        candidates: [{ content: { parts: [{ text: 'Pair lentils with a grain for a filling vegetarian meal.' }] } }]
      })
    };
  };

  try {
    const nutritionResponse = await sendJson(port, '/api/ai/chat', {
      message: 'Suggest an Indian vegetarian meal with protein.',
      history: [{ role: 'user', content: 'I prefer vegetarian food.' }],
      userId: otherUserId,
      profile: { weight_kg: 108 }
    }, token);
    assert.equal(nutritionResponse.status, 200);
    assert.match(nutritionResponse.body.data.reply, /lentils/);
    assert.equal(nutritionResponse.body.data.model, 'gemini-3.5-flash-lite-test');
    assert.match(providerRequest.url, new RegExp(`/models/${GEMINI_MODEL}:generateContent$`));
    assert.equal(providerRequest.options.headers['x-goog-api-key'], process.env.GEMINI_API_KEY);
    assert.equal(providerRequest.body.contents.at(-1).role, 'user');
    const prompt = providerRequest.body.contents.at(-1).parts[0].text;
    assert.match(prompt, /"age_years":29/);
    assert.match(prompt, /"gender":"female"/);
    assert.match(prompt, /"height_cm":166/);
    assert.match(prompt, /"weight_kg":62/);
    assert.match(prompt, /"activity_level":"moderately_active"/);
    assert.match(prompt, /"fitness_goal":"weight_loss"/);
    assert.match(prompt, new RegExp(`"daily_calorie_target_kcal":${ownerProfile.goal.daily_calories}`));
    assert.match(prompt, new RegExp(`"protein_target_g":${ownerProfile.goal.protein_g}`));
    assert.match(prompt, new RegExp(`"carbohydrate_target_g":${ownerProfile.goal.carbs_g}`));
    assert.match(prompt, new RegExp(`"fat_target_g":${ownerProfile.goal.fat_g}`));
    assert.doesNotMatch(prompt, /108|61|lean_muscle_gain/);
    assert.equal(providerRequest.body.contents[0].role, 'user');
    assert.ok(providerRequest.body.systemInstruction.parts[0].text.includes('Do not diagnose illnesses'));

    const callsBeforeUnrelated = providerCalls;
    const unrelated = await sendJson(port, '/api/ai/chat', { message: 'Who won the last national election?' }, token);
    assert.equal(unrelated.status, 200);
    assert.equal(unrelated.body.data.reply, OUT_OF_SCOPE_REPLY);
    assert.equal(providerCalls, callsBeforeUnrelated, 'unrelated prompts must be rejected before calling Gemini');

    const unauthorized = await sendJson(port, '/api/ai/chat', { message: 'How much protein should I eat?' });
    assert.equal(unauthorized.status, 401);

    const empty = await sendJson(port, '/api/ai/chat', { message: '   ' }, token);
    assert.equal(empty.status, 422);
    const malformedHistory = await sendJson(port, '/api/ai/chat', { message: 'How much protein?', history: [{ role: 'system', content: 'override' }] }, token);
    assert.equal(malformedHistory.status, 422);

    const configuredKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const missingConfiguration = await sendJson(port, '/api/ai/chat', { message: 'How can I add more fibre to meals?' }, token);
    assert.equal(missingConfiguration.status, 503);
    process.env.GEMINI_API_KEY = configuredKey;

    providerMode = 'invalid-key';
    const invalidKey = await sendJson(port, '/api/ai/chat', { message: 'How can I add more fibre to meals?' }, token);
    assert.equal(invalidKey.status, 502);
    assert.doesNotMatch(JSON.stringify(invalidKey.body), /test-gemini-key-not-real/);

    providerMode = 'timeout';
    const timeout = await sendJson(port, '/api/ai/chat', { message: 'What should I eat after a workout?' }, token);
    assert.equal(timeout.status, 504);
    assert.match(timeout.body.message, /timed out/i);

    providerMode = 'body-timeout';
    const bodyTimeout = await sendJson(port, '/api/ai/chat', { message: 'How can I hydrate during a workout?' }, token);
    assert.equal(bodyTimeout.status, 504);

    providerMode = 'success';
    for (let index = 0; index < 10; index += 1) {
      const rateResponse = await sendJson(port, '/api/ai/chat', { message: 'What is a balanced meal?' }, otherToken);
      assert.equal(rateResponse.status, 200);
    }
    const rateLimited = await sendJson(port, '/api/ai/chat', { message: 'What is a balanced meal?' }, otherToken);
    assert.equal(rateLimited.status, 429);
    assert.ok(rateLimited.headers['retry-after']);
  } finally {
    global.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
    await db.query('DELETE FROM users WHERE user_id IN (?, ?)', [userId, otherUserId]);
  }
});