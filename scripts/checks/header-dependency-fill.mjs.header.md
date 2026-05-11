---
fileId: contextrail-template:scripts:checks:header-dependency-fill
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: Batch fill machine-verifiable dependency fields (allowedDependencies, forbiddenDependencies, adapterType) on module sidecars based on hex layer and adapter naming.
owns: Per-layer canonical dependency rule tables and the adapter-name → adapterType classifier used to bulk-populate COA-relevant machine fields across module sidecars.
boundaries: One-shot structural fill. Must not rewrite existing allowedDependencies/forbiddenDependencies/adapterType entries; must stay aligned with architecture-check.mjs rules (that script remains the enforcer).
invariants: Must only touch code files under modules/ (.mjs/.cjs/.js/.ts/.d.ts); must skip READMEs and manifests; must be idempotent — rerunning after success produces zero changes.
risks: Rule drift — if architecture-check.mjs changes its layer rules, this script's canonical tables can silently fall out of sync and report stale guidance to agents.
notesForLLM: This fills documentation-grade machine fields consumed by agents for navigation. It does not enforce anything at runtime; the enforcement source of truth is scripts/checks/architecture-check.mjs. Keep the two in sync when hex rules evolve.
tests: scripts/checks/header-check.mjs
related:
  - scripts/checks/architecture-check.mjs
  - scripts/checks/header-semantic-fill.mjs
  - .claude/skills/header-sidecar/SKILL.md
---

# header-dependency-fill.mjs
