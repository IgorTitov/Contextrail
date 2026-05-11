---
fileId: contextrail-template:apps:starter:sw
module: apps/starter
stability: evolving
steward: shared
api: "{ CACHE_NAME, APP_SHELL_URLS, isAppShellUrl }"
owns: The precache URL list, cache versioning, and fetch strategies (cache-first for shell, network-first for dynamic).
boundaries: Must not import app-config or other app modules. Event listeners must only attach in ServiceWorkerGlobalScope. Cross-origin requests must never be cached.
invariants: CACHE_NAME must contain a version segment; APP_SHELL_URLS must include the root entry; isAppShellUrl must reject cross-origin URLs.
risks: Stale CACHE_NAME after content changes causes users to receive outdated assets; APP_SHELL_URLS missing key routes breaks offline support.
securityPrivacy: No secrets; only caches same-origin resources.
notesForLLM: Bump CACHE_NAME version to invalidate caches. Event listeners are guarded by typeof ServiceWorkerGlobalScope check so the file is importable in Node.js tests. The isAppShellUrl function takes a baseUrl parameter for testability.
tests: tests/unit/sw.test.mjs
linkedDocs:
  - apps/starter/pwa/README.md
  - docs/backlog/platform-seams.md
specRefs: TPL-027
related:
  - apps/starter/pwa/pwa-register.mjs
  - docs/backlog/platform-seams.md
summary: Sw for the starter app.
---

# sw.mjs
