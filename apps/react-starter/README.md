<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and setup guide for the react-starter app.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# React Starter

A React 19 + Vite starter app demonstrating how a production UI framework
integrates with Contextrail's hex modules.

## Key idea

Contextrail and React operate at different layers:

```
COA layer       — headers, hex boundaries, BBA, agents, gates
UI layer        — React components, hooks, JSX
Runtime layer   — browser, Node, Electron
```

This starter shows that hex modules are framework-agnostic. The same
`modules/` directory powers both `apps/starter/` (vanilla JS) and this
React app. Only the adapter glue changes.

## Architecture

```
apps/react-starter/
├── src/
│   ├── adapters/         ← React hooks wrapping hex port adapters
│   │   ├── use-i18n.js
│   │   ├── use-notifications.js
│   │   ├── use-preferences.js
│   │   └── use-store.js
│   ├── components/       ← React UI components
│   │   ├── App.jsx
│   │   ├── Header.jsx
│   │   ├── NotificationList.jsx
│   │   └── ThemeToggle.jsx
│   ├── pages/            ← Route pages
│   │   └── Home.jsx
│   ├── main.jsx          ← React entry point
│   └── selectors.js      ← UI selector registry (data-testid)
├── index.html            ← Vite HTML entry
├── vite.config.js        ← Vite config with modules/ alias
├── package.json
└── README.md
```

## How hex adapters become React hooks

Each hex module exposes domain logic + port contracts via `public-api.mjs`.
A React adapter hook wraps the port adapter with React state primitives:

```jsx
// Domain logic — unchanged, framework-free
import { createNotification } from '../../modules/notifications/public-api.mjs';

// React adapter — thin glue
export function useNotifications() {
  const [toasts, setToasts] = useState([]);
  // ... wire createNotification to React state
}
```

The domain function `createNotification()` is the same one used by the
vanilla starter. Only the reactivity layer differs.

## Quick start

```bash
cd apps/react-starter
pnpm install
pnpm dev          # Vite dev server on localhost:5173
pnpm build        # Production build to dist/
```

## What this demonstrates

1. **Hex modules are framework-free** — same `modules/` directory, no changes
2. **Adapters are thin** — each hook is 10-25 lines
3. **Port contracts still validate** — `assertXPort()` catches bugs at init
4. **COA tooling still works** — headers, architecture checks, test gates
5. **Domain tests stay unchanged** — only add React-specific component tests

## What this is NOT

This is not a full production React app. It is a reference showing the
integration pattern. For a real project, add your router, form library,
and other React ecosystem tools on top.
