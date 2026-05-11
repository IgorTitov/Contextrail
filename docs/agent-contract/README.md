<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Describe the canonical Claude↔Codex compatibility layer, its source of truth, generated adapters, migration notes, and verification steps.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# agent-contract

This folder is the vendor-neutral compatibility layer for running the same repository through Claude, Codex, and Cursor.

## Source of truth

**Canonical machine source:** `docs/agent-contract/compatibility-contract.json`

**Canonical human guide:** `docs/agent-contract/README.md`

The JSON file is the only shared process contract that adapters are generated from. `AGENTS.md` and the generated Codex skills are adapters, `.cursorrules` is the Cursor adapter, and `.claude/CLAUDE.md` remains the Claude adapter. All three are generated from the same contract.

## Schema v2 — agent capability tiers

`schemaVersion: 2` introduces a top-level `agentProfiles` array describing three capability tiers (`frontier`, `mid`, `small`) plus a `capabilityTier` field on every entry in `roles` and `skills` naming the **minimum** profile that can fulfill it. The contract names tiers by capability, not by vendor — concrete model recommendations live in `docs/guides/local-frameworks.md` (landing across TPL-208..215).

The tier vocabulary lets Contextrail credibly support mixed teams of agents:

- **frontier** — frontier-class hosted models with rich harness tooling (Claude Code, Codex CLI, Cursor). Owns architecture, control-plane, multi-module slices.
- **mid** — single-agent tool use without subagent dispatch. Owns bounded slices within one module. May run cloud (Sonnet, GPT-4o-mini) or local (Llama-3.1-70B, Qwen-2.5-72B in LM Studio/Ollama).
- **small** — local-small tier (≥16K context). Not a slice owner; runs as deterministic helper for header sync, README generation, doc translation, narrow extracts.

The `local` adapter slot under `adapters` reserves `LOCAL.md` and `MICRO.md` for the upcoming TPL-209 slice that generates the local-tier adapter.

## Schema v3 — local-tier equivalents

`schemaVersion: 3` adds an optional `localTierEquivalent` field to every entry in `roles[]` and `skills[]`. When the canonical workflow says "route through X" or "delegate to Y" but the harness has no role-delegation primitive, this field names the deterministic command a small-tier agent should run instead.

```json
{
  "name": "header-sidecar",
  "capabilityTier": "small",
  "localTierEquivalent": {
    "command": "node scripts/checks/header-fix.mjs --changed",
    "scope": "Repair sidecars and stamp version/date for files in the current diff.",
    "limits": "Cannot decide which files need new headers from scratch."
  }
}
```

The validator in `scripts/agent-contract/check.mjs` enforces:

- `command` is a string starting with `node` or `pnpm` followed by a space.
- The command does not contain shell pipelines, redirects, or substitutions — it must be invocable directly.
- The named file (for `node ...`) or pnpm script (for `pnpm ...`) actually exists in the repo.
- `scope` and `limits` are non-empty strings.

Entries that genuinely require reasoning (architectural decisions, slice authoring, design judgment) **omit** the field and document why in the entry's `notes:` line. The honest "no equivalent" signal tells small-tier agents "this one isn't yours; surface it and stop". Currently 3 of 8 roles and 7 of 17 skills carry equivalents; the remainder are reasoning-only.

`scripts/agent-contract/sync.mjs` renders a "Local-tier equivalents" section into `LOCAL.md` listing both the equipped commands and the reasoning-only entries. `MICRO.md` intentionally does not surface this section — MICRO is for narrow deterministic-helper tasks where this contract is already implicit.

## What stays shared

Both tools are expected to follow the same repository contract:

- small implementation slices
- mandatory product-planner stop before user-facing implementation
- atomic commits
- deterministic test gate
- explicit acceptance gate
- changelog discipline
- release/finalization discipline
- no "done" state before checks and commit discipline are satisfied
- the same architectural and repo conventions
- the same terminology for roles and stages

The executable truth still lives in shared repo files such as `.githooks/*`, `scripts/checks/*`, and `tests/*`. The compatibility layer does not replace those guarantees; it aligns both tools on top of them.

New hard-stop enforcement is provided by `scripts/checks/usm-check.mjs` and `scripts/checks/pre-impl-gate.mjs`, while `scripts/checks/changeset-size-check.mjs` warns when a staged slice looks suspiciously batched.

## Audit matrix

| Claude artifact | Codex equivalent | Cursor equivalent | Canonical source | Notes |
| --- | --- | --- | --- | --- |
| `.claude/CLAUDE.md` | `AGENTS.md` | `.cursorrules` | `docs/agent-contract/compatibility-contract.json` | Repo-wide adapter for each tool |
| `.claude/agents/*.md` | `AGENTS.md` role routing + `.agents/skills/*` | — | `compatibility-contract.json#roles` | Codex receives role routing through AGENTS + skills; Cursor uses the flat rules file |
| `.claude/skills/*` | `.agents/skills/*` | — | `compatibility-contract.json#skills` | Shared workflow summaries are generated from one skill map |
| `.claude/hooks/*` | shared scripts and git hooks | shared scripts and git hooks | shared executable tooling | No direct Codex/Cursor runtime-hook analogue is assumed |
| `.githooks/*`, `scripts/checks/*`, `tests/*` | same shared files | same shared files | executable truth | All tools depend on the same repo commands and proofs |

## Target structure

```text
AGENTS.md
.cursorrules
.agents/
  README.md
  skills/
    README.md
    <skill>/SKILL.md
docs/agent-contract/
  README.md
  compatibility-contract.json
scripts/agent-contract/
  README.md
  sync.mjs
  check.mjs
```

Repository paths above are additive. Existing Claude assets remain in place.

## How drift is prevented

1. Edit `docs/agent-contract/compatibility-contract.json` when the shared process changes.
2. Run `node scripts/agent-contract/sync.mjs` to regenerate `AGENTS.md`, `.cursorrules`, `.agents/skills/**`, and the synced Claude compatibility block.
3. Run `node scripts/agent-contract/check.mjs` to verify the generated adapters still match the canonical contract.
4. Let `.githooks/pre-commit` run the same sync/check pair before commit creation.
5. Keep the contract test and integration test green so process drift is caught as repository drift, not as prompt folklore.

## Migration notes

- Claude-specific artifacts stay supported and do **not** need to be removed.
- `AGENTS.md` is added for Codex instead of trying to copy Claude subagent files one-to-one.
- Generated Codex skills live under `.agents/skills/` and summarize the same canonical workflow contract.
- Existing `scripts/checks/*`, `.githooks/*`, and `tests/*` remain the executable enforcement layer.
- Future process changes should start in `compatibility-contract.json`, then flow outward through the sync script.

## Verification checklist

- `node scripts/agent-contract/sync.mjs`
- `node scripts/agent-contract/check.mjs`
- `node scripts/checks/control-plane-check.mjs`
- `node scripts/checks/usm-check.mjs`
- `node scripts/checks/pre-impl-gate.mjs`
- `node scripts/checks/delivery-flow-check.mjs`
- `node --test "tests/integration/**/*.test.mjs"`
- `node --test "tests/contract/**/*.test.mjs"`

## How to work in Claude

1. Enter through `CLAUDE.md` → `.claude/CLAUDE.md`.
2. Treat `.claude/CLAUDE.md` as the Claude adapter to the shared contract.
3. Use the existing Claude subagents, hooks, and `.claude/skills/*` for Claude-native routing.
4. Follow the shared command map and gates from the canonical contract.
5. Do not redefine cross-tool process policy inside ad-hoc Claude-only docs.

## How to work in Codex

1. Enter through `AGENTS.md`.
2. Treat `AGENTS.md` as the Codex adapter to the shared contract.
3. Use `.agents/skills/*` for Codex-friendly workflow modules.
4. Run the same shared repo commands and pass the same gates as Claude.
5. Do not bypass the canonical contract by editing generated skills manually.

## How to work in Cursor

1. Cursor auto-loads `.cursorrules` from the repo root as system instructions.
2. Treat `.cursorrules` as the Cursor adapter to the shared contract.
3. Follow the navigation protocol (SYSTEM_MAP → manifest → module-catalog) for efficient context use.
4. Run the same shared repo commands and pass the same gates as Claude and Codex.
5. Do not edit `.cursorrules` manually — regenerate it from the contract.

## What each tool reads

**Claude reads:** `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/agents/*`, `.claude/skills/*`, Claude settings/hooks, and the shared repo scripts/tests.

**Codex reads:** `AGENTS.md`, `.agents/skills/*`, and the same shared repo scripts/tests.

**Cursor reads:** `.cursorrules` and the same shared repo scripts/tests.

## Remaining platform differences

- Claude has native `.claude/agents/*` and `.claude/hooks/*` surfaces.
- Codex is expressed here through `AGENTS.md` plus generated skills.
- Cursor uses a single flat `.cursorrules` file — no subagent or skill primitives.
- Because those primitives differ, parity is **semantic** rather than byte-for-byte mechanical.
- The shared process contract, command map, gates, and terminology are what stay identical.

## Recommended next steps

- Add CI wiring that runs `node scripts/agent-contract/check.mjs` on every pull request.
- Add directory-local `AGENTS.md` files later only if a subtree genuinely needs narrower Codex guidance.
- Expand contract coverage when a new shared workflow becomes durable enough to deserve repo-level enforcement.
