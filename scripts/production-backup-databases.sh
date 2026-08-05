#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

backup_root="backups/automated"
daily_dir="${backup_root}/daily"
weekly_dir="${backup_root}/weekly"
manifest_dir="${backup_root}/manifests"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
manifest="${manifest_dir}/backup-${stamp}.txt"
manifest_partial="${manifest}.partial"

umask 077
mkdir -p "$daily_dir" "$weekly_dir" "$manifest_dir"
exec 9>"${backup_root}/backup.lock"
if ! flock -n 9; then
  printf 'backup_already_running=yes\n' >&2
  exit 1
fi

available_bytes="$(df --output=avail -B1 "$backup_root" | tail -n 1 | tr -d ' ')"
if [ "$available_bytes" -lt 1073741824 ]; then
  printf 'backup_free_space_below_1g=yes\n' >&2
  exit 1
fi

app_dump="${daily_dir}/app-postgres-${stamp}.dump"
umami_dump="${daily_dir}/umami-postgres-${stamp}.dump"
app_partial="${app_dump}.partial"
umami_partial="${umami_dump}.partial"

cleanup() {
  rm -f -- "$app_partial" "$umami_partial" "$manifest_partial"
}
trap cleanup EXIT

{
  printf 'backup_started=%s\n' "$stamp"
  printf 'policy=5-hour local dumps, keep 70 generations and 8 weekly snapshots\n'
} > "$manifest_partial"

docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$app_partial"
test -s "$app_partial"
docker compose --env-file .env.production -f compose.production.yml exec -T postgres pg_restore --list < "$app_partial" > /dev/null

docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$umami_partial"
test -s "$umami_partial"
docker compose --env-file .env.production -f compose.production.yml exec -T umami-postgres pg_restore --list < "$umami_partial" > /dev/null

mv "$app_partial" "$app_dump"
mv "$umami_partial" "$umami_dump"

{
  printf '\ndumps\n'
  ls -lh "$app_dump" "$umami_dump"
  printf '\nsha256\n'
  sha256sum "$app_dump" "$umami_dump"
} >> "$manifest_partial"

iso_week="$(date -u +%G-W%V)"
if [ "$(date -u +%u)" = "7" ] && ! compgen -G "${weekly_dir}/app-postgres-weekly-${iso_week}-*.dump" > /dev/null; then
  cp "$app_dump" "${weekly_dir}/app-postgres-weekly-${iso_week}-${stamp}.dump"
  cp "$umami_dump" "${weekly_dir}/umami-postgres-weekly-${iso_week}-${stamp}.dump"
  {
    printf '\nweekly_snapshots\n'
    ls -lh "${weekly_dir}/app-postgres-weekly-${iso_week}-${stamp}.dump" "${weekly_dir}/umami-postgres-weekly-${iso_week}-${stamp}.dump"
  } >> "$manifest_partial"
fi

prune_log="$manifest_partial"
prune_oldest() {
  local pattern="$1"
  local keep="$2"
  mapfile -t files < <(ls -1t $pattern 2>/dev/null || true)
  if [ "${#files[@]}" -le "$keep" ]; then
    return 0
  fi

  printf '\npruned_%s\n' "$pattern" >> "$prune_log"
  for file in "${files[@]:$keep}"; do
    printf '%s\n' "$file" >> "$prune_log"
    rm -f -- "$file"
  done
}

{
  printf '\ndisk_after\n'
  df -h /
  printf 'backup_finished=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)"
} >> "$manifest_partial"

mv "$manifest_partial" "$manifest"
trap - EXIT

/opt/middleware/bin/backup-offsite.sh "$manifest"

prune_log="${manifest_dir}/cleanup-${stamp}.txt"
prune_oldest "${daily_dir}/app-postgres-*.dump" 70
prune_oldest "${daily_dir}/umami-postgres-*.dump" 70
prune_oldest "${weekly_dir}/app-postgres-weekly-*.dump" 8
prune_oldest "${weekly_dir}/umami-postgres-weekly-*.dump" 8
prune_oldest "${manifest_dir}/backup-*.txt" 90

printf 'backup_manifest=%s\n' "$manifest"
