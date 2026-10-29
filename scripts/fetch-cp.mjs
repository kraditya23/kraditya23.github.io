// Fetches competitive programming data at build time and saves it as JSON snapshots in src/data/cp/.
// The site never fetches platform data in the visitor's browser; it renders these files.
//
//   npm run fetch:cp            fetch every enabled platform
//   npm run fetch:cp -- --force skip the sanity guard (contests or solved count went down)
//
// Fails softly, per platform: on any fetch, parse or validation error it logs a warning,
// leaves that platform's existing JSON untouched, and moves on. The script always exits 0.
//
// Only Node built-ins are imported statically. Everything else is loaded inside run(), so even a
// missing dependency is caught and reported instead of crashing the script with a non-zero exit.
import { pathToFileURL } from 'node:url';

export const loadFetchers = async () => ({
  codeforces: await import('./cp/codeforces.mjs'),
  leetcode: await import('./cp/leetcode.mjs'),
  codechef: await import('./cp/codechef.mjs'),
});

const inActions = process.env.GITHUB_ACTIONS === 'true';
const info = (msg) => console.log(`[fetch:cp] ${msg}`);
// In GitHub Actions, warnings also show up as annotations on the run summary.
const warn = (msg) =>
  console.warn(inActions ? `::warning title=fetch:cp::${msg.replace(/\r?\n/g, '%0A')}` : `[fetch:cp] WARNING ${msg}`);

const summary = (s) =>
  [
    s.rating && `rating ${s.rating.current} (max ${s.rating.max})`,
    `${s.contests.length} rated contests`,
    `${s.solved.total} solved`,
  ]
    .filter(Boolean)
    .join(', ');

/**
 * @param {object} [opts]
 * @param {string[]} [opts.argv]
 * @param {Record<string, { fetchRaw: (h: string) => Promise<any>, normalize: Function }>} [opts.fetchers]
 * @param {{ handle: string, platforms: Record<string, { enabled: boolean }> }} [opts.config]
 * @param {string} [opts.dir]
 * @param {() => string} [opts.now]
 */
export async function run({ argv = process.argv.slice(2), fetchers, config, dir, now = () => new Date().toISOString() } = {}) {
  const { z } = await import('astro/zod');
  const { PLATFORMS, snapshotSchema } = await import('./cp/schema.mjs');
  const { guard, readSnapshot, removeSnapshot, sameData, SNAPSHOT_DIR, writeSnapshot } = await import('./cp/store.mjs');
  fetchers ??= await loadFetchers();
  dir ??= SNAPSHOT_DIR;
  const force = argv.includes('--force');

  if (!config) {
    try {
      const { site, cpPlatforms } = await import('../src/data/site.ts');
      config = { handle: site.handle, platforms: cpPlatforms };
    } catch (err) {
      warn(`could not read cpPlatforms from src/data/site.ts (${err.message}). Nothing fetched.`);
      return;
    }
  }

  for (const id of PLATFORMS) {
    if (!config.platforms?.[id]?.enabled) {
      if (removeSnapshot(id, dir)) info(`${id}: disabled, deleted its snapshot.`);
      else info(`${id}: disabled, skipped.`);
      continue;
    }

    try {
      const fetchedAt = now();
      const raw = await fetchers[id].fetchRaw(config.handle);
      const result = snapshotSchema.safeParse(fetchers[id].normalize(raw, { handle: config.handle, fetchedAt }));
      if (!result.success) throw new Error(`snapshot failed validation:\n${z.prettifyError(result.error)}`);
      const next = result.data;

      const prev = readSnapshot(id, dir);
      const refused = guard(prev, next);
      if (refused && !force) {
        warn(`${id}: ${refused}. Kept the existing snapshot. Run with --force if this is expected.`);
        continue;
      }
      if (sameData(prev, next)) {
        info(`${id}: no change (${summary(next)}).`);
        continue;
      }
      writeSnapshot(id, next, dir);
      info(`${id}: wrote ${summary(next)}${refused ? ' (forced past the sanity guard)' : ''}.`);
    } catch (err) {
      warn(`${id}: ${err?.message ?? err}. Kept the existing snapshot.`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await run();
  } catch (err) {
    warn(`unexpected error: ${err?.stack ?? err}`);
  }
  // A broken platform, or a bug here, must never break the build or the deploy.
  process.exitCode = 0;
}
