---
fileId: contextrail-template:scripts:checks:header-port-fill
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: Backfill portCategory and contractTests on port sidecars from a curated port-name dictionary and the tests/contract glob.
owns: The curated port-name → category mapping that pairs with adapterType so agents can reason about port↔adapter compatibility from sidecars alone.
boundaries: Additive only. Must not overwrite existing portCategory or contractTests entries. Touches only files matching modules/<mod>/ports/<name>-port.<ext>. Categories must reflect conventional port semantics, not module-specific quirks.
invariants: Idempotent — re-running after success produces zero changes. Never invents contract test paths; only references files that physically exist under tests/contract/.
risks: Dictionary drift — when a new port type appears (e.g. a new ai-pipeline stage) its entry must be added here, otherwise it lands in the unmatched list. Category granularity is intentionally coarse — over-splitting categories defeats the purpose of pairing with adapterType.
notesForLLM: Run after architecture-check.mjs to confirm port files are in the expected layout. To improve a hand-written sidecar, edit the sidecar directly rather than touching this script. When adding a new port category, verify the conventional meaning (not the specific repo implementation) to avoid over-claiming.
tests: scripts/checks/header-check.mjs
related:
  - scripts/checks/header-dependency-fill.mjs
  - scripts/checks/architecture-check.mjs
  - tests/contract/
---

# header-port-fill.mjs
