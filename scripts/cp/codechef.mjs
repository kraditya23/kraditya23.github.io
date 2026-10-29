// CodeChef: no public API, so this reads the public profile page and parses it.
// The parser is written against the real page; scripts/cp/__fixtures__/codechef.html is a trimmed
// copy and codechef.test.mjs checks the parser still reads it.
import { fetchText } from './http.mjs';
import { lastYearActivity, padDay } from './dates.mjs';

export const profileUrl = (handle) => `https://www.codechef.com/users/${encodeURIComponent(handle)}`;

export async function fetchRaw(handle) {
  return fetchText(profileUrl(handle), {
    headers: { Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en' },
  });
}

const int = (s) => {
  const n = Number.parseInt(String(s).replace(/[,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
};

/** Text between `start` and the next `end` (or the end of the page), or '' if `start` is missing. */
function slice(html, start, end) {
  const i = html.indexOf(start);
  if (i < 0) return '';
  const j = end ? html.indexOf(end, i + start.length) : -1;
  return html.slice(i, j < 0 ? undefined : j);
}

/** The JSON array assigned to `var <name> = [...];` inside an inline script. */
function scriptArray(html, name) {
  const m = new RegExp(`var\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`).exec(html);
  if (!m) return undefined;
  try {
    return JSON.parse(m[1]);
  } catch {
    return undefined;
  }
}

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

/**
 * Pulls the profile fields out of the page. Anything not found is undefined.
 * @param {string} html
 */
export function parseProfile(html) {
  const handle = /class=['"]m-username--link['"]>([^<]+)</.exec(html)?.[1]?.trim();

  // The page has two rating blocks (all contests, and the DSA track). Only "all" is used.
  const block = slice(html, 'id="rating-block-all"', 'id="rating-block-');
  const current = int(/class="rating-number">\s*([\d,]+)\s*</.exec(block)?.[1]);
  const starsHtml = /class="rating-star">([\s\S]*?)<\/div>/.exec(block)?.[1] ?? '';
  const stars = (starsHtml.match(/&#9733;|★/g) ?? []).length || undefined;
  const highest = int(/\(Highest Rating\s+([\d,]+)\)/.exec(block)?.[1]);
  const globalRank = int(/<strong>\s*([\d,]+)\s*<\/strong>\s*<\/a>\s*Global Rank/.exec(block)?.[1]);
  const countryRank = int(/<strong>\s*([\d,]+)\s*<\/strong>\s*<\/a>\s*Country Rank/.exec(block)?.[1]);

  const solvedTotal = int(/Total Problems Solved:\s*([\d,]+)/.exec(html)?.[1]);

  // Rating history, embedded for the page's own chart. `rating` is the rating after the contest.
  const history = (scriptArray(html, 'all_rating') ?? []).map((c) => ({
    code: String(c.code),
    name: decode(String(c.name)),
    endDate: String(c.end_date),
    rank: int(c.rank),
    rating: int(c.rating),
  }));

  // "Contests (n)" lists each contest with the problems solved in it.
  const solvedSection = slice(html, 'problems-solved', '<!--.problems-solved-->');
  /** @type {Map<string, number>} */
  const solvedByContest = new Map();
  for (const m of solvedSection.matchAll(/<h5>\s*<span[^>]*>([^<]+)<\/span>\s*<\/h5>\s*<p>([\s\S]*?)<\/p>/g)) {
    // Each problem is a leaf <span>; the wrapper span contains tags, so it doesn't match.
    const problems = [...m[2].matchAll(/<span[^>]*>([^<]*)<\/span>/g)].filter((p) => p[1].trim()).length;
    solvedByContest.set(decode(m[1]), problems);
  }

  const daily = (scriptArray(html, 'userDailySubmissionsStats') ?? [])
    .map((d) => [padDay(d.date), int(d.value)])
    .filter(([day, n]) => day && n > 0);

  return { handle, current, stars, highest, globalRank, countryRank, solvedTotal, history, solvedByContest, daily };
}

/**
 * @param {string} html
 * @param {{ handle: string, fetchedAt: string }} meta
 * @returns {import('./schema.mjs').Snapshot}
 */
export function normalize(html, { handle, fetchedAt }) {
  const p = parseProfile(html);

  // A login wall, a bot check or a redirect to the home page all lack the username on the profile card.
  if (!p.handle || p.handle.toLowerCase() !== handle.toLowerCase()) {
    throw new Error(`page does not look like ${handle}'s profile (found ${p.handle ?? 'no username'})`);
  }
  if (p.solvedTotal === undefined) throw new Error('could not find "Total Problems Solved"');

  /** @type {import('./schema.mjs').Snapshot} */
  const snap = {
    platform: 'codechef',
    handle: p.handle,
    profileUrl: profileUrl(p.handle),
    fetchedAt,
    sources: [profileUrl(p.handle)],
    contests: [],
    solved: { total: p.solvedTotal },
  };

  const history = p.history
    .filter((c) => c.code && c.rank > 0 && Number.isFinite(c.rating) && padDay(c.endDate.slice(0, 10)))
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0));

  snap.contests = history.map((c, i) => {
    const prev = history[i - 1];
    const solved = p.solvedByContest.get(c.name);
    return {
      id: c.code,
      name: c.name,
      // CodeChef's own date label for when the contest ended.
      date: /** @type {string} */ (padDay(c.endDate.slice(0, 10))),
      rank: /** @type {number} */ (c.rank),
      // The page does not say what the rating was before the first contest, so it is left out there.
      ...(prev && { oldRating: prev.rating, delta: c.rating - prev.rating }),
      newRating: c.rating,
      url: `https://www.codechef.com/${encodeURIComponent(c.code)}`,
      ...(solved !== undefined && { solved }),
    };
  });

  if (history.length && p.current === undefined) throw new Error('rated contests found but no current rating');
  if (p.current !== undefined) {
    const max = p.highest ?? Math.max(p.current, ...history.map((c) => c.rating));
    snap.rating = {
      current: p.current,
      max,
      ...(p.stars && { title: `${p.stars}★` }),
      ...(p.globalRank && { globalRank: p.globalRank }),
      ...(p.countryRank && { countryRank: p.countryRank }),
    };
  }

  const activity = lastYearActivity(p.daily, fetchedAt);
  if (activity) snap.activity = activity;

  return snap;
}
