---
fileId: contextrail-template:scripts:checks:seam-inventory
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/seam-inventory.mjs [--json]"
dependsOn:
  - scripts/checks/_shared.mjs
summary: Scan codebase for feature seam registrations and report active seams.
owns: Detection of whenEnabled, ifEnabled, createMemorySeamAdapter, and similar seam patterns.
boundaries: Read-only scan. Does not modify seams or enforce seam policy.
invariants: Pattern list must cover all seam registration helpers in the feature-seams module.
risks: Stale patterns if seam helper names change in feature-seams module.
securityPrivacy: Local filesystem only.
notesForLLM: Use this to audit temporary seams before release. Check for seams that should have been cleaned up.
related:
  - modules/feature-seams/public-api.mjs
  - docs/adr/0002-trunk-based-delivery.md
---

# seam-inventory.mjs
