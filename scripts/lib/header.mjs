/* @HEADER
 * @version 0.7.87 | 2026-05-05
 * @purpose Header v2 engine — schema constants, comment-style decisions, file discovery, regex, parsing, rendering, injection, and validation for structured inline and sidecar headers.
 * @sidecar header.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { ROOT, toPosix, fileExists, walk } from './fs-helpers.mjs';
import { todayIsoDateUTC } from './output.mjs';
import { repoFileIdPrefix, repoVersion, REPO_FILEID_PREFIX } from './repo-meta.mjs';

// ---------------------------------------------------------------------------
// Constants & schema
// ---------------------------------------------------------------------------

export const HEADER_START = '@HEADER-START';
export const CHANGELOG_BEGIN = 'CHANGELOG-BEGIN';
export const CHANGELOG_END = 'CHANGELOG-END';
export const FILEINFO_BEGIN = 'FILEINFO-BEGIN';
export const FILEINFO_END = 'FILEINFO-END';
export const HEADER_END = 'HEADER-END';
export const LEGACY_HEADER_START = '@PROJECT-TEMPLATE-HEADER-START';
export const LEGACY_HEADER_END = '@PROJECT-TEMPLATE-HEADER-END';

export const CHANGELOG_SECTIONS = ['Summary', 'Added', 'Changed', 'Fixed', 'Removed', 'Notes'];

export const FILEINFO_FIELDS = [
  'Summary',
  'FileId',
  'Path',
  'Layer',
  'Module/Package',
  'Public',
  'API',
  'Stability',
  'EditPolicy',
  'Steward',
  'DependsOn',
  'Owns',
  'Boundaries',
  'Invariants',
  'Tests',
  'Risks',
  'LinkedDocs',
  'SpecRefs',
  'UsmRefs',
  'Related',
  'Security/Privacy',
  'NotesForLLM',
  // --- Architecture metadata (AI Cockpit / hex visualization) ---
  'HexLayer',
  'PortType',
  'AdapterType',
  'BoundedContext',
  'AllowedDependencies',
  'ForbiddenDependencies',
  'ExternalSystems',
];

export const EDIT_POLICY_VALUES = new Set([
  'rewrite-ok',
  'careful',
  'append-only',
  'sync-only',
  'generated',
  'manual-only',
]);

export const STEWARD_VALUES = new Set(['agent', 'human', 'shared', 'generator', 'pipeline']);

// --- Architecture metadata enums ---

export const HEX_LAYER_VALUES = new Set([
  'domain',
  'port',
  'adapter',
  'application',
  'infrastructure',
  '_none_',
]);

export const PORT_TYPE_VALUES = new Set(['inbound', 'outbound', '_none_']);

export const ADAPTER_TYPE_VALUES = new Set(['primary', 'secondary', '_none_']);

// ---------------------------------------------------------------------------
// File discovery & classification
// ---------------------------------------------------------------------------

const ROOT_SCAN_DIRS = [
  '.claude',
  '.agents',
  '.claims',
  '.githooks',
  '.vscode',
  'scripts',
  'docs',
  'tests',
  'modules',
  'apps',
  'templates',
];
const ROOT_SCAN_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'README.md',
  'CHANGELOG.md',
  'package.json',
  'VERSION',
  '.gitignore',
  'eslint.config.mjs',
  'playwright.config.mjs',
];

const SUPPORTED_EXTENSIONS = new Set([
  '.md',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.sh',
  '.bash',
  '.zsh',
  '.json',
  '.feature',
  '.yml',
  '.yaml',
  '.toml',
  '.html',
  '.xml',
  '.css',
  '.svg',
]);

const NON_MEANINGFUL_BASENAMES = new Set(['pnpm-lock.yaml']);

/** Files that are meaningful but should not receive generated/updated headers. */
export const HEADER_EXEMPT_FILES = new Set([
  'CHANGELOG.md',
  'AGENTS.md',
  'docs/user-guide.md',
  '.aider.conf.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/copilot-instructions.md',
  // Machine-generated JSON registry — comment-unsafe format; sidecar-only per ADR-0009.
  // The .githooks/ prefix would otherwise trigger hash-style headers on JSON (TPL-256).
  '.githooks/.fingerprints.json',
]);

export const HEADER_EXEMPT_PREFIXES = [
  '.agents/',
  'docs/analysis/session-summaries/',
  '.claude/agent-memory/',
];

/** File patterns exempt from header check (glob-style suffixes). */
export const HEADER_EXEMPT_SUFFIXES = ['.help.md'];

/**
 * Operational (non-example) claim files in .claims/. These are short-lived
 * coordination artefacts produced by `claim-check --acquire` / `--create`,
 * pruned by `claim-check --prune`, and not part of the documented surface.
 * Also covers transient worktree-lifecycle markers produced by coa-worktree
 * (e.g. teardown-stale-marker-*.json). Tracked example claims
 * (`clm-ex0001..3.json`, see EXAMPLE_CLAIM_ID_PREFIX in
 * scripts/checks/claim-check.mjs) are documentation and DO get sidecars.
 */
const OPERATIONAL_CLAIM_PATTERN =
  /^\.claims\/(clm-(?!ex)|teardown-stale-marker-)[^/]+\.json$/;

export function isHeaderExempt(file) {
  const posix = file.replaceAll('\\', '/');
  if (HEADER_EXEMPT_FILES.has(posix)) return true;
  if (HEADER_EXEMPT_PREFIXES.some((prefix) => posix.startsWith(prefix))) return true;
  if (HEADER_EXEMPT_SUFFIXES.some((suffix) => posix.endsWith(suffix))) return true;
  if (OPERATIONAL_CLAIM_PATTERN.test(posix)) return true;
  return false;
}

export function commentStyle(file, currentText = '') {
  const posix = toPosix(file);
  const ext = path.extname(posix).toLowerCase();

  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css'].includes(ext)) {
    return 'block';
  }

  if (['.py', '.sh', '.bash', '.zsh', '.feature', '.yml', '.yaml', '.toml'].includes(ext)) {
    return 'hash';
  }

  if (['.md', '.html', '.xml'].includes(ext)) {
    return 'html';
  }

  // Comment-unsafe formats (ADR-0009): sidecar-only, no inline header.
  // This check must come before path-based checks so JSON files inside
  // .githooks/ or other directories still get sidecar treatment.
  if (['.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
    return 'sidecar';
  }

  if (posix.startsWith('.githooks/')) return 'hash';
  if (posix === '.gitignore') return 'hash';
  if (!ext && String(currentText).startsWith('#!')) return 'hash';

  return 'sidecar';
}

export function sidecarPath(file) {
  return `${file}.header.md`;
}

export function isSidecarHeader(file) {
  return file.endsWith('.header.md');
}

export function isMeaningfulFile(file) {
  const posix = toPosix(file);
  const ext = path.extname(posix).toLowerCase();
  const base = path.basename(posix);

  if (isSidecarHeader(posix)) return false;
  if (NON_MEANINGFUL_BASENAMES.has(base)) return false;
  if (posix.includes('/_generated/') || posix.includes('/dist/') || posix.includes('/coverage/')) {
    return false;
  }

  if (posix.startsWith('.githooks/')) return true;
  if (posix === '.gitignore') return true;
  if (posix === 'VERSION') return true;
  if (!ext) return false;

  return SUPPORTED_EXTENSIONS.has(ext);
}

export async function collectRepoFiles() {
  // Use git ls-files to respect .gitignore (avoids scanning untracked local docs)
  const tracked = gitLines(['ls-files', '--cached']);
  const untracked = gitLines(['ls-files', '--others', '--exclude-standard']);
  const gitFiles = [...tracked, ...untracked];

  if (gitFiles.length > 0) {
    return gitFiles.filter(isMeaningfulFile).sort();
  }

  // Fallback: walk filesystem if git is unavailable
  const nested = (await Promise.all(ROOT_SCAN_DIRS.map(walk))).flat();
  const rootFiles = ROOT_SCAN_FILES.filter((file) => fileExists(file));
  return [...new Set([...nested, ...rootFiles].map(toPosix))].filter(isMeaningfulFile).sort();
}

/**
 * Enumerate only tracked (committed) and staged files — no untracked working-tree files.
 *
 * header-check uses this instead of collectRepoFiles() so it never false-positives on
 * untracked files that are intentionally outside header discipline (e.g. local memory state,
 * generated artifacts not yet staged). Newly `git add`-ed files appear in `--cached` before
 * their first commit, so staged-but-never-committed files are still validated. (TPL-253)
 */
export async function collectTrackedFiles() {
  const tracked = gitLines(['ls-files', '--cached']);
  if (tracked.length > 0) return tracked.filter(isMeaningfulFile).sort();

  // Fallback: walk filesystem if git is unavailable
  const nested = (await Promise.all(ROOT_SCAN_DIRS.map(walk))).flat();
  const rootFiles = ROOT_SCAN_FILES.filter((file) => fileExists(file));
  return [...new Set([...nested, ...rootFiles].map(toPosix))].filter(isMeaningfulFile).sort();
}

/**
 * Like changedRepoFiles() but scoped to tracked/staged files only — no `--others`.
 * Used by header-check --changed mode to avoid false-positives on untracked files. (TPL-253)
 */
export async function collectChangedTrackedFiles() {
  const files = new Set([
    ...gitLines(['diff', '--name-only', '--cached']),
    ...gitLines(['diff', '--name-only']),
  ]);
  const filtered = [...files].filter(isMeaningfulFile);
  return filtered.length ? filtered.sort() : collectTrackedFiles();
}

function gitLines(args) {
  const out = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
  });

  if (out.status !== 0) return [];

  return String(out.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix);
}

export async function changedRepoFiles() {
  const files = new Set([
    ...gitLines(['diff', '--name-only', '--cached']),
    ...gitLines(['diff', '--name-only']),
    ...gitLines(['ls-files', '--others', '--exclude-standard']),
  ]);

  const filtered = [...files].filter(isMeaningfulFile);
  return filtered.length ? filtered.sort() : collectRepoFiles();
}

/**
 * Files differing from <ref> in the working tree (added/modified/renamed).
 *
 * Unlike `changedRepoFiles()`, this does NOT silently fall back to the entire
 * repo when the diff is empty — empty input means empty work. That is the
 * disk-wear safety the pre-commit Phase 5 fallback relies on.
 *
 * `runGit` is injectable so unit tests can drive the helper without spawning
 * a real git process.
 *
 * @param {string} ref - git ref to diff against (e.g. "HEAD")
 * @param {object} [opts]
 * @param {(args: string[]) => string[]} [opts.runGit] - injectable git runner returning lines
 * @returns {Promise<string[]>} sorted list of meaningful files differing from `<ref>`
 */
export async function changedFilesSinceRef(ref, { runGit = gitLines } = {}) {
  if (!ref || typeof ref !== 'string') {
    throw new Error('changedFilesSinceRef requires a non-empty ref');
  }
  const out = runGit(['diff', '--name-only', '--diff-filter=AMR', ref]);
  const filtered = out.filter(isMeaningfulFile);
  return filtered.sort();
}

// ---------------------------------------------------------------------------
// Preamble parsing
// ---------------------------------------------------------------------------

export function shebangPrefix(text) {
  if (!text.startsWith('#!')) return { shebang: '', rest: text };
  const nl = text.indexOf('\n');
  if (nl < 0) return { shebang: `${text}\n`, rest: '' };
  return { shebang: text.slice(0, nl + 1), rest: text.slice(nl + 1) };
}

export function markdownFrontmatterPrefix(text) {
  if (!text.startsWith('---\n')) return { frontmatter: '', rest: text };
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return { frontmatter: '', rest: text };
  const closing = end + '\n---\n'.length;
  return {
    frontmatter: text.slice(0, closing),
    rest: text.slice(closing),
  };
}

export function splitCanonicalPreamble(file, text) {
  const style = commentStyle(file, text);
  const { shebang, rest: afterShebang } = shebangPrefix(text);
  if (style === 'html' && path.extname(file).toLowerCase() === '.md') {
    const { frontmatter, rest } = markdownFrontmatterPrefix(afterShebang);
    return { shebang, frontmatter, rest, style };
  }
  return { shebang, frontmatter: '', rest: afterShebang, style };
}

// ---------------------------------------------------------------------------
// Header regex & removal
// ---------------------------------------------------------------------------

function countRegexMatches(text, regexFactory) {
  return [...String(text).matchAll(regexFactory())].length;
}

export function structuredHeaderCountForStyle(style, text) {
  const [structuredRe] = regexSetForStyle(style === 'sidecar' ? 'html' : style);
  return countRegexMatches(text, () => new RegExp(structuredRe.source, structuredRe.flags));
}

export function legacyHeaderCountForStyle(style, text) {
  const [, legacyRe] = regexSetForStyle(style === 'sidecar' ? 'html' : style);
  return countRegexMatches(text, () => new RegExp(legacyRe.source, legacyRe.flags));
}

function blockStructuredRegex() {
  return /\/\*\s*@HEADER-START[\s\S]*?HEADER-END\s*\*\/\s*\n*/g;
}

function blockLegacyRegex() {
  return /\/\*\s*@PROJECT-TEMPLATE-HEADER-START[\s\S]*?@PROJECT-TEMPLATE-HEADER-END\s*\*\/\s*\n*/g;
}

function htmlStructuredRegex() {
  return /<!--\s*@HEADER-START[\s\S]*?HEADER-END\s*-->\s*\n*/g;
}

function htmlLegacyRegex() {
  return /<!--\s*@PROJECT-TEMPLATE-HEADER-START[\s\S]*?@PROJECT-TEMPLATE-HEADER-END\s*-->\s*\n*/g;
}

function hashStructuredRegex() {
  return /(?:^|\n)#\s*@HEADER-START[\s\S]*?#\s*HEADER-END\s*(?:\n|$)/g;
}

function hashLegacyRegex() {
  return /(?:^|\n)#\s*@PROJECT-TEMPLATE-HEADER-START[\s\S]*?#\s*@PROJECT-TEMPLATE-HEADER-END\s*(?:\n|$)/g;
}

function regexSetForStyle(style) {
  if (style === 'block') return [blockStructuredRegex(), blockLegacyRegex()];
  if (style === 'html') return [htmlStructuredRegex(), htmlLegacyRegex()];
  return [hashStructuredRegex(), hashLegacyRegex()];
}

export function removeHeaderBlocks(file, text) {
  const style = commentStyle(file, text);
  const effectiveStyle = style === 'sidecar' ? 'html' : style;
  const [structuredRe, legacyRe] = regexSetForStyle(effectiveStyle);
  let next = String(text);
  // Hash-style regex consumes the \n before the header via (?:^|\n).
  // Replace with \n to preserve the line boundary; the final ^\s+ strip
  // handles the edge case where the header was at the start of the file.
  const replacement = effectiveStyle === 'hash' ? '\n' : '';
  next = next.replace(structuredRe, replacement);
  next = next.replace(legacyRe, replacement);
  return next.replace(/^\s+/, '');
}

// ---------------------------------------------------------------------------
// Header extraction & detection
// ---------------------------------------------------------------------------

function extractByRegex(text, regex) {
  const match = String(text).match(regex);
  return match ? match[0].trimEnd() : null;
}

export function extractInlineHeader(file, text) {
  const style = commentStyle(file, text);
  if (style === 'sidecar') return null;
  if (style === 'block') {
    return extractByRegex(text, /\/\*\s*@HEADER-START[\s\S]*?HEADER-END\s*\*\//);
  }
  if (style === 'html') return extractByRegex(text, /<!--\s*@HEADER-START[\s\S]*?HEADER-END\s*-->/);
  return extractByRegex(text, /#\s*@HEADER-START[\s\S]*?#\s*HEADER-END/);
}

export function hasStructuredInlineHeader(file, text) {
  const style = commentStyle(file, text);
  return structuredHeaderCountForStyle(style, text) > 0 && Boolean(extractInlineHeader(file, text));
}

export function hasLegacyTemplateHeader(fileOrText, maybeText = null) {
  const file = maybeText === null ? '' : fileOrText;
  const text = maybeText === null ? fileOrText : maybeText;
  const style = maybeText === null ? 'html' : commentStyle(file, text);
  return legacyHeaderCountForStyle(style, text) > 0;
}

export function stripCommentSyntax(style, headerText) {
  const lines = headerText.split(/\r?\n/);
  return lines
    .map((line) => {
      if (style === 'block') {
        return line
          .replace(/^\/\*\s?/, '')
          .replace(/^\*\s?/, '')
          .replace(/\s?\*\/$/, '');
      }
      if (style === 'hash') return line.replace(/^#\s?/, '');
      if (style === 'html') {
        return line.replace(/^<!--\s?/, '').replace(/\s?-->$/, '');
      }
      return line;
    })
    .join('\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Header parsing
// ---------------------------------------------------------------------------

export function parseStructuredHeaderText(file, text) {
  const style = commentStyle(file, text);
  const headerText =
    style === 'sidecar'
      ? extractByRegex(text, /<!--\s*@HEADER-START[\s\S]*?HEADER-END\s*-->/)
      : extractInlineHeader(file, text);
  if (!headerText) return null;

  const raw = stripCommentSyntax(style === 'sidecar' ? 'html' : style, headerText);
  const lines = raw.split(/\r?\n/).map((line) => line.trimEnd());

  if (!lines[0]?.startsWith(HEADER_START)) return null;

  const versionLine = lines.find((line) => line.startsWith('version ')) || '';
  const pathLine = lines.find((line) => line.startsWith('path: ')) || '';
  const purposeLine = lines.find((line) => line.startsWith('Purpose: ')) || '';

  const changelogStart = lines.indexOf(CHANGELOG_BEGIN);
  const changelogEnd = lines.indexOf(CHANGELOG_END);
  const fileinfoStart = lines.indexOf(FILEINFO_BEGIN);
  const fileinfoEnd = lines.indexOf(FILEINFO_END);

  const changelog = {};
  if (changelogStart >= 0 && changelogEnd > changelogStart) {
    let current = null;
    for (const line of lines.slice(changelogStart + 1, changelogEnd)) {
      const section = CHANGELOG_SECTIONS.find((name) => line === `${name}:`);
      if (section) {
        current = section;
        changelog[current] = [];
        continue;
      }
      if (current && line.trim()) changelog[current].push(line.trim());
    }
  }

  const fileinfo = {};
  if (fileinfoStart >= 0 && fileinfoEnd > fileinfoStart) {
    for (const line of lines.slice(fileinfoStart + 1, fileinfoEnd)) {
      const idx = line.indexOf(':');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      fileinfo[key] = value;
    }
  }

  return {
    versionLine,
    pathLine,
    purposeLine,
    changelog,
    fileinfo,
    raw: headerText,
  };
}

// ---------------------------------------------------------------------------
// Inference & defaults
// ---------------------------------------------------------------------------

function repoKey() {
  return repoFileIdPrefix().replace(/:$/, '');
}

function shortName(file) {
  const base = path.basename(file, path.extname(file));
  return base.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
}

export function inferLayer(file) {
  const posix = toPosix(file);
  if (posix.startsWith('.claude/')) return 'control-plane';
  if (posix.startsWith('scripts/')) return 'tooling';
  if (posix.startsWith('.githooks/')) return 'git-hooks';
  if (posix.startsWith('.vscode/')) return 'editor';
  if (posix.startsWith('docs/')) return 'docs';
  if (posix.startsWith('tests/')) return 'tests';
  if (posix.startsWith('apps/')) return 'app';
  if (posix.startsWith('modules/')) return 'module';
  return 'root';
}

export function inferModulePackage(file) {
  const posix = toPosix(file);
  const parts = posix.split('/');
  if (parts.length <= 1) return 'root';
  return parts.length === 2 ? parts[0] : `${parts[0]}/${parts[1]}`;
}

export function inferPublic(file) {
  const posix = toPosix(file);
  if (posix.startsWith('docs/')) return 'true';
  return 'false';
}

export function inferApi(file) {
  const posix = toPosix(file);
  const ext = path.extname(posix).toLowerCase();

  if (posix.startsWith('.claude/agents/')) return 'Claude subagent prompt';
  if (posix.startsWith('.claude/skills/') && posix.endsWith('/SKILL.md')) return 'Claude skill';
  if (posix.startsWith('scripts/')) return `CLI: node ${posix}`;
  if (posix.startsWith('.githooks/')) return 'Git hook';
  if (posix.startsWith('.vscode/')) return 'Editor config';
  if (ext === '.md') return 'Documentation';
  if (ext === '.json' || posix === 'VERSION') return 'Config data';
  return 'file-local';
}

export function inferHexLayer(file) {
  const posix = toPosix(file);
  if (/\/domain\//.test(posix)) return 'domain';
  if (/\/ports\//.test(posix)) return 'port';
  if (/\/adapters\//.test(posix)) return 'adapter';
  if (/\/application\//.test(posix)) return 'application';
  if (/\/infrastructure\//.test(posix) || /\/di\//.test(posix)) return 'infrastructure';
  // public-api.mjs at module root is the application entry point
  if (/^modules\/[^/]+\/public-api\.[^/]+$/.test(posix)) return 'application';
  return '_none_';
}

export function inferBoundedContext(file) {
  const posix = toPosix(file);
  const match = posix.match(/^modules\/([^/]+)\//);
  return match ? match[1] : '_none_';
}

export function defaultPurpose(file, asSidecar = false) {
  const posix = toPosix(file);

  if (asSidecar) {
    return `Document ${file} because inline comments are unsafe or undesirable.`;
  }
  if (posix.startsWith('scripts/')) {
    return `Implement the ${shortName(posix)} repository script.`;
  }
  if (posix.startsWith('.claude/agents/')) {
    return `Define the ${shortName(posix)} Claude subagent.`;
  }
  if (posix.startsWith('.claude/skills/')) {
    return `Describe the ${shortName(posix)} Claude skill.`;
  }
  if (posix.startsWith('.githooks/')) {
    return `Implement the ${shortName(posix)} repository Git hook.`;
  }
  if (posix.startsWith('docs/')) {
    return `Document ${shortName(posix)} for this repository.`;
  }
  if (posix === '.gitignore') {
    return 'Declare Git ignore rules for local artifacts, dependencies, and generated outputs.';
  }
  if (posix === 'VERSION') {
    return 'Store the repository version string.';
  }

  return `Describe the role of ${shortName(posix)} in this repository.`;
}

function defaultOwns(file, asSidecar = false) {
  if (asSidecar) {
    return `Documentation for ${file} without modifying the comment-sensitive or tool-managed file body.`;
  }
  return '_none_';
}

function defaultNotesForLLM(file, asSidecar = false) {
  if (asSidecar) {
    return `Keep this sidecar aligned with ${file}; do not invent a second sidecar convention.`;
  }
  return '_none_';
}

export function defaultHeaderData(file, { asSidecar = false } = {}) {
  const posix = toPosix(file);

  return {
    version: repoVersion(),
    date: todayIsoDateUTC(),
    path: posix,
    purpose: defaultPurpose(file, asSidecar),
    changelog: Object.fromEntries(CHANGELOG_SECTIONS.map((name) => [name, ['- _none_']])),
    fileinfo: {
      Summary: '_none_',
      FileId: `${repoKey()}:${posix.replace(/\.[^.]+$/, '').replace(/\//g, ':')}`,
      Path: posix,
      Layer: inferLayer(posix),
      'Module/Package': inferModulePackage(posix),
      Public: inferPublic(posix),
      API: inferApi(posix),
      Stability: 'evolving',
      EditPolicy: 'careful',
      Steward: 'shared',
      DependsOn: asSidecar ? file : '_none_',
      Owns: defaultOwns(file, asSidecar),
      Boundaries: '_none_',
      Invariants: '_none_',
      Tests: '_none_',
      Risks: '_none_',
      LinkedDocs: '_none_',
      SpecRefs: '_none_',
      UsmRefs: '_none_',
      Related: '_none_',
      'Security/Privacy': '_none_',
      NotesForLLM: defaultNotesForLLM(file, asSidecar),
      // Architecture metadata
      HexLayer: inferHexLayer(posix),
      PortType: '_none_',
      AdapterType: '_none_',
      BoundedContext: inferBoundedContext(posix),
      AllowedDependencies: '_none_',
      ForbiddenDependencies: '_none_',
      ExternalSystems: '_none_',
    },
  };
}

// ---------------------------------------------------------------------------
// Header rendering
// ---------------------------------------------------------------------------

function lineArray(value) {
  if (!Array.isArray(value) || value.length === 0) return ['- _none_'];
  return value.map((line) => {
    const trimmed = String(line).trim();
    return trimmed.startsWith('- ') ? trimmed : `- ${trimmed || '_none_'}`;
  });
}

export function renderHeaderCore(file, data = {}) {
  const merged = defaultHeaderData(file, data);

  if (data.version) merged.version = data.version;
  if (data.date) merged.date = data.date;
  if (data.path) merged.path = toPosix(data.path);
  if (data.purpose) merged.purpose = data.purpose;

  if (data.changelog) {
    for (const key of CHANGELOG_SECTIONS) {
      if (data.changelog[key]) merged.changelog[key] = lineArray(data.changelog[key]);
    }
  }

  if (data.fileinfo) Object.assign(merged.fileinfo, data.fileinfo);

  const lines = [
    HEADER_START,
    `version ${merged.version} | ${merged.date}`,
    `path: ${merged.path}`,
    `Purpose: ${merged.purpose}`,
    CHANGELOG_BEGIN,
  ];

  for (const section of CHANGELOG_SECTIONS) {
    lines.push(`${section}:`);
    lines.push(...lineArray(merged.changelog[section]));
  }

  lines.push(CHANGELOG_END, FILEINFO_BEGIN);

  for (const field of FILEINFO_FIELDS) {
    lines.push(`${field}: ${merged.fileinfo[field] ?? '_none_'}`);
  }

  lines.push(FILEINFO_END, HEADER_END);
  return lines.join('\n');
}

export function wrapHeader(core, style) {
  if (style === 'block') return `/* ${core} */\n\n`;
  if (style === 'html') return `<!-- ${core} -->\n\n`;
  if (style === 'hash') {
    return `${core
      .split('\n')
      .map((line) => `# ${line}`)
      .join('\n')}\n\n`;
  }
  return '';
}

export function renderInlineHeader(file, data = {}) {
  return wrapHeader(renderHeaderCore(file, data), commentStyle(file));
}

export function renderSidecarHeader(file, data = {}) {
  const sidecar = sidecarPath(file);
  const core = renderHeaderCore(sidecar, {
    asSidecar: true,
    ...data,
    path: sidecar,
    fileinfo: {
      ...(data.fileinfo || {}),
      Path: sidecar,
      DependsOn: file,
    },
  });

  return `<!-- ${core} -->\n\n# ${path.basename(file)} sidecar\n\nSidecarFor: \`${file}\`\n`;
}

// ---------------------------------------------------------------------------
// Header injection & merge
// ---------------------------------------------------------------------------

function normalizedBody(text) {
  return String(text).replace(/^\s+/, '');
}

export function injectInlineHeader(file, currentText, data = {}) {
  const style = commentStyle(file, currentText);
  if (style === 'sidecar') return currentText;

  const stripped = removeHeaderBlocks(file, currentText);
  const { shebang, frontmatter, rest } = splitCanonicalPreamble(file, stripped);
  const header = renderInlineHeader(file, data);
  const body = normalizedBody(rest);

  const frontmatterBlock = frontmatter ? `${frontmatter.replace(/\s*$/, '')}\n\n` : '';
  return `${shebang}${frontmatterBlock}${header}${body}`;
}

export function mergeExistingSemanticData(parsed, fallback) {
  if (!parsed) return fallback;

  const next = JSON.parse(JSON.stringify(fallback));

  if (parsed.purposeLine.startsWith('Purpose: ')) {
    next.purpose = parsed.purposeLine.slice('Purpose: '.length).trim() || next.purpose;
  }

  for (const section of CHANGELOG_SECTIONS) {
    if (parsed.changelog[section]?.length) next.changelog[section] = parsed.changelog[section];
  }

  for (const field of FILEINFO_FIELDS) {
    const value = parsed.fileinfo[field];
    if (value) next.fileinfo[field] = value;
  }

  return next;
}

// ---------------------------------------------------------------------------
// Slim header (ADR-0009: sidecar-first)
// ---------------------------------------------------------------------------

export const SLIM_HEADER_MARKER = '@HEADER';

/**
 * Fields that survive in the slim inline header.
 * Everything else moves to the sparse sidecar.
 */
export const SLIM_INLINE_FIELDS = ['version', 'purpose', 'sidecar', 'layer', 'public', 'edit'];

// --- Slim header regex ---

function blockSlimRegex() {
  return /\/\*\s*@HEADER\s*\n(?:(?!@HEADER-START)[\s\S])*?\*\/\s*\n*/g;
}

function htmlSlimRegex() {
  return /<!--\s*@HEADER\s*\n(?:(?!@HEADER-START)[\s\S])*?-->\s*\n*/g;
}

function hashSlimRegex() {
  return /(?:^|\n)#\s*@HEADER\s*\n(?:#\s*@\w[\s\S]*?)(?=\n(?!#\s*@)|$)\n*/g;
}

function slimRegexForStyle(style) {
  if (style === 'block') return blockSlimRegex();
  if (style === 'html') return htmlSlimRegex();
  return hashSlimRegex();
}

export function hasSlimHeader(file, text) {
  const style = commentStyle(file, text);
  if (style === 'sidecar') return false;
  return slimRegexForStyle(style).test(text);
}

export function removeSlimHeaderBlocks(file, text) {
  const style = commentStyle(file, text);
  if (style === 'sidecar') return text;
  const replacement = style === 'hash' ? '\n' : '';
  return String(text).replace(slimRegexForStyle(style), replacement).replace(/^\s+/, '');
}

// --- Slim header parsing ---

export function parseSlimHeader(file, text) {
  const style = commentStyle(file, text);
  if (style === 'sidecar') return null;

  const regex = slimRegexForStyle(style);
  const match = String(text).match(regex);
  if (!match) return null;

  let raw = match[0];
  // Strip comment syntax
  if (style === 'block') {
    raw = raw.replace(/^\/\*\s*/, '').replace(/\s*\*\/\s*$/, '');
    raw = raw
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, ''))
      .join('\n');
  } else if (style === 'html') {
    raw = raw.replace(/^<!--\s*/, '').replace(/\s*-->\s*$/, '');
  } else {
    raw = raw
      .split('\n')
      .map((l) => l.replace(/^#\s?/, ''))
      .join('\n');
  }

  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const result = {};

  for (const line of lines) {
    const m = line.match(/^@(\w+)\s+(.+)$/);
    if (m) {
      const [, key, value] = m;
      result[key.toLowerCase()] = value;
    }
  }

  // Parse the compound layer line: "@layer module | @hex domain | @ctx task"
  if (result.layer) {
    const parts = result.layer.split('|').map((s) => s.trim());
    result.layer = parts[0];
    for (const part of parts.slice(1)) {
      const pm = part.match(/^@(\w+)\s+(.+)$/);
      if (pm) result[pm[1].toLowerCase()] = pm[2];
    }
  }

  return {
    version: result.version || null,
    purpose: result.purpose || null,
    sidecar: result.sidecar || null,
    layer: result.layer || null,
    hex: result.hex || null,
    ctx: result.ctx || null,
    public: result.public || null,
    edit: result.edit || null,
  };
}

// --- Slim header rendering ---

export function renderSlimHeaderCore(file, data = {}) {
  const posix = toPosix(file);
  const version = data.version || repoVersion();
  const date = data.date || todayIsoDateUTC();
  const purpose = data.purpose || defaultPurpose(file);
  const sidecar = data.sidecar || sidecarPath(posix);
  const layer = data.layer || inferLayer(posix);
  const hex = data.hex || inferHexLayer(posix);
  const ctx = data.ctx || inferBoundedContext(posix);
  const pub = data.public || inferPublic(posix);
  const edit = data.edit || 'careful';

  const layerLine = `${layer} | @hex ${hex} | @ctx ${ctx}`;

  return [
    `${SLIM_HEADER_MARKER}`,
    `@version ${version} | ${date}`,
    `@purpose ${purpose}`,
    `@sidecar ${path.basename(sidecar)}`,
    `@layer ${layerLine}`,
    `@public ${pub}`,
    `@edit ${edit}`,
  ].join('\n');
}

export function wrapSlimHeader(core, style) {
  if (style === 'block') {
    const lines = core.split('\n');
    return `/* ${lines[0]}\n${lines
      .slice(1)
      .map((l) => ` * ${l}`)
      .join('\n')}\n */\n\n`;
  }
  if (style === 'html') {
    return `<!-- ${core} -->\n\n`;
  }
  if (style === 'hash') {
    return `${core
      .split('\n')
      .map((l) => `# ${l}`)
      .join('\n')}\n\n`;
  }
  return '';
}

export function renderSlimInlineHeader(file, data = {}) {
  const style = commentStyle(file);
  if (style === 'sidecar') return '';
  return wrapSlimHeader(renderSlimHeaderCore(file, data), style);
}

export function injectSlimHeader(file, currentText, data = {}) {
  const style = commentStyle(file, currentText);
  if (style === 'sidecar') return currentText;

  // Remove both old heavy headers and existing slim headers
  let stripped = removeHeaderBlocks(file, currentText);
  stripped = removeSlimHeaderBlocks(file, stripped);
  const { shebang, frontmatter, rest } = splitCanonicalPreamble(file, stripped);
  const header = renderSlimInlineHeader(file, data);
  const body = normalizedBody(rest);

  const frontmatterBlock = frontmatter ? `${frontmatter.replace(/\s*$/, '')}\n\n` : '';
  return `${shebang}${frontmatterBlock}${header}${body}`;
}

// --- Sparse sidecar rendering (ADR-0009) ---

/**
 * YAML frontmatter fields for the sparse sidecar.
 * Machine-parseable metadata goes here.
 */
const SIDECAR_YAML_FIELDS = [
  'fileId',
  'module',
  'stability',
  'steward',
  'api',
  'hexLayer',
  'portType',
  'adapterType',
  'boundedContext',
];

/**
 * Narrative fields for the sparse sidecar.
 * All now live in YAML frontmatter (no longer in markdown body).
 */
const SIDECAR_NARRATIVE_FIELDS = [
  'Summary',
  'DependsOn',
  'Owns',
  'Boundaries',
  'Invariants',
  'Tests',
  'Risks',
  'LinkedDocs',
  'SpecRefs',
  'UsmRefs',
  'Related',
  'Security/Privacy',
  'NotesForLLM',
  'AllowedDependencies',
  'ForbiddenDependencies',
  'ExternalSystems',
];

/**
 * Map narrative field names to camelCase YAML keys.
 */
const NARRATIVE_TO_YAML_MAP = {
  Summary: 'summary',
  Owns: 'owns',
  Boundaries: 'boundaries',
  Invariants: 'invariants',
  Risks: 'risks',
  'Security/Privacy': 'securityPrivacy',
  NotesForLLM: 'notesForLLM',
  ExternalSystems: 'externalSystems',
};

/**
 * Narrative fields that are semicolon-separated lists → YAML arrays.
 */
const NARRATIVE_LIST_TO_YAML_MAP = {
  Tests: 'tests',
  LinkedDocs: 'linkedDocs',
  SpecRefs: 'specRefs',
  UsmRefs: 'usmRefs',
  Related: 'related',
  AllowedDependencies: 'allowedDependencies',
  ForbiddenDependencies: 'forbiddenDependencies',
};

const FILEINFO_TO_YAML_MAP = {
  FileId: 'fileId',
  'Module/Package': 'module',
  Stability: 'stability',
  Steward: 'steward',
  API: 'api',
  HexLayer: 'hexLayer',
  PortType: 'portType',
  AdapterType: 'adapterType',
  BoundedContext: 'boundedContext',
};

/** Quote a YAML string value if it contains characters that need escaping. */
function yamlQuote(val) {
  const s = val.trim();
  // Safe bare strings: no special leading chars, no `: `, no ` #`, not a YAML keyword
  if (
    !/^[{['"*&!|>%@`]/.test(s) &&
    !s.includes(': ') &&
    !s.includes(' #') &&
    !/^(true|false|yes|no|null|~)$/i.test(s)
  ) {
    return s;
  }
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function isNone(v) {
  return !v || v === '_none_' || v === 'false' || v === '_none_\n';
}

function isNoneNarrative(v) {
  return !v || v === '_none_';
}

export function renderSparseSidecar(file, data = {}) {
  const fileinfo = data.fileinfo || {};
  // Changelog removed from sidecars — CHANGELOG.md via changelog-sync.mjs is the single source.

  // --- YAML frontmatter (only non-empty fields) ---
  const yamlLines = [];
  for (const [fiField, yamlKey] of Object.entries(FILEINFO_TO_YAML_MAP)) {
    const val = fileinfo[fiField];
    if (val && !isNone(val)) {
      yamlLines.push(`${yamlKey}: ${yamlQuote(val)}`);
    }
  }

  // DependsOn as yaml array
  const deps = fileinfo.DependsOn;
  if (deps && !isNoneNarrative(deps)) {
    const items = deps
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 1) {
      yamlLines.push(`dependsOn: ${items[0]}`);
    } else if (items.length > 1) {
      yamlLines.push('dependsOn:');
      for (const item of items) yamlLines.push(`  - ${item}`);
    }
  }

  // --- Narrative string fields as YAML ---
  for (const [fiField, yamlKey] of Object.entries(NARRATIVE_TO_YAML_MAP)) {
    const val = fileinfo[fiField];
    if (val && !isNoneNarrative(val)) {
      yamlLines.push(`${yamlKey}: ${yamlQuote(val)}`);
    }
  }

  // --- Narrative list fields as YAML arrays ---
  for (const [fiField, yamlKey] of Object.entries(NARRATIVE_LIST_TO_YAML_MAP)) {
    const val = fileinfo[fiField];
    if (val && !isNoneNarrative(val)) {
      const items = val
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length === 1) {
        yamlLines.push(`${yamlKey}: ${yamlQuote(items[0])}`);
      } else if (items.length > 1) {
        yamlLines.push(`${yamlKey}:`);
        for (const item of items) yamlLines.push(`  - ${yamlQuote(item)}`);
      }
    }
  }

  // Changelog removed from sidecars — CHANGELOG.md via changelog-sync.mjs is the single source.

  const yamlBlock = yamlLines.length ? `---\n${yamlLines.join('\n')}\n---\n` : '---\n---\n';

  // Markdown body: just the filename heading (decorative, not parsed by tools)
  return `${yamlBlock}\n# ${path.basename(file)}\n`;
}

/**
 * Parse an existing sparse sidecar (YAML frontmatter + optional markdown body)
 * back into { fileinfo, changelog } suitable for renderSparseSidecar().
 */
export function parseSparseSidecar(file, text) {
  if (!text || !text.startsWith('---\n')) return null;

  const endIdx = text.indexOf('\n---', 4);
  if (endIdx < 0) return null;

  const yamlBlock = text.slice(4, endIdx);
  const body = text.slice(endIdx + 4);

  // Build reverse maps: yamlKey → fiField
  const reverseYaml = {};
  for (const [fi, yaml] of Object.entries(FILEINFO_TO_YAML_MAP)) reverseYaml[yaml] = fi;
  const reverseNarrative = {};
  for (const [fi, yaml] of Object.entries(NARRATIVE_TO_YAML_MAP)) reverseNarrative[yaml] = fi;
  const reverseList = {};
  for (const [fi, yaml] of Object.entries(NARRATIVE_LIST_TO_YAML_MAP)) reverseList[yaml] = fi;

  const fileinfo = {};
  const changelog = {};
  let inChangelog = false;
  let clSection = null;
  let inArray = null; // current yaml array key
  let arrayTarget = null; // fi field for current array

  for (const line of yamlBlock.split('\n')) {
    // Changelog nested YAML
    if (line === 'changelog:') {
      inChangelog = true;
      inArray = null;
      continue;
    }
    if (inChangelog) {
      const secMatch = line.match(/^\s{2}(\w+):$/);
      if (secMatch) {
        clSection = secMatch[1].charAt(0).toUpperCase() + secMatch[1].slice(1);
        changelog[clSection] = changelog[clSection] || [];
        continue;
      }
      const itemMatch = line.match(/^\s{4}-\s+"(.*)"\s*$/);
      if (itemMatch && clSection) {
        changelog[clSection].push(`- ${itemMatch[1].replace(/\\"/g, '"')}`);
        continue;
      }
      // End of changelog block if not indented
      if (!/^\s/.test(line) && line.trim()) {
        inChangelog = false;
      } else continue;
    }

    // YAML array items (dependsOn, tests, related, etc.)
    const arrItem = line.match(/^\s{2}-\s+(.+)$/);
    if (arrItem && inArray) {
      const val = arrItem[1].replace(/^"(.*)"$/, '$1');
      if (arrayTarget) {
        fileinfo[arrayTarget] = fileinfo[arrayTarget] ? `${fileinfo[arrayTarget]}; ${val}` : val;
      }
      continue;
    }

    // Top-level key: value
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!kvMatch) {
      inArray = null;
      continue;
    }
    const [, key, rawVal] = kvMatch;
    const val = rawVal.replace(/^"(.*)"$/, '$1').trim();

    // Check if this starts an array (no value after colon)
    if (!val) {
      inArray = key;
      if (key === 'dependsOn') {
        arrayTarget = 'DependsOn';
      } else if (reverseList[key]) {
        arrayTarget = reverseList[key];
      } else {
        arrayTarget = null;
      }
      continue;
    }

    inArray = null;

    // Map to fileinfo field
    if (reverseYaml[key]) {
      fileinfo[reverseYaml[key]] = val;
    } else if (key === 'dependsOn') {
      fileinfo.DependsOn = val;
    } else if (reverseNarrative[key]) {
      fileinfo[reverseNarrative[key]] = val;
    } else if (reverseList[key]) {
      fileinfo[reverseList[key]] = val;
    }
  }

  // Parse markdown body for old-format narrative fields (FieldName: value)
  for (const line of body.split('\n')) {
    const bodyKv = line.match(/^(\w[\w/]*?):\s+(.+)$/);
    if (!bodyKv) continue;
    const [, field, bVal] = bodyKv;
    // Only pick up known narrative fields not already in YAML
    if (SIDECAR_NARRATIVE_FIELDS.includes(field) && !fileinfo[field]) {
      fileinfo[field] = bVal.trim();
    }
  }

  return { fileinfo, changelog };
}

export {
  SIDECAR_YAML_FIELDS,
  SIDECAR_NARRATIVE_FIELDS,
  FILEINFO_TO_YAML_MAP,
  NARRATIVE_TO_YAML_MAP,
  NARRATIVE_LIST_TO_YAML_MAP,
  yamlQuote,
};

// ---------------------------------------------------------------------------
// Header validation
// ---------------------------------------------------------------------------

function startsWithCanonicalInlineHeader(file, text) {
  const { rest, style } = splitCanonicalPreamble(file, text);
  const remainder = rest.replace(/^\s+/, '');
  if (style === 'block') return remainder.startsWith('/* @HEADER-START');
  if (style === 'html') return remainder.startsWith('<!-- @HEADER-START');
  return remainder.startsWith('# @HEADER-START');
}

export function validateHeader(file, text, { isSidecar = false } = {}) {
  const errors = [];
  const warnings = [];
  const parsed = parseStructuredHeaderText(file, text);

  if (!parsed) {
    errors.push(`${file}: missing structured header v2`);
    return { errors, warnings, parsed: null };
  }

  const style = isSidecar ? 'sidecar' : commentStyle(file, text);
  const structuredCount = structuredHeaderCountForStyle(style, text);
  const legacyCount = legacyHeaderCountForStyle(style, text);

  if (structuredCount !== 1) {
    errors.push(`${file}: expected exactly one structured header, found ${structuredCount}`);
  }

  if (legacyCount > 0) {
    errors.push(`${file}: legacy @PROJECT-TEMPLATE-HEADER markers must be removed`);
  }

  if (!isSidecar && !startsWithCanonicalInlineHeader(file, text)) {
    errors.push(`${file}: header is not in canonical position`);
  }

  if (isSidecar && !String(text).startsWith('<!-- @HEADER-START')) {
    errors.push(`${file}: sidecar header must start the file`);
  }

  const { fileinfo } = parsed;

  if (parsed.pathLine !== `path: ${toPosix(file)}`) {
    errors.push(`${file}: path line must be exactly \`path: ${toPosix(file)}\``);
  }

  if (!/^version\s+\S+\s+\|\s+\d{4}-\d{2}-\d{2}$/.test(parsed.versionLine)) {
    errors.push(`${file}: invalid version line`);
  }

  if (!parsed.purposeLine.startsWith('Purpose: ')) {
    errors.push(`${file}: missing Purpose line`);
  }

  for (const section of CHANGELOG_SECTIONS) {
    if (!parsed.changelog[section]) errors.push(`${file}: missing changelog section ${section}`);
  }

  for (const field of FILEINFO_FIELDS) {
    if (!(field in fileinfo)) errors.push(`${file}: missing FILEINFO field ${field}`);
  }

  if (fileinfo.Path && fileinfo.Path !== toPosix(file)) {
    errors.push(`${file}: FILEINFO Path must equal ${toPosix(file)}`);
  }

  if (!fileinfo.FileId || !String(fileinfo.FileId).startsWith(REPO_FILEID_PREFIX)) {
    errors.push(`${file}: FileId must start with ${REPO_FILEID_PREFIX}`);
  }

  if (fileinfo.EditPolicy && !EDIT_POLICY_VALUES.has(fileinfo.EditPolicy)) {
    errors.push(`${file}: invalid EditPolicy ${fileinfo.EditPolicy}`);
  }

  if (fileinfo.Steward && !STEWARD_VALUES.has(fileinfo.Steward)) {
    errors.push(`${file}: invalid Steward ${fileinfo.Steward}`);
  }

  if (fileinfo.HexLayer && !HEX_LAYER_VALUES.has(fileinfo.HexLayer)) {
    errors.push(`${file}: invalid HexLayer ${fileinfo.HexLayer}`);
  }

  if (fileinfo.PortType && !PORT_TYPE_VALUES.has(fileinfo.PortType)) {
    errors.push(`${file}: invalid PortType ${fileinfo.PortType}`);
  }

  if (fileinfo.AdapterType && !ADAPTER_TYPE_VALUES.has(fileinfo.AdapterType)) {
    errors.push(`${file}: invalid AdapterType ${fileinfo.AdapterType}`);
  }

  const placeholderErrors = [
    [parsed.purposeLine, /TODO|replace with/i, 'Purpose is still placeholder text'],
    [fileinfo.Owns, /^_none_$/i, 'Owns must be filled semantically'],
    [fileinfo.Boundaries, /^_none_$/i, 'Boundaries must be filled semantically'],
    [fileinfo.Invariants, /^_none_$/i, 'Invariants must be filled semantically'],
    [fileinfo.NotesForLLM, /^_none_$/i, 'NotesForLLM must be filled semantically'],
  ];

  for (const [value, pattern, message] of placeholderErrors) {
    if (value && pattern.test(value)) errors.push(`${file}: ${message}`);
  }

  if (isSidecar && !file.endsWith('.header.md')) {
    errors.push(`${file}: sidecar must end with .header.md`);
  }

  if (fileinfo.Summary === '_none_') warnings.push(`${file}: Summary field is still _none_`);
  const isDocFile = file.endsWith('.md');
  const isTestFile = file.startsWith('tests/') || file.includes('.test.');
  const isMemoryFile = file.includes('agent-memory/');
  // Tests: _none_ is expected for doc and memory files; suppress warning
  if (fileinfo.Tests === '_none_' && !isDocFile && !isMemoryFile) {
    warnings.push(`${file}: Tests field is still _none_`);
  }
  // Risks: _none_ is expected for test, doc, and memory files; suppress warning
  if (fileinfo.Risks === '_none_' && !isTestFile && !isDocFile && !isMemoryFile) {
    warnings.push(`${file}: Risks field is still _none_`);
  }

  return { errors, warnings, parsed };
}
