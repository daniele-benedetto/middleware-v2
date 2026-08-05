#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

manifest="${1:?usage: backup-offsite.sh <completed-manifest>}"
backup_root="backups/automated"
offsite_dir="${backup_root}/offsite"
marker="${offsite_dir}/latest-ok"
stamp="$(basename "$manifest" | sed -E 's/^backup-(.+)\.txt$/\1/')"
app_dump="${backup_root}/daily/app-postgres-${stamp}.dump"
umami_dump="${backup_root}/daily/umami-postgres-${stamp}.dump"

test -s "$manifest"
grep -q '^backup_finished=' "$manifest"
test -s "$app_dump"
test -s "$umami_dump"
: "${AGE_RECIPIENT:?AGE_RECIPIENT is required}"
: "${RCLONE_DB_DESTINATION:?RCLONE_DB_DESTINATION is required}"

umask 077
mkdir -p "$offsite_dir"
stage="$(mktemp -d "${offsite_dir}/stage-${stamp}.XXXXXX")"
cleanup() {
  rm -rf -- "$stage"
}
trap cleanup EXIT

docker compose --env-file .env.production -f compose.production.yml exec -T postgres pg_restore --list < "$app_dump" > /dev/null
docker compose --env-file .env.production -f compose.production.yml exec -T umami-postgres pg_restore --list < "$umami_dump" > /dev/null

cp "$manifest" "$stage/"
sha256sum "$app_dump" "$umami_dump" "$manifest" > "$stage/SHA256SUMS"
age -r "$AGE_RECIPIENT" -o "$stage/$(basename "$app_dump").age" "$app_dump"
age -r "$AGE_RECIPIENT" -o "$stage/$(basename "$umami_dump").age" "$umami_dump"
age -r "$AGE_RECIPIENT" -o "$stage/$(basename "$manifest").age" "$manifest"
rm -f "$stage/$(basename "$manifest")"

destination_root="${RCLONE_DB_DESTINATION%/}"
destination="${destination_root}/generations/${stamp}"
rclone copy "$stage" "$destination" --checksum --transfers 2 --checkers 4
rclone check "$stage" "$destination" --one-way --checksum

day="$(date -u +%Y-%m-%d)"
daily_destination="${destination_root}/daily/${day}"
rclone copy "$stage" "$daily_destination" --checksum --transfers 2 --checkers 4
rclone check "$stage" "$daily_destination" --one-way --checksum

if [ "$(date -u +%d)" = "01" ]; then
  month="$(date -u +%Y-%m)"
  monthly_destination="${destination_root}/monthly/${month}"
  rclone copy "$stage" "$monthly_destination" --checksum --transfers 2 --checkers 4
  rclone check "$stage" "$monthly_destination" --one-way --checksum
fi

rclone delete "${destination_root}/generations" --min-age 14d --rmdirs
rclone delete "${destination_root}/daily" --min-age 30d --rmdirs
rclone delete "${destination_root}/monthly" --min-age 365d --rmdirs

marker_partial="${marker}.partial"
{
  printf 'backup_stamp=%s\n' "$stamp"
  printf 'manifest_sha256=%s\n' "$(sha256sum "$manifest" | cut -d ' ' -f 1)"
  printf 'offsite_destination=%s\n' "$destination"
  printf 'offsite_finished=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)"
} > "$marker_partial"
mv "$marker_partial" "$marker"

printf 'offsite_marker=%s\n' "$marker"
