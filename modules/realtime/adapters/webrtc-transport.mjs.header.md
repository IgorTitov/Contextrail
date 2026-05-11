---
fileId: contextrail-template:modules:realtime:adapters:webrtc-transport
module: modules/realtime
stability: evolving
transport: webrtc
steward: shared
api: file-local
hexLayer: adapter
boundedContext: realtime
summary: WebRTC data-channel transport for the realtime module. Peer-to-peer low-latency channel.
owns: The Webrtc Transport adapter implementation for the realtime module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for browser-to-browser data paths or ultra-low-latency needs. Requires signaling arranged outside this adapter.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: infrastructure
specRefs: TPL-152
linkedDocs: modules/realtime/adapters/README.md
---

# webrtc-transport.mjs
