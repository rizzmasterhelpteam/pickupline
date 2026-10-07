import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, CURATED_PICKUP_LINES, LINES_BY_CATEGORY } from '../src/data/curatedLines';
import { getRandomPickupLine } from '../src/services/pickupLineApi';
import { appendLine, createBrowseState, previousLine, HISTORY_LIMIT } from '../src/utils/browseHistory';
import { validateSaved, validateCounts, validateReactions } from '../src/utils/storedData';
import {
  canShowInterstitial,
  retryDelay,
  INTERSTITIAL_COOLDOWN_MS,
  INTERSTITIAL_MIN_ACTIONS,
  INTERSTITIAL_TTL_MS,
} from '../src/services/adPolicy';

test('each category only serves matching, unique, stable catalog lines', () => {
  assert.equal(new Set(CURATED_PICKUP_LINES.map(line => line.text)).size, CURATED_PICKUP_LINES.length);
  for (const category of CATEGORIES) {
    const seen = new Set<string>();
    for (let draw = 0; draw < 30; draw++) {
      const line = getRandomPickupLine(category.id).line;
      assert.ok(CURATED_PICKUP_LINES.includes(line));
      assert.ok(!seen.has(line.id));
      seen.add(line.id);
      if (category.id !== 'all') assert.equal(line.category, category.id);
    }
    assert.ok(LINES_BY_CATEGORY[category.id].length > 30);
  }
});

test('going back then generating replaces the forward branch and stays bounded', () => {
  const [a, b, c, d] = CURATED_PICKUP_LINES;
  let state = appendLine(appendLine(createBrowseState(a), b), c);
  state = previousLine(state);
  assert.equal(state.lines[state.index], b);
  state = appendLine(state, d);
  assert.deepEqual(state.lines, [a, b, d]);
  assert.equal(previousLine(state).lines[previousLine(state).index], b);
  for (let index = 0; index < 500; index++) state = appendLine(state, CURATED_PICKUP_LINES[index]);
  assert.equal(state.lines.length, HISTORY_LIMIT);
  assert.equal(state.index, HISTORY_LIMIT - 1);
});

test('stored data rejects malformed values and migrates old timestamp IDs without losing valid saves', () => {
  const line = CURATED_PICKUP_LINES[0];
  const oldId = `${line.id}-1750000000000`;
  assert.deepEqual(validateSaved({ text: line.text }), []);
  assert.deepEqual(validateSaved([null, { text: 45 }, { ...line, id: oldId }, line]), [line]);
  assert.deepEqual(validateReactions({ [oldId]: 'fire', unknown: 'fire', [CURATED_PICKUP_LINES[1].id]: 'bad' }), { [line.id]: 'fire' });
  assert.deepEqual(validateCounts({ [oldId]: { fire: 1, cheesy: 2, cringe: 3 } }), { [line.id]: { fire: 1, cheesy: 2, cringe: 3 } });
  assert.deepEqual(validateCounts({ [line.id]: { fire: -1, cheesy: '2', cringe: 3 } }), {});
});

test('interstitial eligibility guards loading, startup, expiry, cooldown and foreground state', () => {
  const now = 500_000;
  const state = { loadedAt: now - 1000, startedAt: 0, lastShownAt: null, actions: INTERSTITIAL_MIN_ACTIONS, active: true, online: true, blocked: false, showing: false };
  assert.equal(canShowInterstitial(state, now), true);
  assert.equal(canShowInterstitial({ ...state, startedAt: now }, now), true);
  for (const patch of [
    { loadedAt: null },
    { actions: INTERSTITIAL_MIN_ACTIONS - 1 },
    { active: false },
    { online: false },
    { blocked: true },
    { showing: true },
    { lastShownAt: now - INTERSTITIAL_COOLDOWN_MS + 1 },
    { loadedAt: now - INTERSTITIAL_TTL_MS },
  ]) {
    assert.equal(canShowInterstitial({ ...state, ...patch }, now), false);
  }
  assert.equal(retryDelay(0, 0), 15000);
  assert.equal(retryDelay(1, 0), 30000);
  assert.equal(retryDelay(100, 0), 120000);
});
