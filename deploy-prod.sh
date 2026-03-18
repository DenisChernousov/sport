#!/bin/bash
set -e
echo "🚀 SportRun Deploy (local build → remote)"

# 1. Build frontend locally
echo "🔨 Building frontend locally..."
cd "$(dirname "$0")/client"
npm run build

# 2. Pack dist
echo "📦 Packing dist..."
tar czf /tmp/sportrun-dist.tar.gz dist

# 3. Push code to GitHub
echo "📤 Pushing to GitHub..."
cd "$(dirname "$0")"
git add -A
git commit -m "deploy: $(date +%Y-%m-%d_%H:%M)" --allow-empty
git push origin main

# 4. Upload dist + deploy on server
echo "🚀 Deploying to server..."
scp /tmp/sportrun-dist.tar.gz root@94.241.141.78:/tmp/

ssh root@94.241.141.78 "
  cd /var/www/sportrun
  git pull origin main

  # Server deps + DB
  cd server && npm install 2>&1 | tail -1
  npx prisma generate 2>&1 | tail -1
  npx prisma db push 2>&1 | tail -1

  # Replace dist with local build
  cd ../client && rm -rf dist && tar xzf /tmp/sportrun-dist.tar.gz && rm /tmp/sportrun-dist.tar.gz

  # Restart API
  cd .. && pm2 restart ecosystem.config.cjs 2>&1 | tail -3
  sleep 3 && curl -s http://localhost:3002/api/health
  echo ''
  echo '✅ Deploy complete!'
"

rm /tmp/sportrun-dist.tar.gz 2>/dev/null
echo "🎉 Done! Site: http://94.241.141.78"
