---
fileId: contextrail-template:.claude:skills:changelog-release:README
module: .claude/skills/changelog-release
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/changelog-release/SKILL.md
  - scripts/checks/changelog-sync.mjs
  - scripts/mergezip.mjs
summary: Introduce the changelog-release skill folder and clarify when to use it during commit preparation and release packaging.
owns: The folder-level entrypoint for the changelog-release skill and its current release-flow context.
boundaries: This file is a quick-use folder guide only. It must not duplicate the detailed finalization method from SKILL.md.
invariants: The README stays short, release-flow aware, and aligned with the current mergezip-centered process.
risks: Drift here can cause agents to miss the skill’s real timing and its dependency on the current mergezip flow.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file for quick orientation, then use SKILL.md for the real finalization method.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/changelog-release/SKILL.md
  - scripts/mergezip.mjs
---

# README.md
