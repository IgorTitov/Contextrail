---
name: security-audit
description: Audit third-party skills, agents, hooks, and scripts for destructive commands, exfiltration, and unsafe permission patterns.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Audit third-party skills, agents, hooks, and scripts for destructive commands, exfiltration paths, unsafe trust assumptions, and hidden automation.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# security-audit

## Audit for

- destructive shell commands
- network exfiltration
- hidden auto-commit behavior
- bypass-style permissions
- unreviewed hook automation
- writes to sensitive paths

## Command

```bash
python3 .claude/skills/security-audit/scripts/audit-skill.py <path>
```
