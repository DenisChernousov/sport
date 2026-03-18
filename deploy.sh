#!/bin/bash
set -e

echo "=== SportRun Deploy Script ==="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/sportrun"

echo -e "${YELLOW}[1/8] Pulling latest code...${NC}"
cd $APP_DIR
git pull origin main

echo -e "${YELLOW}[2/8] Installing server dependencies...${NC}"
cd $APP_DIR/server
npm install --production=false

echo -e "${YELLOW}[3/8] Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}[4/8] Applying database migrations...${NC}"
npx prisma db push

echo -e "${YELLOW}[5/8] Seeding database...${NC}"
npx tsx src/seed.ts

echo -e "${YELLOW}[6/8] Installing client dependencies...${NC}"
cd $APP_DIR/client
npm install

echo -e "${YELLOW}[7/8] Building frontend...${NC}"
npm run build

echo -e "${YELLOW}[8/8] Restarting API server...${NC}"
cd $APP_DIR
pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo -e "${GREEN}=== Deploy complete! ===${NC}"
pm2 status
