#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
ENV_FILE=""
COMPOSE_FILE=""
SERVICE="app"
BUILD=1
FOLLOW_LOGS=0
CACHE_CLEANUP=1
AGGRESSIVE_CLEANUP=1
HEALTH_URL=""
HEALTH_PORT_ENV="PORT"
HEALTH_PORT_DEFAULT=""
HEALTH_PATH="/api/health"
HEALTH_MATCH='"success":true'

MIN_FREE_DISK_KB="${MIN_FREE_DISK_KB:-$((5 * 1024 * 1024))}"
MAX_REPO_BUILD_CACHE_KB="${MAX_REPO_BUILD_CACHE_KB:-$((1024 * 1024))}"
MAX_DOCKER_BUILD_CACHE_KB="${MAX_DOCKER_BUILD_CACHE_KB:-$((2 * 1024 * 1024))}"
MIN_FREE_DISK_AFTER_CLEANUP_KB="${MIN_FREE_DISK_AFTER_CLEANUP_KB:-$((3 * 1024 * 1024))}"

CACHE_PATHS=(
  ".docker-build-cache"
  "node_modules/.cache"
  "node_modules/.vite"
  "web/node_modules/.vite"
  "web/dist"
  "dist"
)
CONTEXT_EXTRA_PATHS=(
  "node_modules"
  "screenshots"
  "test-results"
  "playwright-report"
  "data"
  ".data"
  "release"
)

die() {
  echo "error: $*" >&2
  exit 1
}

need_arg() {
  [[ $# -ge 2 && -n "${2:-}" ]] || die "$1 requires a value"
}

resolve_path() {
  local base="$1"
  local value="$2"
  if [[ "$value" = /* ]]; then
    printf '%s\n' "$value"
  else
    printf '%s\n' "${base}/${value}"
  fi
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    printf 'docker compose'
  elif command -v docker-compose >/dev/null 2>&1; then
    printf 'docker-compose'
  else
    return 1
  fi
}

read_env_value() {
  local key="$1"
  local file="$2"
  local line
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0
  line="${line#export }"
  line="${line#${key}=}"
  line="${line%%#*}"
  line="${line%"${line##*[![:space:]]}"}"
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s\n' "$line"
}

usage() {
  cat <<'EOF'
Run a configured production update for a Backpack Game Core consumer.

The consumer wrapper must update its own Git checkout and initialize the core
submodule before invoking this runner. This script validates Docker Compose,
cleans safe build caches, rebuilds or restarts one service, waits for its health
endpoint, and prints diagnostic logs on failure. Docker volumes are never
pruned.

Required:
  --project-root DIR       Consumer repository root
  --env-file PATH          Env file for Docker Compose
  --compose-file PATH      Docker Compose file
  --health-url URL         Full health URL, or use the health port options

Options:
  --service NAME           Compose application service. Default: app
  --health-port-env KEY    Port key read from the env file. Default: PORT
  --health-port-default N  Fallback health port
  --health-path PATH       Health route. Default: /api/health
  --health-match TEXT      Required response fragment. Default: "success":true
  --no-build               Restart the service without rebuilding
  --no-cache-cleanup       Skip disk/cache cleanup
  --preflight-cleanup      Prune only when disk/cache thresholds are exceeded
  --aggressive-cleanup     Prune all unused Docker build/image cache (default)
  --logs                   Follow application logs after update
  -h, --help               Show this help
EOF
}

root_free_kb() {
  df -Pk / | awk 'NR == 2 { print $4 }'
}

path_size_kb() {
  local path="$1"
  [[ -e "$path" ]] || {
    printf '0\n'
    return
  }
  du -sk "$path" 2>/dev/null | awk '{ print $1 }'
}

paths_size_kb() {
  local total=0
  local relative_path
  local size
  for relative_path in "$@"; do
    size="$(path_size_kb "${PROJECT_ROOT}/${relative_path}")"
    total=$((total + size))
  done
  printf '%s\n' "$total"
}

docker_build_cache_kb() {
  local total_kb=0
  local raw
  local kb

  while IFS= read -r raw; do
    [[ -n "$raw" ]] || continue
    kb="$(awk -v raw="$raw" '
      BEGIN {
        value = raw;
        unit = raw;
        gsub(/[^0-9.]/, "", value);
        gsub(/[0-9.]/, "", unit);
        if (value == "") {
          print 0;
          exit;
        }
        if (unit == "B") multiplier = 1 / 1024;
        else if (unit == "kB" || unit == "KB" || unit == "KiB") multiplier = 1;
        else if (unit == "MB") multiplier = 1000;
        else if (unit == "MiB") multiplier = 1024;
        else if (unit == "GB") multiplier = 1000 * 1000;
        else if (unit == "GiB") multiplier = 1024 * 1024;
        else if (unit == "TB") multiplier = 1000 * 1000 * 1000;
        else if (unit == "TiB") multiplier = 1024 * 1024 * 1024;
        else multiplier = 1;
        printf "%.0f\n", value * multiplier;
      }
    ')"
    total_kb=$((total_kb + kb))
  done < <(docker builder du --format '{{.Size}}' 2>/dev/null || true)

  printf '%s\n' "$total_kb"
}

print_disk_summary() {
  local repo_cache_kb="$1"
  local docker_cache_kb="$2"
  local context_extra_kb="$3"

  echo ""
  echo "Disk/cache summary:"
  echo "  root free:            $(df -h / | awk 'NR == 2 { print $4 }')"
  echo "  repo build cache:     $((repo_cache_kb / 1024)) MB"
  echo "  docker build cache:   $((docker_cache_kb / 1024)) MB"
  echo "  excluded local files: $((context_extra_kb / 1024)) MB"
}

cleanup_repo_cache() {
  local relative_path
  for relative_path in "${CACHE_PATHS[@]}"; do
    rm -rf "${PROJECT_ROOT:?}/${relative_path}"
  done
}

cleanup_docker_space() {
  local mode="$1"
  local remove_repo_cache="$2"

  echo ""
  echo "Cleaning Docker/cache space (${mode})..."

  if [[ "$remove_repo_cache" -eq 1 ]]; then
    cleanup_repo_cache
  fi

  docker container prune -f >/dev/null || true

  if [[ "$mode" == "aggressive" ]]; then
    docker builder prune -af >/dev/null || true
    if docker buildx version >/dev/null 2>&1; then
      docker buildx prune -af >/dev/null || true
    fi
    docker system prune -af >/dev/null || true
    docker image prune -af >/dev/null || true
  else
    docker builder prune -f --filter until=24h >/dev/null || true
    if docker buildx version >/dev/null 2>&1; then
      docker buildx prune -f --filter until=24h >/dev/null || true
    fi
    docker image prune -f >/dev/null || true
  fi

  docker network prune -f >/dev/null || true
  docker system df || true
}

maybe_cleanup_docker_space() {
  local free_kb
  local repo_cache_kb
  local docker_cache_kb
  local context_extra_kb
  local needs_cleanup=0
  local remove_repo_cache=0
  local cleanup_mode="preflight"

  [[ "$CACHE_CLEANUP" -eq 1 ]] || return

  free_kb="$(root_free_kb)"
  repo_cache_kb="$(paths_size_kb "${CACHE_PATHS[@]}")"
  docker_cache_kb="$(docker_build_cache_kb)"
  context_extra_kb="$(paths_size_kb "${CONTEXT_EXTRA_PATHS[@]}")"
  print_disk_summary "$repo_cache_kb" "$docker_cache_kb" "$context_extra_kb"

  if [[ "$AGGRESSIVE_CLEANUP" -eq 1 ]]; then
    needs_cleanup=1
    remove_repo_cache=1
    cleanup_mode="aggressive"
  fi
  if [[ -n "$free_kb" && "$free_kb" -lt "$MIN_FREE_DISK_KB" ]]; then
    echo "Low root free space detected before build."
    needs_cleanup=1
  fi
  if [[ "$repo_cache_kb" -gt "$MAX_REPO_BUILD_CACHE_KB" ]]; then
    echo "Repo build cache exceeds threshold."
    needs_cleanup=1
    remove_repo_cache=1
  fi
  if [[ "$docker_cache_kb" -gt "$MAX_DOCKER_BUILD_CACHE_KB" ]]; then
    echo "Docker build cache exceeds threshold."
    needs_cleanup=1
  fi

  if [[ "$needs_cleanup" -eq 1 ]]; then
    cleanup_docker_space "$cleanup_mode" "$remove_repo_cache"
  fi

  free_kb="$(root_free_kb)"
  if [[ -n "$free_kb" && "$free_kb" -lt "$MIN_FREE_DISK_AFTER_CLEANUP_KB" ]]; then
    die "root free space is still too low for a Docker build: $(df -h / | awk 'NR == 2 { print $4 }') free"
  fi
  if [[ "$context_extra_kb" -gt "$MAX_REPO_BUILD_CACHE_KB" ]]; then
    echo "Large local deploy artifacts are present; keep them excluded in .dockerignore."
  fi
}

run_compose() {
  # shellcheck disable=SC2086
  ${COMPOSE_BIN} "${BASE_ARGS[@]}" "$@"
}

restart_with_retry() {
  local first_attempt_exit=0

  set +e
  if [[ "$BUILD" -eq 1 ]]; then
    run_compose up -d --build --remove-orphans "$SERVICE"
  else
    run_compose restart "$SERVICE"
  fi
  first_attempt_exit=$?
  set -e

  [[ "$first_attempt_exit" -ne 0 ]] || return

  if [[ "$CACHE_CLEANUP" -eq 1 && "$AGGRESSIVE_CLEANUP" -eq 1 ]]; then
    echo ""
    echo "Docker restart/build failed after aggressive cleanup; not repeating the same build."
    return "$first_attempt_exit"
  fi

  echo ""
  echo "Docker restart/build failed on the first attempt. Retrying after aggressive cache cleanup..."
  cleanup_docker_space "aggressive" "1"
  if [[ "$BUILD" -eq 1 ]]; then
    run_compose up -d --build --remove-orphans "$SERVICE"
  else
    run_compose restart "$SERVICE"
  fi
}

wait_for_app_health() {
  local attempts=36
  local response=""
  local app_container=""
  local state=""
  local restarts=""

  echo ""
  echo "Waiting for ${SERVICE} health: ${HEALTH_URL}"

  for attempt in $(seq 1 "$attempts"); do
    response="$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null || true)"
    if [[ -n "$response" && "$response" == *"$HEALTH_MATCH"* ]]; then
      echo "Application health check passed."
      return
    fi

    app_container="$(run_compose ps -q "$SERVICE" || true)"
    if [[ -n "$app_container" ]]; then
      state="$(docker inspect -f '{{.State.Status}}' "$app_container" 2>/dev/null || true)"
      restarts="$(docker inspect -f '{{.RestartCount}}' "$app_container" 2>/dev/null || true)"
      if [[ "$state" == "exited" || "$state" == "dead" ]]; then
        echo "${SERVICE} container state is ${state}."
        run_compose logs --tail=160 "$SERVICE" || true
        exit 1
      fi
      if [[ -n "$restarts" && "$restarts" -gt 2 ]]; then
        echo "${SERVICE} container restarted ${restarts} times while waiting for health."
        run_compose logs --tail=160 "$SERVICE" || true
        exit 1
      fi
    fi

    echo "  attempt ${attempt}/${attempts}: state=${state:-unknown} restarts=${restarts:-unknown}"
    sleep 5
  done

  echo "Application did not become healthy in time."
  run_compose ps || true
  run_compose logs --tail=160 "$SERVICE" || true
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) need_arg "$@"; PROJECT_ROOT="$2"; shift 2 ;;
    --env-file) need_arg "$@"; ENV_FILE="$2"; shift 2 ;;
    --compose-file) need_arg "$@"; COMPOSE_FILE="$2"; shift 2 ;;
    --service) need_arg "$@"; SERVICE="$2"; shift 2 ;;
    --health-url) need_arg "$@"; HEALTH_URL="$2"; shift 2 ;;
    --health-port-env) need_arg "$@"; HEALTH_PORT_ENV="$2"; shift 2 ;;
    --health-port-default) need_arg "$@"; HEALTH_PORT_DEFAULT="$2"; shift 2 ;;
    --health-path) need_arg "$@"; HEALTH_PATH="$2"; shift 2 ;;
    --health-match) need_arg "$@"; HEALTH_MATCH="$2"; shift 2 ;;
    --no-build) BUILD=0; shift ;;
    --no-cache-cleanup) CACHE_CLEANUP=0; shift ;;
    --preflight-cleanup) AGGRESSIVE_CLEANUP=0; shift ;;
    --aggressive-cleanup) AGGRESSIVE_CLEANUP=1; shift ;;
    --logs) FOLLOW_LOGS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

[[ -n "$PROJECT_ROOT" ]] || die "--project-root is required"
[[ -n "$ENV_FILE" ]] || die "--env-file is required"
[[ -n "$COMPOSE_FILE" ]] || die "--compose-file is required"

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
ENV_FILE="$(resolve_path "$PROJECT_ROOT" "$ENV_FILE")"
COMPOSE_FILE="$(resolve_path "$PROJECT_ROOT" "$COMPOSE_FILE")"

[[ -f "${PROJECT_ROOT}/package.json" ]] || die "package.json not found in ${PROJECT_ROOT}"
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || die "env file not found: $ENV_FILE"
command -v docker >/dev/null 2>&1 || die "docker is not installed or not in PATH"
command -v curl >/dev/null 2>&1 || die "curl is not installed or not in PATH"
COMPOSE_BIN="$(compose_cmd)" || die "docker compose plugin or docker-compose is required"

if [[ -z "$HEALTH_URL" ]]; then
  [[ -n "$HEALTH_PORT_DEFAULT" ]] || die "--health-url or --health-port-default is required"
  PORT_VALUE="$(read_env_value "$HEALTH_PORT_ENV" "$ENV_FILE")"
  PORT_VALUE="${PORT_VALUE:-$HEALTH_PORT_DEFAULT}"
  HEALTH_URL="http://127.0.0.1:${PORT_VALUE}${HEALTH_PATH}"
fi

cd "$PROJECT_ROOT"
BASE_ARGS=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE")
run_compose config >/dev/null
run_compose config --services | grep -Fx "$SERVICE" >/dev/null \
  || die "compose service not found: ${SERVICE}"

echo ""
echo "Production update details:"
echo "  project root: ${PROJECT_ROOT}"
echo "  env file:     ${ENV_FILE}"
echo "  compose file: ${COMPOSE_FILE}"
echo "  service:      ${SERVICE}"
echo "  health URL:   ${HEALTH_URL}"

echo ""
echo "Checking disk and Docker cache state..."
maybe_cleanup_docker_space

echo ""
echo "Restarting production application..."
restart_with_retry
wait_for_app_health
run_compose ps

if [[ "$FOLLOW_LOGS" -eq 1 ]]; then
  run_compose logs -f --tail=100 "$SERVICE"
fi

echo ""
echo "Production update complete."
