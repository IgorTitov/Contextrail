<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain how accepted design outputs and derived assets should be named, reviewed, and handed off in this template.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# assets

Use this folder for accepted design outputs and their implementation handoff notes.

Suggested conventions:

- keep source-vs-derived distinctions explicit
- name assets by workflow, screen, and state when possible
- record what was accepted and why
- record where implementation should use the asset
- do not treat every generated experiment as a canonical asset

Keep the handoff specific enough that the frontend lane knows:

- which workflow it belongs to
- which screen or state it belongs to
- whether it is source material, reference material, or implementation-ready output
