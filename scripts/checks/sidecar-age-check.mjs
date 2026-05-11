/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Warn when a source file has been modified more recently than its .header.md sidecar.
 * @sidecar sidecar-age-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, parseArgs, isSidecarHeader } from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');

function gitLastCommitDate(filePath) {
  try {
    const out = execSync(`git log -1 --format=%aI -- "${filePath}"`, {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    return out ? new Date(out) : null;
  } catch {
    return null;
  }
}

function collectTrackedSidecars() {
  const out = execSync('git ls-files --cached', { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').filter((f) => f && isSidecarHeader(f));
}

const sidecars = collectTrackedSidecars();
const stale = [];

for (const sc of sidecars) {
  // Derive parent file: foo.mjs.header.md → foo.mjs
  const parent = sc.replace(/\.header\.md$/, '');
  if (!existsSync(join(ROOT, parent))) continue;

  const parentDate = gitLastCommitDate(parent);
  const sidecarDate = gitLastCommitDate(sc);

  if (!parentDate || !sidecarDate) continue;

  // If parent was modified more recently than sidecar, flag it
  if (parentDate > sidecarDate) {
    stale.push({
      sidecar: sc,
      parent,
      parentModified: parentDate.toISOString().slice(0, 10),
      sidecarModified: sidecarDate.toISOString().slice(0, 10),
    });
  }
}

if (wantJson) {
  console.log(JSON.stringify({ staleCount: stale.length, stale }, null, 2));
} else if (stale.length > 0) {
  console.log(
    `sidecar-age-check: ${stale.length} stale sidecar(s) — parent file updated more recently:\n`,
  );
  for (const s of stale) {
    console.log(`  ${s.sidecar} (${s.sidecarModified}) < ${s.parent} (${s.parentModified})`);
  }
} else {
  console.log(`sidecar-age-check: OK — ${sidecars.length} sidecars checked`);
}
