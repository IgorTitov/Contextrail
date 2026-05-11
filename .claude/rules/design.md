<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Capture short repository-local design rules that keep change sets small, explicit, canonical-owner-first, and easy for humans and LLMs to reason about.
@sidecar design.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Design rules

- Prefer the smallest reviewable change set that makes the requested behavior or control-plane change real.
- Modify the canonical owner first before adding a new file, rule, agent, skill, or script.
- Prefer explicit seams, stable names, and low-indirection designs over cleverness.
- Keep files narrow in responsibility and easy to understand from headers, tests, and nearby docs.
- When a new control-plane surface is genuinely required, add its owner, invocation path, proof surface, and discovery update together.
- Do not duplicate the same policy across multiple files when one canonical file can own it.

