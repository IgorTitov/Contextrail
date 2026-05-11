---
fileId: contextrail-template:scripts:checks:lib:readme
module: scripts/checks/lib
stability: evolving
steward: shared
summary: Landing page for shared pure-function helper libraries consumed by scripts/checks/*.mjs control-plane scripts.
owns: Discovery entry point for the parser/helper libraries that feed capabilities-sync and similar generators.
boundaries: Documentation only; no executable logic lives in this README.
invariants: Every library listed here must remain pure (no file I/O, no network, no side effects, zero runtime dependencies beyond Node built-ins).
risks: Drift between this README and the actual library inventory would mislead future contributors about which helpers are available and what subset they support.
securityPrivacy: Documentation only.
notesForLLM: When adding a new library under scripts/checks/lib/, update this README with a short bullet describing its purpose and the consuming script. Keep the "Design rules" section in sync with ADR-0010 and any successor ADRs.
specRefs:
  - TPL-179
  - TPL-180
  - TPL-178
linkedDocs:
  - docs/adr/0010-manifest-capabilities.md
related:
  - scripts/checks/capabilities-sync.mjs
---

# README.md
