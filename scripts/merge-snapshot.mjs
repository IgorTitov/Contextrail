/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Generate a full merged text snapshot of the repository into .backups for sharing and review
 * @sidecar merge-snapshot.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import fs from 'node:fs/promises';
import path from 'node:path';

function normRel(p) {
  return p.split(path.sep).join('/');
}

function isIgnoredSubtree(rel) {
  const p = rel.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const segs = p.split('/').filter(Boolean);
  const ignore = new Set([
    '.git',
    'node_modules',
    '.nx',
    '.turbo',
    'dist',
    'build',
    'coverage',
    '.backups',
    'playwright-report',
    'test-results',
    '.vite',
  ]);
  return segs.some((s) => ignore.has(s));
}

function shouldSkipContent(rel) {
  const p = rel.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const base = p.split('/').filter(Boolean).at(-1) || '';
  if (isIgnoredSubtree(p)) return true;
  if (p.endsWith('.zip')) return true;
  if (/^merge-.*\(.+\)\.txt$/i.test(base)) return true;
  return false;
}

function isBinaryByExt(rel) {
  return /\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|7z|mp4|mov|mp3|wav|ttf|otf|woff2?)$/i.test(rel);
}

async function walk(dir, baseDir, outFiles, outDirs) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = normRel(path.relative(baseDir, abs));

    if (entry.isDirectory()) {
      if (rel) {
        if (isIgnoredSubtree(rel)) {
          outDirs.push(`${rel} (ignored subtree)`);
          continue;
        }
        outDirs.push(rel);
      }
      await walk(abs, baseDir, outFiles, outDirs);
      continue;
    }

    outFiles.push({ abs, rel });
  }
}

async function readPkg(cwd) {
  return JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf8'));
}

function safeName(name) {
  return String(name || 'repo')
    .replace(/^@/, '')
    .replace(/[^\w.-]+/g, '-');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const cwd = process.cwd();
  const pkg = await readPkg(cwd);
  const name = safeName(pkg.name || path.basename(cwd));
  const version = pkg.version || '0.0.0';
  const outDir = path.join(cwd, '.backups');
  const outFile = path.join(outDir, `merge-${name}(${version}).txt`);

  const files = [];
  const dirs = [];
  await walk(cwd, cwd, files, dirs);
  await ensureDir(outDir);

  const lines = [];
  lines.push('MERGE SNAPSHOT');
  lines.push(`Name: ${name}`);
  lines.push(`Version: ${version}`);
  lines.push(`GeneratedAt: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('===== TREE BEGIN =====');
  for (const d of dirs.sort((a, b) => a.localeCompare(b))) {
    lines.push(`DIR: ${d}`);
  }
  for (const f of files.map((x) => x.rel).sort((a, b) => a.localeCompare(b))) {
    lines.push(`FILE: ${f}`);
  }
  lines.push('===== TREE END =====');
  lines.push('');

  for (const f of files.sort((a, b) => a.rel.localeCompare(b.rel))) {
    if (isBinaryByExt(f.rel)) continue;
    if (shouldSkipContent(f.rel)) continue;

    const buf = await fs.readFile(f.abs).catch(() => null);
    if (!buf) continue;
    if (buf.length > 800_000) continue;

    const text = buf.toString('utf8');
    lines.push(`===== FILE: ${f.rel} =====`);
    lines.push(text.replace(/\r\n/g, '\n'));
    if (!text.endsWith('\n')) lines.push('');
    lines.push(`===== END FILE: ${f.rel} =====`);
    lines.push('');
  }

  await fs.writeFile(outFile, lines.join('\n'), 'utf8');
  console.log(`merge-snapshot: wrote ${path.relative(cwd, outFile)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
