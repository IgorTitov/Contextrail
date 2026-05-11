---
name: version-repair.mjs
description: Walk git history per file to determine the true last-content-change commit and repair @version fields to truth.
type: tooling
layer: tooling
hexLayer: _none_
boundedContext: _none_
public: false
editPolicy: careful
steward: agent
purpose: Retroactive @version repair tool — classifies each commit as stamp-only vs content-change using git diff analysis, then rewrites @version to match VERSION at the actual last content-change commit. Supports --dry-run, --write, --scope=<prefix>, --skip-generated flags.
linkedDocs:
  - docs/adr/0009-sidecar-first-headers.md
  - docs/adr/0014-header-stamp-on-commit.md
specRefs:
  - TPL-248
---

# version-repair.mjs
