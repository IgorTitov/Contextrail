<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Hands-on tutorial for creating a complete hexagonal module from scratch in 15 minutes, with full code for every file.
@sidecar quick-start-first-module.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Quick Start: Create Your First Module

Build a complete hexagonal module from scratch in 15 minutes. By the end, you will have a working **bookmark** module with a port contract, domain logic, memory adapter, unit tests, contract tests, and a BDD feature.

**Prerequisites:** Template cloned, `pnpm install` done, hooks installed. See [Getting Started](getting-started.md) for setup.

---

## What you will build

A bookmark manager that can add, list, and remove bookmarks. The module follows the same hexagonal pattern as the 12 built-in modules.

```
modules/bookmark/
├── ports/bookmark-port.mjs       Port contract (what)
├── ports/bookmark-port.d.ts      Type definitions
├── domain/bookmark-service.mjs   Pure business logic (how)
├── adapters/memory-adapter.mjs   In-memory implementation
├── public-api.mjs                Single entry point
├── public-api.d.ts               Type re-exports
├── types.d.ts                    Shared types
├── messages.mjs                  i18n strings
├── manifest.json                 Module metadata
└── README.md                     Module documentation
```

---

## Step 1: Define the port (2 min)

The port is the contract. It says **what** the module can do, without saying **how**.

### `modules/bookmark/ports/bookmark-port.mjs`

```javascript
/**
 * Bookmark port contract.
 * Defines the operations any bookmark adapter must implement.
 *
 * @typedef {import('../types.d.ts').Bookmark} Bookmark
 */

/**
 * Validate that an object satisfies the BookmarkPort contract.
 * @param {object} adapter
 */
export function assertBookmarkPort(adapter) {
  const required = ['addBookmark', 'removeBookmark', 'listBookmarks', 'findByUrl'];
  for (const method of required) {
    if (typeof adapter[method] !== 'function') {
      throw new TypeError(`BookmarkPort requires method: ${method}`);
    }
  }
}
```

### `modules/bookmark/ports/bookmark-port.d.ts`

```typescript
import { Bookmark } from '../types.d.ts';

export interface BookmarkPort {
  addBookmark(url: string, title: string): Bookmark;
  removeBookmark(id: string): boolean;
  listBookmarks(): Bookmark[];
  findByUrl(url: string): Bookmark | null;
}

export function assertBookmarkPort(adapter: object): asserts adapter is BookmarkPort;
```

---

## Step 2: Define shared types (1 min)

### `modules/bookmark/types.d.ts`

```typescript
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
}
```

---

## Step 3: Write domain logic (3 min)

Domain logic is pure — no storage, no frameworks, no side effects.

### `modules/bookmark/domain/bookmark-service.mjs`

```javascript
/**
 * Pure domain logic for bookmark ID generation and validation.
 * Framework-free, no external dependencies.
 *
 * @typedef {import('../types.d.ts').Bookmark} Bookmark
 */

let counter = 0;

/**
 * Generate a unique bookmark ID.
 * @returns {string}
 */
export function generateBookmarkId() {
  counter++;
  return `bm-${Date.now()}-${counter}`;
}

/**
 * Validate a URL string.
 * @param {string} url
 * @returns {boolean}
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Create a bookmark object.
 * @param {string} url
 * @param {string} title
 * @returns {Bookmark}
 */
export function createBookmark(url, title) {
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL: must be http or https');
  }
  if (!title || typeof title !== 'string') {
    throw new Error('Title is required');
  }
  return {
    id: generateBookmarkId(),
    url,
    title: title.trim(),
    createdAt: new Date().toISOString(),
  };
}
```

---

## Step 4: Write the adapter (3 min)

The adapter implements the port contract using a specific technology (here: in-memory storage).

### `modules/bookmark/adapters/memory-adapter.mjs`

```javascript
/**
 * In-memory bookmark adapter. Good for development and testing.
 *
 * @typedef {import('../types.d.ts').Bookmark} Bookmark
 */

import { createBookmark } from '../domain/bookmark-service.mjs';

/**
 * Create an in-memory bookmark adapter that satisfies BookmarkPort.
 * @returns {import('../ports/bookmark-port.d.ts').BookmarkPort}
 */
export function createMemoryBookmarkAdapter() {
  /** @type {Bookmark[]} */
  let bookmarks = [];

  return {
    addBookmark(url, title) {
      const bookmark = createBookmark(url, title);
      bookmarks.push(bookmark);
      return bookmark;
    },

    removeBookmark(id) {
      const index = bookmarks.findIndex((b) => b.id === id);
      if (index === -1) return false;
      bookmarks.splice(index, 1);
      return true;
    },

    listBookmarks() {
      return [...bookmarks];
    },

    findByUrl(url) {
      return bookmarks.find((b) => b.url === url) ?? null;
    },
  };
}
```

---

## Step 5: Create the public API (1 min)

The public API is the only file other modules may import from.

### `modules/bookmark/public-api.mjs`

```javascript
/**
 * Single entry point for the bookmark bounded module.
 * The only file other modules may import.
 */

// Ports
export { assertBookmarkPort } from './ports/bookmark-port.mjs';

// Adapters
export { createMemoryBookmarkAdapter } from './adapters/memory-adapter.mjs';

// Domain (only what external consumers need)
export { isValidUrl } from './domain/bookmark-service.mjs';
```

### `modules/bookmark/public-api.d.ts`

```typescript
export { assertBookmarkPort, BookmarkPort } from './ports/bookmark-port.d.ts';
export { createMemoryBookmarkAdapter } from './adapters/memory-adapter.mjs';
export { isValidUrl } from './domain/bookmark-service.mjs';
export { Bookmark } from './types.d.ts';
```

---

## Step 6: Add i18n messages (1 min)

### `modules/bookmark/messages.mjs`

```javascript
/**
 * Bookmark module i18n message keys.
 */
export const bookmarkMessages = {
  'bookmark.added': 'Bookmark added',
  'bookmark.removed': 'Bookmark removed',
  'bookmark.not_found': 'Bookmark not found',
  'bookmark.invalid_url': 'Invalid URL',
  'bookmark.duplicate': 'Bookmark already exists',
};
```

---

## Step 7: Add module metadata (1 min)

### `modules/bookmark/manifest.json`

```json
{
  "name": "bookmark",
  "purpose": "Manage a collection of bookmarks with pluggable storage",
  "dependencies": [],
  "structure": {
    "ports": ["bookmark-port.mjs"],
    "domain": ["bookmark-service.mjs"],
    "adapters": ["memory-adapter.mjs"]
  },
  "publicApi": "public-api.mjs",
  "testFiles": [
    "tests/unit/bookmark.test.mjs",
    "tests/contract/bookmark-hex-contract.test.mjs"
  ]
}
```

### `modules/bookmark/README.md`

```markdown
# bookmark

Manage a collection of bookmarks with pluggable storage.

## API

| Export | Kind | Purpose |
|--------|------|---------|
| `assertBookmarkPort` | Port validator | Verify an adapter satisfies the contract |
| `createMemoryBookmarkAdapter` | Adapter factory | In-memory storage (dev/test) |
| `isValidUrl` | Domain utility | URL validation |

## Usage

\`\`\`javascript
import { createMemoryBookmarkAdapter, assertBookmarkPort } from './public-api.mjs';

const adapter = createMemoryBookmarkAdapter();
assertBookmarkPort(adapter); // validates contract

const bm = adapter.addBookmark('https://example.com', 'Example');
console.log(adapter.listBookmarks()); // [{ id, url, title, createdAt }]
\`\`\`
```

---

## Step 8: Write unit tests (2 min)

### `tests/unit/bookmark.test.mjs`

```javascript
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertBookmarkPort,
  createMemoryBookmarkAdapter,
  isValidUrl,
} from '../../modules/bookmark/public-api.mjs';

describe('bookmark module', () => {
  describe('assertBookmarkPort()', () => {
    test('accepts a valid adapter', () => {
      const adapter = createMemoryBookmarkAdapter();
      assert.doesNotThrow(() => assertBookmarkPort(adapter));
    });

    test('rejects an empty object', () => {
      assert.throws(() => assertBookmarkPort({}), /BookmarkPort requires method/);
    });
  });

  describe('createMemoryBookmarkAdapter()', () => {
    test('adds and lists bookmarks', () => {
      const adapter = createMemoryBookmarkAdapter();
      const bm = adapter.addBookmark('https://example.com', 'Example');
      assert.equal(bm.url, 'https://example.com');
      assert.equal(bm.title, 'Example');
      assert.equal(adapter.listBookmarks().length, 1);
    });

    test('removes a bookmark by id', () => {
      const adapter = createMemoryBookmarkAdapter();
      const bm = adapter.addBookmark('https://example.com', 'Example');
      assert.equal(adapter.removeBookmark(bm.id), true);
      assert.equal(adapter.listBookmarks().length, 0);
    });

    test('returns false when removing a non-existent bookmark', () => {
      const adapter = createMemoryBookmarkAdapter();
      assert.equal(adapter.removeBookmark('non-existent'), false);
    });

    test('finds a bookmark by URL', () => {
      const adapter = createMemoryBookmarkAdapter();
      adapter.addBookmark('https://example.com', 'Example');
      const found = adapter.findByUrl('https://example.com');
      assert.equal(found?.url, 'https://example.com');
    });

    test('returns null for unfound URL', () => {
      const adapter = createMemoryBookmarkAdapter();
      assert.equal(adapter.findByUrl('https://nope.com'), null);
    });

    test('rejects invalid URLs', () => {
      const adapter = createMemoryBookmarkAdapter();
      assert.throws(() => adapter.addBookmark('not-a-url', 'Bad'), /Invalid URL/);
    });

    test('each factory call is independent', () => {
      const a = createMemoryBookmarkAdapter();
      const b = createMemoryBookmarkAdapter();
      a.addBookmark('https://a.com', 'A');
      assert.equal(b.listBookmarks().length, 0);
    });
  });

  describe('isValidUrl()', () => {
    test('accepts http URLs', () => assert.equal(isValidUrl('http://example.com'), true));
    test('accepts https URLs', () => assert.equal(isValidUrl('https://example.com'), true));
    test('rejects ftp URLs', () => assert.equal(isValidUrl('ftp://example.com'), false));
    test('rejects empty string', () => assert.equal(isValidUrl(''), false));
    test('rejects null', () => assert.equal(isValidUrl(null), false));
  });
});
```

---

## Step 9: Write a contract test (1 min)

Contract tests verify the hexagonal structure, not business logic.

### `tests/contract/bookmark-hex-contract.test.mjs`

```javascript
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_ROOT = resolve(import.meta.dirname, '../../modules/bookmark');

describe('bookmark hex contract', () => {
  test('has required hex folders', () => {
    for (const dir of ['domain', 'ports', 'adapters']) {
      assert.ok(existsSync(resolve(MODULE_ROOT, dir)), `missing ${dir}/`);
    }
  });

  test('has public-api.mjs', () => {
    assert.ok(existsSync(resolve(MODULE_ROOT, 'public-api.mjs')));
  });

  test('has public-api.d.ts', () => {
    assert.ok(existsSync(resolve(MODULE_ROOT, 'public-api.d.ts')));
  });

  test('has manifest.json', () => {
    assert.ok(existsSync(resolve(MODULE_ROOT, 'manifest.json')));
  });

  test('exports match expected public surface', async () => {
    const mod = await import('../../modules/bookmark/public-api.mjs');
    const expected = ['assertBookmarkPort', 'createMemoryBookmarkAdapter', 'isValidUrl'];
    for (const name of expected) {
      assert.equal(typeof mod[name], 'function', `missing export: ${name}`);
    }
  });
});
```

---

## Step 10: Run tests

```bash
# Run your new tests
pnpm test:unit
pnpm test:contract

# Or run everything
pnpm test
```

All tests should pass. The pre-commit hook will verify hex boundaries, headers, and READMEs on your next commit.

---

## Optional: Add a BDD feature

For user-visible behavior, add a Gherkin scenario:

### `tests/bdd/features/bookmark.feature`

```gherkin
Feature: Managing bookmarks

  As a user of the bookmark module
  I want to add, find, and remove bookmarks
  So that I can save interesting links

  Scenario: Add a bookmark
    Given an empty bookmark collection
    When I add a bookmark for "https://example.com" titled "Example"
    Then the collection contains 1 bookmark
    And the bookmark URL is "https://example.com"

  Scenario: Remove a bookmark
    Given a bookmark for "https://example.com" titled "Example"
    When I remove the bookmark
    Then the collection is empty

  Scenario: Find a bookmark by URL
    Given a bookmark for "https://example.com" titled "Example"
    When I search for "https://example.com"
    Then the result title is "Example"
```

### `tests/bdd/bookmark.test.mjs`

```javascript
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMemoryBookmarkAdapter } from '../../modules/bookmark/public-api.mjs';

const feature = readFileSync(new URL('./features/bookmark.feature', import.meta.url), 'utf8');

describe('Feature: Managing bookmarks', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Managing bookmarks'));
    assert.ok(feature.includes('Scenario: Add a bookmark'));
    assert.ok(feature.includes('Scenario: Remove a bookmark'));
    assert.ok(feature.includes('Scenario: Find a bookmark by URL'));
  });

  test('Scenario: Add a bookmark', () => {
    // Given an empty bookmark collection
    const adapter = createMemoryBookmarkAdapter();

    // When I add a bookmark
    const bm = adapter.addBookmark('https://example.com', 'Example');

    // Then the collection contains 1 bookmark
    assert.equal(adapter.listBookmarks().length, 1);
    // And the bookmark URL is correct
    assert.equal(bm.url, 'https://example.com');
  });

  test('Scenario: Remove a bookmark', () => {
    // Given a bookmark exists
    const adapter = createMemoryBookmarkAdapter();
    const bm = adapter.addBookmark('https://example.com', 'Example');

    // When I remove the bookmark
    adapter.removeBookmark(bm.id);

    // Then the collection is empty
    assert.equal(adapter.listBookmarks().length, 0);
  });

  test('Scenario: Find a bookmark by URL', () => {
    // Given a bookmark exists
    const adapter = createMemoryBookmarkAdapter();
    adapter.addBookmark('https://example.com', 'Example');

    // When I search for the URL
    const result = adapter.findByUrl('https://example.com');

    // Then the result title is correct
    assert.equal(result?.title, 'Example');
  });
});
```

Run BDD tests: `pnpm test:bdd`

---

## Summary

You built a complete hexagonal module with:

| Layer | File | Purpose |
|-------|------|---------|
| Port | `ports/bookmark-port.mjs` | Contract definition |
| Types | `types.d.ts` | Shared type declarations |
| Domain | `domain/bookmark-service.mjs` | Pure business logic |
| Adapter | `adapters/memory-adapter.mjs` | In-memory implementation |
| Public API | `public-api.mjs` | Single entry point |
| i18n | `messages.mjs` | User-facing strings |
| Metadata | `manifest.json` | Module metadata for agents |
| Unit tests | `tests/unit/bookmark.test.mjs` | Logic verification |
| Contract tests | `tests/contract/bookmark-hex-contract.test.mjs` | Boundary enforcement |
| BDD | `tests/bdd/features/bookmark.feature` | Behavior specification |

This is the same pattern used by all 12 built-in modules. The only difference is scale.

---

## Next steps

- Add a persistent adapter (localStorage, IndexedDB) for production use
- Wire the module into `apps/starter/app.mjs`
- Add the module to `docs/SYSTEM_MAP.md`
- Create PRD and backlog entries for full traceability
- Run `node scripts/checks/header-create.mjs modules/bookmark/**/*.mjs` to generate structured headers
