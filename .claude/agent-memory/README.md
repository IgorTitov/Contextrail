<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Agent memory git-tracking policy and security guidance.
@sidecar README.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Agent Memory

Agent memory files persist context across Claude Code conversations. They are stored per-agent under `.claude/agent-memory/<agent-name>/`.

## Git-tracking policy

Agent memory **is tracked in git** by design. This provides:

- **Auditability** — PR diffs show exactly what an agent "remembers"
- **Reproducibility** — any developer cloning the repo gets the same agent context
- **Collaboration** — team members can review and correct agent memory

### Security implications

Because agents load memory as trusted context, memory files are a prompt injection surface (see [Prompt Injection Defense Guide](../../docs/guides/prompt-injection-defense.md), Tier 7).

**Review rules:**

1. Treat memory file changes in PRs with the same scrutiny as instruction file changes
2. Memory files should contain project facts and slice context, not behavioral directives
3. Flag any memory file that contains action-oriented language ("always", "must", "delete", "skip", "ignore", "disable")
4. Add `.claude/agent-memory/` to CODEOWNERS so memory changes require maintainer review

### What belongs in memory

- Completed slice summaries and decisions
- Project context that spans multiple conversations
- Module-specific planning state

### What does NOT belong in memory

- Behavioral overrides ("always do X", "never do Y") — those belong in `.claude/rules/`
- Secrets, tokens, or credentials
- Temporary debugging notes — delete after the issue is resolved
- Duplicates of information already in docs, ADRs, or code comments

## Structure

```
.claude/agent-memory/
├── README.md              ← this file
├── product-planner/       ← product-planner agent memory
│   ├── MEMORY.md          ← index of memory files
│   └── project_*.md       ← individual memory entries
└── <agent-name>/          ← other agents as needed
```

Each agent folder follows the same pattern: a `MEMORY.md` index plus individual memory files.
