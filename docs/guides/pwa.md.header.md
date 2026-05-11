---
fileId: contextrail-template:docs:guides:pwa
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/guides/platforms.md
  - apps/starter (pwa/pwa-register.mjs
  - pwa/install-prompt.mjs
  - sw.mjs
  - manifest.json)
summary: "Guide for deploying the starter app as a Progressive Web App: build steps, service worker behavior, manifest configuration, and troubleshooting."
owns: Canonical PWA deployment instructions including build command, HTTPS requirement, service worker behavior, and manifest setup.
boundaries: Must not duplicate the platform overview from platforms.md. PWA-specific content only.
invariants: Build command (pnpm build:pwa) and feature flags documented here must stay in sync with app-config.mjs pwa mode behavior.
risks: Documenting wrong feature flags or service worker behavior causes users to set up PWA incorrectly and miss HTTPS or manifest requirements.
securityPrivacy: Service workers require HTTPS. Document this prominently — localhost exception applies only to local dev.
notesForLLM: The feature flags section (pwa:true, offlineCache:true, installPrompt:true) must stay aligned with app-config.mjs. sw.mjs caching strategy is described here — keep aligned if sw.mjs changes.
linkedDocs:
  - docs/guides/platforms.md
  - docs/guides/deployment.md
specRefs: TPL-034
related:
  - docs/guides/platforms.md
  - docs/guides/deployment.md
  - docs/guides/README.md
---

# pwa.md
