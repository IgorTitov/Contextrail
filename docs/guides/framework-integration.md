<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Step-by-step guide for integrating hex modules into Next.js, Angular, Vue, and Svelte projects.
@sidecar framework-integration.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Framework integration

How to use this template's hex modules, quality gates, and AI workflow inside a framework-based project.

## Architecture overview

The template has three layers of increasing framework-specificity:

| Layer | What it contains | Framework coupling |
|-------|------------------|--------------------|
| **Hex modules** (`modules/*`) | Domain logic, ports, adapters | **None** — pure ES modules |
| **Tooling** (`scripts/`, hooks, CI) | Header checks, architecture gates, changelog | **None** — Node.js scripts |
| **Starter scaffolds** (`apps/*`) | Demo applications | **High** — pick or replace |

The first two layers work with any JavaScript framework. The third layer provides starter applications:

- **`apps/starter/`** — Vanilla JS, zero dependencies, shows hex architecture in pure form
- **`apps/react-starter/`** — React 19 + Vite, shows how hex modules integrate with a production framework

Both share the same `modules/` directory. Choose the starter that fits your project, or replace with your own framework scaffold.

## General integration pattern

```
your-framework-project/
├── app/                         ← framework routing/pages
├── modules/                     ← hex modules (copy or symlink)
│   ├── auth/
│   ├── i18n/
│   ├── notifications/
│   ├── onboarding/
│   ├── state/
│   └── ...
├── scripts/checks/              ← quality gates (copy as-is)
├── .claude/                     ← Claude Code adapter (copy as-is)
├── docs/                        ← architecture docs (copy as-is)
├── tests/
│   ├── unit/                    ← hex module tests (copy as-is)
│   ├── contract/                ← hex compliance tests (copy as-is)
│   └── e2e/                     ← rewrite for framework test runner
└── package.json                 ← merge scripts
```

### Step 1: Copy hex modules

```bash
cp -r modules/ your-project/modules/
```

All hex modules are self-contained ES modules with zero domain-layer dependencies. Adapters declare their own infrastructure dependencies when needed (e.g., `jose` for the JWT adapter). Modules import only through `public-api.mjs` barrel files.

### Step 2: Copy quality gates

```bash
cp -r scripts/checks/ your-project/scripts/checks/
cp -r .claude/ your-project/.claude/
cp -r docs/ your-project/docs/
```

### Step 3: Merge package.json scripts

Add the check scripts to your framework's `package.json`:

```json
{
  "scripts": {
    "header-check": "node scripts/checks/header-check.mjs",
    "architecture-check": "node scripts/checks/architecture-check.mjs",
    "test:unit": "node --test \"tests/unit/**/*.test.mjs\"",
    "test:contract": "node --test \"tests/contract/**/*.test.mjs\""
  }
}
```

### Step 4: Create framework-specific adapters

The hex port/adapter pattern means you can create framework-native adapters that implement the same port contracts. The domain logic and port validators stay unchanged.

---

## Next.js (App Router)

### Project structure

```
nextjs-app/
├── app/
│   ├── layout.tsx              ← root layout (replaces apps/starter/index.html)
│   ├── page.tsx
│   └── providers.tsx           ← context providers wrapping hex adapters
├── modules/                    ← copied from template
│   ├── auth/
│   ├── i18n/
│   ├── state/
│   └── ...
├── lib/
│   └── adapters/               ← Next.js-specific adapter wrappers
│       ├── use-i18n.ts
│       ├── use-notifications.ts
│       └── use-onboarding.ts
└── scripts/checks/             ← copied from template
```

### Using hex modules in React components

```tsx
// lib/adapters/use-i18n.ts
'use client';
import { createIntlAdapter } from '../../modules/i18n/public-api.mjs';

const adapter = createIntlAdapter({ defaultLocale: 'en' });

export function useTranslation() {
  return {
    t: adapter.t,
    setLocale: adapter.setLocale,
    getLocale: adapter.getLocale,
  };
}
```

```tsx
// app/components/Header.tsx
'use client';
import { useTranslation } from '../../lib/adapters/use-i18n';

export function Header() {
  const { t } = useTranslation();
  return <header>{t('app.header.title')}</header>;
}
```

### Notifications adapter for React

```tsx
// lib/adapters/use-notifications.ts
'use client';
import { useState, useCallback } from 'react';
import {
  createNotification,
  assertNotificationPort,
} from '../../modules/notifications/public-api.mjs';

export function useNotifications() {
  const [toasts, setToasts] = useState([]);

  const adapter = {
    show(notification) {
      setToasts(prev => [...prev, notification]);
      if (notification.autoDismiss && notification.duration > 0) {
        setTimeout(() => adapter.dismiss(notification.id), notification.duration);
      }
    },
    dismiss(id) {
      setToasts(prev => prev.filter(t => t.id !== id));
    },
    getActive() {
      return toasts;
    },
  };

  assertNotificationPort(adapter);

  return {
    toasts,
    notify: (message, level) => adapter.show(createNotification(message, level)),
    dismiss: adapter.dismiss,
  };
}
```

### Key considerations for Next.js

- **Server Components**: Hex domain functions are pure and can run on the server. Adapters that touch the DOM (notifications, onboarding) must be `'use client'`.
- **App Router**: Use `layout.tsx` to initialize adapters once, pass via React Context.
- **RSC + i18n**: The i18n module's `interpolate()` and `buildFallbackChain()` work in Server Components. The full adapter needs client-side state for locale switching.
- **Import paths**: Next.js resolves ES modules natively. No bundler config needed for `modules/*/public-api.mjs`.

---

## Angular

### Project structure

```
angular-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── services/              ← Angular services wrapping hex adapters
│   │   │   ├── i18n.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── onboarding.service.ts
│   │   └── ...
│   └── modules/                   ← copied from template (inside src/)
│       ├── auth/
│       ├── i18n/
│       └── ...
├── scripts/checks/                ← copied from template
└── docs/                          ← copied from template
```

### Wrapping hex modules as Angular services

```typescript
// src/app/services/notification.service.ts
import { Injectable, signal, computed } from '@angular/core';
import {
  createNotification,
  assertNotificationPort,
  type Notification,
} from '../../modules/notifications/public-api.mjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _active = signal<Notification[]>([]);
  readonly active = this._active.asReadonly();

  private adapter = {
    show: (n: Notification) => {
      this._active.update(list => [...list, n]);
      if (n.autoDismiss && n.duration > 0) {
        setTimeout(() => this.dismiss(n.id), n.duration);
      }
    },
    dismiss: (id: string) => {
      this._active.update(list => list.filter(n => n.id !== id));
    },
    getActive: () => this._active(),
  };

  constructor() {
    assertNotificationPort(this.adapter);
  }

  notify(message: string, level: 'info' | 'success' | 'error' = 'info') {
    this.adapter.show(createNotification(message, level));
  }

  dismiss(id: string) {
    this.adapter.dismiss(id);
  }
}
```

### Key considerations for Angular

- **Dependency injection**: Angular's DI and the template's hex adapter pattern complement each other. Wrap each hex adapter in an `@Injectable` service.
- **Signals**: Angular Signals (v17+) pair well with the hex state module's pure state transitions.
- **Strict mode**: Angular's strict template checking works with TypeScript types from `types.d.ts` in each hex module.
- **Module paths**: Add a `paths` alias in `tsconfig.json` for cleaner imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@hex/*": ["src/modules/*/public-api.mjs"]
    }
  }
}
```

---

## Vue 3 (Composition API)

### Project structure

```
vue-app/
├── src/
│   ├── App.vue
│   ├── composables/               ← Vue composables wrapping hex adapters
│   │   ├── useI18n.ts
│   │   ├── useNotifications.ts
│   │   └── useOnboarding.ts
│   └── modules/                   ← copied from template
├── scripts/checks/
└── docs/
```

### Hex adapter as Vue composable

```typescript
// src/composables/useNotifications.ts
import { ref, readonly } from 'vue';
import {
  createNotification,
  assertNotificationPort,
} from '../modules/notifications/public-api.mjs';

const active = ref([]);

const adapter = {
  show(notification) {
    active.value = [...active.value, notification];
    if (notification.autoDismiss && notification.duration > 0) {
      setTimeout(() => adapter.dismiss(notification.id), notification.duration);
    }
  },
  dismiss(id) {
    active.value = active.value.filter(n => n.id !== id);
  },
  getActive: () => active.value,
};

assertNotificationPort(adapter);

export function useNotifications() {
  return {
    toasts: readonly(active),
    notify: (message, level = 'info') => adapter.show(createNotification(message, level)),
    dismiss: adapter.dismiss,
  };
}
```

### Key considerations for Vue

- **Composition API**: Hex adapters map directly to composables. One composable per hex module.
- **Reactivity**: Wrap adapter state in `ref()` or `reactive()` for template reactivity.
- **Nuxt**: Works the same way — place modules in `~/modules/` and composables in `~/composables/`.
- **Vite**: Resolves ES module imports natively. No extra config needed.

---

## Svelte / SvelteKit

### Hex adapter as Svelte store

```typescript
// src/lib/stores/notifications.ts
import { writable, derived } from 'svelte/store';
import {
  createNotification,
  assertNotificationPort,
} from '../../modules/notifications/public-api.mjs';

const active = writable([]);

const adapter = {
  show(notification) {
    active.update(list => [...list, notification]);
    if (notification.autoDismiss && notification.duration > 0) {
      setTimeout(() => adapter.dismiss(notification.id), notification.duration);
    }
  },
  dismiss(id) {
    active.update(list => list.filter(n => n.id !== id));
  },
  getActive: () => { let val; active.subscribe(v => val = v)(); return val; },
};

assertNotificationPort(adapter);

export const toasts = { subscribe: active.subscribe };
export const notify = (message, level = 'info') =>
  adapter.show(createNotification(message, level));
export const dismiss = adapter.dismiss;
```

### Key considerations for Svelte

- **Stores**: Svelte stores align naturally with hex adapter state.
- **SvelteKit**: Place hex modules in `src/lib/modules/` for the `$lib` alias.
- **Minimal overhead**: Svelte's compile-time approach means hex modules add no runtime framework overhead.

---

## Common patterns across all frameworks

### 1. Domain logic is framework-free

Pure domain functions (`createTourStep`, `createNotification`, `interpolate`, etc.) work identically in any framework — no wrapping needed.

### 2. Port validators catch integration bugs early

Always call `assertXPort(adapter)` when creating a framework-specific adapter. This catches missing methods at initialization, not at runtime.

### 3. Test the adapter, not the domain

Domain tests from the template run unchanged. Only write framework-specific tests for your custom adapters.

### 4. One adapter per framework integration point

Don't create a "universal" adapter. Each framework has its own reactivity system (React state, Angular signals, Vue refs, Svelte stores). Embrace it.

### 5. Keep hex modules as a directory, not an npm package

Copy the `modules/` directory rather than publishing it as a package. This keeps the hex architecture visible and editable.

## Driver.js upgrade path

The onboarding module ships with a zero-dependency vanilla DOM adapter. For richer animations and accessibility, install Driver.js (~5 KB, MIT):

```bash
pnpm add driver.js
```

See `modules/onboarding/README.md` for a complete Driver.js adapter example that implements `OnboardingPort`.
