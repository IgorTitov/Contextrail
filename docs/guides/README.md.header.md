---
fileId: contextrail-template:docs:guides:README
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/guides/platforms.md
  - docs/guides/pwa.md
  - docs/guides/local-app.md
  - docs/guides/electron.md
  - docs/guides/extension.md
  - docs/guides/deployment.md
  - docs/guides/agent-framework-integration.md
summary: Index of all platform deployment guides in docs/guides/, mapping each guide to its deployment target.
owns: Discovery index for all deployment and platform guides under docs/guides/.
boundaries: Must not contain guide content — link to individual guides only. Must not duplicate platforms.md overview.
invariants: Table must stay in sync when guides are added, removed, or renamed.
risks: Stale index causes agents and users to miss available guides or follow broken links.
securityPrivacy: No secrets.
notesForLLM: When a new guide is added to docs/guides/, update the table here. One row per guide — description should be one short phrase matching the guide's own Purpose field.
linkedDocs:
  - docs/guides/platforms.md
  - docs/guides/pwa.md
  - docs/guides/local-app.md
  - docs/guides/electron.md
  - docs/guides/extension.md
  - docs/guides/deployment.md
  - docs/guides/agent-framework-integration.md
specRefs:
  - TPL-034
  - TPL-035
related:
  - docs/guides/platforms.md
  - docs/guides/deployment.md
  - templates/README.md
---

# README.md
