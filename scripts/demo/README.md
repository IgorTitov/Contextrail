<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Demo scripts that showcase COA features with reproducible measurements.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Demo Scripts

Reproducible demonstrations of COA architecture features, producing measurable numbers suitable for whitepapers, READMEs, and presentations.

## COA Architecture Demo

Measures three aspects of the COA architecture against the live repository:

| Section | What it measures | Key metric |
| ------- | --------------- | ---------- |
| **Context Efficiency** | Tokens: naive (all source) vs COA (tiered metadata) | 73% reduction for large modules |
| **Parallel Capacity** | How many agents can work simultaneously | 99% of module pairs conflict-free |
| **Module Independence** | Fan-out, detachability, self-containment | 87% zero-dependency modules |

### Usage

```bash
# All three sections
node scripts/demo/context-budget-demo.mjs

# Individual sections
node scripts/demo/context-budget-demo.mjs --context
node scripts/demo/context-budget-demo.mjs --parallel
node scripts/demo/context-budget-demo.mjs --independence

# Output formats
node scripts/demo/context-budget-demo.mjs --json        # machine-readable for CI
node scripts/demo/context-budget-demo.mjs --markdown    # tables for docs/README
```

### Data sources

- **Section 1** reads the file system directly (module source sizes, metadata sizes)
- **Sections 2 & 3** read `docs/_generated/dependency-graph.json` (run `node scripts/checks/dependency-graph.mjs` to regenerate)

### Where the numbers appear

- Whitepaper [§6.4](../../docs/whitepaper.md) (context efficiency, module budget overflow)
- Whitepaper [§6.5](../../docs/whitepaper.md) (parallel capacity, measured numbers)
- Project README (headline metrics)

Numbers are snapshot measurements at the current repo state. Rerun the demo after adding or removing modules to get updated figures.
