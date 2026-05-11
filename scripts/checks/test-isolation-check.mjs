/* @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose R1 static check (ADR-0015) — refuses to commit any test file that invokes git outside the safeGit helper, follows imports transitively, and treats string obfuscation, dynamic imports, fs writes to .git, and process.chdir as violations.
 * @sidecar test-isolation-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R1 static check — test isolation enforcement.
 *
 * Walks every `tests/**\/*.{mjs,test.mjs,spec.mjs}` file repo-wide
 * (plus `scripts/**\/*.{test,spec}.mjs` if present), follows their
 * import graph one hop at a time so helper files inside `tests/lib/`
 * or `tests/_setup/` are scanned as well, and rejects any of the
 * patterns documented in ADR-0015's anti-evasion matrix.
 *
 * Modes:
 *   --self-test  — runs all bad fixtures through detect() and asserts
 *                  each is detected with a verdict matching its file
 *                  name. Runs FIRST in pre-commit so a tampered check
 *                  fails its own meta-validation before scanning the
 *                  real codebase.
 *   --json       — machine-readable output { ok, violations: [...] }
 *   (default)    — human-readable output, exit 1 on any violation.
 *
 * The check is regex-based but token-aware: comments, strings, and
 * regex literals are stripped to whitespace BEFORE pattern matching,
 * so `// execSync('git ...')` in a comment is not flagged. The
 * approach trades acorn's full AST for zero new dependencies; the
 * pattern surface is small and the meta-test pins detection.
 *
 * See ADR-0015 for the anti-evasion matrix.
 */

import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Paths and config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');

const ALLOWLIST_PATH = join(__dirname, 'test-isolation-allowlist.json');
const FIXTURE_ROOT = join(ROOT, 'tests', 'checks', 'fixtures', 'test-isolation');

// File-extension test for "is this a test file we should scan".
const TEST_FILE_RE = /\.(test|spec)\.m?js$/i;
// Test file OR helper file under tests/.
function isCandidate(absPath) {
  const norm = absPath.replaceAll('\\', '/');
  if (TEST_FILE_RE.test(norm)) return true;
  if (norm.includes('/tests/') && (norm.endsWith('.mjs') || norm.endsWith('.js'))) return true;
  return false;
}

// Fixtures live under tests/checks/fixtures/test-isolation/ and are
// intentionally bad-or-good. They must NOT be flagged during a normal
// scan — only during --self-test.
function isFixture(absPath) {
  const norm = absPath.replaceAll('\\', '/');
  return norm.includes('/tests/checks/fixtures/test-isolation/');
}

// safeGit / safeGitSpawn callers are pre-cleared by construction.
const SAFE_GIT_HELPER_PATH = 'tests/_setup/safe-git.mjs';
const SAFE_GIT_HELPER_PATH_2 = 'tests/_setup/safe-git.mjs.header.md';
// Files in tests/_setup/ themselves are exempt — they ARE the helper
// implementation. Their contents are reviewed manually + via meta-test.
function isSetupFile(absPath) {
  return absPath.replaceAll('\\', '/').includes('/tests/_setup/');
}

// ---------------------------------------------------------------------------
// Token-aware text stripping
// ---------------------------------------------------------------------------

/**
 * Replace every comment, string literal, and regex literal in `src`
 * with whitespace of equal length, preserving newlines. The result has
 * the same line/column layout as the original — so regex matches over
 * it produce accurate line numbers — but contains no syntactic hiding
 * places for git invocations.
 *
 * This is a small purpose-built scanner. It handles:
 *   - // line comments
 *   - /* block comments *\/
 *   - 'single' / "double" string literals (with backslash escapes)
 *   - `template literals` (without expressions — ${...} stays in place
 *     because we WANT to flag string-concat obfuscation inside templates)
 *   - / regex literals / (only when context suggests a regex, not division)
 *
 * Edge cases the scanner accepts conservatively:
 *   - Template-literal expressions are NOT recursively stripped; their
 *     content is preserved so `\`gi${x}t status\`` still scans as code.
 *   - Regex detection is heuristic — when ambiguous between regex and
 *     division, the scanner leaves the slash alone, which is safe (it
 *     might cause a false-positive elsewhere, but our patterns don't
 *     match standalone /).
 */
export function stripCommentsAndStrings(src) {
  const out = new Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i];

  let i = 0;
  let prevSignificant = ''; // last non-whitespace char before current position
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1];

    // Line comment
    if (c === '/' && c2 === '/') {
      while (i < src.length && src[i] !== '\n') {
        out[i] = src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }

    // Block comment
    if (c === '/' && c2 === '*') {
      out[i] = ' ';
      out[i + 1] = ' ';
      i += 2;
      while (i < src.length - 1 && !(src[i] === '*' && src[i + 1] === '/')) {
        out[i] = src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < src.length - 1) {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
      }
      continue;
    }

    // String literals
    if (c === '"' || c === "'") {
      const quote = c;
      out[i] = ' ';
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < src.length) {
          out[i] = ' ';
          out[i + 1] = src[i + 1] === '\n' ? '\n' : ' ';
          i += 2;
          continue;
        }
        out[i] = src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < src.length) {
        out[i] = ' ';
        i++;
      }
      prevSignificant = quote;
      continue;
    }

    // Template literal — strip the literal text but keep ${...} content
    // so an embedded git command in an interpolation is still seen.
    if (c === '`') {
      out[i] = ' ';
      i++;
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\' && i + 1 < src.length) {
          out[i] = ' ';
          out[i + 1] = src[i + 1] === '\n' ? '\n' : ' ';
          i += 2;
          continue;
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          // Walk to the matching close brace, preserving content.
          out[i] = ' ';
          out[i + 1] = ' ';
          i += 2;
          let depth = 1;
          while (i < src.length && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            if (depth === 0) {
              out[i] = ' ';
              i++;
              break;
            }
            // leave content in place
            i++;
          }
          continue;
        }
        out[i] = src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < src.length) {
        out[i] = ' ';
        i++;
      }
      prevSignificant = '`';
      continue;
    }

    // Regex literal heuristic: a `/` after an operator, keyword, or
    // start-of-input is a regex. After an identifier or close paren it's
    // division. We only strip in clear-regex contexts.
    if (c === '/' && isRegexContext(prevSignificant)) {
      // Walk to closing slash, then any flags.
      out[i] = ' ';
      i++;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === '\\' && i + 1 < src.length) {
          out[i] = ' ';
          out[i + 1] = src[i + 1] === '\n' ? '\n' : ' ';
          i += 2;
          continue;
        }
        if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        else if (src[i] === '/' && !inClass) {
          out[i] = ' ';
          i++;
          // Eat regex flags
          while (i < src.length && /[a-z]/i.test(src[i])) {
            out[i] = ' ';
            i++;
          }
          break;
        }
        out[i] = src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      prevSignificant = ')';
      continue;
    }

    if (!/\s/.test(c)) prevSignificant = c;
    i++;
  }
  return out.join('');
}

function isRegexContext(prev) {
  if (prev === '') return true;
  // Operators and punctuation that can precede a regex.
  if ('=([{,;:!&|?+*~/^%<>'.includes(prev)) return true;
  // Closing paren / bracket / identifier means division — not regex.
  return false;
}

// ---------------------------------------------------------------------------
// Pattern detectors — operate on STRIPPED source (no strings/comments)
// ---------------------------------------------------------------------------

/**
 * Each detector returns an array of { pattern, line, col, snippet,
 * suggestion } for matches in the stripped text. Line/col are 1-based.
 */
function makeViolation(pattern, src, idx, suggestion) {
  let line = 1,
    col = 1;
  for (let i = 0; i < idx; i++) {
    if (src[i] === '\n') {
      line++;
      col = 1;
    } else col++;
  }
  // Snippet: the full original line, trimmed to 200 chars.
  const lineStart = src.lastIndexOf('\n', idx - 1) + 1;
  const lineEnd = src.indexOf('\n', idx);
  const fullLine = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd);
  return { pattern, line, col, snippet: fullLine.slice(0, 200), suggestion };
}

const SPAWN_NAMES = ['execSync', 'exec', 'spawn', 'spawnSync', 'execFile', 'execFileSync'];

/**
 * Find every `<name>(...)` call site in stripped source. Returns
 * [{ name, callIdx, argsIdx, argsEnd }] where callIdx is the start of
 * the identifier and argsIdx points just past the opening `(`.
 *
 * Only direct method calls or bare-identifier calls match. A call like
 * `cp.execSync(...)` matches via the trailing `execSync(`.
 */
function findCallSites(stripped, names) {
  const matches = [];
  for (const name of names) {
    const re = new RegExp(`(^|[^\\w$])(${name})\\s*\\(`, 'g');
    let m;
    while ((m = re.exec(stripped)) !== null) {
      const nameIdx = m.index + m[1].length;
      const openParenIdx = m.index + m[0].length - 1;
      const argsIdx = openParenIdx + 1;
      const argsEnd = matchCloseParen(stripped, openParenIdx);
      if (argsEnd === -1) continue;
      matches.push({ name, nameIdx, argsIdx, argsEnd });
    }
  }
  return matches.sort((a, b) => a.nameIdx - b.nameIdx);
}

function matchCloseParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split the args list of a call site (already trimmed to between
 * argsIdx..argsEnd) into top-level arguments by commas, respecting
 * nested parens / braces / brackets.
 */
function splitTopLevelArgs(s) {
  const args = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      args.push(s.slice(start, i));
      start = i + 1;
    }
  }
  args.push(s.slice(start));
  return args.map((a) => a.trim()).filter((a) => a.length > 0);
}

// ---------------------------------------------------------------------------
// Detect logic — given file contents, return violations[]
// ---------------------------------------------------------------------------

/**
 * Inspect a single source file. Returns array of violations.
 *
 * Each violation has shape:
 *   {
 *     pattern: 'no-cwd' | 'cwd-non-tmpdir' | 'no-env-override'
 *            | 'process-chdir' | 'dynamic-cmd' | 'helper-import'
 *            | 'fs-git-write' | 'dynamic-import-cp' | 'simple-git'
 *            | 'spawn-variable' | 'claims-dir-leak',
 *     line, col, snippet, suggestion
 *   }
 */
export function detect(originalSource, filePathPosix = '<input>', options = {}) {
  const violations = [];
  const stripped = stripCommentsAndStrings(originalSource);

  // 1. process.chdir(...) — entirely banned in tests.
  for (const m of stripped.matchAll(/(^|[^\w$])process\s*\.\s*chdir\s*\(/g)) {
    violations.push(
      makeViolation(
        'process-chdir',
        originalSource,
        m.index + m[1].length,
        'process.chdir is banned in tests — use {cwd: tmpDir} on the spawn instead',
      ),
    );
  }

  // 2. Dynamic import / require of child_process inside a test file —
  //    legitimate uses go via top-level static import.
  // import('child_process') / import('node:child_process')
  for (const m of stripped.matchAll(/(^|[^\w$])import\s*\(\s*\)/g)) {
    // Argument was a string — already stripped. Look at the original
    // source at this offset to see if "child_process" appeared between
    // the parens.
    const openIdx = stripped.indexOf('(', m.index + m[1].length);
    const closeIdx = stripped.indexOf(')', openIdx);
    if (openIdx === -1 || closeIdx === -1) continue;
    const orig = originalSource.slice(openIdx, closeIdx + 1);
    if (/child_process/.test(orig)) {
      violations.push(
        makeViolation(
          'dynamic-import-cp',
          originalSource,
          m.index + m[1].length,
          "Use top-level `import { execSync } from 'node:child_process'` plus safeGit, not dynamic import",
        ),
      );
    }
  }
  // require('child_process') / require('node:child_process')
  for (const m of originalSource.matchAll(
    /(^|[^\w$])require\s*\(\s*['"`](?:node:)?child_process['"`]\s*\)/g,
  )) {
    // Skip if inside a string/comment of the stripped view (the offset
    // in stripped should also match a non-whitespace identifier here).
    const idx = m.index + m[1].length;
    if (/\s/.test(stripped[idx] ?? ' ')) continue;
    violations.push(
      makeViolation(
        'dynamic-import-cp',
        originalSource,
        idx,
        'Use top-level static import of node:child_process plus safeGit',
      ),
    );
  }

  // 3. R1.3 — paths that point to the live .claims/ directory (ADR-0052).
  //
  // The ZVX-DEV-1000 incident revealed that test files which build paths to
  // the repo's real `.claims/` directory can pollute it with orphaned claim
  // files if teardown fails. Those files then skew autoPickNextSliceId and
  // produce anomalous slice IDs (ZVX-DEV-999 → 1000). The static check must
  // refuse test code that constructs such a path unless the file is
  // explicitly whitelisted (R1.3 / ADR-0052).
  //
  // We scan the ORIGINAL source (not stripped) for two canonical forms:
  //   1. new URL('.../.claims', import.meta.url)  — file-relative URL pattern
  //   2. join(<ROOT>, '.claims') / join(__dirname…, '.claims')  — path-join pattern
  //
  // Both patterns are flagged UNLESS the surrounding line is obviously
  // tmpdir-derived (contains tmpdir / RUNNER_TEMP / mkdtemp — that would
  // be pointing to a temporary repo, not the live .claims/).

  // Pattern 1: new URL('.../.claims', import.meta.url)
  const claimsUrlRe =
    /new\s+URL\s*\(\s*['"`][^'"` ]*\.claims[^'"` ]*['"`]\s*,\s*import\.meta\.url/g;
  for (const m of originalSource.matchAll(claimsUrlRe)) {
    // Skip if this position is blanked out in the stripped view (inside a string/comment).
    if (/^\s*$/.test(stripped.slice(m.index, m.index + 3))) continue;
    const lineStart = originalSource.lastIndexOf('\n', m.index) + 1;
    const lineEnd = originalSource.indexOf('\n', m.index);
    const line = originalSource.slice(lineStart, lineEnd === -1 ? originalSource.length : lineEnd);
    if (/tmpdir|RUNNER_TEMP|mkdtemp/i.test(line)) continue;
    violations.push(
      makeViolation(
        'claims-dir-leak',
        originalSource,
        m.index,
        'Test must not build a path to the live .claims/ dir — use mkdtempSync(join(tmpdir(),...)) for isolated test repos, or add the live-repo-allowed whitelist annotation if intentional',
      ),
    );
  }

  // Pattern 2: join(<repo-root constant>, '.claims') — catches join(ROOT, '.claims'),
  // join(REPO_ROOT, '.claims'), and join(__dirname, '..', '.claims') constructions
  // that point to the live repo's .claims/ directory.
  //
  // Key distinction from safe patterns:
  //   SAFE:  join(root, '.claims')     — 'root' is a local test-setup variable (tmpdir)
  //   SAFE:  join(dir, '.claims')      — 'dir' is a local tmpdir-derived path
  //   UNSAFE: join(ROOT, '.claims')    — 'ROOT' is the module-level repo-root constant
  //   UNSAFE: join(__dirname, '..', '.claims') — traverses from source file to repo root
  //
  // Heuristic: flag ONLY when the first argument is a canonical repo-root identifier
  // (ROOT, REPO_ROOT, __dirname, repoRoot) or __dirname with traversal segments.
  // Local test-setup variables (root, dir, baseDir, repo, mainWt, etc.) are NOT flagged
  // because they are always tmpdir-derived in correct test code.
  const REPO_ROOT_IDENTS = /^(ROOT|REPO_ROOT|__dirname|repoRoot|projectRoot|TEMPLATE_ROOT)\b/;
  const claimsJoinRe2 = /join\s*\(\s*([^,)]+?)(?:\s*,\s*[^)]*)?['"`]\.claims['"`]/g;
  for (const m of originalSource.matchAll(claimsJoinRe2)) {
    if (/^\s*$/.test(stripped.slice(m.index, m.index + 3))) continue;
    const firstArg = (m[1] ?? '').trim();
    // Only flag when first arg is a known repo-root identifier.
    if (!REPO_ROOT_IDENTS.test(firstArg)) continue;
    const lineStart = originalSource.lastIndexOf('\n', m.index) + 1;
    const lineEnd = originalSource.indexOf('\n', m.index);
    const line = originalSource.slice(lineStart, lineEnd === -1 ? originalSource.length : lineEnd);
    if (/tmpdir|RUNNER_TEMP|mkdtemp/i.test(line)) continue;
    violations.push(
      makeViolation(
        'claims-dir-leak',
        originalSource,
        m.index,
        'Test must not build a path to the live .claims/ dir — use mkdtempSync(join(tmpdir(),...)) for isolated test repos, or add the live-repo-allowed whitelist annotation if intentional',
      ),
    );
  }

  // 4. fs writes targeting **/.git/** or **/refs/**
  // Scan each call site of fs.write* / fs.appendFile* / writeFile sync etc.
  const fsWriteRe =
    /(^|[^\w$])(fs\s*\.\s*)?(writeFile|writeFileSync|appendFile|appendFileSync)\s*\(/g;
  for (const m of stripped.matchAll(fsWriteRe)) {
    const openIdx = stripped.indexOf('(', m.index + m[1].length);
    const closeIdx = matchCloseParen(stripped, openIdx);
    if (openIdx === -1 || closeIdx === -1) continue;
    // Look at the literal first arg in the ORIGINAL source.
    const origArgs = originalSource.slice(openIdx + 1, closeIdx);
    // Pull the first quoted string literal.
    const literalMatch = origArgs.match(/^\s*(['"`])(.*?)\1/s);
    if (literalMatch) {
      const literal = literalMatch[2];
      if (/(^|[\\/])\.git([\\/]|$)/.test(literal) || /(^|[\\/])refs([\\/])/.test(literal)) {
        violations.push(
          makeViolation(
            'fs-git-write',
            originalSource,
            m.index + m[1].length,
            'Test must not write directly to .git/* or refs/* — use safeGit instead',
          ),
        );
      }
    }
  }

  // 4. spawn-family call sites — the heart of the rule.
  const callSites = findCallSites(stripped, SPAWN_NAMES);
  for (const site of callSites) {
    // For execSync/exec — first arg is the command string. For
    // spawn/spawnSync/execFile/execFileSync — first arg is executable.
    const looksLikeExec = site.name === 'execSync' || site.name === 'exec';

    // Use the ORIGINAL source to extract args, since the stripped view
    // collapses string literals to whitespace and would lose the actual
    // command text. splitTopLevelArgsFromOrig walks the raw source
    // respecting string and template boundaries.
    const origArgsAll = originalSource.slice(site.argsIdx, site.argsEnd);
    const origSplit = splitTopLevelArgsFromOrig(origArgsAll);
    if (origSplit.length === 0) continue;
    const origFirst = origSplit[0];

    const firstArgInfo = analyzeFirstArg(origFirst, looksLikeExec);
    if (!firstArgInfo.isGit) continue;

    // String concatenation / variable / template-with-expr → dynamic-cmd
    if (firstArgInfo.dynamic) {
      violations.push(
        makeViolation(
          firstArgInfo.reason === 'variable' ? 'spawn-variable' : 'dynamic-cmd',
          originalSource,
          site.nameIdx,
          'First arg of spawn/exec must be a literal "git ..." or use safeGit(cwd, args)',
        ),
      );
      continue;
    }

    // We have a (possibly dynamic) git invocation. Now check the
    // options object for cwd and env.
    const opts = parseOptionsArg(origSplit, site.name);
    if (!opts.hasCwd) {
      violations.push(
        makeViolation(
          'no-cwd',
          originalSource,
          site.nameIdx,
          'git invocation must pass {cwd: <tmpdir>} — use safeGit(cwd, args) from tests/_setup/safe-git.mjs',
        ),
      );
      continue;
    }
    if (!opts.cwdLooksTmpdir) {
      violations.push(
        makeViolation(
          'cwd-non-tmpdir',
          originalSource,
          site.nameIdx,
          `cwd must be derived from mkdtempSync()/tmpdir() — got ${JSON.stringify(opts.cwdExpr).slice(0, 80)}`,
        ),
      );
      continue;
    }
    if (!opts.hasGitEnvOverride) {
      violations.push(
        makeViolation(
          'no-env-override',
          originalSource,
          site.nameIdx,
          'git invocation must scrub GIT_DIR/GIT_WORK_TREE in env, OR use safeGit(cwd, args) which does it for you',
        ),
      );
      continue;
    }
    // TPL-272: even with correct cwd and env, raw spawn/exec calls must
    // go through safeGit/safeGitSpawn. The helper centralises env scrubbing
    // and cwd validation so future hardening only needs one change.
    violations.push(
      makeViolation(
        'raw-git-call',
        originalSource,
        site.nameIdx,
        'All git calls in tests must use safeGit(cwd, args) or safeGitSpawn(cwd, args) from tests/_setup/safe-git.mjs — raw execSync/spawn is forbidden even with correct cwd and env',
      ),
    );
  }

  // 5. simpleGit() with no arg or non-tmpdir literal arg.
  for (const m of stripped.matchAll(/(^|[^\w$])simpleGit\s*\(/g)) {
    const openIdx = stripped.indexOf('(', m.index + m[1].length);
    const closeIdx = matchCloseParen(stripped, openIdx);
    if (openIdx === -1 || closeIdx === -1) continue;
    const origArgs = originalSource.slice(openIdx + 1, closeIdx).trim();
    if (origArgs.length === 0) {
      violations.push(
        makeViolation(
          'simple-git',
          originalSource,
          m.index + m[1].length,
          'simpleGit() with no arg uses cwd by default — provide a tmpdir path or use safeGit',
        ),
      );
      continue;
    }
    // Heuristic: literal string argument — accept only if it looks like tmpdir
    if (/^['"`]/.test(origArgs)) {
      if (!/tmpdir|os\.tmpdir|RUNNER_TEMP|mkdtemp/i.test(origArgs)) {
        violations.push(
          makeViolation(
            'simple-git',
            originalSource,
            m.index + m[1].length,
            'simpleGit() literal path is not tmpdir-derived',
          ),
        );
      }
    } else if (!/tmp|mkdtemp|RUNNER_TEMP/i.test(origArgs)) {
      // Variable name doesn't look tmpdir-derived
      violations.push(
        makeViolation(
          'simple-git',
          originalSource,
          m.index + m[1].length,
          'simpleGit(<var>) — variable name does not signal tmpdir derivation; rename or use safeGit',
        ),
      );
    }
  }

  return violations;
}

/**
 * Same as splitTopLevelArgs, but operates on raw source so quoted
 * commas don't split the args. Walks character-by-character respecting
 * string boundaries.
 */
function splitTopLevelArgsFromOrig(s) {
  const args = [];
  let depth = 0;
  let start = 0;
  let inStr = '';
  let inTpl = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = '';
      continue;
    }
    if (inTpl) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inTpl = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '`') {
      inTpl = true;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      args.push(s.slice(start, i));
      start = i + 1;
    }
  }
  args.push(s.slice(start));
  return args.map((a) => a.trim()).filter((a) => a.length > 0);
}

/**
 * Decide whether `expr` (the verbatim first argument source) is a
 * literal "git ..." invocation. Returns:
 *   { isGit: bool, dynamic: bool, reason: string }
 *
 * Cases:
 *   - "git ..."          → isGit=true, dynamic=false
 *   - 'git ...'          → isGit=true, dynamic=false
 *   - `git ...`          → isGit=true, dynamic=false (literal template)
 *   - `git ${x}`         → isGit=true, dynamic=true (template with expr)
 *   - 'gi' + 't ...'     → isGit=true, dynamic=true (concat)
 *   - cmd                → isGit=false from string, but variable — flag
 *                          as dynamic-cmd if context smells like git
 *   - Whatever else      → isGit=false (we can't prove git)
 *
 * For spawn/spawnSync/execFile* the first arg is the executable name;
 * we treat 'git', "git", "git.exe", or any path ending in those as git.
 */
function analyzeFirstArg(expr, looksLikeExec) {
  const trimmed = expr.trim();
  // String concatenation: contains '+' at top level outside any literal.
  const hasConcat = hasTopLevelOp(trimmed, '+');
  // Template literal with expression: backtick-wrapped AND has ${...}
  const isTpl = trimmed.startsWith('`');
  const tplHasExpr = isTpl && /\$\{[\s\S]+?\}/.test(trimmed);
  // Plain literal: starts with quote, no concat, no template expression.
  const isPlain =
    (trimmed.startsWith('"') || trimmed.startsWith("'") || (isTpl && !tplHasExpr)) && !hasConcat;

  // Identifier-only first arg: e.g. spawn(cmd, ['status']).
  const isBareIdent = /^[a-zA-Z_$][\w$]*$/.test(trimmed);

  if (isPlain) {
    // Strip the surrounding quote, look at content.
    const inner = trimmed.slice(1, -1);
    if (looksLikeExec) {
      if (/^\s*git(\s|$)/i.test(inner)) {
        return { isGit: true, dynamic: false, reason: 'literal-exec' };
      }
      return { isGit: false, dynamic: false, reason: 'non-git-exec' };
    }
    // spawn-family — first arg is executable name.
    const base = inner.split(/[\\/]/).pop() ?? '';
    if (base.toLowerCase() === 'git' || base.toLowerCase() === 'git.exe') {
      return { isGit: true, dynamic: false, reason: 'literal-spawn' };
    }
    return { isGit: false, dynamic: false, reason: 'non-git-spawn' };
  }

  if (tplHasExpr) {
    // Template with interpolation. Three cases:
    //   1. Command itself is fixed (literal starts with "git " before
    //      any ${...}) — args interpolate, command identity is safe.
    //      Treat as a literal git invocation; options still get
    //      checked for cwd/env.
    //   2. First literal segment is empty (template starts with ${...})
    //      — the COMMAND is being interpolated, classic obfuscation.
    //   3. First literal segment starts with letters but not 'git'
    //      — still suspicious for execSync (obfuscation via prefix
    //      tweak), tolerate for spawn (command is the executable).
    const firstSegMatch = trimmed.match(/^`([^$`]*?)(?:\$\{|`$|`)/);
    const firstSeg = firstSegMatch ? firstSegMatch[1] : '';
    const fixedCommandIsGit = looksLikeExec
      ? /^\s*git[\s\\/]/i.test(firstSeg) || /^\s*git$/i.test(firstSeg.trim())
      : /^\s*git(\.exe)?$/i.test(firstSeg.trim()) || /[\\/]git(\.exe)?$/i.test(firstSeg.trim());

    if (fixedCommandIsGit) {
      return { isGit: true, dynamic: false, reason: 'template-fixed-git' };
    }

    // Command identity itself interpolates → obfuscation.
    if (firstSeg.trim() === '' || /^[a-z]+$/i.test(firstSeg.trim())) {
      // Could be 'gi' + ${'t status'} style. Flag it.
      if (looksLikeExec && /^g/i.test(firstSeg.trim())) {
        return { isGit: true, dynamic: true, reason: 'template' };
      }
      // Empty first segment — assume command is in interpolation. We
      // can't prove git, but for execSync this is suspicious. Flag.
      if (firstSeg.trim() === '') {
        return { isGit: true, dynamic: true, reason: 'template' };
      }
    }

    return { isGit: false, dynamic: true, reason: 'template-non-git' };
  }

  if (hasConcat) {
    // String concatenation. Check whether the FIRST literal segment
    // looks git-ish — that's the obfuscation pattern (e.g. 'gi' + 't ...').
    const firstLitMatch = trimmed.match(/^\s*['"`]([^'"`]*)['"`]/);
    if (firstLitMatch) {
      const lit = firstLitMatch[1];
      if (/^g/i.test(lit)) {
        return { isGit: true, dynamic: true, reason: 'concat' };
      }
      // Literal first segment doesn't start with 'g' — not git obfuscation.
      return { isGit: false, dynamic: false, reason: 'concat-non-git' };
    }
    // Concat where first piece is a variable (e.g., `cmd + ' status'`).
    // Check if any later literal looks git-shaped; otherwise let it through.
    if (/['"`]\s*git\b/i.test(trimmed)) {
      return { isGit: true, dynamic: true, reason: 'concat-var' };
    }
    return { isGit: false, dynamic: false, reason: 'concat-non-git' };
  }

  // Suspicious bare-identifier names that read like an obfuscated git
  // handle. A test using `const cmd = 'git'; spawn(cmd, [...])` is
  // intentionally hiding the command from a static reader.
  const SUSPICIOUS_IDENT_RE = /^(?:cmd|command|gitcmd|gitbin|git|bin|exe|gitexe|gitpath)$/i;

  if (isBareIdent) {
    if (SUSPICIOUS_IDENT_RE.test(trimmed)) {
      return { isGit: true, dynamic: true, reason: 'variable' };
    }
    // Plain identifier with a clearly non-git name (e.g. `nodePath`,
    // `scriptPath`, `claimCheckPath`) — accept. The test author is
    // spawning something else (typically node).
    return { isGit: false, dynamic: false, reason: 'non-git-ident' };
  }

  // Member expression / function call. Common legitimate pattern:
  // spawn(process.execPath, ...) for spawning node. Only flag when
  // the expression contains "git" as an identifier — that's positive
  // evidence of obfuscation.
  if (/\bgit\b/i.test(trimmed)) {
    return { isGit: true, dynamic: true, reason: 'expr' };
  }
  return { isGit: false, dynamic: false, reason: 'non-git-expr' };
}

function hasTopLevelOp(s, op) {
  let depth = 0;
  let inStr = '';
  let inTpl = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = '';
      continue;
    }
    if (inTpl) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inTpl = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '`') {
      inTpl = true;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === op && depth === 0) return true;
  }
  return false;
}

/**
 * Look at the options-object argument (typically the 2nd or 3rd arg)
 * and decide:
 *   - hasCwd: did the caller pass cwd at all?
 *   - cwdExpr: the verbatim expression used for cwd
 *   - cwdLooksTmpdir: does the expression smell like mkdtemp/tmpdir/etc?
 *   - hasGitEnvOverride: does options.env explicitly null GIT_DIR or
 *                         GIT_WORK_TREE?
 */
function parseOptionsArg(args, callName) {
  // execSync/exec: options at args[1]
  // spawn/spawnSync/execFile/execFileSync: argv at args[1], options at args[2]
  let optsExpr;
  if (callName === 'execSync' || callName === 'exec') {
    optsExpr = args[1];
  } else if (args.length >= 3) {
    optsExpr = args[2];
  } else if (args.length === 2 && /^\s*\{/.test(args[1])) {
    // Two-arg form: spawn(cmd, options)
    optsExpr = args[1];
  } else {
    optsExpr = undefined;
  }

  if (!optsExpr || !/^\s*\{/.test(optsExpr.trim())) {
    return { hasCwd: false, cwdLooksTmpdir: false, hasGitEnvOverride: false, cwdExpr: '' };
  }

  // Pull cwd: <expr> from the options object. Use balanced-bracket
  // walk so nested calls (e.g. cwd: join(tmpdir(), 'x')) survive.
  // Also accept the shorthand `{ cwd, ... }` form where the value is
  // implicit — in that case the cwd expression IS the literal "cwd"
  // identifier from the enclosing scope.
  let cwdExprRaw = extractKeyExpr(optsExpr, 'cwd');
  if (cwdExprRaw === null && /\{\s*[\s\S]*?\bcwd\b\s*[,}]/.test(optsExpr)) {
    cwdExprRaw = 'cwd'; // shorthand — value is the variable named cwd
  }
  const hasCwd = cwdExprRaw !== null;
  const cwdExpr = hasCwd ? cwdExprRaw : '';

  // Recognize tmpdir-derived expressions:
  //   - identifier whose name suggests it (dir, tmpDir, repoDir, sandbox, tmp)
  //   - call to mkdtempSync(...) or mkdtemp(...)
  //   - join(tmpdir(), ...) or join(os.tmpdir(), ...)
  //   - explicit RUNNER_TEMP usage
  const tmpdirRe =
    /^(\s*(repo|dir|tmp|sandbox|fixture|wt|workTree|wtPath|tmpDir|tempDir|tempRepo|repoDir|cwd)\s*$)|mkdtemp|tmpdir|RUNNER_TEMP|os\.tmpdir/i;
  const cwdLooksTmpdir = hasCwd && tmpdirRe.test(cwdExpr);

  // env: { ... } — look for explicit empty-string OR delete-style
  // override of GIT_DIR or GIT_WORK_TREE. We extract the env value
  // expression by walking balanced braces / brackets / parens so a
  // nested object literal isn't truncated at the first inner comma.
  const envExpr = extractKeyExpr(optsExpr, 'env');
  let hasGitEnvOverride = false;
  if (envExpr !== null) {
    if (/SAFE|safeEnv|GIT_SAFE/i.test(envExpr)) {
      hasGitEnvOverride = true;
    } else if (/\bGIT_DIR\s*:/.test(envExpr) || /\bGIT_WORK_TREE\s*:/.test(envExpr)) {
      hasGitEnvOverride = true;
    } else if (/buildSafeEnv|safeEnv\s*\(/.test(envExpr)) {
      hasGitEnvOverride = true;
    }
  }

  return { hasCwd, cwdLooksTmpdir, hasGitEnvOverride, cwdExpr };
}

/**
 * Pull the value of `key:` from an options-object source. Walks the
 * source character-by-character respecting strings and balanced
 * brackets so e.g. `env: { ...process.env, GIT_DIR: '' }` returns
 * the full nested expression rather than getting cut at the comma
 * inside `{ ... }`.
 */
function extractKeyExpr(optsExprSrc, key) {
  const re = new RegExp(`\\b${key}\\s*:`, 'g');
  let m;
  while ((m = re.exec(optsExprSrc)) !== null) {
    const start = m.index + m[0].length;
    const end = walkValueEnd(optsExprSrc, start);
    if (end > start) return optsExprSrc.slice(start, end).trim();
  }
  return null;
}

function walkValueEnd(s, from) {
  let depth = 0;
  let inStr = '';
  let inTpl = false;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = '';
      continue;
    }
    if (inTpl) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inTpl = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '`') {
      inTpl = true;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return i;
      depth--;
    } else if (c === ',' && depth === 0) return i;
  }
  return s.length;
}

// ---------------------------------------------------------------------------
// Whitelist annotation (per-file)
// ---------------------------------------------------------------------------

const WHITELIST_RE = /\/\/\s*@test-isolation:\s*live-repo-allowed\s*\|\s*reason:\s*(.+?)$/m;

/**
 * Look in the first 10 lines of the original source for the
 * whitelist annotation. Returns:
 *   { hasMarker: bool, reason: string, markerInsideFirstTen: bool }
 */
export function readWhitelistMarker(source) {
  const head = source.split(/\r?\n/).slice(0, 10).join('\n');
  const match = head.match(WHITELIST_RE);
  if (!match) return { hasMarker: false, reason: '', markerInsideFirstTen: true };
  const reason = match[1].trim();
  return { hasMarker: true, reason, markerInsideFirstTen: true };
}

// ---------------------------------------------------------------------------
// Repo walk
// ---------------------------------------------------------------------------

/**
 * Recursively collect candidate test/helper files under `dir`. Skips
 * node_modules, .git, build outputs, and the fixtures folder unless
 * options.includeFixtures is true.
 */
function walk(dir, options = {}) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.git')) continue;
    if (entry.name === 'node_modules') continue;
    if (entry.name === '.backups') continue;
    if (entry.name === 'dist' || entry.name === 'build') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, options));
    } else if (entry.isFile()) {
      if (isCandidate(full)) out.push(full);
    }
  }
  return out;
}

/**
 * Resolve relative imports in `tests/...` that reach into shared lib
 * files. We don't traverse npm imports — only relative ones.
 */
function resolveRelImport(fromFile, importPath) {
  const baseDir = dirname(fromFile);
  const candidates = [
    importPath,
    importPath + '.mjs',
    importPath + '.js',
    join(importPath, 'index.mjs'),
    join(importPath, 'index.js'),
  ].map((p) => resolve(baseDir, p));
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        if (statSync(c).isFile()) return c;
      } catch {
        // not stat-able — skip this candidate, try next
      }
    }
  }
  return null;
}

/**
 * Collect all imports of the form `import ... from '<path>'` (and
 * `import('<path>')` static-string form) where path is relative.
 */
function findRelativeImports(source) {
  const stripped = stripCommentsAndStrings(source);
  const results = new Set();
  // We can't see strings in the stripped form, so use the original to
  // pick out the literal paths.
  const importRe = /(?:^|[^\w$])(?:import|export)\s+[\s\S]*?from\s+['"`]([./][^'"`]+)['"`]/g;
  let m;
  while ((m = importRe.exec(source)) !== null) {
    // Confirm the from-keyword falls outside a comment/string by
    // checking the stripped view at the match start.
    if (/\S/.test(stripped[m.index] ?? '') === false && stripped[m.index] !== ' ') continue;
    results.add(m[1]);
  }
  // import('./path')
  const dynRe = /(?:^|[^\w$])import\s*\(\s*['"`]([./][^'"`]+)['"`]\s*\)/g;
  while ((m = dynRe.exec(source)) !== null) {
    results.add(m[1]);
  }
  return [...results];
}

function buildImportClosure(rootFiles) {
  const visited = new Set();
  const queue = [...rootFiles];
  while (queue.length > 0) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const rel of findRelativeImports(src)) {
      const resolved = resolveRelImport(file, rel);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return [...visited];
}

// ---------------------------------------------------------------------------
// Allowlist load
// ---------------------------------------------------------------------------

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return { files: [] };
  try {
    return JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  } catch {
    return { files: [] };
  }
}

function isAllowlisted(filePosix, allowlist) {
  if (!allowlist || !Array.isArray(allowlist.files)) return false;
  return allowlist.files.some(
    (entry) => entry === filePosix || entry === filePosix.replace(/^\.\//, ''),
  );
}

// ---------------------------------------------------------------------------
// File scan with whitelist check
// ---------------------------------------------------------------------------

function scanFile(absPath, allowlist, fixturesAreReal = false) {
  const filePosix = relative(ROOT, absPath).replaceAll('\\', '/');
  // Setup files (safe-git.mjs, no-live-git.mjs) implement the helper
  // and are exempt — but ONLY those two files. Other files in
  // tests/_setup/ would still be scanned.
  if (filePosix === 'tests/_setup/safe-git.mjs' || filePosix === 'tests/_setup/no-live-git.mjs') {
    return { filePosix, violations: [] };
  }
  // Fixtures only scanned during --self-test.
  if (isFixture(absPath) && !fixturesAreReal) {
    return { filePosix, violations: [] };
  }
  const source = readFileSync(absPath, 'utf8');
  const violations = detect(source, filePosix);
  if (violations.length === 0) {
    return { filePosix, violations: [] };
  }

  // Whitelist check. Both annotation in first 10 lines AND allowlist.
  const wl = readWhitelistMarker(source);
  const annotated = wl.hasMarker && wl.reason.length >= 60;
  const allowed = isAllowlisted(filePosix, allowlist);
  if (annotated && allowed) {
    return { filePosix, violations: [], whitelisted: true };
  }

  // If only one half present, INSTEAD of clearing the violations we
  // append a meta-violation explaining the partial whitelist. The
  // fixtures depend on this for verdicts 16/17.
  if (annotated && !allowed) {
    return {
      filePosix,
      violations: [
        ...violations,
        {
          pattern: 'whitelist-incomplete',
          line: 1,
          col: 1,
          snippet: '@test-isolation marker present but file not in allowlist',
          suggestion: `add "${filePosix}" to scripts/checks/test-isolation-allowlist.json files[]`,
        },
      ],
    };
  }
  if (!annotated && allowed) {
    return {
      filePosix,
      violations: [
        ...violations,
        {
          pattern: 'whitelist-incomplete',
          line: 1,
          col: 1,
          snippet: 'file in allowlist but missing @test-isolation marker',
          suggestion:
            'add a `// @test-isolation: live-repo-allowed | reason: <≥60 chars>` line in the first 10 lines',
        },
      ],
    };
  }
  return { filePosix, violations };
}

// ---------------------------------------------------------------------------
// Self-test mode
// ---------------------------------------------------------------------------

const SELF_TEST_EXPECTATIONS = {
  // bad fixtures — each must produce ≥1 violation of the expected pattern
  'bad-no-cwd.fixture.mjs': { expect: 'violation', patterns: ['no-cwd'] },
  'bad-cwd-process-cwd.fixture.mjs': { expect: 'violation', patterns: ['cwd-non-tmpdir'] },
  'bad-cwd-dirname.fixture.mjs': { expect: 'violation', patterns: ['cwd-non-tmpdir'] },
  'bad-no-env-override.fixture.mjs': { expect: 'violation', patterns: ['no-env-override'] },
  'bad-chdir.fixture.mjs': { expect: 'violation', patterns: ['process-chdir'] },
  // bad-helper-import looks innocent on its own — it only imports the
  // bad helper. The transitive-scan invariant is exercised in the
  // META-test (test-isolation-check.test.mjs), not the self-test.
  'bad-helper-import.fixture.mjs': { expect: 'pass' },
  'bad-dynamic-cmd.fixture.mjs': { expect: 'violation', patterns: ['dynamic-cmd'] },
  'bad-spawn-variable.fixture.mjs': { expect: 'violation', patterns: ['spawn-variable'] },
  'bad-process-chdir.fixture.mjs': { expect: 'violation', patterns: ['process-chdir'] },
  'bad-fs-git-write.fixture.mjs': { expect: 'violation', patterns: ['fs-git-write'] },
  'bad-dynamic-import.fixture.mjs': { expect: 'violation', patterns: ['dynamic-import-cp'] },
  // good fixtures — must produce zero violations
  'good-tmpdir-with-env.fixture.mjs': { expect: 'pass' },
  'good-uses-safe-helper.fixture.mjs': { expect: 'pass' },
  // TPL-272: raw git call even with correct cwd+env is forbidden
  'bad-raw-exec-with-safe-env.fixture.mjs': { expect: 'violation', patterns: ['raw-git-call'] },
  // whitelist-mechanism fixtures
  'whitelisted-with-marker-and-allowlist.fixture.mjs': { expect: 'pass-via-whitelist' },
  'whitelisted-marker-only-no-allowlist.fixture.mjs': {
    expect: 'violation',
    patterns: ['whitelist-incomplete'],
  },
  'whitelisted-allowlist-no-marker.fixture.mjs': {
    expect: 'violation',
    patterns: ['whitelist-incomplete'],
  },
  // helper file referenced by bad-helper-import.fixture.mjs.
  // execSync('git status --porcelain') with no options → 'no-cwd'.
  'bad-helper.mjs': { expect: 'violation', patterns: ['no-cwd'] },
  // R1.3: claims-dir-leak — live .claims/ path construction in tests (ADR-0052)
  'bad-claims-write.fixture.mjs': { expect: 'violation', patterns: ['claims-dir-leak'] },
};

function runSelfTest(wantJson) {
  if (!existsSync(FIXTURE_ROOT)) {
    const msg = `self-test: fixture root missing: ${relative(ROOT, FIXTURE_ROOT)}`;
    if (wantJson) console.log(JSON.stringify({ ok: false, error: msg }));
    else console.error(`test-isolation-check --self-test: ${msg}`);
    process.exit(1);
  }
  const expectedFiles = Object.keys(SELF_TEST_EXPECTATIONS);
  const failures = [];

  // Assert every expected fixture exists.
  for (const name of expectedFiles) {
    const p = join(FIXTURE_ROOT, name);
    if (!existsSync(p)) failures.push(`missing fixture: ${name}`);
  }

  // For the whitelist-mechanism fixtures, we need a synthetic allowlist
  // that includes whitelisted-with-marker-and-allowlist.fixture.mjs +
  // whitelisted-allowlist-no-marker.fixture.mjs but NOT
  // whitelisted-marker-only-no-allowlist.fixture.mjs. We DON'T touch
  // the real allowlist on disk — we simulate per-call.
  const synthAllowlist = {
    files: [
      'tests/checks/fixtures/test-isolation/whitelisted-with-marker-and-allowlist.fixture.mjs',
      'tests/checks/fixtures/test-isolation/whitelisted-allowlist-no-marker.fixture.mjs',
    ],
  };

  for (const name of expectedFiles) {
    const p = join(FIXTURE_ROOT, name);
    if (!existsSync(p)) continue;
    const { violations, whitelisted } = scanFile(p, synthAllowlist, /*fixturesAreReal*/ true);
    const exp = SELF_TEST_EXPECTATIONS[name];

    if (exp.expect === 'pass') {
      if (violations.length > 0) {
        failures.push(
          `${name}: expected zero violations, got ${violations.length} [${violations.map((v) => v.pattern).join(',')}]`,
        );
      }
      continue;
    }
    if (exp.expect === 'pass-via-whitelist') {
      if (!whitelisted) {
        failures.push(
          `${name}: expected whitelisted=true (got violations=[${violations.map((v) => v.pattern).join(',')}])`,
        );
      }
      continue;
    }
    // expect violations
    if (violations.length === 0) {
      failures.push(`${name}: expected violations, got none`);
      continue;
    }
    for (const wantPat of exp.patterns) {
      if (!violations.some((v) => v.pattern === wantPat)) {
        failures.push(
          `${name}: expected pattern '${wantPat}' not detected (got [${violations.map((v) => v.pattern).join(',')}])`,
        );
      }
    }
  }

  const ok = failures.length === 0;
  if (wantJson) {
    console.log(JSON.stringify({ ok, failures }, null, 2));
  } else if (!ok) {
    console.error('test-isolation-check --self-test: FAIL');
    for (const f of failures) console.error(`  - ${f}`);
  } else {
    console.log('test-isolation-check --self-test: OK');
  }
  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

function runMainScan(wantJson) {
  const allowlist = loadAllowlist();
  const testsRoot = join(ROOT, 'tests');
  const scriptsRoot = join(ROOT, 'scripts');
  const candidates = new Set();
  for (const f of walk(testsRoot)) candidates.add(f);
  // Test files under scripts/checks/ — common in this repo.
  for (const f of walk(scriptsRoot)) candidates.add(f);

  const closure = buildImportClosure([...candidates]).filter(isCandidate);
  const allFiles = [...new Set([...candidates, ...closure])];

  const fileResults = [];
  let total = 0;
  for (const f of allFiles) {
    const r = scanFile(f, allowlist, /*fixturesAreReal*/ false);
    if (r.violations.length > 0) {
      fileResults.push(r);
      total += r.violations.length;
    }
  }

  const ok = total === 0;
  if (wantJson) {
    const violations = [];
    for (const r of fileResults) {
      for (const v of r.violations) violations.push({ file: r.filePosix, ...v });
    }
    console.log(JSON.stringify({ ok, violations, scanned: allFiles.length }, null, 2));
  } else if (!ok) {
    console.error(
      `test-isolation-check: FAIL — ${total} violation(s) across ${fileResults.length} file(s)`,
    );
    for (const r of fileResults) {
      console.error(`\n  ${r.filePosix}`);
      for (const v of r.violations) {
        console.error(`    ${v.line}:${v.col}  [${v.pattern}]  ${v.snippet.trim()}`);
        console.error(`        → ${v.suggestion}`);
      }
    }
    console.error('\nSee docs/adr/0015-test-isolation-enforcement.md.');
  } else {
    console.log(`test-isolation-check: OK (${allFiles.length} files scanned)`);
  }
  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes('--json');
  if (args.includes('--self-test')) {
    runSelfTest(wantJson);
    return;
  }
  runMainScan(wantJson);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('test-isolation-check.mjs') ||
    process.argv[1].endsWith('test-isolation-check'));

if (isDirectRun) {
  main();
}

export { scanFile, runSelfTest, runMainScan, SELF_TEST_EXPECTATIONS, ROOT };
