// Reading, guarding and writing the JSON snapshots in src/data/cp/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SNAPSHOT_DIR = fileURLToPath(new URL('../../src/data/cp/', import.meta.url));

export const snapshotPath = (platform, dir = SNAPSHOT_DIR) => path.join(dir, `${platform}.json`);

/** The existing snapshot, or undefined if there is none or it is unreadable. */
export function readSnapshot(platform, dir = SNAPSHOT_DIR) {
  try {
    return JSON.parse(fs.readFileSync(snapshotPath(platform, dir), 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Rated contests and solved problems only ever go up. If the new data has fewer of either,
 * something upstream is wrong (a partial response, a parser miss), so the old file is kept.
 * @returns {string | null} why the write was refused, or null if it is fine
 */
export function guard(prev, next) {
  if (!prev) return null;
  const reasons = [];
  const prevContests = prev.contests?.length ?? 0;
  if (next.contests.length < prevContests) {
    reasons.push(`rated contests went down from ${prevContests} to ${next.contests.length}`);
  }
  const prevSolved = prev.solved?.total ?? 0;
  if (next.solved.total < prevSolved) {
    reasons.push(`solved count went down from ${prevSolved} to ${next.solved.total}`);
  }
  return reasons.length ? reasons.join('; ') : null;
}

/** True when nothing but fetchedAt differs, so the file is left alone and git sees no change. */
export function sameData(prev, next) {
  if (!prev) return false;
  const strip = ({ fetchedAt, ...rest }) => rest;
  return JSON.stringify(strip(prev)) === JSON.stringify(strip(next));
}

/** Writes via a temp file and rename, so a crash never leaves half a JSON file behind. */
export function writeSnapshot(platform, snapshot, dir = SNAPSHOT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  const file = snapshotPath(platform, dir);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(snapshot, null, 2)}\n`);
  fs.renameSync(tmp, file);
  return file;
}

/** Deletes the snapshot of a disabled platform. Returns true if a file was removed. */
export function removeSnapshot(platform, dir = SNAPSHOT_DIR) {
  const file = snapshotPath(platform, dir);
  if (!fs.existsSync(file)) return false;
  fs.rmSync(file);
  return true;
}
