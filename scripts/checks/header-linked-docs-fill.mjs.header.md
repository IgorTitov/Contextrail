---
fileId: contextrail-template:scripts:checks:header-linked-docs-fill
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: Backfill linkedDocs on module sidecars by pointing at the nearest sibling README.md when one exists.
owns: The "nearest README" discovery rule used to add a single human-facing navigation hop to module sidecars.
boundaries: Additive only. Must not overwrite existing linkedDocs entries. Touches only files under modules/. Skips README.md itself.
invariants: Idempotent — re-running after success produces zero changes. Never invents README paths; only references files that physically exist on disk.
risks: Coarse heuristic — the nearest sibling README is not always the best human-facing context. The right fix for a sidecar that needs richer linkedDocs is to edit it directly rather than to make this heuristic smarter.
notesForLLM: This script is intentionally minimal. It only fills the gap where a README exists and the sidecar simply forgot to mention it.
tests: scripts/checks/header-check.mjs
related:
  - scripts/checks/header-port-fill.mjs
  - scripts/checks/header-message-keys-fill.mjs
---

# header-linked-docs-fill.mjs
