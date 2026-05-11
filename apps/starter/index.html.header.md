---
fileId: contextrail-template:apps:starter:index
module: apps/starter
stability: evolving
steward: shared
api: HTML entry point
dependsOn:
  - apps/starter/app.mjs
  - apps/starter/design/reset.css
  - apps/starter/design/tokens.css
  - apps/starter/design/components.css
  - apps/starter/theme-toggle/theme-variables.css
  - apps/starter/layout/layout.css
  - apps/starter/navigation/navigation.css
  - apps/starter/notifications/notifications.css
  - apps/starter/loading-states/loading-states.css
  - apps/starter/error-boundary/error-boundary.css
owns: The HTML document structure, semantic landmark layout (header/main/footer), data-testid anchor placement, CSS load order, and the PWA service-worker registration stub.
boundaries: Must not contain application logic beyond the initApp() call and the conditional SW registration. Feature initialization belongs in app.mjs. Inline scripts must remain minimal bootstrapping only.
invariants: data-testid attributes used by tests and app.mjs (skip-to-content, site-header, site-main, toast-container, status-text) must not be renamed without updating selectors across app.mjs and the test suite; the meta[name="app-mode"] pattern is the agreed PWA activation signal and must not be replaced with a different mechanism.
risks: Renaming or removing data-testid anchors silently breaks app.mjs DOM queries and end-to-end selectors. CSS load order matters for theme token availability at paint time.
securityPrivacy: No secrets; all content is served as a static public document.
notesForLLM: The commented-out meta[name="app-mode" content="pwa"] line is the intentional opt-in switch for PWA mode — do not remove it. The toast-container div must remain outside main because it is an ARIA live region. CSS stylesheets must be linked before the module script to avoid FOUC.
tests: tests/e2e/platform-seams.spec.mjs (planned)
linkedDocs: docs/adr/0004-multi-platform-seams.md
specRefs: TPL-025
related:
  - tests/e2e/starter-app.html
  - docs/adr/0004-multi-platform-seams.md
summary: HTML entry point for the starter app.
---

# index.html
