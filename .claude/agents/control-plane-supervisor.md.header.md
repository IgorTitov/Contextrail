---
fileId: contextrail-template:.claude:agents:control-plane-supervisor
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/rules/architecture.md
  - .claude/skills/control-plane-audit/SKILL.md
  - scripts/checks/control-plane-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
summary: Route cross-plane drift auditing to a narrow supervisor agent that checks agreement between canonical instructions, rules, scripts, hooks, tasks, docs, sidecars, and proof surfaces.
owns: The operational contract for cross-plane drift detection across canonical instructions, rules, indices, scripts, tasks, hooks, docs, sidecars, and tests.
boundaries: This file defines an audit role only. It must not become a second policy document, replace specialist agents, or silently own all repository decisions.
invariants: The agent runs the deterministic control-plane check first, then focuses only on semantic drift the script cannot fully judge.
risks: Drift here can blur authority boundaries, hide stale workflows, or normalize process claims that are not backed by executable checks.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent after control-plane changes or when workflow drift is suspected. Audit agreement and route fixes to the real owner instead of broadening this role.
tests:
  - node scripts/checks/control-plane-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - scripts/checks/README.md
  - docs/adr/0002-trunk-based-delivery.md
related:
  - .claude/agents/repo-architect.md
  - .claude/agents/header-guardian.md
  - .claude/agents/readme-guardian.md
  - .claude/agents/test-guardian.md
---

# control-plane-supervisor.md
