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
failed_units="$(systemctl --failed --no-legend --plain | wc -l | tr -d ' ')"
test "$failed_units" = "0"
printf 'failed_units=0\n'

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
check_url() {
  local url="$1"
  local expected_type="$2"
  local output

  output="$(curl --fail --location --silent --show-error \
    --connect-timeout 5 --max-time 20 --retry 2 --retry-connrefused \
    --output /dev/null \
    --write-out 'code=%{http_code} content_type=%{content_type} time=%{time_total}' \
    "$url")"
  case "$output" in
    *"content_type=${expected_type}"*) ;;
    *) printf 'unexpected_response url=%s %s\n' "$url" "$output" >&2; return 1 ;;
  esac
  printf 'url=%s %s\n' "$url" "$output"
}

for url in \
  'https://middleware.media/' \
  'https://www.middleware.media/' \
  'https://middleware.media/cms/login' \
  'https://middleware.media/cms/media' \
  'https://stats.middleware.media/'
do
  check_url "$url" 'text/html'
done
check_url 'https://middleware.media/api/og?title=health' 'image/png'

section "object-storage-auth"
timeout 30s docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T app node -e "import('@aws-sdk/client-s3').then(async({S3Client,HeadObjectCommand})=>{if(!process.env.S3_HEALTHCHECK_KEY)throw new Error('S3_HEALTHCHECK_KEY missing');const c=new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,forcePathStyle:process.env.S3_FORCE_PATH_STYLE!=='false',credentials:{accessKeyId:process.env.S3_ACCESS_KEY,secretAccessKey:process.env.S3_SECRET_KEY}});try{await c.send(new HeadObjectCommand({Bucket:process.env.S3_BUCKET,Key:process.env.S3_HEALTHCHECK_KEY}));console.log('object_storage_auth=ok')}finally{c.destroy()}}).catch(e=>{console.error(e.name);process.exit(1)})"

section "deploy-source"
sed -n '1,10p' DEPLOY_SOURCE 2>/dev/null || true
