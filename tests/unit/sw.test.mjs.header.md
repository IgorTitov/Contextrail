---
fileId: contextrail-template:tests:unit:sw.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: apps/starter/sw.mjs
summary: Verify service worker constants (CACHE_NAME, APP_SHELL_URLS) and the isAppShellUrl classification function.
owns: The 14-test suite covering cache name format, shell URL completeness, and URL matching logic.
boundaries: Must not test actual SW event handler behavior (requires browser). Tests only the exported pure functions.
invariants: isAppShellUrl tests must use explicit base URLs for deterministic results.
risks: Tests are bypassed if the typeof ServiceWorkerGlobalScope guard is removed from sw.mjs, causing import to fail in Node.js.
securityPrivacy: Test-only file.
notesForLLM: The SW event listeners are guarded by typeof ServiceWorkerGlobalScope, so the module is safely importable in Node.js for testing the exported constants and isAppShellUrl function.
tests: self
linkedDocs: docs/backlog/platform-seams.md
specRefs: TPL-027
related: docs/backlog/platform-seams.md
---

# sw.test.mjs
