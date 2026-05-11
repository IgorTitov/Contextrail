---
fileId: contextrail-template:.claude:agents:security-screener
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/security-audit/SKILL.md
  - .claude/rules/security.md
  - .claude/hooks/dangerous-command-blocker.py
summary: Route enablement review for third-party skills, hooks, scripts, and suspicious shell behavior to a subagent that screens for destructive or high-trust risk.
owns: The operational contract for pre-enablement security review of imported or high-risk automation surfaces.
boundaries: This file defines the subagent’s review scope. It must not become a generic security policy document or duplicate the implementation details of security-audit scripts.
invariants: The agent stays focused on destructive behavior, exfiltration patterns, auto-commit surprises, permission bypasses, and other high-trust risks before enablement.
risks: Drift here can normalize dangerous imports or understate risky shell and hook behavior.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent before enabling external automation or when shell behavior looks suspicious. Return concrete risk findings and recommended disposition, not vague caution.
tests:
  - Manual invocation before imports or hook changes
  - consistency review against .claude/skills/security-audit/SKILL.md
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/security-audit/SKILL.md
  - .claude/rules/security.md
related:
  - .claude/hooks/dangerous-command-blocker.py
  - .claude/hooks/README.md
---

# security-screener.md
