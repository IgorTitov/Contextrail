<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Capture the short repository-local security rules that govern hooks, shell usage, imported skills, and default trust posture.
@sidecar security.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Security rules

- Treat third-party skills as executable software, not as inert prompts.
- Audit any imported skill, agent, hook, or script before enabling it.
- Block destructive shell commands and writes to sensitive paths unless explicitly approved.
- Do not grant bypass-style permissions as a default.
- Prefer local project skills over marketplace installs.
- Keep hooks deterministic and reviewable.
