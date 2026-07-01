# Operational scripts

Scripts for the production-like Docker Compose runtime. They are safe to test locally and are the same entrypoints the VPS deploy will use later.

## Scripts

- `deploy.sh <image-tag>`: backup, migrate, app swap, healthcheck, rollback on failed healthcheck.
- `healthcheck.sh`: waits for the `app` container to become healthy, with optional HTTP fallback.
- `backup-db.sh`: writes a compressed `pg_dump` locally and optionally copies it with `rclone`.
- `restore-db.sh <backup.sql.gz>`: restores a compressed dump into the Compose Postgres service.
- `aggregate-observability.mjs`: rebuilds persisted daily observability aggregates from interpreted tables.
- `prune-observability.mjs`: deletes raw/interpreted observability data beyond retention without breaking aggregate history.
- `observability-jobs.mjs`: runs aggregate refresh and prune in sequence.

## Common variables

| Variable                                        | Default                   | Use                                                 |
| ----------------------------------------------- | ------------------------- | --------------------------------------------------- |
| `COMPOSE_FILE`                                  | `docker-compose.prod.yml` | Compose file path                                   |
| `ENV_FILE`                                      | `.env`                    | Env file updated by `deploy.sh`                     |
| `IMAGE_TAG`                                     | `local`                   | Current image tag                                   |
| `APP_IMAGE_REPOSITORY`                          | `middleware-app`          | App image repository                                |
| `MIGRATOR_IMAGE_REPOSITORY`                     | `middleware-migrator`     | Migrator image repository                           |
| `DEPLOY_SKIP_PULL`                              | `0`                       | Set `1` for local deploys without registry pulls    |
| `DEPLOY_SKIP_BACKUP`                            | `0`                       | Set `1` for local deploys without backup            |
| `HEALTHCHECK_URL`                               | empty                     | Optional HTTP healthcheck fallback                  |
| `BACKUP_DIR`                                    | `.backups/db`             | Local backup destination                            |
| `BACKUP_RETENTION_DAYS`                         | `30`                      | Local backup retention, `0` disables pruning        |
| `RCLONE_REMOTE`                                 | empty                     | Optional remote backup destination                  |
| `RESTORE_ALLOW_NON_EMPTY`                       | `0`                       | Set `1` to reset a non-empty DB before restore      |
| `OBSERVABILITY_AGGREGATE_DAYS`                  | `7`                       | Recent days rebuilt by observability jobs           |
| `OBSERVABILITY_RAW_RETENTION_DAYS`              | disabled                  | Raw `observability_events` retention window         |
| `OBSERVABILITY_INTERPRETED_RETENTION_DAYS`      | disabled                  | Engagement/performance interpreted retention window |
| `OBSERVABILITY_ERROR_OCCURRENCE_RETENTION_DAYS` | disabled                  | Error occurrence retention window                   |
| `OBSERVABILITY_AGGREGATE_RETENTION_DAYS`        | disabled                  | Persisted daily aggregate retention window          |
| `OBSERVABILITY_JOB_LOCK_MS`                     | `900000`                  | Aggregation lock timeout                            |

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

Local backup retention deletes `middleware-*.sql.gz` files older than `BACKUP_RETENTION_DAYS` in `BACKUP_DIR`. Set `BACKUP_RETENTION_DAYS=0` to disable local pruning.

## Local restore

Restore into a separate Compose project, not into the source DB:

```bash
COMPOSE_PROJECT_NAME=middleware-v2-restore-check docker compose -f docker-compose.prod.yml up -d postgres redis
COMPOSE_PROJECT_NAME=middleware-v2-restore-check ./scripts/restore-db.sh .backups/test/middleware-YYYY-MM-DD-HHMMSS.sql.gz
COMPOSE_PROJECT_NAME=middleware-v2-restore-check docker compose -f docker-compose.prod.yml --profile ops run --rm migrate
COMPOSE_PROJECT_NAME=middleware-v2-restore-check docker compose -f docker-compose.prod.yml down -v
```

`restore-db.sh` refuses to restore into a non-empty DB by default. To intentionally reset the public schema first:

```bash
RESTORE_ALLOW_NON_EMPTY=1 ./scripts/restore-db.sh .backups/test/middleware-YYYY-MM-DD-HHMMSS.sql.gz
```

## Observability jobs

Run aggregate refresh and prune from the migrator container, not the standalone app container:

```bash
OBSERVABILITY_RAW_RETENTION_DAYS=30 OBSERVABILITY_INTERPRETED_RETENTION_DAYS=180 pnpm observability:jobs
```

On the VPS, schedule it with cron from `/opt/middleware`:

```cron
15 2 * * * cd /opt/middleware && docker compose -f docker-compose.prod.yml --profile ops run --rm migrate pnpm observability:jobs
```

`observability:aggregate` is idempotent for the last `OBSERVABILITY_AGGREGATE_DAYS` days: it deletes and rebuilds only the selected aggregate window. `observability:prune` deletes raw/interpreted observability data according to the explicit retention variables. Persisted daily aggregates are retained separately and are not coupled to raw retention.

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
