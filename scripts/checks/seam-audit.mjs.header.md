---
fileId: contextrail-template:scripts:checks:seam-audit
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/seam-audit.mjs"
dependsOn: scripts/checks/_shared.mjs
summary: Implement the seam-audit repository script.
owns: Static analysis of seam registration and guard usage across the codebase; detection of orphaned seams (registered but never guarded) and ghost seams (guarded but never registered).
boundaries: Must not modify the codebase; must remain a read-only reporting tool. Must not evolve into a feature-flag management CLI or a runtime toggle system.
invariants: Output must be deterministic for a given repo snapshot; --json output must remain machine-parseable; orphaned and ghost seam categories must stay distinct and clearly labelled; exit code must be non-zero when warnings are present.
risks: Regex patterns for .register() and whenEnabled/ifEnabled/.isEnabled() may drift from actual module conventions and produce false-positive or false-negative seam reports without obvious failure.
notesForLLM: "This script is read-only analysis only — never write or mutate files here. The two scan categories are registrations (extractSeamRegistrations: .register() and config object patterns) and guard usages (extractSeamUsages: whenEnabled/ifEnabled/.isEnabled()). Orphaned = registered but no guard usage found. Ghost = guard usage found but no registration found. Extend regex patterns carefully; a missed pattern produces silent false negatives rather than noisy errors."
tests:
  - scripts/checks/header-check.mjs
  - "manual invocation: node scripts/checks/seam-audit.mjs"
linkedDocs: docs/design/feature-seams.md
specRefs: TPL-042
---

# seam-audit.mjs
