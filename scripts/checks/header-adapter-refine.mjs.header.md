---
fileId: contextrail-template:scripts:checks:header-adapter-refine
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: One-shot refinement pass that replaces templated "{vendor}-adapter for the {mod} module" summary/notesForLLM on adapter sidecars with vendor-aware guidance derived from a curated vendor dictionary.
owns: The curated vendor dictionary mapping adapter filename patterns to accurate "when to use this adapter" guidance used to strengthen weak auto-generated semantic fields.
boundaries: Must not fabricate behavior it cannot verify from conventional vendor semantics. Only rewrites sidecars whose summary still matches the templated weak shape; leaves strong hand-written sidecars untouched. Unknown vendors are left as-is rather than guessed.
invariants: Idempotent — re-running after success produces zero changes because the refined summary no longer matches the templated regex; must only touch files under modules/*/adapters/.
risks: Vendor dictionary drift — if a new adapter convention appears (e.g. a new transport type) its entries need to be added here, otherwise new weak sidecars will slip through. Dictionary claims should match conventional vendor semantics, not module-specific oddities.
notesForLLM: This script is intentionally conservative — it only improves sidecars that already had templated weak text. To improve a strong hand-written sidecar, edit the sidecar directly rather than touching this script. When adding a new vendor entry, verify the conventional meaning (not the specific repo implementation) to avoid over-claiming.
tests: scripts/checks/header-check.mjs
related:
  - scripts/checks/header-dependency-fill.mjs
  - scripts/checks/header-semantic-fill.mjs
  - .claude/skills/header-sidecar/SKILL.md
---

# header-adapter-refine.mjs
