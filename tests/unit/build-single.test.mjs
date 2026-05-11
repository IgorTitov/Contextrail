/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify build script argument parsing, source path resolution, HTML patching, and file copy with temp directories.
 * @sidecar build-single.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the build-single script.
 *
 * Tests argument parsing, source path resolution, and HTML patching.
 * The actual file-copy build is tested with a temporary directory.
 *
 * SpecRefs: TPL-032; TPL-188
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseArgs, getSourcePaths, patchHtml, build } from '../../scripts/build-single.mjs';

// ---------------------------------------------------------------------------
// parseArgs()
// ---------------------------------------------------------------------------

describe('parseArgs()', () => {
  it('returns defaults when no arguments given', () => {
    const result = parseArgs([]);
    assert.equal(result.mode, 'hosted');
    assert.equal(result.outDir, 'dist');
    assert.equal(result.clean, false);
  });

  it('parses --mode flag', () => {
    const result = parseArgs(['--mode', 'pwa']);
    assert.equal(result.mode, 'pwa');
  });

  it('parses --out flag', () => {
    const result = parseArgs(['--out', 'build']);
    assert.equal(result.outDir, 'build');
  });

  it('parses --clean flag', () => {
    const result = parseArgs(['--clean']);
    assert.equal(result.clean, true);
  });

  it('parses all flags together', () => {
    const result = parseArgs(['--mode', 'electron', '--out', 'out', '--clean']);
    assert.equal(result.mode, 'electron');
    assert.equal(result.outDir, 'out');
    assert.equal(result.clean, true);
  });

  it('throws on invalid mode', () => {
    assert.throws(() => parseArgs(['--mode', 'invalid']), /Unknown mode/);
  });

  it('accepts all valid modes', () => {
    for (const mode of ['hosted', 'pwa', 'local', 'electron', 'extension']) {
      const result = parseArgs(['--mode', mode]);
      assert.equal(result.mode, mode);
    }
  });
});

// ---------------------------------------------------------------------------
// getSourcePaths()
// ---------------------------------------------------------------------------

describe('getSourcePaths()', () => {
  it('returns base paths for hosted mode', () => {
    const paths = getSourcePaths('hosted');
    assert.ok(paths.includes('app.mjs'));
    assert.ok(paths.includes('index.html'));
    assert.ok(paths.includes('app-config.mjs'));
    assert.ok(!paths.includes('manifest.json'));
    assert.ok(!paths.includes('sw.mjs'));
  });

  it('includes PWA files for pwa mode', () => {
    const paths = getSourcePaths('pwa');
    assert.ok(paths.includes('manifest.json'));
    assert.ok(paths.includes('sw.mjs'));
    assert.ok(paths.includes('icons'));
    assert.ok(paths.includes('pwa'));
  });

  it('does not include PWA files for local mode', () => {
    const paths = getSourcePaths('local');
    assert.ok(!paths.includes('manifest.json'));
    assert.ok(!paths.includes('sw.mjs'));
  });

  it('includes platform directory for all modes', () => {
    for (const mode of ['hosted', 'pwa', 'local', 'electron']) {
      const paths = getSourcePaths(mode);
      assert.ok(paths.includes('platform'), `platform missing for ${mode}`);
    }
  });
});

// ---------------------------------------------------------------------------
// patchHtml()
// ---------------------------------------------------------------------------

describe('patchHtml()', () => {
  const HTML_WITH_COMMENT = `<!DOCTYPE html>
<html>
<head>
  <!-- <meta name="app-mode" content="pwa" /> -->
</head>
<body></body>
</html>`;

  it('uncomments PWA meta tag for pwa mode', () => {
    const result = patchHtml(HTML_WITH_COMMENT, 'pwa');
    assert.ok(result.includes('<meta name="app-mode" content="pwa" />'));
    assert.ok(!result.includes('<!--'));
  });

  it('leaves HTML unchanged for hosted mode', () => {
    const result = patchHtml(HTML_WITH_COMMENT, 'hosted');
    assert.equal(result, HTML_WITH_COMMENT);
  });

  it('leaves HTML unchanged for local mode', () => {
    const result = patchHtml(HTML_WITH_COMMENT, 'local');
    assert.equal(result, HTML_WITH_COMMENT);
  });

  it('handles HTML without the commented tag', () => {
    const plain = '<html><head></head><body></body></html>';
    const result = patchHtml(plain, 'pwa');
    assert.equal(result, plain);
  });
});

// ---------------------------------------------------------------------------
// build() — integration with temp directory
// ---------------------------------------------------------------------------

describe('build()', () => {
  const testDirs = [];

  function makeTempRoot() {
    const dir = join(tmpdir(), `build-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });

    // Create minimal starter app structure
    const starter = join(dir, 'apps', 'starter');
    mkdirSync(starter, { recursive: true });
    writeFileSync(
      join(starter, 'index.html'),
      '<!DOCTYPE html><html><head><!-- <meta name="app-mode" content="pwa" /> --></head><body></body></html>',
    );
    writeFileSync(join(starter, 'app.mjs'), 'export function initApp() {}');
    writeFileSync(join(starter, 'app-config.mjs'), 'export const MODES = {};');
    writeFileSync(join(starter, 'messages.mjs'), 'export function t() {}');
    writeFileSync(join(starter, 'ui-selectors.mjs'), 'export const sel = {};');

    // Create a minimal modules directory
    const mod = join(dir, 'modules', 'user-preferences');
    mkdirSync(mod, { recursive: true });
    writeFileSync(join(mod, 'public-api.mjs'), 'export {}');

    testDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of testDirs) {
      try {
        rmSync(dir, { recursive: true });
      } catch {
        /* ignore */
      }
    }
    testDirs.length = 0;
  });

  it('copies files to dist/ by default', () => {
    const root = makeTempRoot();
    const result = build({ mode: 'hosted', outDir: 'dist', clean: false, root });
    assert.ok(existsSync(join(root, 'dist', 'index.html')));
    assert.ok(existsSync(join(root, 'dist', 'app.mjs')));
    assert.ok(result.fileCount > 0);
  });

  it('cleans output directory when --clean is set', () => {
    const root = makeTempRoot();
    const outDir = join(root, 'dist');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'old-file.txt'), 'stale');

    build({ mode: 'hosted', outDir: 'dist', clean: true, root });
    assert.ok(!existsSync(join(outDir, 'old-file.txt')));
    assert.ok(existsSync(join(outDir, 'index.html')));
  });

  it('patches HTML for PWA mode', () => {
    const root = makeTempRoot();

    // Create PWA files
    const starter = join(root, 'apps', 'starter');
    writeFileSync(join(starter, 'manifest.json'), '{}');
    writeFileSync(join(starter, 'sw.mjs'), '// sw');
    mkdirSync(join(starter, 'icons'), { recursive: true });
    mkdirSync(join(starter, 'pwa'), { recursive: true });

    build({ mode: 'pwa', outDir: 'dist', clean: true, root });

    const html = readFileSync(join(root, 'dist', 'index.html'), 'utf-8');
    assert.ok(html.includes('<meta name="app-mode" content="pwa" />'));
    assert.ok(existsSync(join(root, 'dist', 'manifest.json')));
    assert.ok(existsSync(join(root, 'dist', 'sw.mjs')));
  });

  it('copies modules directory', () => {
    const root = makeTempRoot();
    build({ mode: 'hosted', outDir: 'dist', clean: false, root });
    assert.ok(existsSync(join(root, 'dist', 'modules', 'user-preferences', 'public-api.mjs')));
  });

  it('assembles MV3 extension artifact for extension mode', () => {
    const root = makeTempRoot();

    // Create a minimal templates/extension scaffold mirroring the real one
    const extTemplate = join(root, 'templates', 'extension');
    mkdirSync(extTemplate, { recursive: true });
    writeFileSync(
      join(extTemplate, 'manifest.json'),
      JSON.stringify({
        manifest_version: 3,
        name: '{{PROJECT_NAME}}',
        version: '1.0.0',
        background: { service_worker: 'background.mjs', type: 'module' },
        action: { default_popup: 'popup.html' },
      }),
    );
    writeFileSync(join(extTemplate, 'background.mjs'), '// background worker');
    writeFileSync(join(extTemplate, 'popup.html'), '<!DOCTYPE html><html></html>');

    build({ mode: 'extension', outDir: 'dist', clean: true, root });

    // Starter output is present
    assert.ok(existsSync(join(root, 'dist', 'app.mjs')));
    // Extension scaffold files are copied into dist/ alongside the app
    assert.ok(existsSync(join(root, 'dist', 'manifest.json')));
    assert.ok(existsSync(join(root, 'dist', 'background.mjs')));
    assert.ok(existsSync(join(root, 'dist', 'popup.html')));

    // Manifest is valid MV3 JSON (placeholder token has been replaced)
    const manifest = JSON.parse(readFileSync(join(root, 'dist', 'manifest.json'), 'utf-8'));
    assert.equal(manifest.manifest_version, 3);
    assert.ok(
      typeof manifest.name === 'string' && !manifest.name.includes('{{'),
      'manifest name placeholder should be substituted',
    );
  });
});
