// Build-time access to the competitive programming snapshots in src/data/cp/.
// Nothing here runs in the visitor's browser, and nothing here fetches: `npm run fetch:cp` writes the
// snapshots, and the build renders whatever valid snapshots exist.
import { cpPlatforms } from '../data/site';
import { snapshotSchema, type Snapshot } from '../../scripts/cp/schema.mjs';

export type PlatformId = 'codeforces' | 'leetcode' | 'codechef';
export type Contest = Snapshot['contests'][number];

export interface Platform {
  id: PlatformId;
  name: string;
  host: string;
  snap: Snapshot;
}

const META: Record<PlatformId, { name: string; host: string }> = {
  leetcode: { name: 'LeetCode', host: 'leetcode.com' },
  codeforces: { name: 'Codeforces', host: 'codeforces.com' },
  codechef: { name: 'CodeChef', host: 'codechef.com' },
};

const files = import.meta.glob<unknown>('../data/cp/*.json', { eager: true, import: 'default' });

function load(id: PlatformId): Snapshot | undefined {
  const raw = files[`../data/cp/${id}.json`];
  if (raw === undefined) {
    console.warn(`[cp] ${id} is enabled but src/data/cp/${id}.json is missing. Run npm run fetch:cp. Hiding it.`);
    return undefined;
  }
  const result = snapshotSchema.safeParse(raw);
  if (!result.success) {
    console.warn(`[cp] src/data/cp/${id}.json is invalid, hiding ${id}: ${result.error.message}`);
    return undefined;
  }
  return result.data;
}

/** Enabled platforms with a valid snapshot, in cpPlatforms order. */
export const platforms: Platform[] = (Object.keys(cpPlatforms) as PlatformId[])
  .filter((id) => cpPlatforms[id]?.enabled && id in META)
  .flatMap((id) => {
    const snap = load(id);
    return snap ? [{ id, ...META[id], snap }] : [];
  });

/** Sum of solved counts across shown platforms (a problem only ever counts on its own platform). */
export const solvedSum = platforms.reduce((n, p) => n + p.snap.solved.total, 0);

// ---------------------------------------------------------------------------
// Formatting

const fmt = new Intl.NumberFormat('en-US');
export const num = (n: number) => fmt.format(n);

/** Ratings as each platform shows them: LeetCode's are floats and it displays them rounded. */
export const rating = (n: number) => fmt.format(Math.round(n));

/** '2026-07-26' → '26 Jul 2026' */
export function formatDay(day: string): string {
  return new Date(`${day.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** 734 → '700+', 463 → '450+', 62 → '60+'. Always rounds down, so the site never claims more than the data. */
export function floorCount(n: number): string {
  if (n < 10) return String(n);
  const step = n < 100 ? 10 : n < 1000 ? 50 : 100;
  const floored = Math.floor(n / step) * step;
  return floored === n ? fmt.format(n) : `${fmt.format(floored)}+`;
}

/** 'Knight · top 6.02%', 'Pupil', '3★' */
export function titleLine(p: Platform): string {
  const r = p.snap.rating;
  if (!r?.title) return 'Contest rating';
  return r.topPercent !== undefined ? `${r.title} · top ${r.topPercent}%` : r.title;
}

/** 'Max 1,387 · 13 rated contests · 103 solved', leaving out whatever the snapshot doesn't have. */
export function detailLine(p: Platform): string {
  const { rating: r, contests, solved } = p.snap;
  return [
    r && `Max ${rating(r.max)}`,
    r?.globalRank !== undefined && `global rank ${num(r.globalRank)}`,
    contests.length > 0 && `${contests.length} rated contests`,
    `${num(solved.total)} solved`,
  ]
    .filter(Boolean)
    .join(' · ');
}

// ---------------------------------------------------------------------------
// Rating chart geometry (an SVG path built at build time)

export interface Chart {
  width: number;
  height: number;
  line: string;
  area: string;
  end: { x: number; y: number };
  /** Horizontal guide lines with their rating values. */
  guides: { y: number; label: string }[];
  summary: string;
}

/** Contests plotted by date, so gaps between contests stay honest. Undefined with fewer than two contests. */
export function ratingChart(p: Platform, width = 600, height = 240): Chart | undefined {
  const cs = p.snap.contests;
  if (cs.length < 2) return undefined;

  const pad = { top: 16, right: 12, bottom: 12, left: 12 };
  const t = cs.map((c) => Date.parse(`${c.date}T00:00:00Z`));
  const r = cs.map((c) => c.newRating);
  const t0 = Math.min(...t);
  const t1 = Math.max(...t);
  const step = 100;
  const lo = Math.floor(Math.min(...r) / step) * step;
  const hi = Math.ceil(Math.max(...r) / step) * step;
  const span = Math.max(hi - lo, step);

  const x = (v: number) => pad.left + ((v - t0) / Math.max(t1 - t0, 1)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - lo) / span) * (height - pad.top - pad.bottom);
  const pts = cs.map((_, i) => ({ x: +x(t[i]).toFixed(1), y: +y(r[i]).toFixed(1) }));

  const line = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt.x} ${pt.y}`).join(' ');
  const base = height - pad.bottom;
  const area = `${line} L${pts.at(-1)!.x} ${base} L${pts[0].x} ${base} Z`;

  // Three evenly spaced guides between lo and hi, labelled with their rating.
  const guides = [0, 0.5, 1].map((f) => {
    const v = Math.round(lo + f * span);
    return { y: +y(v).toFixed(1), label: num(v) };
  });

  const first = cs[0];
  const last = cs.at(-1)!;
  const max = Math.max(...r);
  const summary =
    `${p.name} rating over ${cs.length} rated contests, from ${rating(first.newRating)} on ${formatDay(first.date)} ` +
    `to ${rating(last.newRating)} on ${formatDay(last.date)}. Highest ${rating(max)}.`;

  return { width, height, line, area, end: pts.at(-1)!, guides, summary };
}
