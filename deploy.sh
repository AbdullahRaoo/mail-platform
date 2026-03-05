#!/usr/bin/env bash
# ============================================
# deploy.sh — Deploy MagicQC Mail Platform
# ============================================
# Usage: ./deploy.sh
#
# This script:
#   1. Pulls latest code from GitHub
#   2. Builds the frontend Docker image
#   3. Restarts the Docker Compose stack
#   4. Shows status
#
# Prerequisites:
#   - Docker + Docker Compose installed on VPS
#   - .env file present (copy from .env.example)
#   - DNS records configured
#   - Caddy installed and running on host

set -euo pipefail

# ─── Config ───────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[deploy]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── Pre-flight checks ───────────────────────
log "Running pre-flight checks..."

command -v docker >/dev/null 2>&1 || error "Docker is not installed"
command -v docker compose >/dev/null 2>&1 || error "Docker Compose v2 is not installed"

if [ ! -f "$PROJECT_DIR/.env" ]; then
  error ".env file not found. Copy .env.example to .env and fill in values."
fi

success "Pre-flight checks passed"

# ─── Pull latest code ────────────────────────
cd "$PROJECT_DIR"

if [ -d .git ]; then
  log "Pulling latest code from GitHub..."
  git pull --ff-only origin main || warn "Git pull failed — continuing with current code"
  success "Code updated"
else
  warn "Not a git repository — skipping pull"
fi

# ─── Build & Deploy ──────────────────────────
log "Building and starting containers..."

# Build the frontend image
docker compose build --no-cache webmail

# Pull latest Stalwart image
docker compose pull stalwart

# Restart everything
docker compose down
docker compose up -d

success "Containers started"

# ─── Health Check ─────────────────────────────
log "Waiting for services to be healthy..."
sleep 10

# Check Stalwart
if curl -sf http://localhost:18080/healthz > /dev/null 2>&1; then
  success "Stalwart is healthy"
else
  warn "Stalwart health check failed — may still be starting up"
fi

# Check Webmail
if curl -sf http://localhost:13000 > /dev/null 2>&1; then
  success "Webmail is healthy"
else
  warn "Webmail health check failed — may still be starting up"
fi

# ─── Status ───────────────────────────────────
echo ""
log "Container status:"
docker compose ps

echo ""
success "Deployment complete!"
echo ""
echo "  Webmail:   https://mail.magicqc.online"
echo "  JMAP API:  https://jmap.magicqc.online"
echo "  Admin:     https://admin.magicqc.online"
echo ""
