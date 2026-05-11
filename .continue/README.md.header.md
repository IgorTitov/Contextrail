---
fileId: contextrail-template:continue:readme
module: .continue
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .continue/config.template.json
  - docs/guides/local-frameworks.md
summary: Folder guide for the Continue extension configuration seed and gitignored operator-local copy.
owns: The folder-level navigational README for the .continue/ seed pattern.
boundaries: This README is navigational only. It must not duplicate the full setup recipe — that lives in docs/guides/local-frameworks.md.
invariants: Documents the template + gitignored copy pattern and points at LOCAL.md as the slim contract Continue should read.
risks: If contributors edit config.json and accidentally commit it, their personal endpoint/credentials leak. The .gitignore rule guards against this; this README reinforces it.
securityPrivacy: Reminds contributors not to commit config.json (which may contain real API keys for cloud Continue setups).
notesForLLM: Read this when a user asks why .continue/ has both a .template.json and a gitignored .json file.
linkedDocs:
  - docs/guides/local-frameworks.md
  - LOCAL.md
related:
  - .continue/config.template.json
  - .aider.conf.yml.template
---

# README.md
