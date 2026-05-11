---
fileId: contextrail-template:tests:unit:notifications.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the notifications module.
owns: Unit proof of notifications domain logic (createNotification, shouldAutoDismiss), port contract validation (assertNotificationPort), and memory adapter correctness.
boundaries: Must import only through modules/notifications/public-api.mjs; must not touch UI, DOM, or adapter-external infrastructure; integration-level behaviour belongs in separate tests.
invariants: Domain functions must remain pure and side-effect-free in tests; port validator must throw on any invalid adapter; memory adapter state must be fully reset between test cases via resetIdCounter or beforeEach setup.
notesForLLM: Import exclusively via public-api.mjs; never reach into modules/notifications internals. Use beforeEach with resetIdCounter to prevent id-counter leakage between test cases.
tests: node:test runner via pnpm test:unit
specRefs: TPL-019
---

# notifications.test.mjs
