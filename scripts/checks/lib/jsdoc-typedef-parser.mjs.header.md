---
fileId: contextrail-template:scripts:checks:lib:jsdoc-typedef-parser
module: scripts/checks/lib
stability: evolving
steward: shared
api: "parseJsdocTypedefs(source: string): { typedefs: Record<string, object> }"
dependsOn: []
summary: Pure JSDoc @typedef parser that extracts port method signatures and supporting record shapes without touching the filesystem.
owns: The string-to-structure extraction rules for JSDoc @typedef blocks used by capabilities-sync.
boundaries: Input is a source string; output is a plain object. No file I/O, no code execution, no network, no requires.
invariants: Deterministic, side-effect-free, classifies typedefs as interface (all methods) or record (has fields); handles balanced braces in arrow-function parameter types.
risks: Parser drift could silently mis-extract method signatures and feed bad data into manifest capabilities blocks.
securityPrivacy: Pure function; no external I/O.
notesForLLM: Extend carefully. Add unit cases in tests/unit/jsdoc-typedef-parser.test.mjs before widening the grammar. TPL-180 adds a sibling types.d.ts parser — keep the output shapes parallel so downstream consumers cannot tell which source was used.
specRefs:
  - TPL-179
  - TPL-178
tests:
  - tests/unit/jsdoc-typedef-parser.test.mjs
linkedDocs:
  - docs/adr/0010-manifest-capabilities.md
  - docs/prd/manifest-capabilities.md
related:
  - scripts/checks/capabilities-sync.mjs
---

# jsdoc-typedef-parser.mjs
