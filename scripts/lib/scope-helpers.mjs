/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Resolve --scope=<prefixes> into a file/directory filter with module neighborhood expansion.
 * @sidecar scope-helpers.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFileSync, readdirSync } from 'node:fs';
import { toPosix } from './fs-helpers.mjs';

const TEST_ROOTS = ['tests/unit', 'tests/bdd', 'tests/contract', 'tests/integration'];

/**
 * Resolve --scope=<prefixes> into a file filter.
 * @param {string|undefined} scopeArg - comma-separated dir prefixes
 * @returns {{ filter: (path: string) => boolean, prefixes: string[], isScoped: boolean }}
 */
export function resolveScope(scopeArg) {
  if (!scopeArg || scopeArg === true) {
    return { filter: () => true, prefixes: [], isScoped: false };
  }

  const rawPrefixes = String(scopeArg)
    .split(',')
    .map((p) => toPosix(p.trim()).replace(/\/$/, ''));
  const allPrefixes = new Set(rawPrefixes);

  for (const prefix of rawPrefixes) {
    const match = prefix.match(/^modules\/([^/]+)$/);
    if (!match) continue;
    const modName = match[1];

    // Forward deps from manifest
    try {
      const manifest = JSON.parse(readFileSync(`modules/${modName}/manifest.json`, 'utf8'));
      const deps = manifest?.dependencies?.modules || [];
      for (const dep of deps) allPrefixes.add(`modules/${dep}`);
    } catch {
      /* no manifest */
    }

    // Reverse deps: scan all module manifests
    try {
      for (const dir of readdirSync('modules')) {
        if (dir === modName) continue;
        try {
          const m = JSON.parse(readFileSync(`modules/${dir}/manifest.json`, 'utf8'));
          if ((m?.dependencies?.modules || []).includes(modName)) {
            allPrefixes.add(`modules/${dir}`);
          }
        } catch {
          /* skip */
        }
      }
    } catch {
      /* no modules dir */
    }

    // Corresponding test dirs and file-named tests
    for (const testRoot of TEST_ROOTS) {
      allPrefixes.add(`${testRoot}/${modName}`);
    }
  }

  const prefixArray = [...allPrefixes];

  function filter(filePath) {
    const posix = toPosix(filePath);
    return prefixArray.some((p) => posix === p || posix.startsWith(p + '/'));
  }

  return { filter, prefixes: prefixArray, isScoped: true };
}
