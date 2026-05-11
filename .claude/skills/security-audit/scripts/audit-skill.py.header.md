---
fileId: contextrail-template:.claude:skills:security-audit:scripts:audit-skill
module: .claude/skills/security-audit/scripts
stability: evolving
steward: human
api: "Helper CLI: python .claude/skills/security-audit/scripts/audit-skill.py <path>"
dependsOn:
  - python pathlib
  - python json
  - local repository files
summary: Scan a local directory of skills, agents, or scripts for risky patterns so the security-audit skill has a deterministic first-pass helper.
owns: The local helper that scans candidate automation files for risky patterns used by the security-audit skill.
boundaries: This file is a lightweight scanning helper only. It must not become a full policy engine, networked scanner, or auto-remediation tool.
invariants: The script stays local, deterministic, pattern-based, and limited to first-pass findings that a human or agent still interprets.
risks: Drift here can create false confidence, miss risky patterns, or produce noisy output that obscures real findings.
securityPrivacy: Local helper content only; avoid embedding secrets or networked side effects.
notesForLLM: Keep this helper local and deterministic. It should surface suspicious patterns for review, not silently decide trust or remediation.
tests: Manual helper execution against known-safe and known-risk sample directories
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/security-audit/SKILL.md
  - .claude/agents/security-screener.md
---

# audit-skill.py
