/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate the PWA manifest JSON structure, required fields, icon references, and icon file existence.
 * @sidecar pwa-manifest.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const starterDir = resolve(__dirname, '../../apps/starter');
const manifestPath = resolve(starterDir, 'manifest.json');

describe('PWA manifest (TPL-026)', () => {
  let manifest;

  it('is valid JSON', async () => {
    const raw = await readFile(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
    assert.ok(manifest);
  });

  it('has name and short_name', () => {
    assert.equal(typeof manifest.name, 'string');
    assert.ok(manifest.name.length > 0);
    assert.equal(typeof manifest.short_name, 'string');
    assert.ok(manifest.short_name.length > 0);
  });

  it('has description', () => {
    assert.equal(typeof manifest.description, 'string');
    assert.ok(manifest.description.length > 0);
  });

  it('has start_url and scope', () => {
    assert.equal(typeof manifest.start_url, 'string');
    assert.equal(typeof manifest.scope, 'string');
  });

  it('has display and theme_color', () => {
    assert.equal(manifest.display, 'standalone');
    assert.equal(typeof manifest.theme_color, 'string');
    assert.match(manifest.theme_color, /^#[0-9a-fA-F]{6}$/);
  });

  it('has orientation', () => {
    assert.equal(typeof manifest.orientation, 'string');
  });

  it('has icons array with 192 and 512 sizes', () => {
    assert.ok(Array.isArray(manifest.icons));
    const sizes = manifest.icons.map((i) => i.sizes);
    assert.ok(sizes.includes('192x192'), 'missing 192x192 icon');
    assert.ok(sizes.includes('512x512'), 'missing 512x512 icon');
  });

  it('icons are SVG type', () => {
    for (const icon of manifest.icons) {
      assert.equal(icon.type, 'image/svg+xml');
    }
  });

  it('icon files exist on disk', async () => {
    for (const icon of manifest.icons) {
      const iconPath = resolve(starterDir, icon.src);
      await access(iconPath); // throws if missing
    }
  });
});
