---
fileId: contextrail-template:.claude:skills:changelog-release:SKILL
module: .claude/skills/changelog-release
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - scripts/checks/changelog-sync.mjs
  - scripts/mergezip.mjs
  - scripts/testall-mergezip.mjs
  - CHANGELOG.md
summary: Keep changelog, version, and artifact preparation deterministic around commit-ready changes using the repository’s current mergezip-centered release flow.
owns: The reusable method for changelog sync, commit-finalization checks, and mergezip-based artifact preparation.
boundaries: This file defines a reusable finalization method only. It must not become a second release-policy document or invent legacy archive flows.
invariants: The skill stays aligned with the current .backups plus mergezip workflow and preserves script-first changelog and artifact preparation.
risks: Drift here can create contradictory release guidance, duplicate version bumps, weak changelog entries, or missing artifacts.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this skill when a change is genuinely close to commit or release packaging. Preserve the simple mergezip-centered flow and avoid inventing hidden automation.
tests:
  - node scripts/checks/changelog-sync.mjs --check
  - manual skill use near commit finalization
linkedDocs: .claude/CLAUDE.md
related:
  - scripts/checks/changelog-sync.mjs
  - scripts/mergezip.mjs
  - scripts/testall-mergezip.mjs
  - .claude/agents/release-operator.md
---

# SKILL.md
