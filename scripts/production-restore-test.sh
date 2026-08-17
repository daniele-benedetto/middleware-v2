#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

backup_root="backups/automated"
manifest_dir="${backup_root}/restore-tests"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
started_epoch="$(date +%s)"
manifest="${manifest_dir}/restore-test-${stamp}.txt"
app_db="middleware_restore_test_${stamp}"
umami_db="umami_restore_test_${stamp}"

umask 077
mkdir -p "$manifest_dir"

latest_backup_manifest="$(ls -1t ${backup_root}/manifests/backup-*.txt 2>/dev/null | head -n 1 || true)"

if [ -z "$latest_backup_manifest" ]; then
  printf 'missing_latest_dump=yes\n' > "$manifest"
  exit 1
fi

grep -q '^backup_finished=' "$latest_backup_manifest"
backup_stamp="$(basename "$latest_backup_manifest" | sed -E 's/^backup-(.+)\.txt$/\1/')"
latest_app="${backup_root}/daily/app-postgres-${backup_stamp}.dump"
latest_umami="${backup_root}/daily/umami-postgres-${backup_stamp}.dump"

test -s "$latest_app"
test -s "$latest_umami"
docker compose --env-file .env.production -f compose.production.yml exec -T postgres pg_restore --list < "$latest_app" > /dev/null
docker compose --env-file .env.production -f compose.production.yml exec -T umami-postgres pg_restore --list < "$latest_umami" > /dev/null

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
docker compose --env-file .env.production -f compose.production.yml exec -T -e RESTORE_DB="$app_db" postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DB" --no-owner --no-acl --exit-on-error --single-transaction' < "$latest_app"
app_migrations="$(docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$app_db" postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -tAc "select count(*) from \"_prisma_migrations\";"')"
test "$app_migrations" = "4"
printf 'app_migrations=%s\n' "$app_migrations" >> "$manifest"

docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$umami_db" umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$RESTORE_DB"'
docker compose --env-file .env.production -f compose.production.yml exec -T -e RESTORE_DB="$umami_db" umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DB" --no-owner --no-acl --exit-on-error --single-transaction' < "$latest_umami"
umami_tables="$(docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T -e RESTORE_DB="$umami_db" umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -tAc "select count(*) from information_schema.tables where table_schema = '\''public'\'';"')"
test "$umami_tables" = "19"
printf 'umami_tables=%s\n' "$umami_tables" >> "$manifest"

cleanup
trap - EXIT

{
  printf 'restore_test_finished=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)"
  printf 'restore_duration_seconds=%s\n' "$(( $(date +%s) - started_epoch ))"
  printf 'source_backup_age_seconds=%s\n' "$(( started_epoch - $(stat -c %Y "$latest_app") ))"
  printf 'restore_test=ok\n'
} >> "$manifest"

printf 'restore_manifest=%s\n' "$manifest"

mapfile -t restore_manifests < <(ls -1t "${manifest_dir}"/restore-test-*.txt 2>/dev/null || true)
for stale_manifest in "${restore_manifests[@]:24}"; do
  rm -f -- "$stale_manifest"
done
