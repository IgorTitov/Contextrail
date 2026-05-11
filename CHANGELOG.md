# Changelog

All notable changes to Contextrail will be documented here.

## [Unreleased]

_Nothing yet._

---

## [0.8.6] — 2026-05-11

### Added

- Initial public release — Contextrail v0.8.6
- 39 production hex modules plus 1 teaching example organized as hexagonal bounded contexts with single-entry `public-api.mjs` per module
- Deterministic safety gates covering architecture boundaries, test isolation, transport branches, inter-agent claims, header discipline, and changelog alignment across 17 pre-commit validation phases
- Atomic commit ceremony (`coa-merge.mjs`), worktree and session management (`coa-worktree.mjs`), and file-level inter-agent claim coordination (`claim-check.mjs`)
- Slice-aware context briefing (`scripts/agent-context.mjs`) for bounded agent orientation without full-repo reads
- BYO-LLM support validated on 4 stacks via Aider + LM Studio: Qwen3.6-27B-Instruct, Qwen3.6-35B-A3B-Instruct, Devstral Small 2 24B, Qwen3-Coder-30B-A3B-Instruct
- Whitepaper, Getting Started guide, SYSTEM_MAP (~1,900 tokens), full ADR library, and module catalog
- Apache-2.0 license
