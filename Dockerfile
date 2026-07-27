# syntax=docker/dockerfile:1.7

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

ENV BETTER_AUTH_SECRET=build-time-placeholder-32-characters-minimum
ENV AUDIT_LOG_RETENTION_DAYS=365
ENV BLOB_READ_WRITE_TOKEN=build-time-placeholder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the bundle at build time, so the real
# public site URL must be provided here. It is public, not a secret.
ARG BUILD_NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG BUILD_NEXT_PUBLIC_UMAMI_SRC=
ARG BUILD_NEXT_PUBLIC_UMAMI_WEBSITE_ID=
ARG BUILD_NEXT_PUBLIC_UMAMI_DOMAINS=
ARG BUILD_NEXT_PUBLIC_UMAMI_PERFORMANCE=false
ARG BUILD_NEXT_PUBLIC_UMAMI_DO_NOT_TRACK=true
ARG BUILD_NEXT_PUBLIC_UMAMI_EXCLUDE_SEARCH=false
ARG BUILD_NEXT_PUBLIC_UMAMI_EXCLUDE_HASH=true
ARG BUILD_NEXT_PUBLIC_PRIVACY_BANNER_MODE=acknowledge
ENV NEXT_PUBLIC_SITE_URL=$BUILD_NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_UMAMI_SRC=$BUILD_NEXT_PUBLIC_UMAMI_SRC
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$BUILD_NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_UMAMI_DOMAINS=$BUILD_NEXT_PUBLIC_UMAMI_DOMAINS
ENV NEXT_PUBLIC_UMAMI_PERFORMANCE=$BUILD_NEXT_PUBLIC_UMAMI_PERFORMANCE
ENV NEXT_PUBLIC_UMAMI_DO_NOT_TRACK=$BUILD_NEXT_PUBLIC_UMAMI_DO_NOT_TRACK
ENV NEXT_PUBLIC_UMAMI_EXCLUDE_SEARCH=$BUILD_NEXT_PUBLIC_UMAMI_EXCLUDE_SEARCH
ENV NEXT_PUBLIC_UMAMI_EXCLUDE_HASH=$BUILD_NEXT_PUBLIC_UMAMI_EXCLUDE_HASH
ENV NEXT_PUBLIC_PRIVACY_BANNER_MODE=$BUILD_NEXT_PUBLIC_PRIVACY_BANNER_MODE
ENV SITE_URL=$BUILD_NEXT_PUBLIC_SITE_URL

# Production builds may mount /run/secrets/build_env so Next.js page-data
# collection can reach production-like services without baking secrets into image
# metadata. Local builds fall back to harmless placeholders.
RUN --mount=type=secret,id=build_env,required=false sh -lc '\
  if [ -f /run/secrets/build_env ]; then . /run/secrets/build_env; else \
    export DATABASE_URL="postgresql://user:password@localhost:5432/db?sslmode=disable"; \
    export POSTGRES_URL="$DATABASE_URL"; \
    export PRISMA_DATABASE_URL="$DATABASE_URL"; \
    export REDIS_URL="redis://localhost:6379/0"; \
    export BETTER_AUTH_URL="http://localhost:3000"; \
  fi; \
  pnpm prisma:generate && pnpm build \
'

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
