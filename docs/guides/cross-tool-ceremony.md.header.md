---
fileId: contextrail-template:docs:guides:cross-tool-ceremony
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - AGENTS.md
  - docs/guides/byollm-feature-dispatch.md
  - docs/guides/agent-framework-integration.md
  - scripts/coa-worktree.mjs
  - scripts/coa-merge.mjs
summary: Unified COA commit ceremony guide for Codex CLI and Aider users
owns: Ceremony walkthrough for non-Claude-Code agents; Codex and Aider specific setup; common ceremony rules and troubleshooting.
boundaries: Must not duplicate CLAUDE.md ceremony content verbatim — reference it. Must not become a second process contract. Tool-specific invocations belong here; shared policy belongs in development.md.
invariants: Ceremony steps must match coa-worktree.mjs and coa-merge.mjs actual behavior. Codex and Aider sections must accurately describe how each tool reads project context.
risks: coa-merge step numbering may change; verify against scripts/coa-merge.mjs when updating.
securityPrivacy: No secrets. Model API keys are user-managed and must not be committed.
notesForLLM: Use this guide when a Codex or Aider session needs ceremony instructions. The four-step loop in section 2 is the canonical reference. Section 5 (common rules) applies to all agents including Claude Code.
linkedDocs:
  - docs/guides/README.md
  - docs/guides/agent-framework-integration.md
  - docs/guides/byollm-feature-dispatch.md
  - docs/guides/local-frameworks.md
  - AGENTS.md
related:
  - .claude/CLAUDE.md
  - .claude/rules/development.md
  - scripts/coa-worktree.mjs
  - scripts/coa-merge.mjs
---

# cross-tool-ceremony.md
