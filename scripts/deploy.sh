#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ] || [ -z "${1:-}" ]; then
  echo "Usage: $0 <image-tag>" >&2
  exit 2
fi

NEW_TAG="$1"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
DEPLOY_SKIP_PULL="${DEPLOY_SKIP_PULL:-0}"
DEPLOY_SKIP_BACKUP="${DEPLOY_SKIP_BACKUP:-0}"
GHCR_REGISTRY="${GHCR_REGISTRY:-ghcr.io}"
GHCR_USER="${GHCR_USER:-}"
GHCR_PAT="${GHCR_PAT:-}"

load_env_file() {
  if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
  fi
}

set_env_value() {
  key="$1"
  value="$2"
  tmp_file="$(mktemp)"

  if [ -f "$ENV_FILE" ]; then
    awk -v key="$key" -v value="$value" '
      BEGIN { found = 0 }
      $0 ~ "^" key "=" {
        print key "=" value
        found = 1
        next
      }
      { print }
      END {
        if (found == 0) {
          print key "=" value
        }
      }
    ' "$ENV_FILE" > "$tmp_file"
  else
    printf "%s=%s\n" "$key" "$value" > "$tmp_file"
  fi

  mv "$tmp_file" "$ENV_FILE"
}

run_migration() {
  docker compose -f "$COMPOSE_FILE" --profile ops run --rm migrate
}

start_app() {
  docker compose -f "$COMPOSE_FILE" up -d app
}

rollback() {
  if [ -z "${PREV_TAG:-}" ]; then
    echo "Health check failed and no previous IMAGE_TAG is available for rollback." >&2
    return 1
  fi

  echo "Health check failed. Rolling back to $PREV_TAG" >&2
  set_env_value IMAGE_TAG "$PREV_TAG"
  export IMAGE_TAG="$PREV_TAG"

  if [ "$DEPLOY_SKIP_PULL" != "1" ]; then
    docker compose -f "$COMPOSE_FILE" pull app
  fi

  start_app
}

load_env_file

PREV_TAG="${IMAGE_TAG:-}"

if [ -n "$GHCR_PAT" ]; then
  if [ -z "$GHCR_USER" ]; then
    echo "GHCR_USER is required when GHCR_PAT is set" >&2
    exit 1
  fi

  printf "%s" "$GHCR_PAT" | docker login "$GHCR_REGISTRY" -u "$GHCR_USER" --password-stdin
fi

if [ "$DEPLOY_SKIP_BACKUP" != "1" ]; then
  ./scripts/backup-db.sh
fi

set_env_value IMAGE_TAG "$NEW_TAG"
export IMAGE_TAG="$NEW_TAG"

if [ "$DEPLOY_SKIP_PULL" != "1" ]; then
  docker compose -f "$COMPOSE_FILE" pull app
  docker compose -f "$COMPOSE_FILE" --profile ops pull migrate
fi

run_migration
start_app

if ! ./scripts/healthcheck.sh; then
  rollback
  exit 1
fi

echo "Deploy ok: $NEW_TAG"
