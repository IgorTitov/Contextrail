---
fileId: contextrail-template:.claude:rules:security
module: .claude/rules
stability: evolving
steward: shared
api: Topic rule document
dependsOn:
  - .claude/CLAUDE.md
  - .claude/hooks/dangerous-command-blocker.py
  - .claude/skills/security-audit/SKILL.md
summary: Capture the short repository-local security rules that govern hooks, shell usage, imported skills, and default trust posture.
owns: The short security rule set for high-trust automation surfaces, destructive shell safeguards, and third-party import review.
boundaries: This file states concise security rules only. It must not become a full security playbook or duplicate detailed audit procedures.
invariants: Security rules stay short, reviewable, and aligned with actual hooks and audit skills used in the repo.
risks: Drift here can normalize unsafe imports, destructive commands, or over-trusting automation.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Read this rule file before enabling new hooks, agents, or imported skills. Keep edits concrete, reviewable, and aligned with the repo’s default trust posture.
tests: Manual review plus consistency checks against hook wiring and security-audit guidance
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/hooks/README.md
  - .claude/skills/security-audit/SKILL.md
related: .claude/agents/security-screener.md
---

# security.md
