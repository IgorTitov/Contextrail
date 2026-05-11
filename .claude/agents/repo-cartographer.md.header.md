---
fileId: contextrail-template:.claude:agents:repo-cartographer
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/repo-nav/SKILL.md
  - .claude/skills/hex-boundary/SKILL.md
summary: Route orientation and impact-analysis work to a subagent that quickly identifies owning modules, public APIs, affected docs, and likely test surfaces.
owns: The operational contract for repository orientation, ownership discovery, surface mapping, and first-pass impact analysis.
boundaries: This file defines when to use the repo-cartographer agent and what it should return. It must not drift into architecture policy, test policy, or generic documentation rules that belong elsewhere.
invariants: The agent should stay focused on mapping ownership, public boundaries, affected docs, and likely test surfaces rather than implementing changes itself.
risks: If this file drifts, agents may skip crucial impacted files or overstate certainty about ownership and test coverage.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent when the repo is unfamiliar or when impact analysis matters more than implementation. Return crisp maps and likely blast radius, not broad architectural essays.
tests: Manual invocation plus consistency review against .claude/skills/repo-nav/SKILL.md and .claude/skills/hex-boundary/SKILL.md
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/repo-nav/SKILL.md
  - .claude/skills/hex-boundary/SKILL.md
related:
  - .claude/agents/hex-architect.md
  - .claude/skills/repo-nav/README.md
---

# repo-cartographer.md
