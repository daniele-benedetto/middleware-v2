#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
APP_SERVICE="${APP_SERVICE:-app}"
TIMEOUT_SECONDS="${HEALTHCHECK_TIMEOUT_SECONDS:-90}"
SLEEP_SECONDS="${HEALTHCHECK_INTERVAL_SECONDS:-3}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"

deadline=$((SECONDS + TIMEOUT_SECONDS))

while [ "$SECONDS" -lt "$deadline" ]; do
  container_id="$(docker compose -f "$COMPOSE_FILE" ps -q "$APP_SERVICE" 2>/dev/null || true)"

  if [ -n "$container_id" ]; then
    status="$(docker inspect --format '{{ if .State.Health }}{{ .State.Health.Status }}{{ else }}no-healthcheck{{ end }}' "$container_id" 2>/dev/null || true)"

    if [ "$status" = "healthy" ]; then
      exit 0
    fi
  fi

  if [ -n "$HEALTHCHECK_URL" ]; then
    if node -e "fetch(process.argv[1]).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))" "$HEALTHCHECK_URL"; then
      exit 0
    fi
  fi

  sleep "$SLEEP_SECONDS"
done

echo "Health check failed for service '$APP_SERVICE' after ${TIMEOUT_SECONDS}s" >&2
exit 1
