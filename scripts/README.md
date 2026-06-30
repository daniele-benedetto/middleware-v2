# Operational scripts

Scripts for the production-like Docker Compose runtime. They are safe to test locally and are the same entrypoints the VPS deploy will use later.

## Scripts

- `deploy.sh <image-tag>`: backup, migrate, app swap, healthcheck, rollback on failed healthcheck.
- `healthcheck.sh`: waits for the `app` container to become healthy, with optional HTTP fallback.
- `backup-db.sh`: writes a compressed `pg_dump` locally and optionally copies it with `rclone`.

## Common variables

| Variable                    | Default                   | Use                                              |
| --------------------------- | ------------------------- | ------------------------------------------------ |
| `COMPOSE_FILE`              | `docker-compose.prod.yml` | Compose file path                                |
| `ENV_FILE`                  | `.env`                    | Env file updated by `deploy.sh`                  |
| `IMAGE_TAG`                 | `local`                   | Current image tag                                |
| `APP_IMAGE_REPOSITORY`      | `middleware-app`          | App image repository                             |
| `MIGRATOR_IMAGE_REPOSITORY` | `middleware-migrator`     | Migrator image repository                        |
| `DEPLOY_SKIP_PULL`          | `0`                       | Set `1` for local deploys without registry pulls |
| `DEPLOY_SKIP_BACKUP`        | `0`                       | Set `1` for local deploys without backup         |
| `HEALTHCHECK_URL`           | empty                     | Optional HTTP healthcheck fallback               |
| `BACKUP_DIR`                | `.backups/db`             | Local backup destination                         |
| `RCLONE_REMOTE`             | empty                     | Optional remote backup destination               |

## Local deploy smoke

```bash
pnpm docker:prod:build
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml --profile ops run --rm migrate
docker compose -f docker-compose.prod.yml --profile ops run --rm migrate pnpm auth:bootstrap-admin
ENV_FILE=.env.ops.local DEPLOY_SKIP_PULL=1 DEPLOY_SKIP_BACKUP=1 ./scripts/deploy.sh local
```

For an isolated smoke, set a project and port:

```bash
COMPOSE_PROJECT_NAME=middleware-v2-ops-check PROD_LOCAL_APP_PORT=3100 pnpm docker:prod:up
COMPOSE_PROJECT_NAME=middleware-v2-ops-check PROD_LOCAL_APP_PORT=3100 HEALTHCHECK_URL=http://127.0.0.1:3100/api/health ./scripts/healthcheck.sh
```

## Local backup

```bash
BACKUP_DIR=.backups/test ./scripts/backup-db.sh
```

If `RCLONE_REMOTE` is set, the same file is copied to that remote:

```bash
RCLONE_REMOTE=hetzner-backup:middleware-db ./scripts/backup-db.sh
```

## VPS notes

On the VPS, `.env` must define the real image repositories and current tag:

```bash
APP_IMAGE_REPOSITORY=ghcr.io/daniele-benedetto/middleware-v2
MIGRATOR_IMAGE_REPOSITORY=ghcr.io/daniele-benedetto/middleware-v2-migrator
IMAGE_TAG=<git-sha>
POSTGRES_USER=middleware
POSTGRES_PASSWORD=<secret>
GHCR_USER=<github-user>
GHCR_PAT=<read-only-token-if-ghcr-private>
RCLONE_REMOTE=hetzner-backup:middleware-db
```

`deploy.sh` performs application rollback only. Database rollback is manual restore from the pre-migration backup, so production migrations must follow expand-contract.
