<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document how to manage environment variables, private keys, and sensitive configuration in projects built from this template.
@sidecar env-and-keys.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Environment variables and private keys

## Quick start

```bash
cp .env.example .env
# Edit .env with your real values
```

## How it works

| File | Tracked? | Purpose |
|---|---|---|
| `.env.example` | Yes | Documents expected variables with placeholder values |
| `.env` | No (git-ignored) | Your local real values — never committed |
| `.env.test` | No (git-ignored) | Test-specific overrides |
| `*.pem`, `*.key` | No (git-ignored) | Private keys and certificates |

## What `.gitignore` protects

```gitignore
.env
.env.*
!.env.example    # exception — the reference file IS tracked
*.pem
*.key
*.p12
*.pfx
*.jks
```

## Reading environment variables at runtime

Use `process.env` directly for Node.js scripts and server-side code:

```js
const jwtKey = process.env.JWT_SECRET;
if (!jwtKey) throw new Error('JWT_SECRET is required');
```

For browser-side code, use your bundler's env injection (Vite uses `import.meta.env`, webpack uses `process.env` via DefinePlugin). Never bundle private keys into client-side code — only public configuration like API base URLs.

## Private keys for JWT

For production JWT signing with asymmetric algorithms (RS256, ES256):

```bash
# Generate an ES256 key pair
openssl ecparam -genkey -name prime256v1 -noout -out jwt-private.key
openssl ec -in jwt-private.key -pubout -out jwt-public.pem
```

Reference them via environment variables:

```bash
JWT_PRIVATE_KEY_PATH=./jwt-private.key
JWT_PUBLIC_KEY_PATH=./jwt-public.pem
```

The `.key` and `.pem` extensions are git-ignored by default.

## Security checklist

- [ ] `.env` is in `.gitignore` (done by default in this template)
- [ ] `.env.example` has only placeholder values, never real credential data
- [ ] Private keys (`*.pem`, `*.key`) are git-ignored
- [ ] Client-side code never bundles private keys
- [ ] Production uses a vault or platform-native injection, not `.env` files
- [ ] The `dangerous-command-blocker` hook blocks accidental edits to `.env` files

## Production deployment

For production deployments, use your platform's native mechanism:

- **Docker/K8s**: Kubernetes mounted volumes, Docker config
- **Cloud**: AWS Secrets Manager, Azure Key Vault, GCP Secret Manager
- **CI/CD**: GitHub Actions variables, GitLab CI variables
- **Self-hosted**: HashiCorp Vault, Doppler

The `.env` pattern is for local development only. Production should inject values via the runtime environment, not files on disk.
