/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Inventory all feature seams registered or referenced in the codebase.
 * @sidecar seam-inventory.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, parseArgs } from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');

/**
 * Patterns that reference seam names via the feature-seams module API.
 * Guard calls (whenEnabled, whenShadow, ifEnabled) capture the flag from the second arg.
 * SeamPort methods (.isEnabled, .isShadow) are only counted in files that also
 * import from the feature-seams module — see FILE_FILTER below.
 */
const GUARD_PATTERNS = [
  { label: 'whenEnabled', pattern: /whenEnabled\(\s*\w+\s*,\s*['"]([^'"]+)['"]/g },
  { label: 'whenShadow', pattern: /whenShadow\(\s*\w+\s*,\s*['"]([^'"]+)['"]/g },
  { label: 'ifEnabled', pattern: /ifEnabled\(\s*\w+\s*,\s*['"]([^'"]+)['"]/g },
];

/** Patterns only counted in files that import from feature-seams. */
const PORT_PATTERNS = [
  { label: '.isEnabled', pattern: /\.isEnabled\(\s*['"]([^'"]+)['"]/g },
  { label: '.isShadow', pattern: /\.isShadow\(\s*['"]([^'"]+)['"]/g },
];

const SEAM_IMPORT_RE = /feature-seams\/public-api/;

function collectTrackedFiles() {
  const out = execSync('git ls-files --cached', { cwd: ROOT, encoding: 'utf8' });
  return out
    .split('\n')
    .filter((f) => f && (f.endsWith('.mjs') || f.endsWith('.ts') || f.endsWith('.js')));
}

const files = collectTrackedFiles();
const seams = new Map(); // seamName → { files: Set, usages: [] }

for (const file of files) {
  let content;
  try {
    content = readFileSync(join(ROOT, file), 'utf8');
  } catch {
    continue;
  }

  const isSeamFile = SEAM_IMPORT_RE.test(content);
  const patterns = [...GUARD_PATTERNS, ...(isSeamFile ? PORT_PATTERNS : [])];

  for (const spec of patterns) {
    spec.pattern.lastIndex = 0;
    let match;
    while ((match = spec.pattern.exec(content)) !== null) {
      const seamName = match[1];
      if (!seams.has(seamName)) {
        seams.set(seamName, { files: new Set(), usages: [] });
      }
      const entry = seams.get(seamName);
      entry.files.add(file);
      entry.usages.push({ file, api: spec.label });
    }
  }
}

if (wantJson) {
  const data = {};
  for (const [name, info] of seams) {
    data[name] = {
      files: [...info.files].sort(),
      usages: info.usages,
    };
  }
  console.log(JSON.stringify({ seamCount: seams.size, seams: data }, null, 2));
} else {
  if (seams.size === 0) {
    console.log('seam-inventory: no seams found in the codebase');
  } else {
    console.log(`seam-inventory: ${seams.size} seam(s) found\n`);
    for (const [name, info] of [...seams].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  ${name}`);
      for (const u of info.usages) {
        console.log(`    ${u.api} in ${u.file}`);
      }
    }
  }
}
