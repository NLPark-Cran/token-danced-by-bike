# 《我的 Token, danced by bike:》

> K3 太贵了?别抱怨,上车。
> 狂踩这台赛博二轮,把腿力炼成**虚拟词元**,喂给右侧那颗饥渴的 **K3 核心** —— 维持它闷闷儿烧。

观猹 FDE 共学营 · 无厘头作业。创意来源:TokenDance 大佬说"踩自行车发电,踩多少 TokenDance 里就加多少额度"。本仓库是该伟大构想的赛博预演(词元是虚拟的,快乐是真实的)。

**线上地址:** https://bike.hub.tt2.li

## 玩法

- 键盘 `←` `→`(或 `A` `D`)**交替狂敲** = 左右脚交替踩踏;手机用屏幕下方两个大按钮。
- 踏频 → 功率(W) → 词元产率。功率越高,K3 核心越亮,词元火花被核心吸走。
- **腿力**会耗尽,耗尽后功率打骨折,歇脚回血。
- 随机无厘头事件:被马路扇巴掌(功率 ×1.6)、猹上后座(×1.4)、链条掉了(滑行 3s)……
- 用**观猹账号登录**后,词元才会入账并参与**腿王排行榜**;游客裸踩,词元蒸发。

## 技术栈(2026 现役)

| 层 | 选型 |
|---|---|
| 前端 | Vite 8 · TypeScript · PixiJS 8(WebGL 渲染,程序化绘制骑手/曲柄/反应堆,视差城市背景) |
| 样式 | Tailwind CSS v4(`@tailwindcss/vite`,零配置文件) |
| 后端 | Hono 4(`@hono/node-server`)· better-sqlite3(WAL) |
| 认证 | 观猹 OAuth2 Authorization Code + PKCE(机密客户端,签名 Cookie 会话) |
| 部署 | 无容器:nginx 反代 + Certbot TLS + PM2 守护 |
| 素材 | TokenDance `seedream-5.0-pro` 生图(背景/hero/logo/meme 贴纸) |

## 目录

```
web/      # Vite 前端(PixiJS 游戏引擎在 src/game/engine.ts)
server/   # Hono API:OAuth 回调、词元结算、排行榜(SQLite)
docs/     # 观猹认证接入文档
scripts/  # gen_image.sh — TokenDance 生图脚本
```

## API

| 端点 | 说明 |
|---|---|
| `GET /api/auth/login` | 302 跳转观猹授权页(PKCE + state) |
| `GET /api/auth/callback` | 换 token → userinfo → 建会话 |
| `GET /api/auth/me` | 当前用户 + 词元余额 |
| `POST /api/pedal/sync` | 上报曲柄功(joules),服务端按窗口功率上限(1500W)封顶折算词元 |
| `GET /api/leaderboard` | 总榜 + 今日榜 + 全站闷烧总量 |

游戏经济:`词元 = 功率 × 时间 × 0.08`,服务端钳制最大功率防作弊。

## 本地开发

```bash
cd server && npm install && npm run dev   # API → 127.0.0.1:8971
cd web && npm install && npm run dev      # 前端 → 127.0.0.1:5175(/api 已代理)
```

观猹 OAuth 默认使用接入文档中的**开发测试机密客户端**;正式凭据用 `server/.env` 覆盖(见 `server/.env.example`),回调域名需与观猹后台登记一致。

## 部署(无容器)

```bash
cd web && npm run build
rsync -a --delete dist/ /var/www/bike.hub.tt2.li/
cd ../server && pm2 start npx --name tokenbike-api -- tsx src/index.ts && pm2 save
```

nginx:`bike.hub.tt2.li` 静态 root + `/api/` 反代 `127.0.0.1:8971`,TLS 由 Certbot 签发。

---

*词元为虚拟道具,与真实 TokenDance 账户额度无关。膝盖受损概不负责。*
