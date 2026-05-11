---
fileId: contextrail-template:docs:guides:local-app
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn: docs/guides/platforms.md
summary: Guide for running the starter app from the local filesystem via file:// protocol without any server.
owns: "Canonical documentation for the local (file://) deployment mode: build command, storage adapter choice, API limitations, and distribution."
boundaries: Must not duplicate the platform overview or cover Electron (which is a different local mode). file:// direct use only.
invariants: Build command (pnpm build:local) and storage fallback (IndexedDB) must stay aligned with adapter-factory.mjs local mode behavior.
risks: Documenting localStorage as the local storage adapter would be incorrect — IndexedDB is used because localStorage is unreliable on file://.
securityPrivacy: file:// has no CORS isolation. Document that the app uses relative imports only to avoid CORS issues.
notesForLLM: IndexedDB is the storage choice here, not localStorage (localStorage is unreliable on file://). Service workers are explicitly disabled. Keep limitations section accurate if browser behavior changes.
linkedDocs:
  - docs/guides/platforms.md
  - docs/guides/deployment.md
specRefs: TPL-034
related:
  - docs/guides/platforms.md
  - docs/guides/deployment.md
  - docs/guides/electron.md
  - docs/guides/README.md
---

# local-app.md
