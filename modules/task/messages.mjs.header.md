---
fileId: contextrail-template:modules:task:messages
module: modules/task
stability: evolving
steward: shared
api: file-local
boundedContext: task
summary: i18n message registry for the task module.
owns: All user-facing text for the task module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the task module must come from this registry.
notesForLLM: i18n layer for task. Add new user-facing strings here, not inline in code.
messageKeys:
  - task.port.adapter_must_be_object
  - task.port.missing_enqueue
  - task.port.missing_cancel
  - task.port.missing_getStatus
  - task.port.missing_onProgress
  - task.port.missing_onComplete
  - task.port.missing_drain
  - task.lifecycle.invalid_transition
  - task.lifecycle.already_terminal
  - task.timeout
  - task.cancelled
  - task.serialize.invalid_transferable
linkedDocs: modules/task/README.md
---

# messages.mjs
