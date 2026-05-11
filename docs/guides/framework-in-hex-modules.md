<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide for using React, Vue, Svelte, or Angular inside COA hex modules — where framework code goes and where it doesn't.
@sidecar framework-in-hex-modules.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Using Frameworks Inside Hex Modules

COA hex modules are not vanilla-JS-only. Your domain and ports must be
framework-free, but **adapters can use any framework** — React, Vue,
Svelte, Angular, or anything else.

The template ships with vanilla JS to demonstrate that hex works without
a framework. Real projects should use whatever framework fits their stack.

See [ADR-0012](../adr/0012-framework-adapters-in-hex-modules.md) for
the full decision rationale.

---

## The rule

| Layer | Framework code allowed? | Why |
|-------|------------------------|-----|
| `domain/` | **No** | Pure business logic. Testable without any framework. |
| `ports/` | **No** | Contracts must be framework-agnostic so any adapter can implement them. |
| `adapters/` | **Yes** | This is where framework integration lives. React components, Vue composables, Angular services — all go here. |
| `apps/` | **Yes** | Shell, routing, global providers. Wires module adapters together. |

## Example: Kanban module with React

```
modules/kanban/
  domain/
    board-logic.mjs         ← pure JS: add/move/reorder cards, WIP limits
    cpm-scheduler.mjs       ← critical path calculations
  ports/
    board-port.mjs           ← { getColumns, moveCard, addCard, ... }
  adapters/
    react-board-view.tsx     ← <KanbanBoard> component
    react-board-hooks.ts     ← useKanban() hook wrapping domain
    memory-board-adapter.mjs ← for unit tests (no React)
  public-api.mjs
  manifest.json
```

### domain/board-logic.mjs (framework-free)
```js
export function moveCard(board, cardId, fromCol, toCol) {
  if (board.wipLimits[toCol] && board.columns[toCol].length >= board.wipLimits[toCol]) {
    return { ok: false, error: 'wip-limit-exceeded' };
  }
  // ... pure logic, no React
  return { ok: true, board: updatedBoard };
}
```

### adapters/react-board-view.tsx (React adapter)
```tsx
import { moveCard, type Board } from '../domain/board-logic.mjs';

export function KanbanBoard({ board, onUpdate }: { board: Board; onUpdate: (b: Board) => void }) {
  const handleDrop = (cardId: string, fromCol: string, toCol: string) => {
    const result = moveCard(board, cardId, fromCol, toCol);
    if (result.ok) onUpdate(result.board);
  };
  return <div className="kanban">{ /* render columns + drag handlers */ }</div>;
}
```

### adapters/memory-board-adapter.mjs (test adapter)
```js
import { moveCard } from '../domain/board-logic.mjs';

export function createMemoryBoardAdapter(initialBoard) {
  let board = initialBoard;
  return {
    getBoard: () => board,
    moveCard: (cardId, from, to) => {
      const result = moveCard(board, cardId, from, to);
      if (result.ok) board = result.board;
      return result;
    },
  };
}
```

## Migrating a React feature folder to hex

Starting with a typical React feature folder:
```
features/kanban/
  KanbanBoard.tsx         ← mixed: React UI + business logic
  KanbanCard.tsx
  useKanban.ts            ← mixed: hooks + domain logic
  kanban.types.ts
  kanban.api.ts           ← API calls
```

Step-by-step:

1. **Create the hex module:** `pnpm create-module -- --name kanban`
2. **Extract domain logic** from `useKanban.ts` and `KanbanBoard.tsx`
   into `modules/kanban/domain/board-logic.mjs` — pure functions,
   no hooks, no JSX
3. **Define the port** in `modules/kanban/ports/board-port.mjs` — the
   contract between domain and UI
4. **Move React components** to `modules/kanban/adapters/` — they
   import from domain, not from each other's internals
5. **Create a memory adapter** for testing domain logic without React
6. **Wire in `apps/`** — import from `modules/kanban/public-api.mjs`

**You don't have to do this all at once.** Start with one module. Keep
the rest in `apps/` as feature folders. Migrate incrementally — this is
the brownfield path described in [Brownfield Migration](brownfield-migration.md).

## What stays in `apps/`

- **Routing** — page-level route definitions
- **Global state providers** — React Context, Redux store, Zustand
- **App shell** — layout, navigation, error boundaries
- **Framework-specific wiring** — `<Suspense>`, `<ErrorBoundary>`, `<QueryClientProvider>`

These are orchestration concerns, not business logic. They belong in the
app layer.

## What goes into `modules/`

- **Business rules** — scoring, validation, scheduling, permissions
- **Domain types** — entities, value objects, enums
- **Data access contracts** — ports for IndexedDB, API, file system
- **UI components that implement a port** — React views that render
  domain state through the adapter pattern

## Build tooling

Framework adapters (`.tsx`, `.vue`, `.svelte`) need a build tool.
The build tool lives in `apps/`, not in the module:

```
apps/zvenix-web/
  vite.config.ts          ← Vite configured to resolve modules/
  tsconfig.json           ← TypeScript for the app + module adapters
  src/
    main.tsx              ← React entry point
    router.tsx            ← imports from modules/*/public-api.mjs
```

Modules themselves have no `vite.config` or `tsconfig`. The app's
build tool resolves them.

## Testing

| What | Tool | Where |
|------|------|-------|
| Domain logic | `node --test` | `tests/unit/kanban.test.mjs` (vanilla, fast) |
| React adapters | Vitest + React Testing Library | `tests/unit/kanban-react.test.tsx` |
| Port contract | `node --test` | `tests/contract/kanban-hex-contract.test.mjs` |
| User flows | BDD / Playwright | `tests/bdd/kanban.test.mjs` |

Domain tests don't need React. Adapter tests don't need a real backend.
This is the hex testing pyramid.

## React adapter performance patterns

These patterns were validated in real COA projects (Zvenix multi-board
Kanban). They all stay within hex boundaries — DOM manipulation is
adapter-layer, domain logic stays pure.

### Continuous interactions (drag, resize, scroll)

Never use React state (`useState`) for visual feedback during 60fps
interactions. Use DOM refs + `classList` instead:

```tsx
// BAD — triggers re-render of entire component tree on every dragover
const [dragOverCell, setDragOverCell] = useState<string | null>(null)

// GOOD — zero re-renders, DOM manipulation in adapter layer
const dragOverCellRef = useRef<string | null>(null)
e.currentTarget.classList.add('cell--drag-over')
```

This is COA-compatible: DOM manipulation is adapter-layer code.
Domain logic (e.g., `computeReorderPlan()`) stays pure.

### Callback stability with React.memo

When using `React.memo` on list-rendered components, every callback
prop must be a stable reference:

```tsx
// BAD — parent re-creates function, child re-renders despite memo
<Row onToggle={() => toggleLane(row.key)} />

// GOOD — pass stable ref, child calls internally
const handleToggle = useCallback((key: string) => { ... }, [])
<Row onToggle={handleToggle} laneKey={row.key} />
```

### React Context is adapter-layer

When a read-only prop passes through 4+ component levels, migrate to
React Context. Context providers are adapter-layer components — COA
has no objection:

```tsx
// Adapter layer: Context provider wrapping domain data
const TaskActivityProvider = ({ children, activity }) => (
  <TaskActivityContext.Provider value={activity}>
    {children}
  </TaskActivityContext.Provider>
)
```

Intermediate components no longer need the prop, and `React.memo`
works better (fewer prop changes trigger re-renders).

## User-facing help (`*.help.md`)

COA has two sidecar types: `*.header.md` for developers, `*.help.md`
for end users. Help sidecars live next to UI components:

```
features/kanban/
  BoardSettings.tsx              ← component code
  BoardSettings.header.md        ← developer: architecture, API, deps
  BoardSettings.help.md          ← user: what it does, how to use it
```

A HelpTooltip component (which you build in your adapter layer) reads
the `*.help.md` content and shows it as a contextual popover:

```tsx
// Adapter-layer component — COA compatible
function HelpTooltip({ helpKey, children }) {
  const helpText = useHelp(helpKey); // loads from compiled help index
  return (
    <span className="help-wrapper">
      {children}
      {helpText && <span className="help-icon" title={helpText}>?</span>}
    </span>
  );
}
```

Run `node scripts/checks/compile-user-guide.mjs` to assemble all
`*.help.md` files into `docs/user-guide.md`. See
[ADR-0009 amendment](../adr/0009-sidecar-first-headers.md) for the
convention.

---

**Related:**
- [ADR-0012](../adr/0012-framework-adapters-in-hex-modules.md) — decision record
- [Brownfield Migration](brownfield-migration.md) — incremental adoption
- [Framework Integration](framework-integration.md) — wiring hex modules with Next.js, Angular, Vue, Svelte
- [Architecture Rules](../../.claude/rules/architecture.md)
