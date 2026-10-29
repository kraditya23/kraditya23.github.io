// LeetCode: unofficial GraphQL endpoint. Public data, no login or cookies.
// LeetCode may block requests from CI runners; the caller treats that as a soft failure.
import { fetchJson } from './http.mjs';
import { dayFromSeconds, lastYearActivity } from './dates.mjs';

const ENDPOINT = 'https://leetcode.com/graphql';
const TOP_TAGS = 10;

export const profileUrl = (username) => `https://leetcode.com/u/${encodeURIComponent(username)}/`;

const QUERY = /* GraphQL */ `
  query cpProfile($username: String!) {
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      totalParticipants
      topPercentage
      badge { name }
    }
    userContestRankingHistory(username: $username) {
      attended
      rating
      ranking
      problemsSolved
      totalProblems
      contest { title titleSlug startTime }
    }
    matchedUser(username: $username) {
      username
      submitStatsGlobal { acSubmissionNum { difficulty count } }
      userCalendar { submissionCalendar }
      tagProblemCounts {
        advanced { tagName tagSlug problemsSolved }
        intermediate { tagName tagSlug problemsSolved }
        fundamental { tagName tagSlug problemsSolved }
      }
    }
  }
`;

/** Raw GraphQL response body. */
export async function fetchRaw(username) {
  return fetchJson(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: profileUrl(username),
    },
    body: JSON.stringify({ operationName: 'cpProfile', query: QUERY, variables: { username } }),
  });
}

// Ratings are floats; keep three decimals so deltas don't carry float noise.
const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * @param {any} raw GraphQL response body
 * @param {{ handle: string, fetchedAt: string }} meta
 * @returns {import('./schema.mjs').Snapshot}
 */
export function normalize(raw, { handle, fetchedAt }) {
  const data = raw?.data;
  const user = data?.matchedUser;
  if (!user) {
    const why = raw?.errors?.map((e) => e.message).join('; ');
    throw new Error(`LeetCode returned no user${why ? `: ${why}` : ''}`);
  }

  /** @type {import('./schema.mjs').Snapshot} */
  const snap = {
    platform: 'leetcode',
    handle: user.username ?? handle,
    profileUrl: profileUrl(user.username ?? handle),
    fetchedAt,
    sources: [ENDPOINT],
    contests: [],
    solved: { total: 0 },
  };

  const attended = (data.userContestRankingHistory ?? [])
    .filter((h) => h.attended === true)
    .sort((a, b) => a.contest.startTime - b.contest.startTime);

  snap.contests = attended.map((h, i) => {
    const prev = attended[i - 1];
    return {
      id: h.contest.titleSlug,
      name: h.contest.title,
      date: dayFromSeconds(h.contest.startTime),
      rank: h.ranking,
      // LeetCode does not report the rating before the first contest, so it is left out there.
      ...(prev && { oldRating: prev.rating, delta: r3(h.rating - prev.rating) }),
      newRating: h.rating,
      url: `https://leetcode.com/contest/${h.contest.titleSlug}/`,
      ...(Number.isInteger(h.problemsSolved) && { solved: h.problemsSolved }),
      ...(Number.isInteger(h.totalProblems) && { problems: h.totalProblems }),
    };
  });

  const ranking = data.userContestRanking;
  if (ranking && typeof ranking.rating === 'number') {
    const max = Math.max(ranking.rating, ...attended.map((h) => h.rating));
    snap.rating = {
      current: ranking.rating,
      max,
      ...(ranking.badge?.name && { title: ranking.badge.name }),
      ...(ranking.globalRanking > 0 && { globalRank: ranking.globalRanking }),
      ...(ranking.totalParticipants > 0 && { participants: ranking.totalParticipants }),
      ...(ranking.topPercentage > 0 && { topPercent: ranking.topPercentage }),
    };
  }

  const ac = user.submitStatsGlobal?.acSubmissionNum ?? [];
  const all = ac.find((x) => x.difficulty === 'All');
  if (!all) throw new Error('LeetCode returned no solved count');
  snap.solved.total = all.count;
  const byDifficulty = ['Easy', 'Medium', 'Hard']
    .map((label) => ({ label, count: ac.find((x) => x.difficulty === label)?.count }))
    .filter((b) => Number.isInteger(b.count));
  if (byDifficulty.length === 3) snap.solved.byDifficulty = byDifficulty;

  const groups = user.tagProblemCounts ?? {};
  const tags = [...(groups.advanced ?? []), ...(groups.intermediate ?? []), ...(groups.fundamental ?? [])]
    .filter((t) => t.problemsSolved > 0)
    .sort((a, b) => b.problemsSolved - a.problemsSolved || a.tagName.localeCompare(b.tagName))
    .slice(0, TOP_TAGS)
    .map((t) => ({ name: t.tagName, count: t.problemsSolved }));
  if (tags.length) snap.solved.byTag = tags;

  // Keys are Unix seconds at UTC midnight.
  const calendarText = user.userCalendar?.submissionCalendar;
  if (calendarText) {
    const calendar = JSON.parse(calendarText);
    const activity = lastYearActivity(
      Object.entries(calendar).map(([sec, n]) => [dayFromSeconds(Number(sec)), Number(n)]),
      fetchedAt,
    );
    if (activity) snap.activity = activity;
  }

  return snap;
}
