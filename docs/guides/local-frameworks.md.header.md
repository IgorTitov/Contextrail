---
fileId: contextrail-template:docs:guides:local-frameworks
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - LOCAL.md
  - MICRO.md
  - docs/agent-contract/compatibility-contract.json
  - .aider.conf.yml.template
  - .continue/config.template.json
summary: End-to-end setup guide for local-tier coding harnesses (Aider, Continue, Cline) running against LM Studio / Ollama, with model recommendations, working-loop walkthroughs, and a smoke-test verification flow.
owns: The human-facing recipe for running a Contextrail repo against a local 7B/70B model via Aider, Continue, or Cline.
boundaries: This guide owns the operator-facing setup story. It does not own the slim contract content (that is LOCAL.md / MICRO.md, generated from the canonical contract) or the agent capability tiers (those are in compatibility-contract.json under agentProfiles).
invariants: Hardware envelope, model recommendations, and harness-specific recipes stay aligned with the configs shipped at .aider.conf.yml.template and .continue/config.template.json. Failure-mode section maps each symptom back to a LOCAL.md section.
risks: Local-model recommendations age fast. The "Choosing a model" section is the canonical home for current picks (the agent contract intentionally does not name specific models); revise here when better baselines emerge.
securityPrivacy: Documentation only. No secrets. Reminds contributors not to commit cloud API keys under the gitignored .aider.conf.yml or .continue/config.json filenames.
notesForLLM: Read this when a user asks how to set up Aider, Continue, Cline, LM Studio, or Ollama against a Contextrail repo. The "When things go wrong" section is the troubleshooting branch — each symptom maps back to a specific LOCAL.md section so the fix is operator-fixable rather than a contract change.
linkedDocs:
  - docs/guides/README.md
  - docs/guides/agent-framework-integration.md
  - LOCAL.md
  - MICRO.md
  - docs/agent-contract/README.md
related:
  - .aider.conf.yml.template
  - .continue/config.template.json
  - .continue/README.md
  - docs/guides/parallel-sessions.md
  - docs/guides/inter-agent-coordination.md
---

# local-frameworks.md
