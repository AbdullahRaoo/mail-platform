#!/usr/bin/env bash
# ============================================
# setup-server.sh — First-time VPS Setup
# ============================================
# Run this ONCE on the VPS to prepare it for
# the MagicQC Mail Platform deployment.
#
# SSH: ssh -p 222 nutechadmin@121.52.149.158
# ============================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[setup]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# ─── Step 1: Install Caddy ───────────────────
log "Installing Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
success "Caddy installed"

# ─── Step 2: Open Firewall Ports ─────────────
log "Configuring UFW firewall..."
sudo ufw allow 25/tcp comment 'SMTP'
sudo ufw allow 465/tcp comment 'SMTPS'
sudo ufw allow 587/tcp comment 'SMTP Submission'
sudo ufw allow 993/tcp comment 'IMAPS'
sudo ufw allow 4190/tcp comment 'ManageSieve'
sudo ufw allow 80/tcp comment 'HTTP (Caddy)'
sudo ufw allow 443/tcp comment 'HTTPS (Caddy)'
sudo ufw reload
success "Firewall configured"

# ─── Step 3: Stop existing Nginx (if running) ─
log "Checking for conflicting services on port 80/443..."
if docker ps --format '{{.Names}}' | grep -q robionix_nginx; then
  warn "robionix_nginx is running on port 80/443."
  warn "You need to:"
  warn "  1. Stop it: docker stop robionix_nginx"
  warn "  2. Change its ports to 8080:80 in its docker-compose.yml"
  warn "  3. Restart it: docker start robionix_nginx"
  warn "  4. Caddy will proxy traffic to it on port 8080"
else
  success "No conflicting services on port 80/443"
fi

# ─── Step 4: Deploy Caddyfile ────────────────
log "Deploying Caddyfile..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo cp "$SCRIPT_DIR/Caddyfile" /etc/caddy/Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl restart caddy
success "Caddy configured and running"

# ─── Step 5: Create project directory ────────
PROJECT_DIR="/home/nutechadmin/Deploy/mail-platform"
if [ ! -d "$PROJECT_DIR" ]; then
  mkdir -p "$PROJECT_DIR"
  success "Created $PROJECT_DIR"
else
  success "Project directory exists: $PROJECT_DIR"
fi

# ─── Done ─────────────────────────────────────
echo ""
success "Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add DNS records (run: ./setup-dns.sh)"
echo "  2. Clone the repo to $PROJECT_DIR"
echo "  3. Copy .env.example to .env and configure"
echo "  4. Run: ./deploy.sh"
echo ""
