---
fileId: contextrail-template:.claude:skills:security-audit:SKILL
module: .claude/skills/security-audit
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/security-audit/scripts/audit-skill.py
  - .claude/hooks/dangerous-command-blocker.py
  - .claude/rules/security.md
summary: Audit third-party skills, agents, hooks, and scripts for destructive commands, exfiltration paths, unsafe trust assumptions, and hidden automation.
owns: The reusable method for pre-enablement review of imported automation and suspicious shell or hook behavior.
boundaries: This file defines an audit method only. It must not become a generic security handbook or replace the concrete audit script and hook surface.
invariants: The skill stays focused on destructive actions, exfiltration, hidden auto-commit behavior, permission surprises, and risky trust assumptions.
risks: Drift here can normalize risky imports, understate destructive behavior, or miss hidden trust escalations.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this skill before enabling third-party automation or when shell behavior feels suspicious. Return concrete risk findings and recommended disposition.
tests:
  - Manual skill use before enabling external automation
  - consistency review against audit-skill.py
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/agents/security-screener.md
  - .claude/hooks/dangerous-command-blocker.py
  - .claude/rules/security.md
---

# SKILL.md
