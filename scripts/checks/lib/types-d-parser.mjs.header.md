---
fileId: contextrail-template:scripts:checks:lib:types-d-parser
module: scripts/checks/lib
stability: evolving
steward: shared
api: "parseTypesDeclaration(source: string): { typedefs: Record<string, object> }"
dependsOn: []
summary: Pure TypeScript interface parser for sibling types.d.ts files, extracting port method signatures and supporting record shapes within the ADR-0010 bounded subset.
owns: The string-to-structure extraction rules for TypeScript `interface` declarations consumed by capabilities-sync.
boundaries: Input is a source string; output is a plain object whose shape is byte-parallel to parseJsdocTypedefs(). No file I/O, no code execution, no network, no requires.
invariants: Deterministic, side-effect-free. Supports only the subset enumerated in ADR-0010 "Port-types convention"; unsupported features throw a line-numbered Error instead of crashing. Output shape is interchangeable with the JSDoc parser — downstream consumers cannot tell which source produced a typedef.
risks: Parser drift could silently mis-extract method signatures or accept syntax outside the bounded subset, feeding bad data into manifest capabilities blocks. Escalation on unsupported syntax is non-negotiable — widening the grammar requires a fresh ADR-0010 review, not an inline patch.
securityPrivacy: Pure function; no external I/O.
notesForLLM: Extend carefully. Add unit cases in tests/unit/types-d-parser.test.mjs before widening the grammar. Keep the output shape parallel to parseJsdocTypedefs() so buildCapabilitiesFromTypedefs() stays source-agnostic. If a legitimate port needs a TS feature outside the subset, escalate to the user instead of patching the parser.
specRefs:
  - TPL-180
  - TPL-178
tests:
  - tests/unit/types-d-parser.test.mjs
linkedDocs:
  - docs/adr/0010-manifest-capabilities.md
  - docs/prd/manifest-capabilities.md
related:
  - scripts/checks/capabilities-sync.mjs
  - scripts/checks/lib/jsdoc-typedef-parser.mjs
---

# types-d-parser.mjs
