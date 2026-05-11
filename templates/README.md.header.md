---
fileId: contextrail-template:templates:README
module: templates
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - templates/electron/README.md
  - templates/extension/README.md
  - templates/capacitor/README.md
  - docs/guides/platforms.md
owns: Discovery index for all platform scaffold templates in this repository.
boundaries: Must not contain platform-specific setup steps — those belong in each scaffold's own README. Must not duplicate the full guides.
invariants: Table must stay in sync when new scaffold directories are added or removed.
risks: Stale directory table causes agents and users to overlook available scaffolds or look for non-existent ones.
securityPrivacy: No secrets.
notesForLLM: When a new scaffold is added under templates/, update the directory table here. Each scaffold's own README owns its detailed instructions — keep this file as an index only.
linkedDocs:
  - docs/guides/platforms.md
  - templates/electron/README.md
  - templates/extension/README.md
  - templates/capacitor/README.md
specRefs:
  - TPL-033
  - TPL-035
related:
  - templates/electron/README.md
  - templates/extension/README.md
  - templates/capacitor/README.md
  - docs/guides/platforms.md
summary: Overview and navigation guide for all platform deployment templates.
---

# README.md
