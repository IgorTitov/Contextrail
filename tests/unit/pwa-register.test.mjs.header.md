---
fileId: contextrail-template:tests:unit:pwa-register.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: apps/starter/pwa/pwa-register.mjs
summary: Verify PWA registration graceful degradation in Node.js, callback subscription/unsubscription, and applyUpdate behavior.
owns: The 7-test suite covering registerServiceWorker null return, onUpdateAvailable, and applyUpdate messaging.
boundaries: Tests only API shape and Node.js degradation. Full lifecycle testing requires a browser.
invariants: _reset must be called in beforeEach for test isolation.
risks: Missing _reset in beforeEach causes callback state to bleed between tests and produce false positives.
securityPrivacy: Test-only file.
notesForLLM: These tests verify graceful degradation in Node.js where navigator.serviceWorker does not exist. The applyUpdate test uses a fake registration with a postMessage mock.
tests: self
linkedDocs: docs/backlog/platform-seams.md
specRefs: TPL-028
related: docs/backlog/platform-seams.md
---

# pwa-register.test.mjs
