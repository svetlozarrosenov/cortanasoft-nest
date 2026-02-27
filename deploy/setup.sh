#!/bin/bash
set -e

echo "=== Backend Droplet Setup ==="

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Create app directory structure
mkdir -p /opt/cortanasoft/nginx
mkdir -p /opt/cortanasoft/certbot/conf
mkdir -p /opt/cortanasoft/certbot/www
cd /opt/cortanasoft

echo ""
echo "=== Next steps ==="
echo ""
echo "1. Copy files to the droplet:"
echo "   scp deploy/docker-compose.yml root@BACKEND_IP:/opt/cortanasoft/"
echo "   scp deploy/nginx/backend.conf root@BACKEND_IP:/opt/cortanasoft/nginx/"
echo "   scp deploy/nginx/init.conf root@BACKEND_IP:/opt/cortanasoft/nginx/"
echo ""
echo "2. Create /opt/cortanasoft/.env with:"
echo "   DATABASE_URL=postgresql://cortanasoft:PASS@DB_PRIVATE_IP:5432/cortanasoft"
echo "   JWT_SECRET=your-jwt-secret"
echo "   FRONTEND_URL=https://cortanasoft.com"
echo "   R2_ACCOUNT_ID=..."
echo "   R2_ACCESS_KEY_ID=..."
echo "   R2_SECRET_ACCESS_KEY=..."
echo "   R2_BUCKET_NAME=..."
echo "   R2_PUBLIC_URL=..."
echo ""
echo "3. Replace GITHUB_USER in docker-compose.yml with your GitHub username"
echo ""
echo "4. Login to GitHub Container Registry:"
echo "   echo 'GITHUB_TOKEN' | docker login ghcr.io -u GITHUB_USER --password-stdin"
echo ""
echo "5. Get SSL certificate (run these in order):"
echo "   cd /opt/cortanasoft"
echo "   cp nginx/init.conf nginx/active.conf"
echo "   docker run -d --name tmp-nginx -p 80:80 -v ./nginx/active.conf:/etc/nginx/conf.d/default.conf:ro -v ./certbot/www:/var/www/certbot:ro nginx:alpine"
echo "   docker run --rm -v ./certbot/conf:/etc/letsencrypt -v ./certbot/www:/var/www/certbot certbot/certbot certonly --webroot -w /var/www/certbot -d api.cortanasoft.com --email your@email.com --agree-tos --no-eff-email"
echo "   docker stop tmp-nginx && docker rm tmp-nginx"
echo "   rm nginx/active.conf"
echo ""
echo "6. Start everything:"
echo "   docker compose up -d"
echo ""
echo "=== Setup complete ==="
