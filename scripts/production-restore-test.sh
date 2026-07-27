#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

backup_root="backups/automated"
manifest_dir="${backup_root}/restore-tests"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
manifest="${manifest_dir}/restore-test-${stamp}.txt"
app_db="middleware_restore_test_${stamp}"
umami_db="umami_restore_test_${stamp}"

umask 077
mkdir -p "$manifest_dir"

latest_app="$(ls -1t ${backup_root}/daily/app-postgres-*.dump 2>/dev/null | head -n 1 || true)"
latest_umami="$(ls -1t ${backup_root}/daily/umami-postgres-*.dump 2>/dev/null | head -n 1 || true)"

if [ -z "$latest_app" ] || [ -z "$latest_umami" ]; then
  printf 'missing_latest_dump=yes\n' > "$manifest"
  exit 1
fi

test -s "$latest_app"
test -s "$latest_umami"

cleanup() {
  docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$app_db" postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" --if-exists "$RESTORE_DB"' >/dev/null 2>&1 || true
  docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$umami_db" umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" --if-exists "$RESTORE_DB"' >/dev/null 2>&1 || true
}
trap cleanup EXIT

{
  printf 'restore_test_started=%s\n' "$stamp"
  printf 'app_dump=%s\n' "$latest_app"
  printf 'umami_dump=%s\n' "$latest_umami"
} > "$manifest"

docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$app_db" postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$RESTORE_DB"'
docker compose --env-file .env.production -f compose.production.yml exec -T -e RESTORE_DB="$app_db" postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DB" --no-owner --no-acl' < "$latest_app"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$app_db" postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -c "select count(*) as app_migrations from \"_prisma_migrations\";"' >> "$manifest"

docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$umami_db" umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$RESTORE_DB"'
docker compose --env-file .env.production -f compose.production.yml exec -T -e RESTORE_DB="$umami_db" umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DB" --no-owner --no-acl' < "$latest_umami"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$umami_db" umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -c "select count(*) as umami_tables from information_schema.tables where table_schema = '\''public'\'';"' >> "$manifest"

cleanup
trap - EXIT

{
  printf 'restore_test_finished=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)"
  printf 'restore_test=ok\n'
} >> "$manifest"

printf 'restore_manifest=%s\n' "$manifest"
