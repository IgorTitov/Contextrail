---
fileId: contextrail-template:docs:guides:tree-shaking
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - scripts/import-graph.mjs
  - scripts/build-single.mjs
summary: Explain how the import-graph analyzer and --treeshake build flag work, including usage examples, programmatic API, and known limitations.
owns: The canonical reference for the import-graph analyzer, --treeshake build flag, and their limitations.
boundaries: Does not duplicate deployment guide content. Covers tree-shaking mechanics only — not general build configuration.
invariants: CLI examples and API signatures must stay aligned with the actual implementation in import-graph.mjs and build-single.mjs. Limitations section must accurately reflect what the regex-based parser does NOT handle.
risks: Stale API signatures or wrong flag names in examples cause user confusion. Undocumented limitations can lead to incorrectly pruned modules in production.
notesForLLM: The analyzer is regex-based, not AST-based. It does not handle dynamic import() with variable specifiers, CommonJS require(), or aliased paths. The --treeshake flag is opt-in and conservative — it includes rather than excludes when ambiguous. Keep limitations section accurate.
linkedDocs: docs/guides/deployment.md
specRefs: TPL-096
related:
  - docs/guides/deployment.md
  - docs/backlog/tree-shaking.md
  - docs/prd/tree-shaking.md
---

# tree-shaking.md
