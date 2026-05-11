<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Introduce the trunk-bba skill folder and clarify when to use it for trunk-based delivery and abstraction-seam changes.
@sidecar README.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# trunk-bba

Use this skill when:

- behavior changes must reach trunk safely
- a safe abstraction seam or flag is needed
- old and new implementations must coexist temporarily
- several agents or humans may touch the same area in parallel

