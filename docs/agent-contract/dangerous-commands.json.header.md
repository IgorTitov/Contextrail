---
fileId: contextrail-template:docs:agent-contract:dangerous-commands
module: docs/agent-contract
stability: evolving
steward: shared
api: Documentation
summary: Shared blocklist of dangerous shell commands and sensitive path patterns for all agent adapters.
owns: dangerousCommands patterns, sensitivePathFragments, and sensitivePathExceptions lists.
boundaries: Data-only JSON. Consumed by agent hooks and adapters. Does not execute commands.
invariants: Pattern list must cover rm -rf, force push, reset --hard, and similar destructive operations.
risks: Missing patterns could allow destructive commands through agent hooks.
securityPrivacy: Security-sensitive — defines the safety boundary for agent shell access.
notesForLLM: When adding new dangerous patterns, update both this file and the hook that consumes it.
related:
  - .claude/hooks/run-dangerous-command-blocker.mjs
  - .claude/rules/security.md
---

# dangerous-commands.json
