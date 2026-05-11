---
fileId: contextrail-template:scripts:checks:header-runtime-context-fill
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: Backfill runtimeEnvironment and externalSystems on adapter sidecars by scanning source for runtime-specific globals and external boundaries.
owns: The deterministic runtime classification (browser/node/universal) and the curated list of recognized external boundaries (http, browser-localstorage, browser-indexeddb, node-fs, web-worker, dom, console, browser-notification, websocket, node-child-process).
boundaries: Touches only adapter source files under modules/<mod>/adapters/. Skips .d.ts, port, domain, application, and public-api files — those are runtime-agnostic by hex layer rule. Authoritative for both fields and rewrites them in place.
invariants: Re-running with no source changes produces no diff. Detection is keyword-based and conservative — when neither node nor browser hints fire the runtime is `universal`.
risks: Conditional / dynamic-import patterns can hide a real runtime dependency from the static scanner. The right fix for an adapter that genuinely runs in both worlds via dynamic imports is to mark it as `universal` by hand and document the dynamic-import seam in the adapter source.
notesForLLM: Use this script before grepping adapter source for `node:`, `indexedDB`, `fetch`, etc. — its output is the canonical answer for "where does this adapter run and what does it touch".
tests: scripts/checks/header-check.mjs
related:
  - scripts/checks/header-implements-port-fill.mjs
  - scripts/checks/header-port-fill.mjs
  - scripts/checks/header-message-keys-fill.mjs
---

# header-runtime-context-fill.mjs
