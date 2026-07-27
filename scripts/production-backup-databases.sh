#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

backup_root="backups/automated"
daily_dir="${backup_root}/daily"
weekly_dir="${backup_root}/weekly"
manifest_dir="${backup_root}/manifests"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
manifest="${manifest_dir}/backup-${stamp}.txt"

umask 077
mkdir -p "$daily_dir" "$weekly_dir" "$manifest_dir"

app_dump="${daily_dir}/app-postgres-${stamp}.dump"
umami_dump="${daily_dir}/umami-postgres-${stamp}.dump"

{
  printf 'backup_started=%s\n' "$stamp"
  printf 'policy=daily local dumps, keep 14 daily and 8 weekly snapshots\n'
} > "$manifest"

docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$app_dump"
test -s "$app_dump"

docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$umami_dump"
test -s "$umami_dump"

{
  printf '\ndumps\n'
  ls -lh "$app_dump" "$umami_dump"
  printf '\nsha256\n'
  sha256sum "$app_dump" "$umami_dump"
} >> "$manifest"

if [ "$(date -u +%u)" = "7" ]; then
  cp "$app_dump" "${weekly_dir}/app-postgres-weekly-${stamp}.dump"
  cp "$umami_dump" "${weekly_dir}/umami-postgres-weekly-${stamp}.dump"
  {
    printf '\nweekly_snapshots\n'
    ls -lh "${weekly_dir}/app-postgres-weekly-${stamp}.dump" "${weekly_dir}/umami-postgres-weekly-${stamp}.dump"
  } >> "$manifest"
fi

prune_oldest() {
  local pattern="$1"
  local keep="$2"
  mapfile -t files < <(ls -1t $pattern 2>/dev/null || true)
  if [ "${#files[@]}" -le "$keep" ]; then
    return 0
  fi

  printf '\npruned_%s\n' "$pattern" >> "$manifest"
  for file in "${files[@]:$keep}"; do
    printf '%s\n' "$file" >> "$manifest"
    rm -f -- "$file"
  done
}

prune_oldest "${daily_dir}/app-postgres-*.dump" 14
prune_oldest "${daily_dir}/umami-postgres-*.dump" 14
prune_oldest "${weekly_dir}/app-postgres-weekly-*.dump" 8
prune_oldest "${weekly_dir}/umami-postgres-weekly-*.dump" 8
prune_oldest "${manifest_dir}/backup-*.txt" 60

{
  printf '\ndisk_after\n'
  df -h /
  printf 'backup_finished=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)"
} >> "$manifest"

printf 'backup_manifest=%s\n' "$manifest"
