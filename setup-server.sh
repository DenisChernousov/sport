#!/bin/bash
set -e

# ===========================================
# SportRun — Server Setup Script
# Run as root on Ubuntu 22.04
# ===========================================

echo "=== SportRun Server Setup ==="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- System updates ---
echo -e "${YELLOW}[1/9] Updating system...${NC}"
apt update && apt upgrade -y

# --- Node.js 22 ---
echo -e "${YELLOW}[2/9] Installing Node.js 22...${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
echo "Node: $(node -v), npm: $(npm -v)"

# --- PostgreSQL ---
echo -e "${YELLOW}[3/9] Installing PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER sportrun WITH PASSWORD 'SportRun2026Secure!';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE sportrun OWNER sportrun;" 2>/dev/null || true
echo "PostgreSQL ready"

# --- Redis ---
echo -e "${YELLOW}[4/9] Installing Redis...${NC}"
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
echo "Redis ready"

# --- Nginx ---
echo -e "${YELLOW}[5/9] Installing Nginx...${NC}"
apt install -y nginx
systemctl enable nginx

# --- PM2 ---
echo -e "${YELLOW}[6/9] Installing PM2...${NC}"
npm install -g pm2

# --- Git ---
echo -e "${YELLOW}[7/9] Installing Git...${NC}"
apt install -y git

# --- Clone project ---
echo -e "${YELLOW}[8/9] Cloning project...${NC}"
mkdir -p /var/www
cd /var/www
if [ -d "sportrun" ]; then
  echo "Directory exists, pulling..."
  cd sportrun && git pull origin main
else
  git clone git@github.com:DenisChernousov/sport.git sportrun
  cd sportrun
fi

# --- Setup server .env ---
echo -e "${YELLOW}[9/9] Setting up environment...${NC}"
if [ ! -f server/.env ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH=$(openssl rand -hex 32)
  cat > server/.env << EOF
DATABASE_URL="postgresql://sportrun:SportRun2026Secure!@localhost:5432/sportrun"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH}"
PORT=3002
EOF
  echo "Created server/.env"
else
  echo "server/.env already exists, skipping"
fi

# --- Create upload dirs ---
mkdir -p server/uploads/{avatars,photos,screenshots,diploma-bg}
mkdir -p server/logs

# --- Install & build ---
echo -e "${YELLOW}Installing dependencies...${NC}"
cd /var/www/sportrun/server && npm install
npx prisma generate
npx prisma db push
npx tsx src/seed.ts

cd /var/www/sportrun/client && npm install
npm run build

# --- Start with PM2 ---
cd /var/www/sportrun
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -1 | bash

# --- Nginx config ---
DOMAIN="${1:-_}"
echo -e "${YELLOW}Configuring Nginx (domain: ${DOMAIN})...${NC}"

cat > /etc/nginx/sites-available/sportrun << NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend
    root /var/www/sportrun/client/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 20M;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:3002;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/sportrun /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SportRun successfully deployed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "  URL: http://${DOMAIN}"
echo "  API: http://${DOMAIN}/api/health"
echo ""
echo "  PM2 status:"
pm2 status
echo ""
echo "  Next steps:"
echo "  1. Add SSL: certbot --nginx -d your-domain.ru"
echo "  2. Register first user and make admin"
echo ""
