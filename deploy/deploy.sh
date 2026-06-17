#!/usr/bin/env bash
# deploy.sh — git-based deploy for Solarpunk Detroit on Hetzner.
#
# Matches the studio's game-deploy pattern (cf. /opt/precursors): the box holds a
# git checkout at /opt/solarpunk-detroit; this resets it to a ref and rebuilds the
# docker-compose container. NOT GitHub Actions, NOT a Coolify-managed app.
#
# Usage (on the box):     cd /opt/solarpunk-detroit && ./deploy/deploy.sh [ref]
# Usage (from dev):       ssh hetzner "cd /opt/solarpunk-detroit && ./deploy/deploy.sh"
#   ref defaults to origin/main.
set -euo pipefail

DEPLOY_DIR="/opt/solarpunk-detroit"
COMPOSE_FILE="docker-compose.prod.yml"
REF="${1:-origin/main}"
LOG_FILE="/var/log/solarpunk-detroit-deploy.log"
HEALTH_URL="https://play.multiversestudios.xyz/solarpunk-detroit/"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }

cd "$DEPLOY_DIR"

log "=== Deploy started (ref: $REF) ==="

# Fetch + hard-reset to the target ref. app/.env is gitignored/untracked, so it
# survives the reset (provides GROQ_API_KEY etc. to the container at runtime).
git fetch origin 2>&1 | tee -a "$LOG_FILE"
TARGET=$(git rev-parse "$REF")
git reset --hard "$REF" 2>&1 | tee -a "$LOG_FILE"
ACTUAL=$(git rev-parse HEAD)
if [ "$ACTUAL" != "$TARGET" ]; then
  log "FATAL: expected HEAD=$TARGET, got $ACTUAL after reset"; exit 1
fi
log "At $(git rev-parse --short HEAD): $(git log -1 --format='%s')"

# Build (runs tsc -b && vite build in-container) then recreate. Build-then-up
# means the old container keeps serving if the build fails — no downtime.
log "Building $COMPOSE_FILE ..."
docker compose -f "$COMPOSE_FILE" build --pull 2>&1 | tee -a "$LOG_FILE"
log "Recreating container ..."
docker compose -f "$COMPOSE_FILE" up -d 2>&1 | tee -a "$LOG_FILE"

# Wait for health.
log "Waiting for healthy ..."
status=unknown
for i in $(seq 1 20); do
  status=$(docker inspect --format '{{.State.Health.Status}}' solarpunk-detroit 2>/dev/null || echo unknown)
  [ "$status" = "healthy" ] && break
  sleep 3
done
log "Container health: $status"

code=$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || echo 000)
log "Live check $HEALTH_URL -> HTTP $code"
[ "$code" = "200" ] || log "WARN: live check not 200"

log "=== Deploy complete ($(git rev-parse --short HEAD)) ==="
