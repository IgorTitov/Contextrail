---
fileId: contextrail-template:scripts:import-graph
module: scripts
stability: evolving
steward: shared
api: "CLI: node scripts/import-graph.mjs; Programmatic: parseImports(source), analyzeImportGraph(entryPath, options?)"
dependsOn:
  - node:fs
  - node:path
  - node:url
summary: Trace ES module imports from an entry file via regex-based static analysis and determine which files and module directories are reachable.
owns: Regex-based ES module import parsing and recursive reachability analysis for the build tree-shaking feature.
boundaries: Must not become a bundler, module resolver with alias support, or AST-based parser. Must not depend on external npm packages.
invariants: Zero external dependencies — only Node.js built-ins allowed. parseImports must remain synchronous. analyzeImportGraph must handle circular imports without infinite recursion. Regex-based parsing only — no AST.
risks: Regex drift can misparse multi-line import statements or import expressions inside block comments, silently dropping reachable files from the graph and causing incorrect module pruning.
notesForLLM: Parsing is line-by-line with regex — not AST. Dynamic import() with variables is not detected. Block-comment filtering is not implemented; only single-line // comments are skipped. resolveSpecifier handles .mjs/.js extensions and index files but not import maps or aliases. The --treeshake integration point is in build-single.mjs which calls analyzeImportGraph synchronously using a wrapper. Keep parseImports and analyzeImportGraph signatures stable — they are part of the programmatic API consumed by build-single.mjs.
tests: tests/unit/import-graph.test.mjs
linkedDocs: docs/guides/tree-shaking.md
specRefs: TPL-094
related:
  - scripts/build-single.mjs
  - tests/unit/import-graph.test.mjs
  - docs/guides/tree-shaking.md
---

# import-graph.mjs
