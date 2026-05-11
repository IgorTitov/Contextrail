---
fileId: contextrail-template:tests:unit:agent-contract-sync:test:mjs
module: tests/unit
stability: evolving
steward: shared
api: Test
dependsOn:
  - scripts/agent-contract/sync.mjs
  - scripts/agent-contract/check.mjs
  - docs/agent-contract/compatibility-contract.json
  - LOCAL.md
  - MICRO.md
summary: Prove renderLocalMd and renderMicroMd produce slim adapters within hard token caps and free of Claude-class concepts.
owns: Test coverage for the local-tier compatibility adapters.
boundaries: Tests adapter generation purity and validator behavior; does not exercise the full sync pipeline.
invariants: LOCAL.md ≤5K tokens; MICRO.md ≤2K tokens; neither contains "subagent", "MCP", or "slash command".
risks: If these tests drift from sync.mjs/check.mjs exports, slim-adapter regressions will go undetected.
securityPrivacy: Documentation tests only; no secrets.
notesForLLM: Run via `node --test tests/unit/agent-contract-sync.test.mjs`.
tests:
  - node --test "tests/unit/agent-contract-sync.test.mjs"
linkedDocs:
  - docs/agent-contract/README.md
related:
  - tests/contract/agent-adapter-consistency.test.mjs
  - tests/contract/agent-contract-content-validation.test.mjs
generated: false
specRefs:
  - TPL-209
usmRefs: _none_
---

# agent-contract-sync.test.mjs
