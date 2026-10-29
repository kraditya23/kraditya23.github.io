// The sanity guard: contests and solved counts only go up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guard, sameData } from './store.mjs';

const snap = (contests, solved, fetchedAt = '2026-10-10T00:00:00.000Z') => ({
  fetchedAt,
  contests: Array.from({ length: contests }, (_, i) => ({ id: String(i) })),
  solved: { total: solved },
});

test('guard allows a first write and growth', () => {
  assert.equal(guard(undefined, snap(1, 1)), null);
  assert.equal(guard(snap(3, 100), snap(3, 100)), null);
  assert.equal(guard(snap(3, 100), snap(4, 120)), null);
});

test('guard refuses fewer contests or fewer solved', () => {
  assert.match(guard(snap(3, 100), snap(2, 100)), /rated contests went down from 3 to 2/);
  assert.match(guard(snap(3, 100), snap(3, 99)), /solved count went down from 100 to 99/);
});

test('sameData ignores fetchedAt only', () => {
  assert.equal(sameData(snap(3, 100), snap(3, 100, '2026-10-11T00:00:00.000Z')), true);
  assert.equal(sameData(snap(3, 100), snap(3, 101)), false);
  assert.equal(sameData(undefined, snap(3, 100)), false);
});
