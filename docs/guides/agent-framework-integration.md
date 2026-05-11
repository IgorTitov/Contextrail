<!-- @HEADER
@version 0.8.4 | 2026-05-10
@purpose Guide for connecting third-party AI coding agents to this template, with Pi as a practical example.
@sidecar agent-framework-integration.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Connecting Third-Party AI Coding Agents

This guide explains how to use AI coding agents beyond Claude Code and Codex with this template. It uses **Pi** (the TypeScript agent toolkit powering OpenClaw) as a practical example, but the pattern applies to any agent that reads markdown-based project instructions.

---

## What the template already provides

The template ships with a **vendor-neutral agent contract** architecture:

```
docs/agent-contract/
  compatibility-contract.json   ← canonical machine source of truth
  README.md                     ← human guide

.claude/CLAUDE.md               ← Claude Code adapter
AGENTS.md                       ← Codex adapter (also read by Pi, Aider, etc.)
.agents/skills/*/SKILL.md       ← generated workflow modules
```

The key insight: **`AGENTS.md` is not Codex-exclusive**. Many modern coding agents read `AGENTS.md` as project instructions — including Pi, Aider, and others. This means the template already works with more agents than just Claude Code and Codex.

## Compatibility matrix

| Template asset | Claude Code | Codex | Pi | Aider | Gemini CLI | Cline |
| --- | --- | --- | --- | --- | --- | --- |
| `.claude/CLAUDE.md` | reads | — | — | — | — | — |
| `AGENTS.md` | — | reads | reads | reads | — | reads |
| `.agents/skills/` | — | reads | reads | — | — | — |
| `.claude/skills/` | reads | — | importable | — | — | — |
| `scripts/checks/*` | via hooks | via bash | via bash | via bash | via bash | via bash |
| `.githooks/*` | automatic | automatic | automatic | automatic | automatic | automatic |
| `tests/*` | via bash | via bash | via bash | via bash | via bash | via bash |

**Bottom line**: any agent that reads `AGENTS.md` gets the full delivery contract, role routing, gates, and definition of done — for free. Git hooks and repo scripts enforce the same quality gates regardless of which agent runs them.

For the step-by-step commit ceremony (worktree create → work → coa-merge → teardown) used by Codex and Aider, see [cross-tool-ceremony.md](cross-tool-ceremony.md).

---

## Example: Integrating Pi

[Pi](https://github.com/badlogic/pi-mono) is a minimal TypeScript coding agent by Mario Zechner. It powers [OpenClaw](https://openclaw.ai/) and is available via `ollama launch pi` or `npm install -g @mariozechner/pi-coding-agent`.

### Step 1 — Install Pi

```bash
# Via npm
npm install -g @mariozechner/pi-coding-agent

# Or via Ollama
ollama launch pi
```

### Step 2 — Verify it reads AGENTS.md

Pi automatically loads `AGENTS.md` from the current directory and parent directories at startup. No configuration needed — just run Pi from the project root:

```bash
cd your-project
pi
```

Pi will read `AGENTS.md` and apply the delivery contract, role routing, and gates described there.

### Step 3 — Import shared skills (optional)

Pi can import skills from `.agents/skills/` automatically. It also supports importing Claude Code skills. Add to your Pi settings (`.pi/settings.json` or `~/.pi/agent/settings.json`):

```json
{
  "skillPaths": [
    ".agents/skills",
    ".claude/skills"
  ]
}
```

This gives Pi access to all 17 workflow skills: `tdd`, `feature-delivery`, `hex-boundary`, `acceptance-validation`, `bdd-playwright`, and others.

### Step 4 — Configure LLM provider

Pi supports multiple providers. Configure your preferred model:

```bash
# Use Claude (recommended — matches the template's primary agent)
pi --provider anthropic --model claude-sonnet-4-20250514

# Use a local model via Ollama
pi --provider ollama --model qwen3:32b

# Use OpenAI
pi --provider openai --model gpt-4.1
```

### Step 5 — Run quality gates

Pi uses bash to run commands, so all template quality gates work unchanged:

```bash
# Inside a Pi session, you can ask it to run:
node scripts/checks/architecture-check.mjs
node scripts/checks/header-check.mjs
node scripts/checks/test-gate.mjs
pnpm test:unit
```

The pre-commit git hook runs these automatically on commit, regardless of which agent made the changes.

---

## Generic pattern: connecting any coding agent

### What works automatically

If your agent reads `AGENTS.md` at project root:
- **Delivery contract** — principles, gates, definition of done
- **Role routing** — which sub-agent or skill handles which type of work
- **Command map** — all quality gate scripts and how to run them
- **Skill roster** — list of available workflow modules

If your agent respects `.githooks/`:
- **Pre-commit quality gates** — header-check, readme-check, architecture-check, test-gate, changelog-sync all run automatically

### What to configure manually

| Capability | How to connect |
| --- | --- |
| **Project instructions** | Point your agent at `AGENTS.md` (or `.claude/CLAUDE.md` if it supports that format) |
| **Skills / tools** | Import `.agents/skills/` or `.claude/skills/` if your agent supports external skill loading |
| **Quality gates** | Run `node scripts/checks/*.mjs` via bash — these are standalone Node scripts, not Claude-specific |
| **System map** | Point your agent at `docs/SYSTEM_MAP.md` for compact repo orientation (~1900 tokens full, ~950 focused) |
| **Module navigation** | Load `modules/X/manifest.json` + `public-api.mjs` header for any target module |

### What to avoid

- **Do not create a competing process contract.** The canonical source is `docs/agent-contract/compatibility-contract.json`. Your agent should follow the same rules, not define new ones.
- **Do not hand-edit generated files.** `AGENTS.md` and `.agents/skills/` are generated by `scripts/agent-contract/sync.mjs`. Edit the canonical contract, then regenerate.
- **Do not bypass quality gates.** The git hooks and scripts enforce the same standards for all agents. If a gate fails, fix the issue — do not skip the hook.

---

## Agent-specific notes

### Aider

[Aider](https://aider.chat/) reads `AGENTS.md` automatically. It focuses on Git-heavy workflows with automatic commits. The template's pre-commit hooks work well with Aider's auto-commit feature — they catch issues before the commit is created. For the commit ceremony specific to Aider, see [cross-tool-ceremony.md](cross-tool-ceremony.md).

### Gemini CLI

[Gemini CLI](https://github.com/google-gemini/gemini-cli) uses `GEMINI.md` for project instructions. You can create a `GEMINI.md` that points to `AGENTS.md`:

```markdown
# Project Instructions

See AGENTS.md for the full delivery contract, role routing, and quality gates.
```

Or symlink: `ln -s AGENTS.md GEMINI.md`

### Cline

[Cline](https://github.com/cline/cline) is a VS Code extension that reads `AGENTS.md`. It works with the template's quality gates through its built-in terminal. The 17 workflow skills under `.agents/skills/` are available as context when loaded.

### Cursor / Windsurf

These IDE agents use their own instruction formats (`.cursor/rules/` and `.windsurfrules` respectively). A thin pointer file that references `AGENTS.md` content can bridge the gap:

```markdown
# Rules

Follow the delivery contract in AGENTS.md.
Run quality gates from scripts/checks/ before considering work complete.
```

---

## When to promote an agent to first-class

The template currently has first-class adapters for Claude Code and Codex. Promoting a third agent to first-class means adding it to `compatibility-contract.json` and generating a dedicated adapter via `sync.mjs`.

**Criteria for promotion:**

1. **Adoption** — the agent is used by a significant share of the template's target audience
2. **Instruction format diverges** — `AGENTS.md` alone is insufficient; the agent needs its own adapter format
3. **Skill format diverges** — `.agents/skills/` is not compatible; the agent needs its own skill generation
4. **Maintenance cost is justified** — the adapter is small enough to keep in sync without adding significant drift risk

As of March 2026, Pi reads `AGENTS.md` and `.agents/skills/` natively, so it works without a dedicated adapter. If Pi's format diverges or its adoption grows significantly, promotion is a single slice: add to `compatibility-contract.json` → extend `sync.mjs` → generate `.pi/` adapter.

---

## Further reading

- [Agent contract architecture](../agent-contract/README.md) — how the shared contract and adapters work
- [AI development workflow](ai-development-workflow.md) — how to use the 17 agents and 18 skills
- [Pi documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/README.md) — Pi coding agent reference
- [Pi skills repository](https://github.com/badlogic/pi-skills) — community Pi skills (compatible with Claude Code and Codex)
