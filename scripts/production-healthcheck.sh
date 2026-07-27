#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

section() {
  printf '\n## %s\n' "$1"
}

section "host"
date -u +%Y-%m-%dT%H:%M:%SZ
uptime
if [ -f /var/run/reboot-required ]; then
  printf 'reboot_required=yes\n'
else
  printf 'reboot_required=no\n'
fi

section "disk"
df -h /
df -ih /

section "systemd"
systemctl --failed --no-pager || true

section "compose"
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml ps

section "database"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select 1;" >/dev/null'
printf 'postgres=ok\n'

section "redis"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T redis sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping' >/dev/null
printf 'redis=ok\n'

section "public-smoke"
for url in \
  'https://middleware.media/' \
  'https://www.middleware.media/' \
  'https://middleware.media/cms/login' \
  'https://middleware.media/cms/media' \
  'https://middleware.media/api/og?title=health' \
  'https://stats.middleware.media/'
do
  curl -sS -o /dev/null -w "url=${url} code=%{http_code} content_type=%{content_type} time=%{time_total} redirect=%{redirect_url}\n" "$url"
done

section "object-storage-egress"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T app node -e "fetch('https://fsn1.your-objectstorage.com',{method:'HEAD'}).then(r=>console.log('object_storage_status='+r.status)).catch(e=>{console.error(e.name+': '+e.message); process.exit(1);})"

section "deploy-source"
sed -n '1,10p' DEPLOY_SOURCE 2>/dev/null || true
