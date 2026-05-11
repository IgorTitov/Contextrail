<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the user-preferences hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx user-preferences
@public false
@edit careful -->

# user-preferences

Hexagonal bounded module for persistent user preferences (locale, theme).

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/preferences.mjs` | Pure functions: `defaultPreferences()`, `mergePreferences()`, `isValidPreferences()` |
| Ports | `ports/storage-port.mjs` | `StoragePort` contract + `assertStoragePort()` validator |
| Adapters | `adapters/memory-adapter.mjs` | In-memory adapter for tests and SSR |
| Adapters | `adapters/local-storage-adapter.mjs` | Browser localStorage adapter |
| Public API | `public-api.mjs` | Single cross-module entry point |

## Usage

```js
import {
  defaultPreferences,
  mergePreferences,
  createMemoryAdapter,
  assertStoragePort,
} from '../../modules/user-preferences/public-api.mjs';

const adapter = createMemoryAdapter();
assertStoragePort(adapter); // throws if non-conforming

const prefs = adapter.load() ?? defaultPreferences();
const updated = mergePreferences(prefs, { theme: 'dark' });
adapter.save(updated);
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
