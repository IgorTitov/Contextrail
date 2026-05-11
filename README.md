<!-- @HEADER
@version 0.8.10 | 2026-05-11
@purpose Top-level onboarding guide for adopters of the Contextrail architecture template.
@sidecar README.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Contextrail

Contextrail is an open-source template for building **COA applications**
(Context-Optimized Architecture): modular monoliths shaped for a world
where AI agents are first-class citizens in agentic software development.
It combines explicit hexagonal boundaries, sidecar metadata, and
deterministic delivery rules so humans and agents can work in bounded
context, keep token and coordination costs under control, and continue
shipping as the codebase grows. It ships the engine/language layer: hex
modules, generated agent adapters, commit ceremony, claim coordination,
and guardrail scripts. An operator-facing product following the open-core
pattern is a **separate launch coming soon**.

*One repo. Many agents. Zero collisions.*

> **Status**
> Version: `0.8.6`
> Maturity: pre-1.0, preparing for a publication-readiness audit pass
> Timeline: 1.0 has **no committed timeline yet**
> Scope boundary: Contextrail is the engine layer; operator UX launches separately on its own roadmap

## What Contextrail Includes

- **39 core hex modules plus 1 teaching example** organized as `modules/<name>/{domain,ports,adapters}` with a single `public-api.mjs` entry point.
- **Canonical agent contract adapters** generated from `docs/agent-contract/compatibility-contract.json` into `AGENTS.md`, `LOCAL.md`, `MICRO.md`, and tool-specific surfaces.
- **Deterministic safety gates** for architecture boundaries, test isolation, transport branches, claims, changelog discipline, and related delivery rules.
- **Atomic commit ceremony** via `coa-merge.mjs`, worktree/session management via `coa-worktree.mjs`, and file-claim coordination via `claim-check.mjs`.
- **Slice-aware context briefing** via `scripts/agent-context.mjs` so bounded agents load the right context surface instead of wandering the whole repo.

## What Is Measured Today

The architecture demo is reproducible from [`scripts/demo/context-budget-demo.mjs`](scripts/demo/context-budget-demo.mjs). Current structural measurements on the shipped core-module baseline (`39` production modules, excluding the single teaching example):

- **99%** of core-module pairs are parallel-safe (`734/741`)
- **36 of 39** core modules are editable without same-file contention
- **73%** reduction in Tier-2 context load versus a naive full-source read for large modules
- **~2.9K tokens** to orient on one core module from the tiered metadata surface
- **87%** zero-dependency modules, **90%** freely detachable, **94%** average self-containment

These are **structural measurements of the shipped template baseline**, not a published production case study or a guarantee that every downstream repository will preserve the same ratios automatically.

## Quick Start

```bash
git clone https://github.com/IgorTitov/Contextrail.git
cd Contextrail
pnpm install
pnpm bootstrap -- --name "MyApp" --key "APP" --module "core"
```

Then:

```bash
pnpm test
node scripts/demo/context-budget-demo.mjs
```

This is a template repository: `pnpm bootstrap` replaces placeholders such as
`{{PROJECT_NAME}}`, `{{PROJECT_KEY}}`, and `{{DEFAULT_MODULE}}`, installs the
hooks, and prepares the repo for your first bounded slice. For the longer path,
start with [Getting Started](docs/guides/getting-started.md).

## What Is Empirically Validated

The public BYO-LLM evidence is intentionally scoped. The authoritative public
source is [local-frameworks.md](docs/guides/local-frameworks.md).

Validated today:

- **Qwen3.6-27B-Instruct + Aider + LM Studio** — strongest for metadata/sidecar-heavy tasks
- **Qwen3.6-35B-A3B-Instruct + Aider + LM Studio** — validated with the documented mandatory prompt discipline
- **Devstral Small 2 24B + Aider + LM Studio** — default recommendation for bounded code-edit slices
- **Qwen3-Coder-30B-A3B-Instruct + Aider + LM Studio** — validated with the documented whole-edit/fence discipline

Scope of that evidence:

- Empirical validation covers **MICRO tasks and single-file LOCAL slices**
- The manual dispatch workflow is documented and usable today
- Multi-file LOCAL delivery is **not** yet claimed as validated

## Current Release Scope

- **Pre-1.0 maturity**: `0.8.x` is the public launch line, and `1.0` follows a publication-readiness audit with no committed timeline yet.
- **Bounded local-LLM evidence**: public validation today covers MICRO tasks and single-file LOCAL slices, not arbitrary multi-file local development.
- **Selective tooling compatibility**: the documented BYO-LLM workflow is validated on selected stacks, not on every harness, model, or OS combination.
- **Engine-layer scope**: this launch covers the architecture template and manual workflow; the operator-facing product is a separate launch.
- **Hardening still in progress**: a few safety and metadata checks in the `0.8.x` line remain advisory or are receiving follow-up fixes before `1.0`.

## Roadmap

- **`0.8.x`**: public launch hardening, documentation accuracy work, sidecar cleanup, and closure of remaining safety-guard edge cases
- **Before 1.0**: stronger public evidence around onboarding and broader bounded local-LLM delivery
- **1.0**: follows the publication-readiness audit pass, with **no committed timeline yet**
- **Operator UX**: separate launch coming soon on its own roadmap

## Read Next

- [Whitepaper](docs/whitepaper.md)
- [Public release history](docs/release-history.md)
- [System Map](docs/SYSTEM_MAP.md)
- [Getting Started](docs/guides/getting-started.md)
- [Local frameworks guide](docs/guides/local-frameworks.md)
- [Open-core boundary](docs/adr/0044-cockpit-migration-open-core-boundary.md)
- [Contributing](CONTRIBUTING.md)
- [Issues](https://github.com/IgorTitov/Contextrail/issues)

## Project Links

- Repository: [IgorTitov/Contextrail](https://github.com/IgorTitov/Contextrail)
- Maintainer: [@IgorTitov](https://github.com/IgorTitov)

## License

Apache-2.0. See [LICENSE](LICENSE).
