/* @HEADER
 * @version 0.7.97 | 2026-05-05
 * @purpose Pure filesystem and path utilities shared across repository scripts.
 * @sidecar fs-helpers.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = process.cwd();

/**
 * Resolve the main repository root even when running from a linked git worktree.
 * `git rev-parse --git-common-dir` returns the shared .git dir (absolute in
 * linked worktrees, relative ".git" in the main repo). dirname strips ".git".
 * Falls back to worktreeRoot when git is unavailable or the directory is not
 * a git repo (e.g. tmpdir test fixtures — they resolve correctly as well since
 * a git-init'd fixture returns its own root).
 */
export function resolveMainRepoRoot(worktreeRoot = ROOT) {
  try {
    const r = spawnSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: worktreeRoot,
      encoding: 'utf8',
    });
    const commonDir = (r.stdout || '').trim();
    if (!commonDir) return worktreeRoot;
    const abs = path.isAbsolute(commonDir)
      ? commonDir
      : path.join(worktreeRoot, commonDir);
    // path.resolve normalises forward/back slashes on Windows so callers can
    // use strict equality regardless of whether git returned a POSIX path.
    return path.resolve(path.dirname(abs));
  } catch {
    return worktreeRoot;
  }
}

export const IGNORE = new Set([
  '.git',
  '.nx',
  '.backups',
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.idea',
]);

export function toPosix(filePath) {
  return String(filePath).replaceAll('\\', '/');
}

export async function walk(dir) {
  const abs = path.join(ROOT, dir);
  let entries;
  try {
    entries = await readdir(abs, { withFileTypes: true });
  } catch {
    return [];
  }

  const out = [];
  for (const entry of entries) {
    if (IGNORE.has(entry.name)) continue;
    const rel = toPosix(path.join(dir, entry.name));
    if (entry.isDirectory()) {
      out.push(...(await walk(rel)));
    } else {
      out.push(rel);
    }
  }
  return out;
}

export function fileExists(file) {
  return existsSync(path.join(ROOT, file));
}

export async function readText(file) {
  return readFile(path.join(ROOT, file), 'utf8');
}

export async function writeText(file, content) {
  const abs = path.join(ROOT, file);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
}

export async function ensureWriteIfChanged(file, content) {
  const current = fileExists(file) ? await readText(file) : null;
  if (current === content) return false;
  await writeText(file, content);
  return true;
}
