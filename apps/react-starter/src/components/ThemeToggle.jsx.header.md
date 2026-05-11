---
fileId: contextrail-template:apps:react-starter:src:components:ThemeToggle
module: apps/react-starter
stability: evolving
steward: shared
api: file-local
summary: ThemeToggle React component for the react-starter app.
owns: The ThemeToggle UI component and its rendering logic.
boundaries: Presentation layer only. Business logic lives in hex modules via adapter hooks.
invariants: Must use adapter hooks for data access. Must use i18n for user-facing text.
notesForLLM: React component. Uses adapter hooks from src/adapters/ to access hex module functionality.
---

# ThemeToggle.jsx
