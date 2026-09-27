# 《我的 Token, danced by bike:》— 项目维护说明

无厘头网页游戏:交替按键模拟踩自行车发电,产出虚拟 TokenDance 词元喂 "K3 核心"。观猹 FDE 共学营作业。

## 结构

- `web/` — Vite 8 + TS + PixiJS 8 + Tailwind v4。游戏引擎 `src/game/engine.ts`(程序化绘制,无精灵图);UI/结算/事件 `src/main.ts`。
- `server/` — Hono 4 + better-sqlite3。观猹 OAuth2(Authorization Code + PKCE,机密客户端)`src/auth.ts`;结算/排行榜 `src/index.ts`;参数 `src/config.ts`。DB: `server/data/tokenbike.db`(不提交)。
- `web/public/assets/` — TokenDance seedream-5.0-pro 生成的图(已压缩为 jpg,勿再放几 MB 的 png)。
- `docs/` — 观猹认证接入文档(权威参考,改 OAuth 前先读)。
- `scripts/gen_image.sh` — 生图,需 `export TOKENDANCE_API_KEY`。

## 命令

```bash
# 开发
cd server && npm install && npm run dev     # API :8971
cd web && npm install && npm run dev        # Web :5175 (代理 /api→8971)
# 构建/部署(本机无容器)
cd web && npx tsc --noEmit && npm run build
rsync -a --delete dist/ /var/www/bike.hub.tt2.li/
cd ../server && pm2 restart tokenbike-api   # 或 pm2 start npx --name tokenbike-api -- tsx src/index.ts
```

nginx 站点配置: `/etc/nginx/sites-available/bike.hub.tt2.li`(静态 root + `/api/` 反代 8971)。

## 约定与坑

- 前后端词元汇率必须一致:`tokensPerWattSecond = 0.08`(server/config.ts 与 engine.ts)。
- 结算口径:客户端 5s 上报 joules;服务端按窗口平均功率 ≤1500W 封顶。改经济参数两边一起改。
- 观猹 client_id 含 `+`,URL 中必须编码(代码里已用 URLSearchParams 处理,勿手拼)。
- 部署用正式 OAuth 凭据时填 `server/.env`(见 `.env.example`),勿提交;`COOKIE_SECRET` 生产必改。
- 不要引入 Docker;复用本机 nginx + PM2。机器无 systemd,PM2 进程重启后需手动 `pm2 resurrect`(已 `pm2 save`)。
- PixiJS v8:`TilingSprite` 滚动用 `tilePosition.x`(没有 tilePositionX);初始化必须 `await app.init()`。

## 已知环境事项

- `bike.hub.tt2.li` 的 DNS(45.154.13.123)指向另一台机器,本机(出网 47.84.129.217)收不到该域名的外部流量,故本机 certbot HTTP-01 无法签发该域名证书;外部流量路由恢复后运行 `certbot --nginx -d bike.hub.tt2.li` 即可。
- 仓库: `github.com/NLPark-Cran/token-danced-by-bike`,master 受 push protection(secret scanning)保护,勿把密钥/PAT 提交进库(`.context_prefix.json` 已 gitignore)。
