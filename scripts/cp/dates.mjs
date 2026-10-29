// Small date helpers. Days are calendar days in UTC unless a platform reports its own day labels.

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' (UTC) for a Unix time in seconds. */
export const dayFromSeconds = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);

/** '2026-4-8' → '2026-04-08'. Returns null for anything that is not a real date. */
export function padDay(text) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(text).trim());
  if (!m) return null;
  const day = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day ? day : null;
}

/**
 * Keeps only the 365 calendar days ending on the day of `fetchedAt`, drops zero counts,
 * and sums duplicate days. Returns undefined when nothing is left, so the field is left out.
 * @param {Iterable<[string, number]>} entries  [day, count] pairs
 * @param {string} fetchedAt ISO time
 */
export function lastYearActivity(entries, fetchedAt) {
  const end = fetchedAt.slice(0, 10);
  const start = new Date(Date.parse(`${end}T00:00:00Z`) - 364 * DAY_MS).toISOString().slice(0, 10);
  /** @type {Record<string, number>} */
  const out = {};
  for (const [day, n] of entries) {
    if (!day || !(n > 0) || day < start || day > end) continue;
    out[day] = (out[day] ?? 0) + n;
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
  return Object.keys(sorted).length ? sorted : undefined;
}
