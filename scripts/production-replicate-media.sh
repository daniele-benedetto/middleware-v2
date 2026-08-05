#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

: "${RCLONE_MEDIA_SOURCE:?RCLONE_MEDIA_SOURCE is required}"
: "${RCLONE_MEDIA_DESTINATION:?RCLONE_MEDIA_DESTINATION is required}"

state_dir="backups/automated/media-replication"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
marker="${state_dir}/latest-ok"
mkdir -p "$state_dir"
exec 9>"${state_dir}/replication.lock"
flock -n 9 || { printf 'media_replication_already_running=yes\n' >&2; exit 1; }

# copy is intentionally deletion-safe: source deletions are retained in DR.
rclone copy "$RCLONE_MEDIA_SOURCE" "$RCLONE_MEDIA_DESTINATION" \
  --checksum --transfers 4 --checkers 8 --create-empty-src-dirs
rclone check "$RCLONE_MEDIA_SOURCE" "$RCLONE_MEDIA_DESTINATION" \
  --one-way --checksum

source_size="$(rclone size "$RCLONE_MEDIA_SOURCE" --json)"
destination_size="$(rclone size "$RCLONE_MEDIA_DESTINATION" --json)"
marker_partial="${marker}.partial"
{
  printf 'replication_finished=%s\n' "$stamp"
  printf 'source=%s\n' "$source_size"
  printf 'destination=%s\n' "$destination_size"
} > "$marker_partial"
mv "$marker_partial" "$marker"

printf 'media_replication_marker=%s\n' "$marker"
