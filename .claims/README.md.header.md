---
fileId: contextrail-template:.claims:README
module: .claims
stability: evolving
steward: shared
api: Documentation
summary: Documentation for the .claims/ inter-agent coordination directory — claim format, lifecycle, and when-required table.
owns: The canonical reference for claim file format, lifecycle, and coordination rules.
boundaries: Documentation only. Must not contain executable logic.
invariants: Claim schema and field reference must match what claim-check.mjs expects.
risks: Schema drift between this README and claim-check.mjs validation.
linkedDocs:
  - docs/design/inter-agent-coordination-protocol.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
related: scripts/checks/claim-check.mjs
notesForLLM: Reference example. Use claim-check.mjs --create to generate real claims.
---

# README.md
