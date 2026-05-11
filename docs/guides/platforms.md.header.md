---
fileId: contextrail-template:docs:guides:platforms
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/guides/pwa.md
  - docs/guides/local-app.md
  - docs/guides/electron.md
  - docs/guides/extension.md
  - templates/electron/README.md
  - templates/extension/README.md
  - templates/capacitor/README.md
summary: Multi-platform overview guide explaining the supported deployment targets, platform detection architecture, and how to add a new platform.
owns: "The canonical cross-platform reference: supported modes, storage adapter selection, platform detection chain, and the checklist for adding a new platform."
boundaries: Must not duplicate per-platform deep guides (pwa.md, electron.md, extension.md, local-app.md). Serve as the overview and routing document only.
invariants: Platform table must stay in sync with MODES in app-config.mjs and adapter-factory.mjs routing; detection chain must reflect actual code flow.
risks: Stale platform table or wrong mode names cause agents to wire new adapters incorrectly. Detection chain diagram must stay aligned with code.
securityPrivacy: No secrets.
notesForLLM: The detection chain (app-config -> environment-detect -> adapter-factory -> app.mjs) is the load-bearing architectural description. Keep the mode names and adapter routing aligned with actual app-config.mjs MODES. Link to per-platform guides rather than duplicating their content.
linkedDocs:
  - docs/guides/pwa.md
  - docs/guides/local-app.md
  - docs/guides/electron.md
  - docs/guides/extension.md
  - docs/guides/deployment.md
specRefs: TPL-034
related:
  - docs/guides/pwa.md
  - docs/guides/local-app.md
  - docs/guides/electron.md
  - docs/guides/extension.md
  - docs/guides/deployment.md
  - templates/README.md
---

# platforms.md
