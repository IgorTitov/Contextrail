<!-- @HEADER
@version 0.8.3 | 2026-05-10
@purpose Public onboarding guide for evaluating and adopting the Contextrail template.
@sidecar getting-started.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Getting Started

**Contextrail Template v0.8.0**

Contextrail is a template for building COA applications: modular
monoliths shaped for bounded AI-assisted delivery. This guide is the
short public onboarding path for evaluating the template, bootstrapping
your own repository, and shipping the first bounded slice without having
to reverse-engineer the repo's internal workflows from scratch.

---

## Prerequisites

- **Node.js** 20 or later
- **pnpm** 10.x
- **Git** 2.x or later
- An AI harness if you want one: Codex, Claude Code, Cursor, Aider, or another tool that can work against repo files

Optional:

- **Playwright** browsers if you want headed browser proof:
  `pnpm playwright:install`

## 1. Clone and Bootstrap

```bash
git clone https://github.com/IgorTitov/Contextrail.git my-app
cd my-app
pnpm install
pnpm bootstrap -- --name "My App" --key "APP" --module "core"
```

`pnpm bootstrap` replaces the shipped placeholders
(`{{PROJECT_NAME}}`, `{{PROJECT_KEY}}`, `{{DEFAULT_MODULE}}`), aligns the
repo identity to your project, and prepares the template for real
delivery work.

## 2. Verify the Template

Run the fast-path proof first:

```bash
pnpm test
node scripts/demo/context-budget-demo.mjs --parallel --core-only
```

That gives you two useful signals immediately:

- the template passes its own shipped proof layers
- the structural claims in the public docs are reproducible from the live tree

If you want the broader context metrics too:

```bash
node scripts/demo/context-budget-demo.mjs --context --core-only
node scripts/demo/context-budget-demo.mjs --independence --core-only
```

## 3. Orient on the Repository

For a fast technical read, use the repo in this order:

1. [README.md](../../README.md)
2. [docs/SYSTEM_MAP.md](../SYSTEM_MAP.md)
3. [docs/whitepaper.md](../whitepaper.md)
4. Your target module's `manifest.json`, `public-api.mjs`, and `README.md`

Contextrail is designed so agents and humans can orient through compact
metadata surfaces before loading implementation files.

## 4. Understand the Module Shape

Most reusable capabilities live under:

```text
modules/<name>/
├── domain/
├── ports/
├── adapters/
├── public-api.mjs
├── manifest.json
├── README.md
└── types.d.ts
```

Meaningful files may also carry adjacent `<file>.header.md` sidecars.
The intended reading path is:

- start at `public-api.mjs` to see the public surface
- inspect `manifest.json` to understand dependencies and module role
- use the module `README.md` and file-level headers only where deeper precision is needed

## 5. Choose the Runtime Shell

The shipped starter supports five first-class runtime modes:

- **Hosted web**
- **PWA**
- **Local runtime**
- **Electron shell**
- **Browser extension**

Build commands remain mode-specific:

```bash
pnpm build:hosted
pnpm build:pwa
pnpm build:local
pnpm build:electron
```

The architecture is not limited to those five. They are the runtime
shells currently shipped by the template baseline.

## 6. Ship the First Bounded Slice

The delivery model is intentionally structured. Start small:

1. Pick one module or one explicit seam.
2. Write the smallest proving test first.
3. Implement the change inside the bounded work surface.
4. Let the checks and commit ceremony enforce the rest.

If you want a dedicated transport branch and clean worktree:

```bash
node scripts/coa-worktree.mjs --create --agent=feature-implementer
# auto-picks next-free slice ID (e.g. APP-001)
```

`--create --agent=<role>` is the standard form — it auto-picks the next-free
slice ID from commit history and active claims. Use `--slice=<ID>` only when
you need an explicit override (e.g. resuming a specific ticket).

If your slice needs to touch a shared surface outside one module, inspect
or file a claim before editing. Note: `coa-worktree --create` creates the
transport claim automatically; `claim-check --create` below is only needed
for additional cross-boundary files that the worktree claim doesn't cover:

```bash
node scripts/checks/claim-check.mjs --query=README.md
node scripts/checks/claim-check.mjs --create --agent=codex --slice=APP-001 --targets=README.md --action=modify
```

For the actual bounded slice:

```bash
pnpm test
node scripts/checks/header-check.mjs
node scripts/checks/spec-check.mjs
```

When the slice is ready, use the repo ceremony rather than an ad-hoc
commit flow:

```bash
node scripts/coa-merge.mjs --message="feat(core): ship first bounded slice (APP-001)"
```

## 7. Trim What You Do Not Need

The template ships broad capability coverage by design. You can remove
unneeded modules rather than adopt all of them forever.

```bash
node scripts/detach-module.mjs --list
node scripts/detach-module.mjs example-greeter --dry-run
```

The teaching example (`example-greeter`) is usually the safest first
module to remove once you understand the structure.

## 8. Local LLMs and Manual Dispatch

If your interest is bounded local-LLM work rather than hosted frontier
models, start here:

- [local-frameworks.md](local-frameworks.md)
- [byollm-feature-dispatch.md](byollm-feature-dispatch.md)

Current public evidence is intentionally scoped: MICRO tasks and
single-file LOCAL slices are validated; arbitrary multi-file local
delivery is not yet claimed as public evidence.

## 9. Read Next

- [README.md](../../README.md)
- [docs/whitepaper.md](../whitepaper.md)
- [docs/SYSTEM_MAP.md](../SYSTEM_MAP.md)
- [docs/release-history.md](../release-history.md)
- [docs/guides/local-frameworks.md](local-frameworks.md)
- [docs/guides/byollm-feature-dispatch.md](byollm-feature-dispatch.md)
