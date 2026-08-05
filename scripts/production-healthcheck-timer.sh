#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

latest_manifest="$(ls -1t backups/automated/manifests/backup-*.txt 2>/dev/null | head -n 1 || true)"
offsite_marker="backups/automated/offsite/latest-ok"
media_marker="backups/automated/media-replication/latest-ok"

: "${HOST_HEARTBEAT_URL:?HOST_HEARTBEAT_URL is required}"

./bin/healthcheck.sh

if [ -z "$latest_manifest" ]; then
  printf 'latest_backup=missing\n'
  exit 1
fi

stamp="$(basename "$latest_manifest" | sed -E 's/^backup-(.+)\.txt$/\1/')"
latest_backup="backups/automated/daily/app-postgres-${stamp}.dump"
latest_umami="backups/automated/daily/umami-postgres-${stamp}.dump"

if [ ! -s "$latest_backup" ] || [ ! -s "$latest_umami" ]; then
  printf 'latest_backup=empty app=%s umami=%s\n' "$latest_backup" "$latest_umami"
  exit 1
fi

if [ $(( $(date +%s) - $(stat -c %Y "$latest_backup") )) -gt 20700 ] || \
   [ $(( $(date +%s) - $(stat -c %Y "$latest_umami") )) -gt 20700 ]; then
  printf 'latest_backup=stale path=%s\n' "$latest_backup"
  exit 1
fi

grep -q '^backup_finished=' "$latest_manifest"
docker compose --env-file .env.production -f compose.production.yml exec -T postgres pg_restore --list < "$latest_backup" > /dev/null
docker compose --env-file .env.production -f compose.production.yml exec -T umami-postgres pg_restore --list < "$latest_umami" > /dev/null
test -s "$offsite_marker"
grep -q "^backup_stamp=${stamp}$" "$offsite_marker"
expected_manifest_sha="$(sha256sum "$latest_manifest" | cut -d ' ' -f 1)"
grep -q "^manifest_sha256=${expected_manifest_sha}$" "$offsite_marker"
if [ $(( $(date +%s) - $(stat -c %Y "$offsite_marker") )) -gt 20700 ]; then
  printf 'offsite_backup=stale path=%s\n' "$offsite_marker"
  exit 1
fi

test -s "$media_marker"
if [ $(( $(date +%s) - $(stat -c %Y "$media_marker") )) -gt 46800 ]; then
  printf 'media_replication=stale path=%s\n' "$media_marker"
  exit 1
fi

disk_percent="$(df --output=pcent / | tail -n 1 | tr -dc '0-9')"
inode_percent="$(df --output=ipcent / | tail -n 1 | tr -dc '0-9')"
available_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
swap_used_kb="$(awk '/SwapTotal:/ {total=$2} /SwapFree:/ {free=$2} END {print total-free}' /proc/meminfo)"
test "$disk_percent" -lt 70
test "$inode_percent" -lt 70
test "$available_kb" -gt 1048576
test "$swap_used_kb" -lt 1048576

reboot_marker="backups/automated/reboot-required-since"
if [ -f /var/run/reboot-required ]; then
  if [ ! -e "$reboot_marker" ]; then
    touch "$reboot_marker"
  fi
  test $(( $(date +%s) - $(stat -c %Y "$reboot_marker") )) -lt 604800
else
  rm -f "$reboot_marker"
fi

while read -r container_id; do
  test -z "$container_id" && continue
  test "$(docker inspect --format '{{.RestartCount}}' "$container_id")" = "0"
  test "$(docker inspect --format '{{.State.OOMKilled}}' "$container_id")" = "false"
done < <(docker compose --env-file .env.production -f compose.production.yml ps -q)

curl --fail --silent --show-error --max-time 10 --retry 2 "$HOST_HEARTBEAT_URL" > /dev/null

printf 'latest_backup=ok app=%s umami=%s offsite=%s media=%s\n' "$latest_backup" "$latest_umami" "$offsite_marker" "$media_marker"
