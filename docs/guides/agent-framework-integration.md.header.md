---
fileId: contextrail-template:docs:guides:agent-framework-integration
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - AGENTS.md
  - .claude/CLAUDE.md
  - docs/agent-contract/compatibility-contract.json
  - docs/agent-contract/README.md
summary: Guide for integrating third-party AI coding agents with the template using Pi as a worked example
owns: Integration guide for third-party AI coding agents, including compatibility matrix, Pi example, and generic pattern.
boundaries: Must not duplicate agent-contract README or CLAUDE.md content — link to them. Must not become a second process contract.
invariants: Compatibility matrix must reflect actual file layout and which agents read which files. Pi instructions must match current Pi CLI behavior.
risks: Pi CLI behavior may change across versions. Verify instructions against Pi docs when updating.
securityPrivacy: No secrets. Pi API keys are user-managed and must not be committed.
notesForLLM: Use this guide when a user asks about connecting a non-Claude, non-Codex AI agent to the template. Pi is the worked example but the pattern applies to any agent that reads markdown project instructions.
linkedDocs:
  - docs/guides/README.md
  - docs/guides/ai-development-workflow.md
  - docs/agent-contract/README.md
related:
  - AGENTS.md
  - .claude/CLAUDE.md
  - .agents/skills/README.md
---

# agent-framework-integration.md
