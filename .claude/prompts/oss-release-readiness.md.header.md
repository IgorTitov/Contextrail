---
fileId: contextrail-template:.claude:prompts:oss-release-readiness
module: .claude/prompts
stability: evolving
steward: shared
api: Documentation
summary: Adversarial 6-angle open-source publication readiness audit prompt.
owns: The adversarial open-source readiness audit prompt for this repository.
boundaries: Audit only — reports findings but does not fix them. Complements pre-release-audit.md with a different perspective.
invariants: Must cover security, community health, and adopter experience angles not covered by the track-based audit.
risks: Audit scope drift if repo structure changes without updating the prompt.
securityPrivacy: No secrets. Audit prompt only.
notesForLLM: This prompt is designed for a fresh Claude session. It takes an adversarial stance to surface issues that track-based audits miss.
linkedDocs: .claude/prompts/pre-release-audit.md
related: .claude/prompts/pre-release-audit.md
---

# oss-release-readiness.md
