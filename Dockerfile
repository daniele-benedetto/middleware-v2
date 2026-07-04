FROM node:22-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

FROM base AS deps
WORKDIR /app

ENV HUSKY=0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time placeholders. The build never connects to these services: public
# pages render at request time (see connection() in app/(public)), so the real
# DB/Redis/auth values are only needed at container runtime, not during build.
ENV DATABASE_URL=postgresql://user:password@localhost:5432/db?sslmode=disable
ENV POSTGRES_URL=postgresql://user:password@localhost:5432/db?sslmode=disable
ENV PRISMA_DATABASE_URL=postgresql://user:password@localhost:5432/db?sslmode=disable
ENV REDIS_URL=redis://localhost:6379/0
ENV BETTER_AUTH_SECRET=build-time-placeholder-32-characters-minimum
ENV BETTER_AUTH_URL=http://localhost:3000
ENV AUDIT_LOG_RETENTION_DAYS=365
ENV BLOB_READ_WRITE_TOKEN=build-time-placeholder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the bundle at build time, so the real
# public site URL must be provided here. It is public, not a secret.
ARG BUILD_NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$BUILD_NEXT_PUBLIC_SITE_URL
ENV SITE_URL=$BUILD_NEXT_PUBLIC_SITE_URL

RUN pnpm prisma:generate && pnpm build

FROM deps AS migrate
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY prisma ./prisma
COPY prisma.config.ts ./

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
