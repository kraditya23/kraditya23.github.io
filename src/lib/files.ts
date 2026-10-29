import fs from 'node:fs';
import path from 'node:path';

/** True when a file exists in public/. Runs at build time, so links to missing files never ship. */
export function hasPublicFile(name: string): boolean {
  if (!name) return false;
  return fs.existsSync(path.join(process.cwd(), 'public', name));
}
