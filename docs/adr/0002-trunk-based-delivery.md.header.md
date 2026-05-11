---
fileId: contextrail-template:docs:adr:0002-trunk-based-delivery
module: docs/adr
stability: evolving
steward: shared
api: ADR document
dependsOn:
  - .claude/CLAUDE.md
  - .githooks/pre-commit
  - scripts/checks/test-gate.mjs
  - scripts/mergezip.mjs
  - scripts/testall-mergezip.mjs
summary: Record the canonical trunk-based delivery model for this template, including atomic slice definition, Branch by Abstraction, temporary-seam coordination, and interaction with checks, hooks, and artifacts.
owns: One ADR that defines how this template delivers changes through trunk, abstraction seams, proof, and artifact handling.
boundaries: This file records one durable workflow decision only. It must not become a release checklist dump or a general design notebook.
invariants: Trunk remains the primary integration line; unfinished behavior reaches trunk only behind a safe seam or flag; old behavior stays active until the new path is proven.
risks: If this ADR drifts, future maintainers may reintroduce long-lived branch thinking or ship unfinished behavior without a stable seam.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Treat this ADR as the operational source for trunk-based delivery in this repo. Keep it concrete and aligned with the real scripts and hooks.
tests:
  - node scripts/checks/control-plane-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .githooks/README.md
  - tests/README.md
  - .claude/skills/trunk-bba/SKILL.md
related:
  - docs/adr/0001-template-scope.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
---

# 0002-trunk-based-delivery.md
