---
name: version-repair.test.mjs
description: Unit proofs for version-repair.mjs — isStampOnlyDiff, findLastContentChangeCommit, and repair pipeline edge cases.
type: tests
layer: tests
hexLayer: _none_
boundedContext: _none_
public: false
editPolicy: careful
steward: agent
purpose: 24 injected-git unit tests covering stamp-only detection, slim header detection, version field read/rewrite, git history parsing, and repairFile dry-run behavior.
linkedDocs:
  - scripts/checks/version-repair.mjs
specRefs:
  - TPL-248
---

# version-repair.test.mjs
