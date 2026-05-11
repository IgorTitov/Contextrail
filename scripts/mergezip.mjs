/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Run the simplified Merge & Zip workflow: bump version, snapshot, optional tests, then zip into .backups
 * @sidecar mergezip.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import archiver from 'archiver';

function parseArgs(argv) {
  const a = argv.slice(2);
  const has = (x) => a.includes(x);
  const get = (k, d) => {
    const i = a.indexOf(k);
    return i >= 0 && a[i + 1] ? a[i + 1] : d;
  };
  return {
    quiet: has('--quiet') || has('-q'),
    skipTests: has('--skip-tests'),
    skipVersionBump: has('--skip-version-bump') || has('--no-bump'),
    outDir: get('--out-dir', '.backups'),
  };
}

function run(cmd, args, quiet) {
  const child = spawnSync(cmd, args, {
    stdio: quiet ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
  });
  if ((child.status ?? 1) !== 0) {
    const stderr = quiet ? child.stderr?.toString('utf8') || '' : '';
    throw new Error(`command failed: ${cmd} ${args.join(' ')}${stderr ? `\n${stderr}` : ''}`);
  }
}

function normRel(p) {
  return p.split(path.sep).join('/');
}

function shouldIgnore(rel) {
  return (
    rel.startsWith('.git/') ||
    rel.startsWith('node_modules/') ||
    rel.startsWith('dist/') ||
    rel.startsWith('build/') ||
    rel.startsWith('coverage/') ||
    rel.startsWith('.nx/') ||
    rel.startsWith('.turbo/') ||
    rel.startsWith('.backups/') ||
    rel.startsWith('playwright-report/') ||
    rel.startsWith('test-results/') ||
    rel.endsWith('.zip')
  );
}

async function walk(dir, baseDir, out) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = normRel(path.relative(baseDir, abs));
    if (shouldIgnore(rel)) continue;
    if (entry.isDirectory()) await walk(abs, baseDir, out);
    else if (entry.isFile()) out.push(rel);
  }
}

async function readPkg(cwd) {
  return JSON.parse(await fsp.readFile(path.join(cwd, 'package.json'), 'utf8'));
}

function safeName(name) {
  return String(name || 'repo')
    .replace(/^@/, '')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9_.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function createZip({ cwd, outDir, name, version, quiet }) {
  await ensureDir(path.join(cwd, outDir));
  const files = [];
  await walk(cwd, cwd, files);

  const zipName = `merge-${name}(${version}).zip`;
  const zipPath = path.join(cwd, outDir, zipName);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        if (!quiet) console.warn(err);
      } else {
        reject(err);
      }
    });
    archive.on('error', reject);
  });

  archive.pipe(output);
  for (const rel of files) {
    archive.file(path.join(cwd, rel), { name: rel });
  }
  await archive.finalize();
  await done;

  if (!quiet) {
    console.log(`mergezip: wrote ${path.relative(cwd, zipPath)} (${archive.pointer()} bytes)`);
  }

  return zipPath;
}

async function main() {
  const cwd = process.cwd();
  const { quiet, skipTests, skipVersionBump, outDir } = parseArgs(process.argv);

  // Gate: check if [Unreleased] has real content before bumping.
  // If empty, snapshot at current version without creating a new release.
  const changelogPath = path.join(cwd, 'CHANGELOG.md');
  const hasRealUnreleased = (() => {
    try {
      const cl = fs.readFileSync(changelogPath, 'utf8');
      const start = cl.indexOf('## [Unreleased]');
      if (start === -1) return false;
      const after = start + '## [Unreleased]'.length;
      const next = cl.indexOf('\n## ', after);
      const block = (next >= 0 ? cl.slice(after, next) : cl.slice(after)).trim();
      const lines = block.split('\n').map((l) => l.trim())
        .filter((l) => l && !l.startsWith('##') && !l.startsWith('###'));
      return lines.some((l) => l !== '_Nothing yet._' && l !== '_none_' && l !== '- _none_' && l !== '- _Nothing yet._');
    } catch { return false; }
  })();

  if (!skipVersionBump && hasRealUnreleased) {
    run('node', ['scripts/checks/version-bump.mjs'], quiet);
    // Move [Unreleased] into versioned section with full timestamp
    const bumped = (await readPkg(cwd)).version || '0.0.0';
    run('node', ['scripts/checks/changelog-release.mjs', `--version=${bumped}`], quiet);
  } else if (!skipVersionBump && !hasRealUnreleased && !quiet) {
    console.log('mergezip: [Unreleased] has no real content — skipping version bump');
  }

  const pkg = await readPkg(cwd);
  const name = safeName(pkg.name || path.basename(cwd));
  const version = pkg.version || '0.0.0';

  run('node', ['scripts/merge-snapshot.mjs'], quiet);

  if (!skipTests) {
    try {
      run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['test'], quiet);
    } catch (error) {
      console.error(
        `mergezip: tests failed, zip will still be created\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  await createZip({ cwd, outDir, name, version, quiet });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
