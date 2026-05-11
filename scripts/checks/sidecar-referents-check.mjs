/* @HEADER
 * @version 0.7.123 | 2026-05-06
 * @purpose Pre-commit Phase 6 advisory gate — verifies sidecar fileId derives from path, tests entries exist, module directory exists; warning-only by default, hard-fail via COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1.
 * @sidecar sidecar-referents-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-316 — sidecar-referents-check (R10, advisory).
 *
 * Defends finding F9 (sidecar metadata hallucination) surfaced during the D6
 * BYO-LLM cross-variant synthesis. Devstral 24B (and likely other Mistral
 * SWE-tune models) confidently fabricates plausible-but-false values for
 * sidecar metadata — for example `fileId: sample-mjs-header` (synthetic
 * kebab-case) and `tests: tests/unit/sample.test.mjs` (no such file).
 *
 * Three referent classes are validated, each only when the corresponding
 * field is present:
 *
 *   - `fileId:`  must equal the canonical derivation:
 *                  `contextrail-template:<path-with-slashes-as-colons-no-ext>`
 *                Example: `apps/starter/sample.mjs.header.md` →
 *                  fileId = `contextrail-template:apps:starter:sample`
 *
 *   - `tests:`   each entry (single string or YAML list) must exist on disk
 *                relative to the repo root.
 *
 *   - `module:`  must reference a directory that exists on disk relative to
 *                the repo root (typically `modules/<name>` or `apps/<name>`).
 *
 * Sparse-YAML parsing is regex-based (no new dependency), per ADR-0009 which
 * intentionally constrains sidecars to single-value fields and short list
 * fields. Malformed sidecars (missing closing `---`, broken indentation) are
 * skipped with a "could not parse" warning rather than crashing — sidecar
 * shape validity is owned by header-check (R8), not this rule.
 *
 * Modes:
 *   --audit                    walk every *.header.md under --root (default cwd)
 *   --staged=<csv>             only check the listed sidecar paths
 *   (default in pre-commit)    derive --staged from `git diff --cached --name-only`
 *
 * Exit codes:
 *   0  always, unless COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1 AND warnings > 0,
 *      in which case exit 1.
 *
 * @see docs/adr/0042-sidecar-referents-check.md
 * @see docs/rules-registry.md (R10 entry)
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_ROOT = resolve(__dirname, '..', '..');

const REPO_ID_PREFIX = 'contextrail-template';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { audit: false, staged: null, root: null };
  for (const a of argv) {
    if (a === '--audit') out.audit = true;
    else if (a.startsWith('--root=')) out.root = a.slice('--root='.length);
    else if (a.startsWith('--staged=')) {
      const csv = a.slice('--staged='.length);
      out.staged =
        csv.length === 0
          ? []
          : csv
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Frontmatter parsing (sparse YAML, regex-based)
// ---------------------------------------------------------------------------

/**
 * Parse a sidecar's frontmatter. Returns { ok: false, reason } on malformed
 * input (missing closing `---`), or { ok: true, fields } where fields is a
 * map of fieldName → string | string[].
 *
 * Supports:
 *   - `key: value`              single string
 *   - `key:` followed by         list (entries must be indented `- value`)
 *     `  - value` lines
 *   - Quoted values:             outer single/double quotes stripped
 *   - Inline `# comments`:       ignored (after a value)
 *   - Blank lines:               skipped
 *
 * Out of scope (per ADR-0009 sparse convention):
 *   - multi-line strings (`|`, `>`)
 *   - nested mappings
 *   - flow-style arrays (`[a, b]`) — not used by any committed sidecar
 */
export function parseFrontmatter(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { ok: false, reason: 'no-opening-delimiter' };
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    return { ok: false, reason: 'no-closing-delimiter' };
  }

  const body = lines.slice(1, endIdx);
  const fields = {};
  let currentListKey = null;

  for (const raw of body) {
    // Strip trailing inline comments. Naive but adequate for sparse YAML —
    // sidecars never embed `#` mid-string in observed corpus.
    const line = raw.replace(/\s+#.*$/, '');

    if (line.trim() === '') {
      currentListKey = null;
      continue;
    }

    // List item under an open key.
    const listMatch = line.match(/^\s+-\s+(.*)$/);
    if (listMatch && currentListKey) {
      fields[currentListKey].push(stripQuotes(listMatch[1].trim()));
      continue;
    }

    // Top-level key (no leading whitespace) — single value or list opener.
    const kvMatch = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const valuePart = kvMatch[2].trim();
      if (valuePart === '') {
        // List opener.
        fields[key] = [];
        currentListKey = key;
      } else {
        fields[key] = stripQuotes(valuePart);
        currentListKey = null;
      }
      continue;
    }

    // Indented continuation of an unrecognized shape — drop list context.
    currentListKey = null;
  }

  return { ok: true, fields };
}

function stripQuotes(s) {
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' || first === "'") && first === last) {
      return s.slice(1, -1);
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Referent derivation + checks
// ---------------------------------------------------------------------------

/**
 * Given a sidecar path like `apps/starter/sample.mjs.header.md` (POSIX),
 * derive the canonical fileId.
 *
 * Algorithm:
 *   1. Strip trailing `.header.md`           → `apps/starter/sample.mjs`
 *   2. Strip the final extension             → `apps/starter/sample`
 *   3. Replace `/` with `:`                  → `apps:starter:sample`
 *   4. Prepend `contextrail-template:`       → `contextrail-template:apps:starter:sample`
 */
export function deriveFileId(sidecarRelPath) {
  let p = sidecarRelPath.replace(/\\/g, '/');
  if (p.endsWith('.header.md')) p = p.slice(0, -'.header.md'.length);
  // Strip ONLY the final extension (after the last dot in the basename).
  // Inner dots are preserved: `tests/unit/foo.test.mjs` → `tests/unit/foo.test`,
  // matching committed sidecars like
  // `contextrail-template:tests:unit:foo.test`. Files without an extension
  // (e.g. `VERSION`, `TODO.md` after stripping `.md`) are left alone.
  const lastSlash = p.lastIndexOf('/');
  const baseStart = lastSlash === -1 ? 0 : lastSlash + 1;
  const lastDot = p.lastIndexOf('.');
  if (lastDot > baseStart) {
    p = p.slice(0, lastDot);
  }
  // Two accepted forms exist in the committed corpus: dot-preserving
  // (`.claims:clm-ex0001`) and dot-stripping (`.agents` → `agents`). Return
  // the dot-preserving form as the canonical "expected" string; the
  // checkSidecar() comparison accepts both via deriveFileIdAlternates().
  return REPO_ID_PREFIX + ':' + p.split('/').join(':');
}

/**
 * Return both accepted forms of the canonical fileId: dot-preserving and
 * dot-stripping (each path segment's leading `.` removed). The committed
 * corpus uses both conventions; matching either form is a pass.
 */
export function deriveFileIdAlternates(sidecarRelPath) {
  const primary = deriveFileId(sidecarRelPath);
  // Build the dot-stripped variant from the same source path.
  let p = sidecarRelPath.replace(/\\/g, '/');
  if (p.endsWith('.header.md')) p = p.slice(0, -'.header.md'.length);
  const lastSlash = p.lastIndexOf('/');
  const baseStart = lastSlash === -1 ? 0 : lastSlash + 1;
  const lastDot = p.lastIndexOf('.');
  if (lastDot > baseStart) p = p.slice(0, lastDot);
  const stripped =
    REPO_ID_PREFIX +
    ':' +
    p
      .split('/')
      .map((seg) => (seg.startsWith('.') ? seg.slice(1) : seg))
      .join(':');
  return stripped === primary ? [primary] : [primary, stripped];
}

/**
 * Given a sidecar path, derive the source-file path (sidecar path with
 * `.header.md` stripped).
 */
export function deriveSourcePath(sidecarRelPath) {
  const p = sidecarRelPath.replace(/\\/g, '/');
  return p.endsWith('.header.md') ? p.slice(0, -'.header.md'.length) : p;
}

function dirExists(root, relPath) {
  try {
    return statSync(join(root, relPath)).isDirectory();
  } catch {
    return false;
  }
}

function fileExists(root, relPath) {
  try {
    return statSync(join(root, relPath)).isFile();
  } catch {
    return false;
  }
}

/**
 * Per-sidecar referent check. Returns an array of warnings (strings).
 */
export function checkSidecar(root, sidecarRelPath) {
  const warnings = [];
  const abs = join(root, sidecarRelPath);
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch (e) {
    warnings.push(`${sidecarRelPath}: could not read sidecar (${e.message})`);
    return warnings;
  }

  const parsed = parseFrontmatter(text);
  if (!parsed.ok) {
    warnings.push(
      `${sidecarRelPath}: could not parse sidecar frontmatter (${parsed.reason}) — skipping referent check`,
    );
    return warnings;
  }

  const { fields } = parsed;

  // fileId check — accept either the dot-preserving or dot-stripping form
  // observed in the committed corpus.
  if (typeof fields.fileId === 'string' && fields.fileId.length > 0) {
    const expectedForms = deriveFileIdAlternates(sidecarRelPath);
    if (!expectedForms.includes(fields.fileId)) {
      warnings.push(
        `${sidecarRelPath}: fileId mismatch — sidecar says "${fields.fileId}", expected "${expectedForms.join('" or "')}" (derived from path)`,
      );
    }
  }

  // tests check (string or list)
  const testsField = fields.tests;
  if (testsField !== undefined) {
    const entries = Array.isArray(testsField) ? testsField : [testsField];
    for (const entry of entries) {
      if (typeof entry !== 'string' || entry.length === 0) continue;
      // Skip command-shaped entries (e.g. "node scripts/checks/foo.mjs ...") —
      // committed sidecars use this for runnable test commands, not file paths.
      // Only check entries that look like file paths.
      if (entry.includes(' ') || entry.startsWith('node ') || entry.startsWith('pnpm ')) {
        continue;
      }
      if (!fileExists(root, entry)) {
        warnings.push(`${sidecarRelPath}: tests entry "${entry}" does not exist on disk`);
      }
    }
  }

  // module check
  if (typeof fields.module === 'string' && fields.module.length > 0) {
    if (!dirExists(root, fields.module)) {
      warnings.push(
        `${sidecarRelPath}: module "${fields.module}" does not exist as a directory on disk`,
      );
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Walking
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', '.backups', '.aider.tags.cache.v4']);

function walkSidecars(root, dir = root, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSidecars(root, abs, out);
    } else if (entry.isFile() && entry.name.endsWith('.header.md')) {
      out.push(relative(root, abs).split(sep).join('/'));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Staged-set discovery
// ---------------------------------------------------------------------------

function gitStaged(cwd) {
  const r = spawnSync('git', ['diff', '--cached', '--name-only'], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  if (r.status !== 0) return [];
  return r.stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function run({ argv = process.argv.slice(2), env = process.env } = {}) {
  const args = parseArgs(argv);
  const root = args.root ? resolve(args.root) : DEFAULT_ROOT;

  let sidecars;
  if (args.audit) {
    sidecars = walkSidecars(root);
  } else if (args.staged) {
    sidecars = args.staged.filter((p) => p.endsWith('.header.md'));
  } else {
    sidecars = gitStaged(root).filter((p) => p.endsWith('.header.md'));
  }

  const warnings = [];
  for (const rel of sidecars) {
    if (!fileExists(root, rel)) continue; // staged delete or rename
    warnings.push(...checkSidecar(root, rel));
  }

  const promote = env.COA_OPERATOR_PROMOTE_SIDECAR_CHECK === '1';
  return { warnings, promote, sidecarCount: sidecars.length };
}

function main() {
  const { warnings, promote, sidecarCount } = run();

  for (const w of warnings) {
    process.stderr.write(`WARN: ${w}\n`);
  }

  const summary = `sidecar-referents-check: ${warnings.length} warning(s) across ${sidecarCount} sidecar(s)`;
  if (warnings.length === 0) {
    console.log(summary + ' — OK');
    process.exit(0);
  }

  console.log(summary);
  if (promote) {
    process.stderr.write(
      'sidecar-referents-check: COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1 → exiting non-zero (hard-fail mode)\n',
    );
    process.exit(1);
  }
  // Advisory mode: warnings-only, exit 0.
  process.exit(0);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('sidecar-referents-check.mjs') ||
    process.argv[1].endsWith('sidecar-referents-check'));

if (isDirectRun) main();
