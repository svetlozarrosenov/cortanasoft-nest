#!/bin/bash
set -e

echo "=== Database Droplet Setup ==="
echo "Run this script on a fresh Ubuntu 22.04/24.04 droplet"
echo ""

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Create app directory
mkdir -p /opt/cortanasoft
cd /opt/cortanasoft

# Setup firewall - ONLY allow PostgreSQL from backend droplet
echo ""
echo "=== Firewall Setup ==="
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
echo ""
echo "IMPORTANT: Replace BACKEND_PRIVATE_IP with actual backend droplet private IP"
echo "   ufw allow from BACKEND_PRIVATE_IP to any port 5432"
echo "   ufw enable"
echo ""

echo ""
echo "=== Manual steps ==="
echo ""
echo "1. Copy docker-compose.db.yml to /opt/cortanasoft/docker-compose.yml"
echo "   scp deploy/docker-compose.db.yml root@DB_IP:/opt/cortanasoft/docker-compose.yml"
echo ""
echo "2. Create .env file at /opt/cortanasoft/.env with:"
echo "   POSTGRES_USER=cortanasoft"
echo "   POSTGRES_PASSWORD=your-secure-password"
echo "   POSTGRES_DB=cortanasoft"
echo "   DB_BIND_IP=0.0.0.0"
echo ""
echo "3. Start PostgreSQL:"
echo "   cd /opt/cortanasoft && docker compose up -d"
echo ""
echo "4. Verify it's running:"
echo "   docker compose ps"
echo "   docker compose logs postgres"
echo ""
echo "=== Setup complete ==="
