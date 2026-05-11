/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of react-starter-test in this repository.
 * @sidecar react-starter.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const appDir = resolve(root, 'apps/react-starter');

// ---------------------------------------------------------------------------
// File structure
// ---------------------------------------------------------------------------

describe('react-starter — file structure', () => {
  const expected = [
    'src/main.jsx',
    'src/selectors.js',
    'src/adapters/use-store.js',
    'src/adapters/use-i18n.js',
    'src/adapters/use-notifications.js',
    'src/adapters/use-preferences.js',
    'src/components/App.jsx',
    'src/components/Header.jsx',
    'src/components/NotificationList.jsx',
    'src/components/ThemeToggle.jsx',
    'src/pages/Home.jsx',
    'index.html',
    'vite.config.js',
    'package.json',
    'README.md',
  ];

  for (const file of expected) {
    test(`${file} exists`, () => {
      assert.ok(existsSync(resolve(appDir, file)), `Missing: ${file}`);
    });
  }
});

// ---------------------------------------------------------------------------
// Selector registry
// ---------------------------------------------------------------------------

describe('react-starter — selectors', () => {
  test('exports a selectors object', async () => {
    const mod = await import('../../apps/react-starter/src/selectors.js');
    assert.ok(mod.selectors);
    assert.equal(typeof mod.selectors, 'object');
  });

  test('all selector values are non-empty strings', async () => {
    const { selectors } = await import('../../apps/react-starter/src/selectors.js');
    for (const [key, value] of Object.entries(selectors)) {
      assert.equal(typeof value, 'string', `selector "${key}" should be a string`);
      assert.ok(value.length > 0, `selector "${key}" should not be empty`);
    }
  });

  test('has expected automation selectors', async () => {
    const { selectors } = await import('../../apps/react-starter/src/selectors.js');
    const required = ['header', 'main', 'themeToggle', 'toastList'];
    for (const key of required) {
      assert.ok(key in selectors, `missing required selector: ${key}`);
    }
  });

  test('selector values are unique', async () => {
    const { selectors } = await import('../../apps/react-starter/src/selectors.js');
    const values = Object.values(selectors);
    const unique = new Set(values);
    assert.equal(unique.size, values.length, 'duplicate selector values found');
  });
});

// ---------------------------------------------------------------------------
// Adapter hooks — import analysis (no React runtime needed)
// ---------------------------------------------------------------------------

describe('react-starter — adapter imports go through public-api.mjs', () => {
  const adapterFiles = [
    { file: 'src/adapters/use-store.js', module: 'state' },
    { file: 'src/adapters/use-i18n.js', module: 'i18n' },
    { file: 'src/adapters/use-notifications.js', module: 'notifications' },
    { file: 'src/adapters/use-preferences.js', module: 'user-preferences' },
  ];

  for (const { file, module } of adapterFiles) {
    test(`${file} imports from ${module}/public-api.mjs`, () => {
      const source = readFileSync(resolve(appDir, file), 'utf-8');
      const hasPublicApiImport = source.includes(`${module}/public-api.mjs`);
      assert.ok(hasPublicApiImport, `${file} should import from ${module}/public-api.mjs`);
    });

    test(`${file} does not deep-import ${module} internals`, () => {
      const source = readFileSync(resolve(appDir, file), 'utf-8');
      // Should not import from adapters/, domain/, ports/ directly
      const deepImport = new RegExp(`${module}/(adapters|domain|ports)/`);
      assert.ok(!deepImport.test(source), `${file} has a deep import into ${module}`);
    });
  }
});

// ---------------------------------------------------------------------------
// Adapter hooks — export shape (static analysis)
// ---------------------------------------------------------------------------

describe('react-starter — adapter hooks export named functions', () => {
  const hookExports = [
    { file: 'src/adapters/use-store.js', name: 'createReactStore' },
    { file: 'src/adapters/use-i18n.js', name: 'useI18n' },
    { file: 'src/adapters/use-notifications.js', name: 'useNotifications' },
    { file: 'src/adapters/use-preferences.js', name: 'usePreferences' },
  ];

  for (const { file, name } of hookExports) {
    test(`${file} exports ${name}`, () => {
      const source = readFileSync(resolve(appDir, file), 'utf-8');
      assert.ok(
        source.includes(`export function ${name}`),
        `${file} should export function ${name}`,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// package.json and vite config
// ---------------------------------------------------------------------------

describe('react-starter — package.json', () => {
  test('has react dependency', () => {
    const pkg = JSON.parse(readFileSync(resolve(appDir, 'package.json'), 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.ok('react' in allDeps, 'missing react dependency');
    assert.ok('react-dom' in allDeps, 'missing react-dom dependency');
  });

  test('has vite dev dependency', () => {
    const pkg = JSON.parse(readFileSync(resolve(appDir, 'package.json'), 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.ok('vite' in allDeps, 'missing vite dependency');
  });
});

describe('react-starter — vite config', () => {
  test('vite.config.js exists and references modules alias', () => {
    const source = readFileSync(resolve(appDir, 'vite.config.js'), 'utf-8');
    assert.ok(source.includes('modules'), 'vite config should reference modules directory');
  });
});

// ---------------------------------------------------------------------------
// Components — static analysis (no React runtime needed)
// ---------------------------------------------------------------------------

describe('react-starter — component exports', () => {
  const components = [
    { file: 'src/components/App.jsx', name: 'App' },
    { file: 'src/components/Header.jsx', name: 'Header' },
    { file: 'src/components/NotificationList.jsx', name: 'NotificationList' },
    { file: 'src/components/ThemeToggle.jsx', name: 'ThemeToggle' },
    { file: 'src/pages/Home.jsx', name: 'Home' },
  ];

  for (const { file, name } of components) {
    test(`${file} exports function ${name}`, () => {
      const source = readFileSync(resolve(appDir, file), 'utf-8');
      assert.ok(
        source.includes(`export function ${name}`),
        `${file} should export function ${name}`,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Components use selectors from bounded registry
// ---------------------------------------------------------------------------

describe('react-starter — components use selector registry', () => {
  const componentFiles = [
    'src/components/Header.jsx',
    'src/components/NotificationList.jsx',
    'src/components/ThemeToggle.jsx',
    'src/pages/Home.jsx',
  ];

  for (const file of componentFiles) {
    test(`${file} imports from selectors.js`, () => {
      const source = readFileSync(resolve(appDir, file), 'utf-8');
      assert.ok(
        source.includes("from '../selectors.js'") || source.includes("from '../selectors'"),
        `${file} should import from the selector registry`,
      );
    });

    test(`${file} uses data-testid with selectors`, () => {
      const source = readFileSync(resolve(appDir, file), 'utf-8');
      assert.ok(
        source.includes('data-testid={selectors.'),
        `${file} should use selectors for data-testid`,
      );
    });

    test(`${file} does not hardcode data-testid strings`, () => {
      const source = readFileSync(resolve(appDir, file), 'utf-8');
      const hardcoded = /data-testid="[^{]/.test(source);
      assert.ok(!hardcoded, `${file} has hardcoded data-testid — use selectors instead`);
    });
  }
});

// ---------------------------------------------------------------------------
// i18n — components use t() for user-facing copy
// ---------------------------------------------------------------------------

describe('react-starter — i18n compliance', () => {
  test('App.jsx defines message catalogs', () => {
    const source = readFileSync(resolve(appDir, 'src/components/App.jsx'), 'utf-8');
    assert.ok(source.includes('const messages'), 'App should define i18n messages');
    assert.ok(source.includes('en:'), 'App should have English locale');
  });

  test('App.jsx initializes useI18n', () => {
    const source = readFileSync(resolve(appDir, 'src/components/App.jsx'), 'utf-8');
    assert.ok(source.includes('useI18n'), 'App should use i18n hook');
  });

  test('Home.jsx uses t() for all user-visible strings', () => {
    const source = readFileSync(resolve(appDir, 'src/pages/Home.jsx'), 'utf-8');
    assert.ok(source.includes("t('home."), 'Home should use t() for translations');
    // No raw user-facing strings in JSX content (excluding attributes and comments)
    const jsxTextMatch = source.match(/>([A-Z][a-z]+ [a-z]+)</g);
    assert.ok(!jsxTextMatch, `Home.jsx has raw text in JSX: ${jsxTextMatch?.join(', ') || 'none'}`);
  });

  test('Header.jsx passes t() to child components', () => {
    const source = readFileSync(resolve(appDir, 'src/components/Header.jsx'), 'utf-8');
    assert.ok(source.includes("t('app."), 'Header should use t() for translations');
  });
});

// ---------------------------------------------------------------------------
// index.html — entry point
// ---------------------------------------------------------------------------

describe('react-starter — index.html', () => {
  test('has root div', () => {
    const html = readFileSync(resolve(appDir, 'index.html'), 'utf-8');
    assert.ok(html.includes('id="root"'), 'index.html should have #root element');
  });

  test('references main.jsx entry', () => {
    const html = readFileSync(resolve(appDir, 'index.html'), 'utf-8');
    assert.ok(html.includes('main.jsx'), 'index.html should reference main.jsx');
  });
});

// ---------------------------------------------------------------------------
// main.jsx — React root setup
// ---------------------------------------------------------------------------

describe('react-starter — main.jsx', () => {
  test('uses StrictMode', () => {
    const source = readFileSync(resolve(appDir, 'src/main.jsx'), 'utf-8');
    assert.ok(source.includes('StrictMode'), 'main.jsx should use StrictMode');
  });

  test('imports App component', () => {
    const source = readFileSync(resolve(appDir, 'src/main.jsx'), 'utf-8');
    assert.ok(source.includes("from './components/App.jsx'"), 'main.jsx should import App');
  });

  test('uses createRoot', () => {
    const source = readFileSync(resolve(appDir, 'src/main.jsx'), 'utf-8');
    assert.ok(source.includes('createRoot'), 'main.jsx should use createRoot (React 18+)');
  });
});
