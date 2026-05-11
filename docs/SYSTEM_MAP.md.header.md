---
fileId: contextrail-template:docs:SYSTEM_MAP
module: docs
stability: evolving
steward: shared
api: Documentation
dependsOn: modules/*/manifest.json
summary: Ultra-compact system entry point for AI agents with limited context windows. Load this FIRST.
owns: The ultra-compact system overview that agents load first. Module index, dependency graph, and navigation pointers.
boundaries: Full file is ~2200 tokens on the shipped v0.8.0 baseline; focused load (category index + one category + bottom sections) is ~992. No API details or code examples; point readers to deeper tiers instead.
invariants: Module count, names, category assignments, dependency arrows, and file counts must match actual modules/ directory and manifest.json files.
risks: Stale if modules are added/removed/renamed without updating this file. Category assignments may need review when module count crosses ~60.
securityPrivacy: No secrets.
notesForLLM: This is your FIRST file. Load it before deep-reading modules. It gives the whole-repo map in about 2200 tokens, or a focused path in about 992. Find the target category first, then descend into one module surface and only then into source files if implementation detail is actually needed.
linkedDocs:
  - docs/module-catalog.md
  - docs/technical-reference.md
  - .claude/CLAUDE.md
related:
  - docs/_generated/dependency-graph.json
  - modules/*/manifest.json
---

# SYSTEM_MAP.md
