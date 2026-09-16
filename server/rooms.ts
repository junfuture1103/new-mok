import { applyMove, createGame, type Game, type Move } from '../lib/games.ts';
import { normalizeNickname, ROOM_CODE, type RoomView } from '../lib/online.ts';

type Seat = { key: string; nickname: string };
type RoomData = Pick<RoomView, 'game' | 'phase' | 'round' | 'state' | 'moves' | 'rematch'> & {
  players: Seat[]; receipts: string[];
};
type Row = { code: string; version: number; data: string; seen1: number; seen2: number; expires_at: number };
type Env = { DB: D1Database };
const DAY = 86_400_000;
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const fail = (status: number, message: string): never => { throw new HttpError(status, message); };
async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
async function identity(request: Request) {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return fail(401, '이 탭의 입장 정보가 없어요. 닉네임으로 다시 입장해주세요.');
  return digest(token);
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail(415, '지원하지 않는 요청입니다.');
  if (Number(request.headers.get('Content-Length')) > 4096) return fail(413, '요청이 너무 큽니다.');
  // Limit the actual body as well as Content-Length, which clients may omit.
  const reader = request.body?.getReader();
  if (!reader) return fail(400, '요청이 비어 있습니다.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.length;
    if (length > 4096) { await reader.cancel(); return fail(413, '요청이 너무 큽니다.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { return fail(400, '요청 형식을 확인해주세요.'); }
}
async function read(db: D1Database, code: string) {
  const row = await db.prepare('SELECT * FROM rooms WHERE code = ?').bind(code).first<Row>();
  if (!row) return fail(404, '방을 찾을 수 없어요. 방 코드를 확인해주세요.');
  if (row.expires_at <= Date.now()) return fail(410, '유효기간이 지난 방이에요. 새 방을 만들어주세요.');
  return row;
}
function view(row: Row, key: string): RoomView {
  const data = JSON.parse(row.data) as RoomData;
  const seat = data.players.findIndex(p => p.key === key);
  if (seat < 0) return fail(403, '먼저 이 방에 입장해주세요.');
  return {
    code: row.code, version: row.version, game: data.game, round: data.round, phase: data.phase,
    state: data.state, moves: data.moves, rematch: data.rematch, expiresAt: row.expires_at,
    you: seat === 0 ? 1 : 2,
    players: data.players.map((p, i) => ({ nickname: p.nickname, color: i === 0 ? 1 : 2,
      connected: Date.now() - (i === 0 ? row.seen1 : row.seen2) < 25000 })),
  };
}
function nickname(value: unknown) {
  try { return normalizeNickname(value); } catch (e) { return fail(400, (e as Error).message); }
}
async function limit(db: D1Database, source: string, scope: string, maximum: number, duration: number) {
  const now = Date.now(), bucket = Math.floor(now / duration);
  const key = await digest(`${scope}:${source}:${bucket}`);
  // A rejected bucket stops growing. All isolates share the same atomic limit.
  const quota = await db.prepare('INSERT INTO room_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count')
    .bind(key, (bucket + 2) * duration, maximum).first<{ count: number }>();
  if (!quota) return fail(429, '요청이 너무 많아요. 잠시 후 다시 시도해주세요.');
}
async function create(request: Request, db: D1Database, key: string, input: Record<string, unknown>) {
  const code = input.code;
  if (typeof code !== 'string' || !ROOM_CODE.test(code)) return fail(400, '방 코드 형식이 올바르지 않습니다.');
  if (typeof input.game !== 'string' || !['ripple', 'erosion', 'legacy'].includes(input.game)) return fail(400, '게임을 골라주세요.');
  const name = nickname(input.nickname);
  const existing = await db.prepare('SELECT * FROM rooms WHERE code = ?').bind(code).first<Row>();
  if (existing) {
    if (existing.expires_at <= Date.now()) return fail(410, '유효기간이 지난 방이에요. 새 방을 만들어주세요.');
    if ((JSON.parse(existing.data) as RoomData).players[0].key !== key) return fail(409, '같은 코드의 방이 있어요. 새 방을 만들어주세요.');
    return view(existing, key);
  }
  const now = Date.now();
  // Only a time-bucketed hash is stored; raw IP addresses are never persisted.
  await limit(db, request.headers.get('CF-Connecting-IP') || 'local', 'create', 12, 3600000);
  const game = input.game as Game;
  const data: RoomData = { game, phase: 'waiting', round: 1, state: createGame(game), moves: [], rematch: [false, false], players: [{ key, nickname: name }], receipts: [] };
  const row = await db.prepare('INSERT INTO rooms (code, version, data, seen1, seen2, expires_at) VALUES (?, 0, ?, ?, 0, ?) ON CONFLICT(code) DO NOTHING RETURNING *').bind(code, JSON.stringify(data), now, now + DAY).first<Row>();
  if (!row) {
    const raced = await read(db, code);
    if ((JSON.parse(raced.data) as RoomData).players[0].key !== key) return fail(409, '같은 코드의 방이 있어요. 다시 만들어주세요.');
    return view(raced, key);
  }
  await db.batch([
    db.prepare('DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires_at < ? LIMIT 100)').bind(now),
    db.prepare('DELETE FROM room_limits WHERE key IN (SELECT key FROM room_limits WHERE expires_at < ? LIMIT 100)').bind(now),
  ]);
  return view(row, key);
}
async function update(db: D1Database, code: string, key: string, action: string, input: Record<string, unknown>) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await read(db, code), data = JSON.parse(row.data) as RoomData;
    const seat = data.players.findIndex(p => p.key === key);
    if (action === 'join') {
      if (seat >= 0) return view(row, key);
      if (data.phase === 'closed') return fail(410, '닫힌 방이에요. 새 방을 만들어주세요.');
      if (data.players.length >= 2) return fail(409, '두 명이 이미 입장한 방이에요. 다른 방을 만들어주세요.');
      const name = nickname(input.nickname);
      if (name === data.players[0].nickname) return fail(400, '상대와 다른 닉네임을 입력해주세요.');
      data.players.push({ key, nickname: name }); data.phase = 'playing'; row.seen2 = Date.now();
    } else {
      if (seat < 0) return fail(403, '이 방의 참가자만 둘 수 있습니다.');
      if (typeof input.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.id)) return fail(400, '요청 번호가 올바르지 않습니다.');
      const receipt = `${key}:${input.id}`;
      if (data.receipts.includes(receipt)) return view(row, key);
      // Two rematch votes commute within one finished round. A stale board
      // revision must not force the second person to click again.
      const roundAction = ['rematch', 'leave', 'resign'].includes(action);
      if (roundAction && input.round !== data.round) return fail(409, '이미 다음 대국이 시작됐어요. 현재 판을 확인해주세요.');
      if (!roundAction && input.version !== row.version) return fail(409, '대국이 갱신됐어요. 현재 판을 확인한 뒤 다시 시도해주세요.');
      if (action === 'leave' && data.phase === 'closed') return view(row, key);
      if (data.phase === 'closed') return fail(410, '이미 닫힌 방입니다.');
      if (attempt === 0) await limit(db, `${code}:${key}`, 'action', 120, 60000);
      if (action === 'move') {
        if (data.phase !== 'playing') return fail(409, '상대가 입장한 뒤 진행 중인 대국에서만 둘 수 있어요.');
        if (data.state.turn !== seat + 1) return fail(409, '상대의 차례입니다.');
        const move = input.move as Move;
        if (!move || typeof move !== 'object' || Array.isArray(move) || !Number.isSafeInteger(move.to) || Object.keys(move).some(k => !['to', 'from', 'card'].includes(k) || !Number.isSafeInteger(move[k as keyof Move]))) return fail(400, '착수 정보가 올바르지 않습니다.');
        try { data.state = applyMove(data.state, move); } catch (e) { return fail(400, (e as Error).message); }
        data.moves.push({ ...move });
        if (data.state.winner !== null) data.phase = 'finished';
      } else if (action === 'rematch') {
        if (data.phase !== 'finished') return fail(409, '대국이 끝나면 다시 둘 수 있어요.');
        data.rematch[seat] = true;
        if (data.rematch.every(Boolean)) {
          data.players.reverse(); [row.seen1, row.seen2] = [row.seen2, row.seen1];
          data.state = createGame(data.game); data.moves = []; data.rematch = [false, false]; data.round++; data.phase = 'playing';
        }
      } else if (action === 'resign') {
        if (data.phase !== 'playing') return fail(409, '진행 중인 대국에서만 기권할 수 있어요.');
        data.state = { ...data.state, winner: seat === 0 ? 2 : 1, reason: `${data.players[seat].nickname} 님이 기권했습니다.` };
        data.phase = 'finished';
      } else if (action === 'leave') {
        if (data.phase === 'playing') data.state = { ...data.state, winner: seat === 0 ? 2 : 1, reason: `${data.players[seat].nickname} 님이 방을 나갔습니다.` };
        data.phase = 'closed';
      } else return fail(404, '지원하지 않는 요청입니다.');
      data.receipts = [...data.receipts.slice(-31), receipt];
    }
    // Compare-and-swap admits exactly one join/move/rematch for this revision.
    const swap = action === 'rematch' && data.round > (JSON.parse(row.data) as RoomData).round;
    const seen = swap ? 'seen1 = seen2, seen2 = seen1' : 'seen1 = MAX(seen1, ?), seen2 = MAX(seen2, ?)';
    const saved = await db.prepare(`UPDATE rooms SET data = ?, version = version + 1, ${seen} WHERE code = ? AND version = ? RETURNING *`)
      .bind(JSON.stringify(data), ...(swap ? [] : [row.seen1, row.seen2]), code, row.version).first<Row>();
    if (saved) return view(saved, key);
  }
  return fail(409, '대국이 갱신 중이에요. 잠시 후 다시 시도해주세요.');
}

export async function roomApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url), origin = request.headers.get('Origin');
  const allowed = origin === url.origin || origin === 'https://junfuture1103.github.io' ||
    (['127.0.0.1', 'localhost'].includes(url.hostname) && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin || ''));
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'X-Frame-Options': 'DENY' });
  if (origin && allowed) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  try {
    if (origin && !allowed) return fail(403, '허용되지 않은 사이트입니다.');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (url.pathname === '/api/health' && request.method === 'GET') {
      await env.DB.prepare('SELECT code FROM rooms LIMIT 1').first();
      return Response.json({ ok: true, service: 'hansu-rooms', protocol: 1 }, { headers });
    }
    const key = await identity(request);
    let result: RoomView;
    if (url.pathname === '/api/rooms' && request.method === 'POST') result = await create(request, env.DB, key, await body(request));
    else {
      const match = url.pathname.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{10})(?:\/(join|move|rematch|resign|leave))?$/);
      if (!match) return fail(404, '방 주소를 확인해주세요.');
      const [, code, action] = match;
      if (request.method === 'GET' && !action) {
        const row = await read(env.DB, code); result = view(row, key);
        const column = result.you === 1 ? 'seen1' : 'seen2';
        if (Date.now() - row[column] > 8000) {
          // Revision check prevents a heartbeat updating the wrong color after rematch.
          await env.DB.prepare(`UPDATE rooms SET ${column} = ? WHERE code = ? AND version = ?`).bind(Date.now(), code, row.version).run();
        }
        result.players[result.you - 1].connected = true;
      } else if (request.method === 'POST' && action) {
        if (action === 'join') await limit(env.DB, request.headers.get('CF-Connecting-IP') || 'local', 'join', 30, 60000);
        result = await update(env.DB, code, key, action, await body(request));
      }
      else return fail(405, '지원하지 않는 요청입니다.');
    }
    return Response.json(result, { headers });
  } catch (e) {
    const expected = e instanceof HttpError;
    if (expected && e.status === 429) headers.set('Retry-After', '60');
    if (!expected) console.error('Room request failed', (e as Error).message);
    return Response.json({ error: expected ? e.message : '대국 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: expected ? e.status : 503, headers });
  }
}
