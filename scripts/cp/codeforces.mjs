// Codeforces: official API, no key. At most one request every 2 seconds.
// https://codeforces.com/apiHelp
import { fetchJson, throttle } from './http.mjs';
import { dayFromSeconds, lastYearActivity } from './dates.mjs';

const API = 'https://codeforces.com/api';
const TOP_TAGS = 10;

const urls = (handle) => {
  const h = encodeURIComponent(handle);
  return {
    info: `${API}/user.info?handles=${h}`,
    rating: `${API}/user.rating?handle=${h}`,
    status: `${API}/user.status?handle=${h}`,
  };
};

export const profileUrl = (handle) => `https://codeforces.com/profile/${encodeURIComponent(handle)}`;

async function call(url, gate) {
  const body = await fetchJson(url, { beforeAttempt: gate });
  if (body?.status !== 'OK') throw new Error(`Codeforces API said ${body?.status}: ${body?.comment ?? 'no comment'}`);
  return body.result;
}

/** Raw API results. Requests run one after another, 2 s apart. */
export async function fetchRaw(handle) {
  const gate = throttle(2_000);
  const u = urls(handle);
  const info = await call(u.info, gate);
  const rating = await call(u.rating, gate);
  const status = await call(u.status, gate);
  return { info, rating, status };
}

// 'candidate master' → 'Candidate Master', as the profile page shows it.
const titleCase = (s) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

const problemKey = (sub) => {
  const p = sub.problem ?? {};
  const contest = p.contestId ?? sub.contestId ?? p.problemsetName ?? '';
  return `${contest}-${p.index ?? p.name}`;
};

/**
 * @param {{ info: any[], rating: any[], status: any[] }} raw
 * @param {{ handle: string, fetchedAt: string }} meta
 * @returns {import('./schema.mjs').Snapshot}
 */
export function normalize(raw, { handle, fetchedAt }) {
  const user = raw.info?.[0];
  if (!user || typeof user.handle !== 'string') throw new Error('user.info returned no user');

  const u = urls(handle);
  /** @type {import('./schema.mjs').Snapshot} */
  const snap = {
    platform: 'codeforces',
    handle: user.handle,
    profileUrl: profileUrl(user.handle),
    fetchedAt,
    sources: [u.info, u.rating, u.status],
    contests: [],
    solved: { total: 0 },
  };

  // Unrated accounts have no rating fields at all; leave the block out.
  if (typeof user.rating === 'number' && typeof user.maxRating === 'number') {
    snap.rating = {
      current: user.rating,
      max: user.maxRating,
      ...(user.rank && { title: titleCase(user.rank) }),
      ...(user.maxRank && { maxTitle: titleCase(user.maxRank) }),
    };
  }

  snap.contests = [...raw.rating]
    .sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds)
    .map((r) => ({
      id: String(r.contestId),
      name: r.contestName,
      date: dayFromSeconds(r.ratingUpdateTimeSeconds),
      rank: r.rank,
      oldRating: r.oldRating,
      newRating: r.newRating,
      delta: r.newRating - r.oldRating,
      url: `https://codeforces.com/contest/${r.contestId}`,
    }));

  // Unique solved problems: verdict OK, counted once per contestId + index.
  // An OK on pretests during a running contest is not final yet, so it is skipped.
  /** @type {Map<string, any>} */
  const solved = new Map();
  for (const sub of raw.status) {
    if (sub.verdict !== 'OK' || sub.testset === 'PRETESTS') continue;
    const key = problemKey(sub);
    if (!solved.has(key)) solved.set(key, sub.problem);
  }
  snap.solved.total = solved.size;

  if (solved.size > 0) {
    const byRating = new Map();
    let unrated = 0;
    const byTag = new Map();
    for (const p of solved.values()) {
      if (typeof p.rating === 'number') byRating.set(p.rating, (byRating.get(p.rating) ?? 0) + 1);
      else unrated++;
      for (const tag of p.tags ?? []) {
        if (tag.startsWith('*')) continue; // '*special' marks unusual problems, not a topic
        byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
      }
    }
    snap.solved.byDifficulty = [
      ...[...byRating.entries()].sort(([a], [b]) => a - b).map(([r, n]) => ({ label: String(r), count: n })),
      ...(unrated > 0 ? [{ label: 'Unrated', count: unrated }] : []),
    ];
    const tags = [...byTag.entries()]
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
      .slice(0, TOP_TAGS)
      .map(([name, n]) => ({ name, count: n }));
    if (tags.length) snap.solved.byTag = tags;
  }

  // Every submission counts towards activity, whatever the verdict. Days are UTC.
  const activity = lastYearActivity(
    raw.status.map((s) => [dayFromSeconds(s.creationTimeSeconds), 1]),
    fetchedAt,
  );
  if (activity) snap.activity = activity;

  return snap;
}
