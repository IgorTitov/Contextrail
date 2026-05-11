<!-- @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Folder guide for the Codex-facing agent adapter layer.
 * @sidecar README.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# .agents

This folder contains the Codex-facing adapter layer generated from `docs/agent-contract/compatibility-contract.json`.

## Structure

- `README.md` — this folder guide
- `skills/README.md` — generated skill index
- `skills/<skill>/SKILL.md` — Codex-compatible workflow summaries

## Rules

- Edit the canonical contract, not the generated skill files.
- Regenerate with `node scripts/agent-contract/sync.mjs`.
- Validate parity with `node scripts/agent-contract/check.mjs`.
