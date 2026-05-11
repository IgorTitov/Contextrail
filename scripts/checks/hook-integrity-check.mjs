/* @HEADER
 * @version 0.7.89 | 2026-05-05
 * @purpose CLI check: verify sha256 fingerprints of .githooks/* match the committed registry; operator-gated --update regenerates registry.
 * @sidecar hook-integrity-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx hook-integrity
 * @public false
 * @edit careful
 */

/**
 * Hook integrity check (R8.2 / TPL-256).
 *
 * Default mode (no flags): reads .githooks/.fingerprints.json and scans
 * every file in .githooks/ (excluding *.header.md sidecars and the registry
 * itself). Compares sha256+size against stored registry. Exits 0 when all
 * match; exits 1 with a diagnostic when any mismatch/missing/extra is found.
 *
 * --update: Requires COA_OPERATOR=1 (or --from-pre-commit-hook). Regenerates
 *           .githooks/.fingerprints.json from the current hook files.
 *           Accepts --slice=<id> to tag entries.
 *
 * --from-pre-commit-hook: Bypasses the COA_OPERATOR=1 gate for --update when
 *           invoked from inside the pre-commit hook (TPL-278 Addition B).
 *           Trust model: equivalent privilege to COA_OPERATOR=1 — the hook is
 *           executing under a human-authorized `git commit`, and Phase 1.0
 *           already verified the hook's own integrity before this flag is
 *           reached. Phase 7 unsets GIT_DIR before Addition B runs, so GIT_DIR
 *           cannot be used as the trust signal (ADR-0019 Bootstrap Note).
 *           See ADR-0019 for the full trust-model rationale.
 *
 * --json:   Structured output for machine consumers.
 *
 * Recovery hint on mismatch:
 *   If you intentionally modified hooks, commit that change as a separate
 *   slice, then run:
 *     COA_OPERATOR=1 node scripts/checks/hook-integrity-check.mjs --update
 *
 * Exit codes:
 *   0 — all fingerprints match (or --update succeeded)
 *   1 — mismatch / missing / extra detected (or --update refused / failed)
 */

import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import {
  computeFingerprint,
  loadFingerprints,
  compareFingerprints,
  formatRegistry,
} from '../lib/hook-integrity.mjs';

const ROOT = resolve(process.cwd());
const HOOKS_DIR = join(ROOT, '.githooks');
const REGISTRY_PATH = join(HOOKS_DIR, '.fingerprints.json');

// Canonical key format used in the registry (forward slashes, relative to ROOT).
function canonicalKey(absPath) {
  return relative(ROOT, absPath).replace(/\\/g, '/');
}

/**
 * Scan .githooks/ and return an array of { path, sha256, size }.
 * Excludes *.header.md sidecars and the registry file itself.
 */
function scanHooks() {
  if (!existsSync(HOOKS_DIR)) {
    return [];
  }
  const entries = readdirSync(HOOKS_DIR, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    // Exclude sidecars and the registry itself
    if (name.endsWith('.header.md')) continue;
    if (name === '.fingerprints.json') continue;
    const absPath = join(HOOKS_DIR, name);
    const { sha256, size } = computeFingerprint(absPath);
    result.push({ path: canonicalKey(absPath), sha256, size });
  }
  return result;
}

function parseArgs(argv = process.argv.slice(2)) {
  const map = new Map();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) map.set(arg.slice(0, eq), arg.slice(eq + 1));
    else map.set(arg, true);
  }
  return {
    has: (k) => map.has(k),
    get: (k) => {
      const v = map.get(k);
      return v === true ? undefined : v;
    },
  };
}

function main() {
  const args = parseArgs();
  const wantJson = args.has('--json');
  const wantUpdate = args.has('--update');
  const fromPreCommitHook = args.has('--from-pre-commit-hook');
  const sliceId = args.get('--slice') || 'TPL-278';

  // -------------------------------------------------------------------------
  // --update path (operator-gated; --from-pre-commit-hook is equivalent)
  // -------------------------------------------------------------------------
  if (wantUpdate) {
    // --from-pre-commit-hook is equivalent privilege to COA_OPERATOR=1.
    // Note: we cannot check $GIT_DIR here because Phase 7 (which is
    // non-skippable) runs `unset GIT_DIR` before Addition B invokes this
    // flag. The trust model relies on Phase 1.0 verifying the hook's own
    // integrity before Addition B is ever reached. (ADR-0019)
    const authorized = process.env.COA_OPERATOR || fromPreCommitHook;
    if (!authorized) {
      const msg =
        '--update requires COA_OPERATOR=1. ' +
        'Set this env var only when you intentionally modified hooks.';
      if (wantJson) {
        console.log(JSON.stringify({ kind: 'hook-integrity-check', ok: false, error: msg }));
      } else {
        console.error(`hook-integrity-check: REFUSED — ${msg}`);
      }
      process.exit(1);
    }

    const hookFiles = scanHooks();
    if (hookFiles.length === 0) {
      const msg = `No hook files found in ${HOOKS_DIR}`;
      if (wantJson) {
        console.log(JSON.stringify({ kind: 'hook-integrity-check', ok: false, error: msg }));
      } else {
        console.error(`hook-integrity-check: ${msg}`);
      }
      process.exit(1);
    }

    const content = formatRegistry(hookFiles, sliceId);
    writeFileSync(REGISTRY_PATH, content, 'utf8');

    if (wantJson) {
      console.log(
        JSON.stringify(
          {
            kind: 'hook-integrity-check',
            ok: true,
            action: 'updated',
            registryPath: REGISTRY_PATH,
            entries: hookFiles.length,
            generatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        `hook-integrity-check: registry updated — ${hookFiles.length} hook(s) fingerprinted`,
      );
      console.log(`  written to: ${REGISTRY_PATH}`);
    }
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // Default: verify mode
  // -------------------------------------------------------------------------
  let registry;
  try {
    const parsed = loadFingerprints(REGISTRY_PATH);
    registry = parsed.hooks || {};
  } catch (err) {
    if (err.code === 'ENOENT') {
      const msg =
        `Fingerprint registry not found: ${REGISTRY_PATH}. ` +
        'Run: COA_OPERATOR=1 node scripts/checks/hook-integrity-check.mjs --update';
      if (wantJson) {
        console.log(JSON.stringify({ kind: 'hook-integrity-check', ok: false, error: msg }));
      } else {
        console.error(`hook-integrity-check: FAIL — ${msg}`);
      }
      process.exit(1);
    }
    throw err;
  }

  const hookFiles = scanHooks();
  const { mismatches, missing, extras } = compareFingerprints(hookFiles, registry);

  const ok = mismatches.length === 0 && missing.length === 0 && extras.length === 0;

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          kind: 'hook-integrity-check',
          ok,
          generatedAt: new Date().toISOString(),
          checked: hookFiles.length,
          mismatches,
          missing,
          extras,
        },
        null,
        2,
      ),
    );
  } else {
    const total = hookFiles.length;
    console.log(`hook-integrity-check: ${ok ? 'OK' : 'FAIL'} (${total} hook(s) checked)`);
    if (!ok) {
      if (mismatches.length > 0) {
        console.error('');
        console.error('  Modified hooks (sha256 mismatch — possible tampering):');
        for (const p of mismatches) {
          const stored = registry[p] || {};
          const current = hookFiles.find((h) => h.path === p) || {};
          console.error(`    ${p}`);
          console.error(`      stored sha256:  ${stored.sha256 || '(unknown)'}`);
          console.error(`      current sha256: ${current.sha256 || '(unknown)'}`);
        }
      }
      if (missing.length > 0) {
        console.error('');
        console.error('  Missing hooks (in registry but absent on disk):');
        for (const p of missing) console.error(`    ${p}`);
      }
      if (extras.length > 0) {
        console.error('');
        console.error('  Extra hooks (on disk but not in registry):');
        for (const p of extras) console.error(`    ${p}`);
      }
      console.error('');
      console.error('  Recovery: If you intentionally modified hooks, commit that change');
      console.error('  as a separate slice, then regenerate the registry:');
      console.error('    COA_OPERATOR=1 node scripts/checks/hook-integrity-check.mjs --update');
    }
  }

  process.exit(ok ? 0 : 1);
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('hook-integrity-check.mjs');
if (isDirectRun) main();
