<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Show good and bad traceability examples so agents can compare proposed work-item linkage against concrete patterns.
@sidecar examples.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# Examples

## Good

- one ID used in PRD, USM, backlog, BDD, tests, header, and changelog
- acceptance criteria phrased so tests can prove them
- `module_ref` points to one bounded context

## Bad

- separate namespaces like `EP-001` and `ST-001`
- missing `bdd_refs` for a UI change
- missing regression test for a bugfix
