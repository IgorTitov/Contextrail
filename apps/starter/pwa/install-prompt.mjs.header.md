---
fileId: contextrail-template:apps:starter:pwa:install-prompt
module: apps/starter
stability: evolving
steward: shared
api: "{ initInstallPrompt, isInstallAvailable, showInstallPrompt, onInstallStateChange, _reset }"
owns: The deferred prompt state, install availability tracking, and state change callback dispatch.
boundaries: Must not import other app modules. Must be a no-op in non-browser environments. Must not auto-show the install prompt without user action.
invariants: "isInstallAvailable must return false before any beforeinstallprompt event fires; showInstallPrompt must return { outcome: 'unavailable' } when no prompt is captured; _reset must clear all state."
risks: Auto-showing the prompt without user gesture violates browser policy and silently fails; calling showInstallPrompt twice without a new event returns unavailable (prompt is consumed on first call).
securityPrivacy: No secrets; install prompt is a standard browser API.
notesForLLM: The _reset function is for test isolation. initInstallPrompt is a no-op in Node.js (no window object). The deferred prompt is consumed on showInstallPrompt — calling it twice without a new beforeinstallprompt returns unavailable.
tests: tests/unit/install-prompt.test.mjs
linkedDocs:
  - apps/starter/pwa/README.md
  - docs/backlog/platform-seams.md
specRefs: TPL-028
related:
  - apps/starter/pwa/pwa-register.mjs
  - apps/starter/pwa/ui-selectors.mjs
  - docs/backlog/platform-seams.md
summary: Install Prompt for the starter app.
---

# install-prompt.mjs
