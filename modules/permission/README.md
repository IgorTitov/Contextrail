<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the permission hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx permission
@public false
@edit careful -->

# permission

Hexagonal bounded module for role-based permission checking.

Supports static in-memory rule evaluation with role hierarchy, and dynamic
permission adapters that delegate to external check functions with caching.

The auth dependency is a type-level contract only: permission duck-types on
`{ role: string }` and does not import from the auth module at runtime.

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/role-hierarchy.mjs` | Pure function: `createRoleHierarchy()` with `resolveRoles()` |
| Domain | `domain/rule-matcher.mjs` | Pure function: `matchRule()` for action/resource/condition matching |
| Ports | `ports/permission-port.mjs` | `PermissionPort` contract + `assertPermissionPort()` validator |
| Adapters | `adapters/static-rules-adapter.mjs` | In-memory rule-set adapter with role hierarchy support |
| Adapters | `adapters/dynamic-adapter.mjs` | External-check adapter with TTL cache and prefetch |
| Messages | `messages.mjs` | i18n message layer for all user-facing copy |
| Public API | `public-api.mjs` | Single cross-module entry point |

## Usage

```js
import {
  createStaticRulesAdapter,
  assertPermissionPort,
} from '../../modules/permission/public-api.mjs';

const adapter = createStaticRulesAdapter({
  roles: { admin: ['editor'], editor: ['viewer'] },
  rules: [
    { role: 'viewer', action: 'read', resource: 'article', effect: 'allow' },
    { role: 'editor', action: 'write', resource: 'article', effect: 'allow' },
    { role: 'admin', action: '*', resource: '*', effect: 'allow' },
  ],
});
assertPermissionPort(adapter);

adapter.setUser({ role: 'editor' });
adapter.can('read', 'article');  // true (inherited from viewer)
adapter.can('write', 'article'); // true (direct)
adapter.can('delete', 'article'); // false (no matching rule, default deny)
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
- All user-facing copy goes through `messages.mjs`.
