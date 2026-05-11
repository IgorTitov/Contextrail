---
fileId: contextrail-template:tests:unit:install-prompt.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: apps/starter/pwa/install-prompt.mjs
summary: Verify install prompt initial state, unavailable outcome, state change subscription, and Node.js no-op behavior.
owns: The 7-test suite covering initial state, showInstallPrompt unavailable result, callback subscription, and Node.js safety.
boundaries: Tests only API shape and Node.js degradation. Full beforeinstallprompt flow requires a browser.
invariants: _reset must be called in beforeEach for test isolation.
risks: Missing _reset in beforeEach causes deferred prompt state to persist between tests and mask consumed-prompt bugs.
securityPrivacy: Test-only file.
notesForLLM: initInstallPrompt is a no-op in Node.js because window is undefined. Tests verify the module does not throw in this environment.
tests: self
linkedDocs: docs/backlog/platform-seams.md
specRefs: TPL-028
related: docs/backlog/platform-seams.md
---

# install-prompt.test.mjs
