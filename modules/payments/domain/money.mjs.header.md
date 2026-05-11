---
fileId: contextrail-template:modules:payments:money
module: modules/payments
stability: evolving
steward: shared
api: Domain
boundedContext: payments
summary: Pure money value object — non-negative integer minor units + ISO-4217 currency.
owns: createMoney, addMoney, subtractMoney, formatMoney.
boundaries: Stays inside the payments bounded context. No I/O, no imports from adapters/.
invariants: Amounts are always non-negative integers. Currency is upper-cased ISO-4217. Never use floats for money.
notesForLLM: Zero-decimal currencies (JPY, KRW, VND) render without decimals in formatMoney.
specRefs:
  - TPL-001
---

# money.mjs
