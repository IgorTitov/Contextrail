---
fileId: contextrail-template:tests:unit:realtime-transports.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for realtime browser transport adapters (WebSocket, SSE, long-polling, WebRTC) and the transport manager — multiplexing, fallback, and reconnection.
owns: Unit proof of WebSocket/SSE/long-polling/WebRTC transport adapters with mocked browser globals plus transport-manager behavior (selection, multiplexing, fallback, reconnection).
boundaries: Must import only through modules/realtime/public-api.mjs; must not open real network sockets; browser-only adapter tests must mock the required Web APIs (WebSocket, EventSource, fetch, RTCPeerConnection).
invariants: All imports must go through public-api.mjs; mocks must be torn down between test cases (origWs / origEs / origFetch restored in finally blocks); transport-manager tests use the in-file createMockTransport helper.
risks: Forgetting to restore the global WebSocket/EventSource/fetch can leak across tests in this file.
notesForLLM: Import exclusively via public-api.mjs. Use the mock transport helper for manager tests; for adapter tests with browser globals, always restore the original global in a finally block.
tests: node --test tests/unit/realtime-transports.test.mjs
related: tests/unit/realtime.test.mjs; tests/unit/realtime-server.test.mjs; tests/contract/realtime-hex-contract.test.mjs
specRefs:
  - TPL-148
  - TPL-149
  - TPL-150
  - TPL-151
  - TPL-218
---

# realtime-transports.test.mjs
