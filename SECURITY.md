<!-- @HEADER
@version 0.8.0 | 2026-05-08
@purpose Security vulnerability reporting policy.
@sidecar SECURITY.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.6.x   | Yes       |
| < 0.6   | No        |

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please report them privately:

1. Email: <{{AUTHOR_EMAIL}}>
2. Or use GitHub's private vulnerability reporting if enabled on this repository.

Include:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

## Response timeline

- **Acknowledgment**: within 48 hours
- **Initial assessment**: within 5 business days
- **Fix or mitigation**: depends on severity, but we aim for 30 days for critical issues

## Scope

This policy covers the Contextrail template repository code, scripts, and
configuration. It does not cover third-party dependencies — please report
those to the respective upstream projects.

## Security practices in this project

- Third-party skills, hooks, and scripts are audited before enablement.
- Pre-commit hooks run deterministic validation gates.
- No secrets or credentials are stored in the repository.
- See `.claude/rules/security.md` for the full security rules.
