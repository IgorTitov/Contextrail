---
fileId: contextrail-template:scripts:checks:lib:import-resolver
module: scripts/checks/lib
stability: evolving
steward: shared
api: "resolveImportTypedefs({ portFile, moduleRoot, typedefs, fs? }): { typedefs }"
dependsOn:
  - scripts/checks/lib/jsdoc-typedef-parser.mjs
summary: Resolve JSDoc `import('relative').TypeName` references inside a port file's typedefs by following imports within the same modules/<name>/ boundary, parsing target files, and rewriting the verbose import-type form to bare typedef names.
owns: The same-module typedef resolution rules used by capabilities-sync to handle PARTIAL ports whose JSDoc references shapes defined in sibling domain files.
boundaries: Reads files via an injectable fs adapter (defaults to node:fs). Hard-fails on cross-module references and on missing typedefs in target files. No code execution, no network.
invariants: Cross-module imports are forbidden and raise an error. Recursion is capped at depth 5 to break cycles. Type-string rewrite is idempotent. Same-file sibling typedefs (e.g. NotificationLevel referenced from Notification) are pulled in transitively.
risks: Resolver drift could silently inline the wrong typedef or fail to detect a cross-module boundary violation, both of which would corrupt downstream manifest capabilities blocks.
securityPrivacy: File reads only; no network or code execution.
notesForLLM: ADR-0010 "Domain shape resolution" locks in this design — inlining domain shapes into ports is rejected, the generator MUST follow imports within the module boundary instead. Cross-module imports MUST throw with a clear error message naming the offending file and import path.
specRefs:
  - TPL-183
  - TPL-178
tests:
  - tests/unit/import-resolver.test.mjs
linkedDocs:
  - docs/adr/0010-manifest-capabilities.md
  - docs/prd/manifest-capabilities.md
related:
  - scripts/checks/capabilities-sync.mjs
  - scripts/checks/lib/jsdoc-typedef-parser.mjs
---

# import-resolver.mjs
