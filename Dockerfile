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

# Build-time defaults. Production builds may override these so Next.js page-data
# collection can reach the production-like services instead of emitting partial
# artifacts when a route needs request-time data during build.
ARG BUILD_DATABASE_URL=postgresql://user:password@localhost:5432/db?sslmode=disable
ARG BUILD_REDIS_URL=redis://localhost:6379/0
ARG BUILD_BETTER_AUTH_URL=http://localhost:3000

ENV DATABASE_URL=$BUILD_DATABASE_URL
ENV POSTGRES_URL=$BUILD_DATABASE_URL
ENV PRISMA_DATABASE_URL=$BUILD_DATABASE_URL
ENV REDIS_URL=$BUILD_REDIS_URL
ENV BETTER_AUTH_SECRET=build-time-placeholder-32-characters-minimum
ENV BETTER_AUTH_URL=$BUILD_BETTER_AUTH_URL
ENV AUDIT_LOG_RETENTION_DAYS=365
ENV BLOB_READ_WRITE_TOKEN=build-time-placeholder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the bundle at build time, so the real
# public site URL must be provided here. It is public, not a secret.
ARG BUILD_NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG BUILD_NEXT_PUBLIC_UMAMI_SRC=
ARG BUILD_NEXT_PUBLIC_UMAMI_WEBSITE_ID=
ARG BUILD_NEXT_PUBLIC_PRIVACY_BANNER_MODE=acknowledge
ENV NEXT_PUBLIC_SITE_URL=$BUILD_NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_UMAMI_SRC=$BUILD_NEXT_PUBLIC_UMAMI_SRC
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$BUILD_NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_PRIVACY_BANNER_MODE=$BUILD_NEXT_PUBLIC_PRIVACY_BANNER_MODE
ENV SITE_URL=$BUILD_NEXT_PUBLIC_SITE_URL

RUN pnpm prisma:generate && pnpm build

FROM deps AS migrate
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://user:password@localhost:5432/db?sslmode=disable

COPY prisma ./prisma
COPY prisma.config.ts ./

# Bake the Prisma schema engine into the image at build time (internet is
# available here). The migrate container runs on the internal Docker network
# with no egress, so it must not try to download the engine at deploy time.
RUN pnpm exec prisma -v

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
