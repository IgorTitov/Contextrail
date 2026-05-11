---
fileId: contextrail-template:github:workflows:release
module: .github/workflows
stability: stable
stabilityRationale: Release pipeline is the single path to published artifacts; changes must be deliberate and reviewed.
steward: shared
api: GitHub Actions workflow (workflow_dispatch)
summary: Release pipeline that bumps the version, validates VERSION format, runs the full test suite and quality gates, builds the artifact archive with SHA-256 checksums, and creates a tagged GitHub Release.
owns: The hosted release flow from version bump through GitHub Release creation, including artifact integrity verification.
boundaries: Invokes deterministic scripts for tests, gates, and artifact builds. Does not own the logic of any check or build step.
invariants: Runs on manual dispatch only; requires explicit bump type selection; VERSION must match semver regex; SHA256SUMS.txt is generated alongside artifacts; commits and tags are created by github-actions bot.
notesForLLM: Do not add automatic triggers (push/PR) to this workflow. Release is always manual. The permissions block grants contents write at the job level for tag push and release creation.
linkedDocs: CHANGELOG.md
related:
  - .github/workflows/ci.yml
  - package.json
  - scripts/checks/changelog-sync.mjs
---

# release.yml
