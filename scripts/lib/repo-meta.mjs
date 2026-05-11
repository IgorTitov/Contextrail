/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Repository identity and version utilities shared across repository scripts.
 * @sidecar repo-meta.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, fileExists } from './fs-helpers.mjs';

let _repoPkgCache;

function readRepoPackage() {
  if (_repoPkgCache) return _repoPkgCache;

  if (fileExists('package.json')) {
    try {
      _repoPkgCache = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      return _repoPkgCache;
    } catch {
      // ignore
    }
  }

  _repoPkgCache = {};
  return _repoPkgCache;
}

function normalizePrefixValue(value) {
  return String(value || '')
    .trim()
    .replace(/:+$/g, '');
}

export function repoFileIdPrefix() {
  const pkg = readRepoPackage();
  const raw = normalizePrefixValue(pkg.projectPrefix || pkg.name || 'repo');
  return `${raw || 'repo'}:`;
}

export function allowedFileIdPrefixes() {
  const pkg = readRepoPackage();
  const values = [repoFileIdPrefix()];

  for (const alias of Array.isArray(pkg.projectPrefixAliases) ? pkg.projectPrefixAliases : []) {
    const normalized = normalizePrefixValue(alias);
    if (normalized) values.push(`${normalized}:`);
  }

  return [...new Set(values)];
}

export const REPO_FILEID_PREFIX = repoFileIdPrefix();

export function repoVersion() {
  if (fileExists('VERSION')) {
    const text = readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
    if (text) return text;
  }

  if (fileExists('package.json')) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      if (pkg.version) return String(pkg.version);
    } catch {
      // ignore
    }
  }

  return '0.0.0';
}

export function headerStampVersion() {
  return repoVersion();
}
