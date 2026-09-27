# 我的 Token, danced by bike:

观猹 FDE 共学营无厘头网页游戏：狂踩自行车发电，给 TokenDance 充虚拟词元，维持 Kimi K3「闷闷儿烧」。

## 技术栈

- 前端：Vite 8 + TypeScript + PixiJS 8 + Tailwind CSS 4 + GSAP
- 后端：Hono 4 + @hono/node-server + better-sqlite3（WAL）
- 认证：观猹 OAuth2（Authorization Code + PKCE）
- 部署：nginx 静态托管 + 反向代理，PM2 守护 API，无容器

## 本地开发

```bash
cd server && npm install && cp .env.example .env && npm run dev   # API :8971
cd web && npm install && npm run dev                              # 页面 :5175（已代理 /api）
```

## 部署

```bash
scripts/deploy.sh   # 构建 web -> rsync 到 /var/www/bike.hub.tt2.li -> pm2 重启 tokenbike-api
```

## 玩法

- 观猹登录后，狂点屏幕或狂敲空格 / ← / → 踩踏
- 功率超过怠速阈值才开始产出词元，攒够 5 词元自动结算
- 单次结算封顶 120 词元，每日封顶 3600 词元（服务器端强制）
- 排行榜每 15 秒刷新
