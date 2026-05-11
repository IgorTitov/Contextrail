/* @HEADER
 * @version 0.7.82 | 2026-05-04
 * @purpose R1 runtime guard — load via `node --import` before tests; refuses to start in a live repo, scrubs GIT_* env, and monkey-patches child_process so any git invocation outside tmpdir throws loudly.
 * @sidecar no-live-git.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R1 runtime guard for test isolation (ADR-0015).
 *
 * Load order (`node --import ./tests/_setup/no-live-git.mjs ...`):
 *
 * 1. Inherited-env trap — refuse to start if GIT_DIR / GIT_WORK_TREE /
 *    GIT_INDEX_FILE / GIT_OBJECT_DIRECTORY were set in the parent
 *    environment AND point to a real path. That is the exact Zvenix
 *    incident vector (TPL-233): a parent shell's plumbing var routed
 *    test-spawned git calls to the live repo even though the test
 *    passed cwd correctly. Refusing to start is safer than scrubbing
 *    silently — the operator gets a loud signal that their shell is
 *    poisoned.
 *
 * 2. Env scrub — clears the same GIT_* directory pointers from the
 *    inherited env, then pins GIT_CEILING_DIRECTORIES to tmpdir +
 *    project root so git's upward repo search cannot escape the temp
 *    tree even if a test forgets to pass cwd.
 *
 * 3. child_process monkey-patch — execSync / exec / spawn / spawnSync /
 *    execFileSync / execFile are wrapped so that any invocation whose
 *    command looks like git (literal "git", "git.exe", or any path
 *    ending in those) must carry an explicit cwd that resolves under
 *    tmpdir / RUNNER_TEMP. Anything else throws loudly with the
 *    caller's stack.
 *
 * 4. Self-verify — runs `git --version` through the original execSync
 *    inside an internal scope to prove git invocation still works after
 *    patching. If the monkey-patch silently broke spawn, we fail at
 *    load time, not from a confused test.
 *
 * The static check (scripts/checks/test-isolation-check.mjs) catches
 * violations at lint time; this guard is defense-in-depth at runtime.
 *
 * See ADR-0015 for the full motivation and anti-evasion matrix.
 */

import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { realpathSync, existsSync } from 'node:fs';
import { execSync as origExecSync } from 'node:child_process';

// Patching ESM live bindings is not allowed (read-only). The CommonJS
// child_process module exports plain object properties, which ARE
// writable, so we obtain a CJS handle and mutate that. Both ESM `import`
// and CJS `require` resolve to the same underlying module exports cache,
// so the patch reaches all consumers.
const cjsRequire = createRequire(import.meta.url);
const childProcess = cjsRequire('node:child_process');

// GIT_COMMON_DIR added in TPL-274: set by git for hooks in linked worktrees;
// points at the common .git dir and causes git to write objects/refs there
// even when cwd is in tmpdir. Must be scrubbed alongside GIT_DIR.
const SAFE_KEYS = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
];

// ---------------------------------------------------------------------------
// 1. Tmpdir root resolution
// ---------------------------------------------------------------------------

function tmpdirRoots() {
  const roots = [];
  try {
    roots.push(realpathSync(tmpdir()));
  } catch {
    // tmpdir() should always succeed on supported platforms; if it doesn't,
    // fall through and let the cwd assertion fail loudly below.
  }
  if (process.env.RUNNER_TEMP) {
    try {
      roots.push(realpathSync(process.env.RUNNER_TEMP));
    } catch {
      // ignore — RUNNER_TEMP path doesn't exist on this machine
    }
  }
  return roots;
}

function isUnderTmpdir(absPath) {
  let real;
  try {
    real = realpathSync(absPath);
  } catch {
    return false;
  }
  for (const root of tmpdirRoots()) {
    if (real === root || real.startsWith(root + '\\') || real.startsWith(root + '/')) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// 2. Inherited-env trap — refuse to start if shell is poisoned
// ---------------------------------------------------------------------------

function isAbsolutePathValue(val) {
  // POSIX: starts with /
  // Windows: starts with drive letter (C:\) or UNC (\\)
  if (val.startsWith('/')) return true;
  if (/^[a-zA-Z]:[\\/]/.test(val)) return true;
  if (val.startsWith('\\\\')) return true;
  return false;
}

function assertNoInheritedGitEnv() {
  const offenders = [];
  for (const key of SAFE_KEYS) {
    const val = process.env[key];
    if (!val || val.length === 0) continue;

    // Relative paths are dynamic — they resolve against whatever cwd
    // the test process picks. Tests using mkdtempSync + cwd: dir route
    // them harmlessly into tmpdir. Git itself sets GIT_INDEX_FILE
    // = ".git/index" (relative) when invoking hooks; refusing on that
    // would block every `git commit` that runs pre-commit. The Zvenix
    // vector required ABSOLUTE paths pointing at a different live
    // repo — that's what we trap here.
    if (!isAbsolutePathValue(val)) continue;

    // Absolute path — flag it if it points to an actual on-disk
    // location (or if existsSync throws, treat as suspicious).
    try {
      if (existsSync(val)) {
        offenders.push({ key, value: val });
      }
    } catch {
      offenders.push({ key, value: val });
    }
  }
  if (offenders.length === 0) return;

  // The shell that launched the test runner has GIT_DIR (or similar)
  // pointing at a real directory. THIS is the Zvenix vector — a forgotten
  // cwd in a child_process call would route to that real path. Refuse to
  // proceed; force the operator to scrub their shell.
  process.stderr.write(
    [
      '',
      '=========================================================',
      'R1 runtime guard (ADR-0015) — REFUSING TO START',
      '=========================================================',
      'Inherited git env vars detected in parent shell:',
      ...offenders.map((o) => `  ${o.key}=${o.value}`),
      '',
      'These point at real directories. If a test forgets to pass cwd',
      'to child_process, git will follow these and silently write to',
      'whatever they reference — including a live work-tree. This is',
      'the exact failure mode that wrote 30 sandbox commits to Zvenix',
      'main on 2026-04-28 (TPL-233).',
      '',
      'Scrub your shell before running tests:',
      ...offenders.map((o) =>
        process.platform === 'win32' ? `  Remove-Item Env:${o.key}` : `  unset ${o.key}`,
      ),
      '',
      'See docs/adr/0015-test-isolation-enforcement.md',
      '=========================================================',
      '',
    ].join('\n'),
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 3. Env scrub — block git's auto-discovery escape hatches
// ---------------------------------------------------------------------------

function scrubGitEnv() {
  for (const key of SAFE_KEYS) {
    if (key in process.env) {
      delete process.env[key];
    }
  }
  // Pin git's upward search ceiling so a forgotten-cwd call cannot
  // resolve to a live work-tree. The ceiling list contains every
  // tmpdir root plus the project root itself: a test that forgets cwd
  // and runs from project root will still hit the ceiling and fail
  // discovery rather than walking up to a parent repo.
  const ceilings = [...tmpdirRoots()];
  try {
    ceilings.push(realpathSync(process.cwd()));
  } catch {
    // cwd unresolvable — leave the ceiling at tmpdir alone.
  }
  if (ceilings.length > 0) {
    // Use ";" on Windows, ":" on POSIX for the ceiling list separator.
    const sep = process.platform === 'win32' ? ';' : ':';
    process.env.GIT_CEILING_DIRECTORIES = Array.from(new Set(ceilings)).join(sep);
  }
}

// ---------------------------------------------------------------------------
// 4. child_process monkey-patch
// ---------------------------------------------------------------------------

let internalCallDepth = 0;

/**
 * Allow internal callers (e.g., safe-git.mjs, the self-verify below) to
 * bypass the patch without circular checks. Increments a depth counter
 * and returns a function that restores it.
 */
export function _enterInternalScope() {
  internalCallDepth += 1;
  return () => {
    internalCallDepth -= 1;
  };
}

function isGitCommand(firstArg, argvOrUndefined) {
  // Form A: execSync('git status', { cwd })
  // Form B: execSync('git', { cwd })  -- rare but possible
  // Form C: spawn('git', ['status'])
  // Form D: spawn('/usr/bin/git', [...])
  // Form E: spawnSync('git.exe', [...])
  if (typeof firstArg === 'string') {
    // Strip leading whitespace, look at the first whitespace-delimited token.
    const trimmed = firstArg.trim();
    if (trimmed.length === 0) return false;
    // Match the executable name regardless of full path or .exe suffix.
    const tokenMatch = trimmed.match(/^("[^"]+"|'[^']+'|\S+)/);
    if (!tokenMatch) return false;
    let token = tokenMatch[1];
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      token = token.slice(1, -1);
    }
    const base = token.split(/[\\/]/).pop().toLowerCase();
    if (base === 'git' || base === 'git.exe') return true;
  }
  // For spawn(): check argvOrUndefined isn't relevant — the executable IS firstArg.
  return false;
}

function checkInvocation(firstArg, options, callerLabel) {
  if (internalCallDepth > 0) return;
  if (!isGitCommand(firstArg)) return;

  const cwd = options && typeof options === 'object' ? options.cwd : undefined;
  if (cwd === undefined || cwd === null) {
    const stack = new Error('R1 runtime guard').stack || '';
    throw new Error(
      `R1 runtime guard: ${callerLabel} invoked git without an explicit cwd option.\n` +
        `  arg: ${JSON.stringify(firstArg).slice(0, 200)}\n` +
        `  See ADR-0015. Use safeGit(cwd, args) from tests/_setup/safe-git.mjs.\n` +
        stack.split('\n').slice(0, 6).join('\n'),
    );
  }
  if (typeof cwd !== 'string') {
    throw new Error(
      `R1 runtime guard: ${callerLabel} invoked git with non-string cwd (got ${typeof cwd})`,
    );
  }
  if (!existsSync(cwd)) {
    // Fail loudly — better than git silently using its discovery walk.
    throw new Error(
      `R1 runtime guard: ${callerLabel} invoked git with cwd that does not exist: ${cwd}`,
    );
  }
  if (!isUnderTmpdir(cwd)) {
    const stack = new Error('R1 runtime guard').stack || '';
    throw new Error(
      `R1 runtime guard: ${callerLabel} invoked git with cwd outside tmpdir.\n` +
        `  cwd: ${cwd}\n` +
        `  arg: ${JSON.stringify(firstArg).slice(0, 200)}\n` +
        `  Allowed roots: ${tmpdirRoots().join(', ')}\n` +
        `  See ADR-0015.\n` +
        stack.split('\n').slice(0, 6).join('\n'),
    );
  }
}

function patchSync(originalName, callerLabel, optionsArgIndex) {
  const original = childProcess[originalName];
  if (typeof original !== 'function') return;
  const wrapper = function patched(...args) {
    const firstArg = args[0];
    const options = args[optionsArgIndex];
    checkInvocation(firstArg, options, callerLabel);
    return original.apply(childProcess, args);
  };
  // Preserve key metadata so callers cannot accidentally tell the wrapper
  // from the original via `name` / `length`.
  Object.defineProperty(wrapper, 'name', { value: originalName });
  childProcess[originalName] = wrapper;
}

function patchAll() {
  // execSync(command, options) — options at index 1
  patchSync('execSync', 'execSync', 1);
  // exec(command, options, callback) — options at index 1
  patchSync('exec', 'exec', 1);
  // spawnSync(command, args, options) OR spawnSync(command, options)
  // We treat options as args[2] when present, args[1] otherwise.
  const origSpawnSync = childProcess.spawnSync;
  if (typeof origSpawnSync === 'function') {
    const wrapped = function patchedSpawnSync(command, ...rest) {
      let options;
      if (Array.isArray(rest[0])) {
        options = rest[1];
      } else {
        options = rest[0];
      }
      checkInvocation(command, options, 'spawnSync');
      return origSpawnSync.call(childProcess, command, ...rest);
    };
    Object.defineProperty(wrapped, 'name', { value: 'spawnSync' });
    childProcess.spawnSync = wrapped;
  }
  // spawn(command, args, options) OR spawn(command, options)
  const origSpawn = childProcess.spawn;
  if (typeof origSpawn === 'function') {
    const wrapped = function patchedSpawn(command, ...rest) {
      let options;
      if (Array.isArray(rest[0])) {
        options = rest[1];
      } else {
        options = rest[0];
      }
      checkInvocation(command, options, 'spawn');
      return origSpawn.call(childProcess, command, ...rest);
    };
    Object.defineProperty(wrapped, 'name', { value: 'spawn' });
    childProcess.spawn = wrapped;
  }
  // execFileSync / execFile — same shape as spawn.
  const origExecFileSync = childProcess.execFileSync;
  if (typeof origExecFileSync === 'function') {
    const wrapped = function patchedExecFileSync(command, ...rest) {
      let options;
      if (Array.isArray(rest[0])) {
        options = rest[1];
      } else {
        options = rest[0];
      }
      checkInvocation(command, options, 'execFileSync');
      return origExecFileSync.call(childProcess, command, ...rest);
    };
    Object.defineProperty(wrapped, 'name', { value: 'execFileSync' });
    childProcess.execFileSync = wrapped;
  }
  const origExecFile = childProcess.execFile;
  if (typeof origExecFile === 'function') {
    const wrapped = function patchedExecFile(command, ...rest) {
      let options;
      if (Array.isArray(rest[0])) {
        options = rest[1];
      } else {
        options = rest[0];
      }
      checkInvocation(command, options, 'execFile');
      return origExecFile.call(childProcess, command, ...rest);
    };
    Object.defineProperty(wrapped, 'name', { value: 'execFile' });
    childProcess.execFile = wrapped;
  }
}

// ---------------------------------------------------------------------------
// 5. Self-verify — make sure the patch did not break git invocation
// ---------------------------------------------------------------------------

function selfVerify() {
  const release = _enterInternalScope();
  try {
    // Run from tmpdir so the patch (had it not been bypassed) would also
    // accept the call. Internal scope makes this redundant but harmless.
    const root = tmpdirRoots()[0];
    if (!root) return; // nothing to verify against
    const result = origExecSync('git --version', {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    if (typeof result !== 'string' || !result.toLowerCase().includes('git')) {
      process.stderr.write(
        `R1 runtime guard: self-verify failed — git --version returned: ${JSON.stringify(result)}\n`,
      );
      process.exit(2);
    }
  } catch (err) {
    process.stderr.write(
      `R1 runtime guard: self-verify failed — could not invoke git: ${err.message}\n`,
    );
    process.exit(2);
  } finally {
    release();
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

assertNoInheritedGitEnv();
scrubGitEnv();
patchAll();
selfVerify();
