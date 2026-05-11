---
name: readme-discipline
description: Keep README.md in every meaningful folder and keep folder intent explicit for humans and LLMs.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Keep README.md present in every meaningful folder and make each folder’s purpose, boundaries, and common operations obvious to humans and agents.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# readme-discipline

## Rule

Every meaningful folder should have a README that states:

- purpose
- what belongs here
- what does not belong here
- common operations
- where to look next

## Commands

```bash
node scripts/checks/readme-fix.mjs
node scripts/checks/readme-check.mjs
```
