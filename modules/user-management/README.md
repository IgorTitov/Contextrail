<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the user-management hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx user-management
@public false
@edit careful -->

# user-management

User lifecycle: registration, profile, invitation, email verification, password reset

## Structure

```
modules/user-management/
├── domain/
│   └── user-management.mjs        # Pure domain logic (no deps)
├── ports/
│   └── user-management-port.mjs   # Port contract + validator
├── adapters/
│   └── default-adapter.mjs # Concrete adapter
├── messages.mjs            # i18n message registry
├── manifest.json           # Module metadata + capability surface
├── public-api.mjs          # Single cross-module entry point
└── README.md
```

## Usage

```javascript
import {
  registerUser,
  assertUserManagementPort,
  createMemoryUserManagementAdapter,
} from '../../modules/user-management/public-api.mjs';

const adapter = createMemoryUserManagementAdapter();
assertUserManagementPort(adapter);

const { user, verificationToken } = await adapter.register({ email: 'alice@example.com' });
const verified = await adapter.verifyEmail(verificationToken);
// verified.status === 'active'
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
- All user-facing copy uses i18n keys via `messages.mjs`.
