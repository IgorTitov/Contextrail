<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Index of starter applications demonstrating hex module consumption across different deployment targets.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# apps

Starter applications that consume hex modules from `modules/`.
Each app wires adapters for its target environment.

| App | Target | Framework | README |
|-----|--------|-----------|--------|
| `starter/` | Browser (vanilla JS) | None | [starter/README.md](starter/README.md) |
| `react-starter/` | Browser (React + Vite) | React | [react-starter/README.md](react-starter/README.md) |
| `api-starter/` | Node.js server | None (node:http) | [api-starter/README.md](api-starter/README.md) |

All apps import hex modules only through `public-api.mjs`.
Domain and port layers remain framework-free; only adapters vary per app.

## Web app conventions (Cockpit-compatible)

Web applications (`vite.config.*` present) should follow these conventions
for compatibility with AI Cockpit's Dev Browser and other tooling:

1. **`vite.config.{ts,js,mjs}`** — use literal values (not env vars):
   ```js
   server: { port: 3000 },
   build: { outDir: 'dist' },
   ```

2. **`package.json` scripts** — three required:
   ```json
   "dev": "vite",
   "build": "vite build",
   "serve": "npx http-server dist -p 3333 --cors -c-1"
   ```
   The `serve` port (3333) must differ from `dev` port (3000).

3. **Multiple web apps** — each must have unique `server.port` and `serve` port.

4. No Cockpit-specific files needed — Cockpit reads only standard project files.
