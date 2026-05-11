<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Visual architecture diagrams for COA pipeline, agent navigation, and parallel safety — renderable on GitHub via Mermaid.
@sidecar coa-architecture-diagram.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# COA Architecture Diagrams

Three views of Context-Optimized Architecture, each answering a different question.

---

## 1. The Pipeline: Raw Codebase → Agent Execution

How unstructured code becomes navigable by AI agents.

```mermaid
graph LR
    subgraph RAW["① Raw Codebase"]
        direction TB
        R1["38 hex modules"]
        R2["domain / ports / adapters"]
        R3["public-api.mjs barrels"]
    end

    subgraph META["② Metadata Layer"]
        direction TB
        M1["Structured file headers"]
        M2["manifest.json per module<br/>(capabilities, dependencies,<br/>structure)"]
        M3["SYSTEM_MAP.md<br/>(~1900 tok, ~950 focused)"]
        M4["dependency-graph.json"]
    end

    subgraph LOAD["③ Bounded Context Loading"]
        direction TB
        L1["Tier 1: System Map<br/>~950 tok focused — always first"]
        L2["Tier 2: Module meta<br/>~850–4300 tok — target only"]
        L3["Tier 3: Full reference<br/>~400 tok — on demand"]
    end

    subgraph EXEC["④ Agent Execution"]
        direction TB
        E1["16K token budget"]
        E2["One module per agent"]
        E3["BBA seams for isolation"]
    end

    RAW --> META --> LOAD --> EXEC
```

---

## 2. Agent Navigation: Tiered Loading Protocol

How a single agent finds and modifies code within a bounded token budget.

```mermaid
graph TD
    START(["Agent receives task"]) --> T1

    subgraph T1_BOX["Tier 1 · ~950 tokens (focused)"]
        T1["Read SYSTEM_MAP.md\nIdentify target module + dependencies"]
    end

    T1 --> T2

    subgraph T2_BOX["Tier 2 · ~850–4300 tokens"]
        T2["Read manifest.json\n+ public-api.mjs\n+ README.md"]
    end

    T2 --> DECIDE{"Need full\nAPI reference?"}
    DECIDE -- No --> IMPL
    DECIDE -- Yes --> T3

    subgraph T3_BOX["Tier 3 · ~400 tokens"]
        T3["Read module-catalog.md\nsection for target module"]
    end

    T3 --> IMPL["Implement behind BBA seam"]
    IMPL --> TEST["Run tests + quality gates"]
    TEST --> COMMIT["Atomic commit"]
```

**Typical token budget (mid-sized module):**

```
System prompt + rules        ~400 tok
Tier 1 (SYSTEM_MAP, focused)  ~950 tok
Tier 2 (module metadata)    ~1800 tok  (median)
File being edited           ~1500 tok
Reasoning + output          ~1100 tok
─────────────────────────────────────
Total                       ~6180 tok
```

---

## 3. Parallel Safety: Multiple Agents, Zero Collisions

How hex boundaries + BBA make concurrent agent work safe by construction.

```mermaid
graph TD
    subgraph AGENTS["Three Agent Teams — Same Repo, Same Time"]
        direction LR

        subgraph ALPHA["Agent Alpha"]
            A1["auth module"]
            A2["+ export verifyMagicLink"]
        end

        subgraph BETA["Agent Beta"]
            B1["notifications module"]
            B2["+ export sendPushNotification"]
        end

        subgraph GAMMA["Agent Gamma"]
            G1["analytics module"]
            G2["+ export trackAuthEvent"]
        end
    end

    ALPHA --> PA["public-api.mjs\n+1 export (additive)"]
    BETA --> PB["public-api.mjs\n+1 export (additive)"]
    GAMMA --> PC["public-api.mjs\n+1 export (additive)"]

    PA --> MERGE["Git merge:\nall additions\nno conflicts ✓"]
    PB --> MERGE
    PC --> MERGE
```

**Defense layers that make this work:**

```
Hex module boundaries        → agents can't touch other modules' internals
public-api.mjs barrels       → cross-module access through exports only
BBA seams                    → changes are additions, not modifications
Atomic slices + fast commits → short conflict windows
Structured headers           → agents understand file intent without reading source
Claims protocol              → optional coordination for rare modify-in-place cases
```

---

## 4. Before / After: Traditional vs COA

```mermaid
graph TD
    subgraph TRAD["Traditional Codebase"]
        direction TB
        TA["Agent A"] --> SHARED["shared/utils.js"]
        TB["Agent B"] --> SHARED
        SHARED --> CONFLICT["❌ Merge conflict\nBoth modified same function"]
    end

    subgraph COA_REPO["COA-Structured Codebase"]
        direction TB
        CA["Agent A"] --> AUTH["modules/auth/public-api.mjs\n+ export A (additive)"]
        CB["Agent B"] --> PAY["modules/payments/public-api.mjs\n+ export B (additive)"]
        AUTH --> CLEAN["✅ Clean merge\nDifferent modules, no overlap"]
        PAY --> CLEAN
    end
```

**Even when agents touch the same file:**

```mermaid
graph TD
    subgraph SAME_FILE["Same public-api.mjs, Two Agents"]
        direction TB
        SA["Agent A\nadd export verifyMagicLink"] --> FILE["modules/auth/public-api.mjs"]
        SB["Agent B\nadd export revokeAllSessions"] --> FILE
        FILE --> OK["✅ Git merges additions cleanly\nNo conflict by construction"]
    end
```

---

## Usage

Reference individual diagrams from other documents:

- **README.md** → Diagram 1 (pipeline overview) or Diagram 4 (before/after)
- **Whitepaper** → Diagram 2 (tiered loading) for §6.4
- **Flagship essay** → Diagram 3 (parallel safety) or Diagram 4 (before/after)
- **Conference deck** → All four, one per slide
