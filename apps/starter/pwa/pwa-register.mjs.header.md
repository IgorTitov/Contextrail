---
fileId: contextrail-template:apps:starter:pwa:pwa-register
module: apps/starter
stability: evolving
steward: shared
api: "{ registerServiceWorker, onUpdateAvailable, applyUpdate, _reset }"
owns: Service worker registration, update detection via updatefound event, and the SKIP_WAITING message protocol.
boundaries: Must not contain caching logic (that belongs in sw.mjs). Must return null gracefully in non-browser environments.
invariants: registerServiceWorker must return null when navigator.serviceWorker is unavailable; _reset must clear all callbacks.
risks: Missing _reset call in tests causes callback state bleed between test cases.
securityPrivacy: No secrets; delegates all security to the browser's SW scope rules.
notesForLLM: The _reset function is for test isolation only. The applyUpdate function sends SKIP_WAITING to the waiting SW. In Node.js, registerServiceWorker returns null because navigator.serviceWorker does not exist.
tests: tests/unit/pwa-register.test.mjs
linkedDocs:
  - apps/starter/pwa/README.md
  - docs/backlog/platform-seams.md
specRefs: TPL-028
related:
  - apps/starter/sw.mjs
  - apps/starter/pwa/install-prompt.mjs
  - docs/backlog/platform-seams.md
summary: Pwa Register for the starter app.
---

# pwa-register.mjs
