// One normalised snapshot shape for every platform.
// Fields a platform does not provide are left out, never filled with zeros.
// Used by the fetch script before writing, and again by the site at build time.
import { z } from 'astro/zod';

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const count = z.number().int().nonnegative();

export const PLATFORMS = /** @type {const} */ (['codeforces', 'leetcode', 'codechef']);

export const contestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  date: isoDay,
  rank: z.number().int().positive(),
  // Left out when the platform does not say what the rating was before the first contest.
  oldRating: z.number().optional(),
  newRating: z.number(),
  delta: z.number().optional(),
  url: z.url().optional(),
  // Problems solved in this contest, where the platform says (LeetCode, CodeChef).
  solved: count.optional(),
  // Problems in the contest, where the platform says (LeetCode).
  problems: count.optional(),
});

const bucketSchema = z.object({ label: z.string().min(1), count });

export const snapshotSchema = z.object({
  platform: z.enum(PLATFORMS),
  handle: z.string().min(1),
  profileUrl: z.url(),
  fetchedAt: z.iso.datetime(),
  sources: z.array(z.url()).min(1),
  rating: z
    .object({
      current: z.number(),
      max: z.number(),
      title: z.string().min(1).optional(),
      maxTitle: z.string().min(1).optional(),
      globalRank: z.number().int().positive().optional(),
      countryRank: z.number().int().positive().optional(),
      participants: z.number().int().positive().optional(),
      topPercent: z.number().positive().max(100).optional(),
    })
    .optional(),
  // Rated contests only, oldest first.
  contests: z
    .array(contestSchema)
    .refine((list) => list.every((c, i) => i === 0 || list[i - 1].date <= c.date), 'contests must be oldest first'),
  solved: z.object({
    total: count,
    byDifficulty: z.array(bucketSchema).optional(),
    byTag: z.array(z.object({ name: z.string().min(1), count })).optional(),
  }),
  // Submissions per day for the 365 days up to fetchedAt. Days with no submissions are omitted.
  activity: z.record(isoDay, count.positive()).optional(),
});

/** @typedef {import('astro/zod').z.infer<typeof snapshotSchema>} Snapshot */
/** @typedef {import('astro/zod').z.infer<typeof contestSchema>} Contest */
