import { generateSignedCookie } from 'hono/cookie';
import { db } from '../src/db.js';
import { config } from '../src/config.js';

const base = `http://127.0.0.1:${config.port}`;
const upsert = db.prepare(`INSERT INTO users (watcha_id,nickname,access_token) VALUES ('e2e-test','测试骑手','fake')
  ON CONFLICT(watcha_id) DO UPDATE SET nickname=excluded.nickname RETURNING id`);
const user = upsert.get() as { id: number };
db.prepare('INSERT OR IGNORE INTO wallets (user_id) VALUES (?)').run(user.id);
db.prepare('DELETE FROM rides WHERE user_id=?').run(user.id);
db.prepare('UPDATE wallets SET balance=0,total=0 WHERE user_id=?').run(user.id);

const signed = await generateSignedCookie('tokenbike_session', String(user.id), config.cookieSecret, { path: '/' });
const headers = { 'content-type': 'application/json', cookie: signed.split(';')[0]! };
const me = await (await fetch(`${base}/api/me`, { headers })).json();
console.log('me:', me);
const r1 = await (await fetch(`${base}/api/ride/sync`, { method: 'POST', headers, body: JSON.stringify({ tokens: 60 }) })).json();
console.log('sync 60:', r1);
const r2 = await (await fetch(`${base}/api/ride/sync`, { method: 'POST', headers, body: JSON.stringify({ tokens: 999999 }) })).json();
console.log('sync 999999 (clamp 120):', r2);
const board = await (await fetch(`${base}/api/leaderboard`)).json();
console.log('leaderboard:', board);
