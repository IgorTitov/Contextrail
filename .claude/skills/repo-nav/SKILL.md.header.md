---
fileId: contextrail-template:.claude:skills:repo-nav:SKILL
module: .claude/skills/repo-nav
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - README.md
  - .claude/agents/repo-cartographer.md
summary: Navigate the repository quickly by reading the right files in the right order and avoiding unnecessary deep dives into internal implementation detail.
owns: The reusable method for orienting quickly in the repository and choosing the smallest useful reading path.
boundaries: This file defines a reusable navigation method only. It must not become a catch-all architecture guide or replace focused impact-analysis prompts.
invariants: The skill stays focused on README first, public API second, tests third, and deep internals last unless evidence demands deeper inspection.
risks: Drift here can make agents wander through irrelevant internals or miss higher-signal public surfaces and tests.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this skill when the repository or module is unfamiliar. Prefer the smallest reading path that reveals ownership, API surface, and likely proof points.
tests: Manual skill use during repo orientation and impact analysis
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/agents/repo-cartographer.md
  - README.md
---

# SKILL.md
