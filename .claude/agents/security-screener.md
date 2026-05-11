---
name: security-screener
description: Audit third-party skills, hooks, scripts, and suspicious shell behavior before enablement. Use proactively for imports.
tools:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Bash
  - Grep
  - Glob
skills:
  - security-audit

permissionMode: default
memory: project
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Route enablement review for third-party skills, hooks, scripts, and suspicious shell behavior to a subagent that screens for destructive or high-trust risk.
@sidecar security-screener.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# security-screener

Use this subagent before enabling external skills, agents, hooks, or scripts.

Look for:

- destructive shell usage
- exfiltration patterns
- auto-commit surprises
- bypass permissions
