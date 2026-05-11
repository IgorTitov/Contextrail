---
fileId: contextrail-template:modules:realtime:messages
module: modules/realtime
stability: evolving
steward: shared
api: file-local
boundedContext: realtime
summary: i18n message registry for the realtime module.
owns: All user-facing text for the realtime module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the realtime module must come from this registry.
notesForLLM: i18n layer for realtime. Add new user-facing strings here, not inline in code.
messageKeys:
  - realtime.port.invalid_adapter
  - realtime.port.missing_connect
  - realtime.port.missing_disconnect
  - realtime.port.missing_send
  - realtime.port.missing_subscribe
  - realtime.port.missing_unsubscribe
  - realtime.port.missing_on_connection_change
  - realtime.port.missing_get_state
  - realtime.transport.invalid_adapter
  - realtime.transport.missing_open
  - realtime.transport.missing_close
  - realtime.transport.missing_send
  - realtime.transport.missing_on_message
  - realtime.transport.missing_on_state_change
  - realtime.transport.missing_get_state
  - realtime.transport.missing_is_supported
  - realtime.connection.invalid_transition
  - realtime.connection.already_in_state
  - realtime.transport.connect_failed
  - realtime.transport.send_failed
  - realtime.transport.not_connected
  - realtime.reconnection.max_attempts
  - realtime.reconnection.attempting
  - realtime.heartbeat.timeout
  - realtime.manager.no_supported_transport
  - realtime.manager.all_transports_failed
  - realtime.manager.fallback
linkedDocs: modules/realtime/README.md
---

# messages.mjs
