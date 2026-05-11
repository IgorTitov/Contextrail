---
fileId: contextrail-template:docs:_generated:readme
module: docs/_generated
stability: evolving
steward: shared
api: Documentation
summary: Landing page for docs/_generated/ — explains which deterministic generator owns each machine-written artifact, how to regenerate them, and how agents should consume them.
owns: The discoverability surface for docs/_generated/ — names every artifact, points at its generator script, names its drift-check command, and tells agents how to use the artifact instead of grepping the repository.
boundaries: Index page only. It must not duplicate the artifact contents, must not act as a generator, and must not become an alternative spec for what the JSON files contain. Update it when a new artifact is added or when a generator is renamed.
invariants: Every file inside docs/_generated/ has a row in the table; every row points at a real generator script and a real drift-check command.
notesForLLM: Read this file first if you land in docs/_generated/. Do not hand-edit any file in this folder — they are deterministic generator output and the pre-commit test-gate blocks drift.
linkedDocs:
  - docs/SYSTEM_MAP.md
  - scripts/checks/dependency-graph.mjs
  - scripts/checks/spec-sync.mjs
specRefs:
  - TPL-001
related:
  - docs/_generated/dependency-graph.json
  - docs/_generated/spec-index.json
---

# README.md
