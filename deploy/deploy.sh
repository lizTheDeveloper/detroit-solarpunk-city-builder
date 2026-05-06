#!/usr/bin/env bash
# deploy/deploy.sh
#
# Deploy to Hetzner VPS via SSH + Docker Compose.
#
# Prerequisites:
#   - SSH access to the Hetzner server (DEPLOY_HOST env var)
#   - Docker and Docker Compose installed on the server
#   - DEPLOY_USER (default: deploy), DEPLOY_HOST, DEPLOY_PATH (default: /opt/city-builder)
#
# Usage: ./deploy/deploy.sh

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_HOST="${DEPLOY_HOST:?Set DEPLOY_HOST to your Hetzner server IP or hostname}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/city-builder}"

echo "==> Syncing project to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH..."
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude app/node_modules \
  --exclude app/dist \
  --exclude .env* \
  ./ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"

echo "==> Building and deploying on server..."
ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH && docker compose build --pull && docker compose up -d"

echo "==> Waiting for health check..."
sleep 5
ssh "$DEPLOY_USER@$DEPLOY_HOST" "curl -sf http://localhost/health && echo ' OK' || echo ' FAILED'"

echo "==> Deploy complete."
