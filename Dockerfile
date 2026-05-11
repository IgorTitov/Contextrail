# @HEADER
# @version 0.5.2 | 2026-04-11
# @purpose Multi-stage Docker image for Contextrail — dev, test, and production targets.
# @sidecar Dockerfile.header.md
# @layer root | @hex _none_ | @ctx _none_
# @public false
# @edit careful

# ── Base stage: Node + pnpm ──────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
WORKDIR /app

# ── Dependencies stage: install node_modules ─────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Dev stage: full source + deps for local development ──────────────
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "build:hosted"]

# ── Test stage: runs all 4 test layers ───────────────────────────────
FROM base AS test
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "test:all"]

# ── Lint stage: runs ESLint + Prettier checks ────────────────────────
FROM base AS lint
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["sh", "-c", "pnpm lint && pnpm format:check"]

# ── Production stage: minimal image with built output ────────────────
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build:hosted
USER node
EXPOSE 3000
CMD ["node", "dist/server.mjs"]
