#!/bin/bash
set -e

DOMAIN="api.cortanasoft.com"
EMAIL="${1:?Usage: ./deploy/init.sh your@email.com [GITHUB_TOKEN]}"
GITHUB_TOKEN="${2:-}"
GITHUB_USER=$(git remote get-url origin | sed -n 's#.*github.com[:/]\([^/]*\)/.*#\1#p')
REPO_NAME=$(git remote get-url origin | sed -n 's#.*/\([^.]*\).*#\1#p')
PROJECT_DIR=$(pwd)

echo "=== CortanaSoft Backend Setup ==="
echo "Domain: $DOMAIN"
echo "GitHub: $GITHUB_USER/$REPO_NAME"
echo ""

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi

# 2. Login to GHCR (only if token provided)
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Logging in to GitHub Container Registry..."
  echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
fi

# 3. Setup directory structure
echo "Setting up directories..."
mkdir -p nginx certbot/conf certbot/www

# 4. Copy nginx config
cp deploy/nginx/backend.conf nginx/backend.conf
cp deploy/nginx/init.conf nginx/init.conf

# 5. Generate docker-compose.yml with correct image name
cat > docker-compose.yml << EOF
services:
  backend:
    image: ghcr.io/${GITHUB_USER}/${REPO_NAME}:latest
    container_name: cortanasoft-backend
    restart: unless-stopped
    expose:
      - "3001"
    environment:
      - PORT=3001
    env_file:
      - .env

  nginx:
    image: nginx:alpine
    container_name: cortanasoft-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/backend.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend

  certbot:
    image: certbot/certbot
    container_name: cortanasoft-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
EOF

# 6. Create .env if not exists
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://cortanasoft:CHANGE_ME@DB_PRIVATE_IP:5432/cortanasoft
JWT_SECRET=CHANGE_ME
FRONTEND_URL=https://cortanasoft.com
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
ENVEOF
  echo "WARNING: Edit .env with real values before going live!"
fi

# 7. SSL Certificate
if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
  echo "Getting SSL certificate for $DOMAIN..."

  # Start temporary nginx for ACME challenge
  docker run -d --name tmp-nginx -p 80:80 \
    -v "$PROJECT_DIR/nginx/init.conf:/etc/nginx/conf.d/default.conf:ro" \
    -v "$PROJECT_DIR/certbot/www:/var/www/certbot:ro" \
    nginx:alpine

  sleep 2

  # Get certificate
  docker run --rm \
    -v "$PROJECT_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$PROJECT_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos --no-eff-email

  # Cleanup
  docker stop tmp-nginx && docker rm tmp-nginx
  echo "SSL certificate obtained!"
else
  echo "SSL certificate already exists, skipping..."
fi

# 8. Pull and start
echo "Pulling Docker image..."
docker compose pull backend

echo "Starting services..."
docker compose up -d

# 9. Run migrations
echo "Running database migrations..."
sleep 5
docker exec cortanasoft-backend npx prisma db push --skip-generate

echo ""
echo "=== Done! ==="
echo "Backend is live at https://$DOMAIN"
echo ""
echo "Don't forget to edit .env with real values!"
