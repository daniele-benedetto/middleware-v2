#!/usr/bin/env bash
set -euo pipefail

cd /opt/middleware

exec 9>/opt/middleware/popular-articles-sync.lock
if ! flock -n 9; then
  printf 'popular_articles_sync_already_running=yes\n' >&2
  exit 1
fi

test -r /opt/middleware/secrets/popular-articles.env
image="$(awk -F= '/^jobs_image=middleware-jobs:/{print $2}' DEPLOY_SOURCE)"
test -n "$image"

container_id="$(docker create \
  --network middleware_internal \
  --env-file /opt/middleware/secrets/popular-articles.env \
  "$image")"
cleanup() {
  docker rm -f "$container_id" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network connect middleware_public "$container_id"
docker start -a "$container_id"
