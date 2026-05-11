---
fileId: contextrail-template:scripts:build-single
module: scripts
stability: evolving
steward: shared
api: "CLI: node scripts/build-single.mjs"
dependsOn:
  - apps/starter/ (source files and directory structure)
  - scripts/import-graph.mjs
summary: Copy starter app files into a self-contained dist/ folder with mode-appropriate configuration.
owns: The build/copy logic, CLI argument parsing, HTML patching, and dist/ output structure.
boundaries: Must not become a bundler, dev server, or multi-app build orchestrator. Output is always a flat copy of the starter app with mode-patched HTML.
invariants: Must remain a zero-bundler-dependency script using only Node.js built-in fs APIs. CLI flags must map deterministically to output configuration. Must not silently overwrite an existing dist/ without a clean step.
risks: Silent path resolution bugs can copy wrong source files into dist/ and produce a broken deployment artifact without failing the build.
notesForLLM: The script uses only Node.js built-in fs/path APIs — no bundler, no external deps. Entry point is the bottom-of-file main() call guarded by import.meta.url. patchHtml injects the mode into the HTML before copying. Read parseArgs and getSourcePaths before touching any path logic. The --treeshake flag uses parseImports from import-graph.mjs for synchronous graph traversal.
tests:
  - tests/unit/build-single.test.mjs
  - tests/unit/build-treeshake.test.mjs
specRefs:
  - TPL-032
  - TPL-095
related:
  - docs/backlog/platform-seams.md
  - docs/backlog/tree-shaking.md
---

# build-single.mjs
