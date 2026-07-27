#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

latest_backup="$(ls -1t backups/automated/daily/app-postgres-*.dump 2>/dev/null | head -n 1 || true)"

./bin/healthcheck.sh

if [ -z "$latest_backup" ]; then
  printf 'latest_backup=missing\n'
  exit 1
fi

if [ ! -s "$latest_backup" ]; then
  printf 'latest_backup=empty path=%s\n' "$latest_backup"
  exit 1
fi

if [ $(( $(date +%s) - $(stat -c %Y "$latest_backup") )) -gt 93600 ]; then
  printf 'latest_backup=stale path=%s\n' "$latest_backup"
  exit 1
fi

printf 'latest_backup=ok path=%s\n' "$latest_backup"
