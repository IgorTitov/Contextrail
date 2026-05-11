---
fileId: contextrail-template:scripts:checks:sidecar-content-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/sidecar-content-check.mjs [--json]"
dependsOn:
  - node:child_process
  - node:fs
summary: Scan .header.md sidecars for suspicious prompt injection content.
owns: Pattern-based detection of agent-directed language in sidecar metadata fields.
boundaries: Scans purpose, summary, notes, notesForLLM, owns, boundaries fields. Excludes risks field.
invariants: Patterns must require agent-directed keywords to avoid false positives on engineering constraints.
risks: False positives if patterns are too broad. False negatives if injection techniques evolve.
securityPrivacy: Local filesystem only. Part of the prompt injection defense layer.
notesForLLM: When tightening patterns, test against the full sidecar corpus to avoid regressions.
related:
  - docs/guides/prompt-injection-defense.md
  - scripts/checks/_shared.mjs
---

# sidecar-content-check.mjs
