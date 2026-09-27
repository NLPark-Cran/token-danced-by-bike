#!/usr/bin/env bash
# 本地部署：构建前端 -> 同步到 nginx 站点目录 -> 重启 API
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/web"
npm run build

mkdir -p /var/www/bike.hub.tt2.li
rsync -a --delete "$ROOT/web/dist/" /var/www/bike.hub.tt2.li/

pm2 restart tokenbike-api || pm2 start "$ROOT/server/ecosystem.config.cjs"
pm2 save

echo "deployed: https://bike.hub.tt2.li"
