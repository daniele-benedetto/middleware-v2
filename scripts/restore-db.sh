#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ] || [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 2
fi

backup_file="$1"

if [ ! -f "$backup_file" ]; then
  echo "Backup file not found: $backup_file" >&2
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-middleware}"
POSTGRES_DB="${POSTGRES_DB:-middleware}"
RESTORE_ALLOW_NON_EMPTY="${RESTORE_ALLOW_NON_EMPTY:-0}"
RESTORE_TIMEOUT_SECONDS="${RESTORE_TIMEOUT_SECONDS:-90}"

wait_for_postgres() {
  deadline=$((SECONDS + RESTORE_TIMEOUT_SECONDS))

  while [ "$SECONDS" -lt "$deadline" ]; do
    if docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
      pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
  done

  echo "Postgres did not become ready within ${RESTORE_TIMEOUT_SECONDS}s" >&2
  return 1
}

table_count() {
  docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
}

reset_public_schema() {
  docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
}

verify_restore() {
  docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At \
    -c "SELECT to_regclass('public.user') IS NOT NULL AND to_regclass('public.articles') IS NOT NULL;" | grep -qx "t"
}

docker compose -f "$COMPOSE_FILE" up -d "$POSTGRES_SERVICE"
wait_for_postgres

existing_tables="$(table_count)"

if [ "$existing_tables" != "0" ]; then
  if [ "$RESTORE_ALLOW_NON_EMPTY" != "1" ]; then
    echo "Refusing to restore into non-empty DB ($existing_tables tables). Set RESTORE_ALLOW_NON_EMPTY=1 to reset public schema first." >&2
    exit 1
  fi

  echo "Resetting non-empty public schema before restore ($existing_tables tables)." >&2
  reset_public_schema
fi

gzip -dc "$backup_file" | docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

verify_restore

echo "DB restore ok: $backup_file"
