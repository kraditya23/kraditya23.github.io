// Checks the CodeChef parser still reads the saved profile page.
// If CodeChef changes its markup, refresh the fixture from the live page and update the expected values.
//   npm run test:cp
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalize, parseProfile } from './codechef.mjs';
import { snapshotSchema } from './schema.mjs';

const html = fs.readFileSync(new URL('./__fixtures__/codechef.html', import.meta.url), 'utf8');
const fetchedAt = '2026-10-10T17:56:46.621Z';

test('parseProfile reads the rating block, solved count and embedded scripts', () => {
  const p = parseProfile(html);
  assert.equal(p.handle, 'kraditya23');
  assert.equal(p.current, 1676);
  assert.equal(p.stars, 3);
  assert.equal(p.highest, 1713);
  assert.equal(p.globalRank, 8705);
  assert.equal(p.countryRank, 7965);
  assert.equal(p.solvedTotal, 62);
  assert.equal(p.history.length, 5);
  assert.equal(p.solvedByContest.get('Starters 237 (Rated)'), 6);
  assert.equal(p.solvedByContest.get('Monday Munch - DSA Challenge 34'), 5);
  assert.equal(p.daily.length, 10);
  assert.deepEqual(p.daily[0], ['2026-04-18', 1]);
});

test('normalize produces a valid snapshot', () => {
  const snap = snapshotSchema.parse(normalize(html, { handle: 'kraditya23', fetchedAt }));
  assert.deepEqual(snap.rating, { current: 1676, max: 1713, title: '3★', globalRank: 8705, countryRank: 7965 });
  assert.equal(snap.solved.total, 62);
  assert.equal(snap.contests.length, 5);
  assert.deepEqual(snap.contests[0], {
    id: 'START235D',
    name: 'Starters 235 (Rated)',
    date: '2026-04-22',
    rank: 442,
    newRating: 1409,
    url: 'https://www.codechef.com/START235D',
    solved: 5,
  });
  assert.deepEqual(snap.contests.at(-1), {
    id: 'START246B',
    name: 'Starters 246 (Rated)',
    date: '2026-07-08',
    rank: 994,
    oldRating: 1713,
    newRating: 1676,
    delta: -37,
    url: 'https://www.codechef.com/START246B',
    solved: 3,
  });
  assert.equal(Object.keys(snap.activity ?? {}).length, 10);
});

test('normalize refuses a page that is not the profile', () => {
  assert.throws(() => normalize('<html><body>Just a moment...</body></html>', { handle: 'kraditya23', fetchedAt }));
  assert.throws(() => normalize(html, { handle: 'someone_else', fetchedAt }));
});
