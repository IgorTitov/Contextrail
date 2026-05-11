<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for cqrs/domain.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/cqrs/domain/

Pure domain logic for the cqrs module. Framework-free, no I/O, no timers. Contains `createCommand`, `createQuery`, and `createEvent` value-object validators, plus the `createAggregate` / `replayAggregate` event-sourcing helpers. Adapters stamp persistence-specific details (id, createdAt, sequence, recordedAt) on top of these shapes.
