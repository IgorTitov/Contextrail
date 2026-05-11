/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify that the design token layer satisfies its structural contract: required files exist, token categories are defined, component styles use only var() references (no raw hex), index.html links all CSS files, and brandbook has real content.
 * @sidecar design-tokens-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Contract test for the design tokens + brandbook layer.
 * Verifies structural compliance: file existence, token categories,
 * component styles use only token references, and brandbook completeness.
 *
 * SpecRefs: TPL-054; TPL-055; TPL-056; TPL-057; TPL-059
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const DESIGN_DIR = new URL('../../apps/starter/design/', import.meta.url);

describe('design tokens contract', () => {
  test('design/ folder exists', () => {
    assert.ok(existsSync(DESIGN_DIR), 'apps/starter/design/ must exist');
  });

  test('tokens.css exists', () => {
    assert.ok(existsSync(new URL('tokens.css', DESIGN_DIR)));
  });

  test('reset.css exists', () => {
    assert.ok(existsSync(new URL('reset.css', DESIGN_DIR)));
  });

  test('components.css exists', () => {
    assert.ok(existsSync(new URL('components.css', DESIGN_DIR)));
  });
});

describe('tokens.css coverage', () => {
  let tokens;

  test('tokens.css is readable', () => {
    tokens = readFileSync(new URL('tokens.css', DESIGN_DIR), 'utf-8');
    assert.ok(tokens.length > 0);
  });

  test('defines spacing tokens', () => {
    tokens = tokens || readFileSync(new URL('tokens.css', DESIGN_DIR), 'utf-8');
    assert.ok(tokens.includes('--space-'), 'Must define --space-* tokens');
  });

  test('defines typography tokens', () => {
    tokens = tokens || readFileSync(new URL('tokens.css', DESIGN_DIR), 'utf-8');
    assert.ok(tokens.includes('--font-'), 'Must define --font-* tokens');
    assert.ok(tokens.includes('--text-'), 'Must define --text-* tokens');
  });

  test('defines shadow tokens', () => {
    tokens = tokens || readFileSync(new URL('tokens.css', DESIGN_DIR), 'utf-8');
    assert.ok(tokens.includes('--shadow-'), 'Must define --shadow-* tokens');
  });

  test('defines z-index tokens', () => {
    tokens = tokens || readFileSync(new URL('tokens.css', DESIGN_DIR), 'utf-8');
    assert.ok(tokens.includes('--z-'), 'Must define --z-* tokens');
  });
});

describe('reset.css compliance', () => {
  test('includes box-sizing reset', () => {
    const reset = readFileSync(new URL('reset.css', DESIGN_DIR), 'utf-8');
    assert.ok(reset.includes('box-sizing'), 'Must reset box-sizing');
  });

  test('includes margin reset', () => {
    const reset = readFileSync(new URL('reset.css', DESIGN_DIR), 'utf-8');
    assert.ok(reset.includes('margin'), 'Must reset margins');
  });
});

describe('components.css token-only rule', () => {
  test('does not use raw hex colors', () => {
    const css = readFileSync(new URL('components.css', DESIGN_DIR), 'utf-8');
    // Strip CSS comments before checking
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Match hex colors (#xxx, #xxxxxx, #xxxxxxxx) in property values
    const hexInValues = stripped.match(/:\s*[^;]*#[0-9a-fA-F]{3,8}/g) || [];
    assert.equal(
      hexInValues.length,
      0,
      `components.css must not use raw hex colors — use var() token references. Found: ${hexInValues.join('; ')}`,
    );
  });

  test('uses var() references', () => {
    const css = readFileSync(new URL('components.css', DESIGN_DIR), 'utf-8');
    assert.ok(css.includes('var(--'), 'Must use var(--*) token references');
  });
});

describe('index.html links design CSS', () => {
  test('links tokens.css', () => {
    const html = readFileSync(new URL('../../apps/starter/index.html', import.meta.url), 'utf-8');
    assert.ok(html.includes('design/tokens.css'), 'index.html must link design/tokens.css');
  });

  test('links reset.css', () => {
    const html = readFileSync(new URL('../../apps/starter/index.html', import.meta.url), 'utf-8');
    assert.ok(html.includes('design/reset.css'), 'index.html must link design/reset.css');
  });

  test('links components.css', () => {
    const html = readFileSync(new URL('../../apps/starter/index.html', import.meta.url), 'utf-8');
    assert.ok(html.includes('design/components.css'), 'index.html must link design/components.css');
  });
});

describe('brandbook completeness', () => {
  test('brandbook.md has real content beyond placeholder', () => {
    const brandbook = readFileSync(
      new URL('../../docs/design/brandbook.md', import.meta.url),
      'utf-8',
    );
    // Must have actual sections, not just "Replace this starter content"
    assert.ok(brandbook.includes('## Color'), 'Must have Color section');
    assert.ok(brandbook.includes('## Typography'), 'Must have Typography section');
    assert.ok(brandbook.includes('## Spacing'), 'Must have Spacing section');
  });
});
