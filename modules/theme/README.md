<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the theme hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx theme
@public false
@edit careful -->

# theme

Hexagonal theme module — a pure color-scheme enum (`light` / `dark` / `auto`), a pure `ThemeTokens` value object that renders CSS custom-property declarations with defensive value escaping, an immutable `ThemePreference` record, a `ThemePreferenceStorePort` for persistence, and a zero-dependency in-memory adapter for tests and dev. Zero external dependencies and zero Node builtins.

## Why

Dark mode is a TOP-100 starter staple that most templates either hard-wire into a CSS framework (Tailwind's `dark:` variant, Material UI's ThemeProvider, Chakra's `useColorMode`) or skip entirely. When the design system, storage backend, or rendering target changes, every caller has to change with it. This module keeps color-scheme resolution, token → CSS rendering, and preference validation as a pure domain (plain strings and frozen records, never touches `document`, `matchMedia`, or `localStorage`), wraps persistence behind a 3-method `ThemePreferenceStorePort`, and ships a zero-dependency in-memory adapter. Real deployments plug a `localStorage`, cookie, or database adapter behind the same port without touching the renderer.

The `resolveColorScheme(preference, systemPreference)` helper is explicitly pure — callers observe `prefers-color-scheme` at the platform layer and pass the observed value in — so the domain is fully isomorphic across browser, worker, Node, and edge runtimes.

## Structure

```text
modules/theme/
├── domain/
│   ├── color-scheme.mjs        # LIGHT/DARK/AUTO + isValidColorScheme + resolveColorScheme
│   ├── theme-tokens.mjs        # createThemeTokens + renderCssVariables + escapeCssValue
│   └── theme-preference.mjs    # createThemePreference (immutable record)
├── ports/
│   └── theme-preference-store-port.mjs  # ThemePreferenceStorePort + assertThemePreferenceStorePort
├── adapters/
│   └── memory-theme-preference-store.mjs  # In-memory Map-backed store (tests + api-starter demo)
├── public-api.mjs              # Cross-module entry point
├── messages.mjs                # i18n keys (theme.*)
├── manifest.json               # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                                |
| ------------ | ---------------- | ------------------------------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions, no I/O, no browser globals, no `node:*` imports.    |
| **Ports**    | `ports/`         | `ThemePreferenceStorePort` contract (3 methods).                    |
| **Adapters** | `adapters/`      | In-memory store (defensive copies, user-id validation).             |
| **Public**   | `public-api.mjs` | The only file other modules may import.                             |

## Usage

### Resolve the effective scheme

```javascript
import {
  LIGHT,
  DARK,
  AUTO,
  resolveColorScheme,
} from './modules/theme/public-api.mjs';

// The platform layer reads `matchMedia('(prefers-color-scheme: dark)')`
// and passes the observed value into the pure domain function.
const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? DARK
  : LIGHT;

const userPreference = AUTO; // stored via the port
const effective = resolveColorScheme(userPreference, systemPreference);
// → 'dark' (if the OS reports dark)
```

### Render a design-token palette as CSS variables

```javascript
import { createThemeTokens, renderCssVariables } from './modules/theme/public-api.mjs';

const tokens = createThemeTokens({
  light: {
    'color-bg': '#ffffff',
    'color-fg': '#111111',
    'color-accent': '#0f172a',
  },
  dark: {
    'color-bg': '#111111',
    'color-fg': '#f5f5f5',
    'color-accent': '#38bdf8',
  },
});

const css = renderCssVariables(tokens, 'dark');
// :root {
//   --color-accent: #38bdf8;
//   --color-bg: #111111;
//   --color-fg: #f5f5f5;
// }
```

### Persist a preference behind the port

```javascript
import {
  createThemePreference,
  createMemoryThemePreferenceStore,
  assertThemePreferenceStorePort,
} from './modules/theme/public-api.mjs';

const store = createMemoryThemePreferenceStore();
assertThemePreferenceStorePort(store);

await store.set(
  'alice',
  createThemePreference({ scheme: 'dark', updatedAt: Date.now() }),
);

const stored = await store.get('alice');
// → { scheme: 'dark', updatedAt: <epoch ms> }
```

## Rules

- Domain is pure. No `document`, no `matchMedia`, no `localStorage`, no `node:*` imports.
- Both `light` and `dark` token maps must declare the exact same key set — switching scheme at runtime must never leave a variable undefined.
- CSS values are defensively escaped in `renderCssVariables`: `{`, `}`, `;`, `<`, `\` are stripped so a crafted palette cannot break out of the declaration block.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/theme.test.mjs` — proves color-scheme validation, `auto → system` resolution, token validation (kebab-case keys, mismatched-set rejection, non-empty values), CSS rendering including escape of `{};<\`, preference record immutability, port assertion, and memory adapter lifecycle.
- `tests/contract/theme-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
