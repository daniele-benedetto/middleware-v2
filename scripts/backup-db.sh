#!/usr/bin/env bash
set -euo pipefail

umask 077

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-middleware}"
POSTGRES_DB="${POSTGRES_DB:-middleware}"
BACKUP_DIR="${BACKUP_DIR:-.backups/db}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

mkdir -p "$BACKUP_DIR"

stamp="$(date +%F-%H%M%S)"
backup_file="$BACKUP_DIR/middleware-$stamp.sql.gz"

docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$backup_file"

echo "DB backup written: $backup_file"
echo "DB backup size: $(du -h "$backup_file" | cut -f1)"

if [ -n "$RCLONE_REMOTE" ]; then
  rclone copy "$backup_file" "$RCLONE_REMOTE"
  echo "DB backup copied to: $RCLONE_REMOTE"
fi

if [ "$BACKUP_RETENTION_DAYS" != "0" ]; then
  find "$BACKUP_DIR" -type f -name 'middleware-*.sql.gz' -mtime "+$BACKUP_RETENTION_DAYS" -delete
  echo "Local backup retention applied: ${BACKUP_RETENTION_DAYS} days"
fi
