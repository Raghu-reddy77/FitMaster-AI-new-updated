/**
 * Tests the Progress Analytics history normalization without a browser runtime.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../frontend/js/progress.js'), 'utf8');
const context = {
  document: { addEventListener() {} },
  window: {},
  console,
  Date,
  Number,
  String,
  Array,
  Math
};
vm.createContext(context);
vm.runInContext(source, context);

test('progress history normalizes valid dates and ignores malformed or synthetic entries', () => {
  const rows = context.normalizeWeighIns([
    { weight_id: 3, recorded_date: '2026-11-17', weight_kg: '71.2' },
    { weight_id: 2, date: '16/11/2026', weight_kg: 72.4 },
    { weight_id: 4, recorded_date: '', weight_kg: 68 },
    { weight_id: 5, recorded_date: 'not-a-date', weight_kg: 70 },
    { weight_id: 6, recorded_date: '2026-11-18', weight_kg: 'invalid' },
    { recorded_date: '2026-11-19', weight_kg: 69 }
  ]);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.date), ['2026-11-16', '2026-11-17']);
  assert.deepEqual(rows.map((row) => context.formatHistoryDate(row.date)), ['16/11/2026', '17/11/2026']);
});

test('progress history date formatting rejects impossible calendar dates', () => {
  assert.equal(context.formatHistoryDate('2026-02-30'), '—');
  assert.equal(context.formatHistoryDate(undefined), '—');
});