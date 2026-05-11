<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Capture the short repository-local documentation and traceability rules that keep structured docs, headers, and linked artifacts consistent.
@sidecar docs.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Docs rules

- Use one project-wide key namespace only.
- Keep work items traceable across PRD, USM, backlog, tests, headers, changelog, and commits.
- Use fenced `trace-yaml` blocks for structured work items.
- Keep README.md in every meaningful folder.
- Keep a slim inline header and a sparse `.header.md` sidecar in every meaningful file (ADR-0009).
- Do not allow docs drift across a behavior change.
