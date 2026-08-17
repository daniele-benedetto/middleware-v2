#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${SSH_HOST:-}"
SSH_USER="deploy"
SSH_KEY="${HOME}/.ssh/middleware_hetzner_ed25519"
REMOTE_DIR="/opt/middleware"
MODE="dry-run"
ALLOW_DIRTY="false"
SKIP_LOCAL_CHECKS="false"

usage() {
  cat <<'EOF'
Usage: scripts/production-deploy-manual.sh [options]

Options:
  --dry-run             Run prechecks and rsync dry-run only (default)
  --execute             Perform the production deploy
  --allow-dirty         Allow deploy with uncommitted local changes
  --skip-local-checks   Skip pnpm typecheck and pnpm test:run
  --host HOST           SSH host/IP (required unless SSH_HOST is set)
  --user USER           SSH user (default: deploy)
  --key PATH            SSH private key path
  -h, --help            Show this help
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) MODE="dry-run" ;;
    --execute) MODE="execute" ;;
    --allow-dirty) ALLOW_DIRTY="true" ;;
    --skip-local-checks) SKIP_LOCAL_CHECKS="true" ;;
    --host) SSH_HOST="$2"; shift ;;
    --user) SSH_USER="$2"; shift ;;
    --key) SSH_KEY="$2"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage; exit 2 ;;
  esac
  shift
done

if [ -z "$SSH_HOST" ]; then
  printf 'SSH host is required. Use --host or set SSH_HOST.\n' >&2
  exit 2
fi

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

require_command git
require_command pnpm
require_command rsync
require_command ssh

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

short_sha="$(git rev-parse --short HEAD)"
dirty="false"
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  dirty="true"
fi

if [ "$dirty" = "true" ] && [ "$ALLOW_DIRTY" != "true" ]; then
  printf 'Refusing to deploy dirty worktree without --allow-dirty.\n' >&2
  git status --short
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dirty_suffix=""
if [ "$dirty" = "true" ]; then
  dirty_suffix="-dirty"
fi
image_tag="manual-${short_sha}${dirty_suffix}-${stamp}"
ssh_target="${SSH_USER}@${SSH_HOST}"
ssh_opts=(-i "$SSH_KEY" -o BatchMode=yes)

printf 'mode=%s\n' "$MODE"
printf 'commit=%s\n' "$short_sha"
printf 'dirty=%s\n' "$dirty"
printf 'image=middleware-app:%s\n' "$image_tag"

if [ "$SKIP_LOCAL_CHECKS" != "true" ]; then
  pnpm typecheck
  pnpm test:run
fi

ssh "${ssh_opts[@]}" "$ssh_target" "${REMOTE_DIR}/bin/healthcheck.sh"

rsync_args=(
  -az
  -e "ssh -i ${SSH_KEY} -o BatchMode=yes"
  --delete
  --exclude '.git/'
  --exclude '.next/'
  --exclude 'node_modules/'
  --exclude '.env*'
  --exclude '*.local'
  --exclude '*.local.*'
  --exclude 'backups/'
  --exclude 'coverage/'
  --exclude 'tiles-incoming/'
  --exclude '.turbo/'
  --exclude '.vercel/'
)

if [ "$MODE" = "dry-run" ]; then
  rsync "${rsync_args[@]}" --dry-run ./ "${ssh_target}:${REMOTE_DIR}/app/"
  printf 'dry_run=ok\n'
  exit 0
fi

ssh "${ssh_opts[@]}" "$ssh_target" bash -s -- "$image_tag" <<'REMOTE_PRE_SYNC'
set -euo pipefail

tag="$1"
cd /opt/middleware

docker buildx version >/dev/null

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p backups
docker builder prune -af >/dev/null 2>&1 || true

prune_deploy_files() {
  local label="$1"
  local keep="$2"
  local pattern="$3"
  local manifest="backups/cleanup-manifest-${stamp}-${label}.txt"
  local files=()

  mapfile -t files < <(ls -1dt $pattern 2>/dev/null || true)
  if [ "${#files[@]}" -le "$keep" ]; then
    return 0
  fi

  {
    printf 'policy=retain %s newest %s\n' "$keep" "$label"
    printf 'created_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'disk_before=\n'
    df -h /
    printf 'retained=\n'
    printf '%s\n' "${files[@]:0:keep}"
    printf 'removed=\n'
    printf '%s\n' "${files[@]:keep}"
    printf 'sizes_before=\n'
    du -sh "${files[@]}"
  } > "$manifest"
  rm -rf -- "${files[@]:keep}"
  {
    printf 'disk_after=\n'
    df -h /
  } >> "$manifest"
}

available_kb="$(df --output=avail / | tail -n 1 | tr -d ' ')"
test "$available_kb" -ge 12582912

backup_file="backups/postgres-predeploy-${tag}-${stamp}.dump"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$backup_file"
test -s "$backup_file"

app_backup="app.backup.${tag}.${stamp}"
mkdir -p "$app_backup"
rsync -a --delete \
  --exclude '.next/' \
  --exclude 'coverage/' \
  --exclude 'node_modules/' \
  --exclude 'tiles-incoming/' \
  app/ "$app_backup/"
cp compose.production.yml "compose.production.yml.backup.${tag}.${stamp}"
prune_deploy_files "app-backup" 1 "app.backup.*"
prune_deploy_files "predeploy-dump" 7 "backups/postgres-predeploy-*.dump"
prune_deploy_files "compose-backup" 1 "compose.production.yml.backup.*"

docker compose --env-file .env.production -f compose.production.yml config --quiet
printf 'pre_sync_backup=ok backup=%s\n' "$backup_file"
REMOTE_PRE_SYNC

rsync "${rsync_args[@]}" ./ "${ssh_target}:${REMOTE_DIR}/app/"

ssh "${ssh_opts[@]}" "$ssh_target" bash -s -- "$image_tag" "$short_sha" "$dirty" <<'REMOTE'
set -euo pipefail

tag="$1"
commit="$2"
dirty="$3"
cd /opt/middleware

docker compose --env-file .env.production -f compose.production.yml config --quiet
postgres_container_before="$(docker compose --env-file .env.production -f compose.production.yml ps -q postgres)"
redis_container_before="$(docker compose --env-file .env.production -f compose.production.yml ps -q redis)"
test -n "$postgres_container_before"
test -n "$redis_container_before"

build_env="$(mktemp)"
migrate_env="$(mktemp)"
events_file="$(mktemp)"
inspect_file="$(mktemp)"
secret_file="$(mktemp)"
proxy_pid=""
cleanup() {
  docker builder prune -af >/dev/null 2>&1 || true
  rm -f "$build_env" "$migrate_env" "$events_file" "$inspect_file" "$secret_file"
  if [ -n "$proxy_pid" ]; then
    kill "$proxy_pid" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

python3 - <<'PY' "$build_env" "$migrate_env" "$secret_file"
from pathlib import Path
import shlex
import sys

build_env_path = Path(sys.argv[1])
migrate_env_path = Path(sys.argv[2])
secret_path = Path(sys.argv[3])
values = {}
for line in Path('/opt/middleware/.env.production').read_text().splitlines():
    if not line or line.lstrip().startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    values[key] = value

build_keys = [
    'DATABASE_URL', 'POSTGRES_URL', 'PRISMA_DATABASE_URL', 'REDIS_URL',
    'BETTER_AUTH_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_UMAMI_SRC',
    'NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'NEXT_PUBLIC_UMAMI_DOMAINS',
    'NEXT_PUBLIC_UMAMI_PERFORMANCE', 'NEXT_PUBLIC_UMAMI_DO_NOT_TRACK',
    'NEXT_PUBLIC_UMAMI_EXCLUDE_SEARCH', 'NEXT_PUBLIC_UMAMI_EXCLUDE_HASH',
    'NEXT_PUBLIC_PRIVACY_BANNER_MODE', 'SITE_URL',
]
def build_value(key: str) -> str:
    value = values[key]
    if key in {'DATABASE_URL', 'POSTGRES_URL', 'PRISMA_DATABASE_URL'}:
        value = value.replace('@postgres:5432/', '@127.0.0.1:15432/')
        value = value.replace('@postgres/', '@127.0.0.1:15432/')
    return value

build_env_path.write_text('\n'.join(f'export {key}={shlex.quote(build_value(key))}' for key in build_keys if key in values) + '\n')
migrate_keys = ['DATABASE_URL', 'POSTGRES_URL', 'PRISMA_DATABASE_URL']
migrate_env_path.write_text('\n'.join(f'{key}={values[key]}' for key in migrate_keys if key in values) + '\n')
secret_path.write_text('\n'.join(values[key] for key in ('POSTGRES_PASSWORD', 'REDIS_PASSWORD') if key in values) + '\n')
PY
chmod 600 "$build_env" "$migrate_env" "$secret_file"

if ! command -v socat >/dev/null 2>&1; then
  sudo -n apt-get update
  sudo -n apt-get install -y socat
fi
postgres_ip="$(docker inspect -f '{{with index .NetworkSettings.Networks "middleware_internal"}}{{.IPAddress}}{{end}}' middleware-postgres-1)"
test -n "$postgres_ip"
socat "TCP-LISTEN:15432,bind=127.0.0.1,fork,reuseaddr" "TCP:${postgres_ip}:5432" &
proxy_pid="$!"
sleep 1

DOCKER_BUILDKIT=1 docker build --network host --target migrate -t "middleware-migrate:${tag}" app
DOCKER_BUILDKIT=1 docker build --network host --secret "id=build_env,src=${build_env}" --target runner -t "middleware-app:${tag}" app

docker run --rm --network middleware_internal --env-file "$migrate_env" "middleware-migrate:${tag}" pnpm prisma:migrate:deploy

test "$(docker compose --env-file .env.production -f compose.production.yml ps -q postgres)" = "$postgres_container_before"
test "$(docker compose --env-file .env.production -f compose.production.yml ps -q redis)" = "$redis_container_before"

python3 - <<'PY' "$tag"
from pathlib import Path
import sys

tag = sys.argv[1]
path = Path('/opt/middleware/compose.production.yml')
lines = path.read_text().splitlines()
changed = False
for index, line in enumerate(lines):
    if line.startswith('    image: ghcr.io/daniele-benedetto/middleware-v2/app:') or line.startswith('    image: middleware-app:'):
        lines[index] = f'    image: middleware-app:{tag}'
        changed = True
        break
if not changed:
    raise SystemExit('app image line not found')
path.write_text('\n'.join(lines) + '\n')
PY

docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app

printf 'branch=main\ncommit=%s\ndirty=%s\nsynced_at=%s\nmethod=manual-vps-rsync\nimage=middleware-app:%s\n' "$commit" "$dirty" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$tag" > DEPLOY_SOURCE

/opt/middleware/bin/healthcheck.sh

docker events --since 10m --until 0s > "$events_file" || true
docker image inspect "middleware-app:${tag}" "middleware-migrate:${tag}" > "$inspect_file"

python3 - <<'PY' "$secret_file" "$events_file" "$inspect_file"
from pathlib import Path
import sys

secrets = [secret for secret in Path(sys.argv[1]).read_text().splitlines() if secret]
events = Path(sys.argv[2]).read_text(errors='ignore')
inspect = Path(sys.argv[3]).read_text(errors='ignore')
if any(secret in events for secret in secrets):
    raise SystemExit('current secret found in recent docker events')
if any(secret in inspect for secret in secrets):
    raise SystemExit('current secret found in image metadata')
PY

prune_manual_images() {
  local repository="$1"
  local keep="$2"
  local active_reference="$3"
  local manifest="backups/image-cleanup-manifest-$(date -u +%Y%m%dT%H%M%SZ)-${repository}.txt"
  local references=()

  mapfile -t references < <(
    docker image ls --format '{{.Repository}}:{{.Tag}}' --filter "reference=${repository}:manual-*"
  )
  if [ "${#references[@]}" -le "$keep" ]; then
    return 0
  fi

  {
    printf 'policy=retain %s newest %s manual images\n' "$keep" "$repository"
    printf 'created_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'retained=\n'
    printf '%s\n' "${references[@]:0:keep}"
    printf 'removed=\n'
  } > "$manifest"

  for reference in "${references[@]:keep}"; do
    if [ "$reference" = "$active_reference" ]; then
      printf 'skipped_active=%s\n' "$reference" >> "$manifest"
      continue
    fi

    if docker image rm "$reference" >> "$manifest" 2>&1; then
      printf 'removed_image=%s\n' "$reference" >> "$manifest"
    else
      printf 'retained_shared_or_in_use=%s\n' "$reference" >> "$manifest"
    fi
  done
}

prune_manual_images "middleware-app" 2 "middleware-app:${tag}"
prune_manual_images "middleware-migrate" 1 ""

printf 'manual_deploy=ok\n'
REMOTE
