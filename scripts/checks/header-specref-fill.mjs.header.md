---
fileId: contextrail-template:scripts:checks:header-specref-fill
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: Backfill specRefs on sidecars by mining file-path references from backlog acceptance criteria and test/BDD refs in docs/backlog/_generated/backlog.json.
owns: The backlog-to-file discovery pass that derives TPL-XXX trace links from acceptance criteria prose and adds them to sidecars missing specRefs.
boundaries: Additive only. Must not overwrite existing specRefs entries. Must read the canonical generated backlog JSON as source of truth, not ad-hoc markdown parsing.
invariants: Idempotent — files with any existing specRefs field are skipped. Re-running after success produces zero changes. Must never invent TPL IDs not present in backlog.json.
risks: Acceptance prose drift — if acceptance criteria stop citing explicit file paths, discoverable refs shrink silently. Coverage is best-effort, not complete.
notesForLLM: Run after backlog-sync.mjs regenerates backlog.json. This pass complements the stronger hand-written specRefs entries already present on flagship files; it only fills the gaps. If coverage is insufficient, the right fix is to enrich the backlog acceptance criteria, not to relax this script.
tests: scripts/checks/header-check.mjs
related:
  - docs/backlog/_generated/backlog.json
  - scripts/checks/backlog-sync.mjs
  - scripts/checks/header-dependency-fill.mjs
---

# header-specref-fill.mjs
