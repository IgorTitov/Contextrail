<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for cqrs/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/cqrs/adapters/

Adapter implementations for the cqrs module. Ships three zero-dependency in-memory adapters: `createMemoryCommandBus`, `createMemoryQueryBus`, and `createMemoryEventStore` — enough to wire a full CQRS round-trip in tests and the api-starter demo. Real persistence adapters (SQL, KV, Kafka, EventStoreDB) should implement the same ports and be swapped in at composition time.
