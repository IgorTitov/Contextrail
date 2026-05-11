---
fileId: contextrail-template:.claude:agents:release-operator
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/changelog-release/SKILL.md
  - .claude/skills/spec-traceability/SKILL.md
  - scripts/mergezip.mjs
  - scripts/testall-mergezip.mjs
  - CHANGELOG.md
summary: Route commit-finalization work to a subagent that checks changelog, version, traceability, and .backups artifact readiness before mergezip-based release steps.
owns: The operational contract for commit-ready release handling, including changelog sync, mergezip use, and .backups artifact verification.
boundaries: This file defines agent behavior for finalization only. It must not quietly become a second release workflow specification or introduce legacy external archive flows.
invariants: The current artifact path is .backups/; mergezip remains the release entrypoint; the agent should verify readiness before running artifact steps, not bypass the documented workflow.
risks: Drift here can create duplicate version bumps, missing artifacts, or contradictory operator guidance at commit time.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent when a change is genuinely ready to finalize. Preserve the simple mergezip-centered workflow and avoid inventing hidden automation.
tests: Manual invocation plus consistency review against scripts/mergezip.mjs and scripts/testall-mergezip.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/changelog-release/SKILL.md
related:
  - scripts/mergezip.mjs
  - scripts/testall-mergezip.mjs
  - CHANGELOG.md
---

# release-operator.md
