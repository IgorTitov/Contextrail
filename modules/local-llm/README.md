<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Describe the bounded context, entry points, and structure of the local-llm module, which provides in-browser LLM inference adapters conforming to AiChatPort.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx local-llm
@public false
@edit careful -->

# local-llm

In-browser LLM inference module providing adapters that conform to AiChatPort.

Provides:
- **LocalLlmPort** — extends AiChatPort with model loading lifecycle (loadModel, unloadModel, isModelLoaded)
- **WebLLM adapter** — runs LLMs via WebGPU using web-llm (dynamically imported)
- **Transformers.js adapter** — runs ONNX models via WASM using @xenova/transformers (dynamically imported)
- **Model Cache Manager** — domain utility for browser model cache management

No ML models are bundled. Models download at runtime by explicit user action.
