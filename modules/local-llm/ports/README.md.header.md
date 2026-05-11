---
fileId: contextrail-template:modules:local-llm:ports:README
module: modules/local-llm
stability: evolving
steward: shared
api: Documentation
hexLayer: port
boundedContext: local-llm
dependsOn: modules/local-llm/ports/local-llm-port.mjs
owns: "Human-readable orientation for the local-llm ports layer: what LocalLlmPort is, what it extends, and what extra lifecycle methods it requires."
boundaries: Must not contain adapter implementation details; must not duplicate the full type definitions already present in local-llm-port.mjs.
invariants: Must remain aligned with the actual LocalLlmPort interface defined in local-llm-port.mjs.
risks: Outdated method lists here cause consumers to implement wrong port shapes and pass validation gaps silently.
notesForLLM: LocalLlmPort extends AiChatPort — both assertAiChatPort and assertLocalLlmPort must pass for any conformant adapter. The extra lifecycle methods are loadModel, unloadModel, and isModelLoaded.
tests: tests/contract/local-llm-hex-contract.test.mjs
linkedDocs: docs/prd/local-llm.md
specRefs: TPL-080
related:
  - modules/local-llm/ports/local-llm-port.mjs
  - modules/ai-chat/ports/ai-chat-port.mjs
summary: Directory overview for the ports layer of the local-llm module.
---

# README.md
