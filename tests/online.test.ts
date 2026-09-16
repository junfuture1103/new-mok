import test from 'node:test';
import assert from 'node:assert/strict';
import { roomApi } from '../server/rooms.ts';
import { legalMoves, type Game } from '../lib/games.ts';
import { normalizeNickname, type RoomView } from '../lib/online.ts';
import { testDatabase } from './support/sqlite.ts';

const a = 'a'.repeat(64), b = 'b'.repeat(64), c = 'c'.repeat(64), code = 'ABCDE23456';
function harness() {
  const { db, sqlite } = testDatabase();
  async function call(path: string, token: string, data?: object, extraHeaders?: Record<string, string>) {
    const result = await roomApi(new Request(`https://rooms.test/api/${path}`, { method: data ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(data ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders }, body: data ? JSON.stringify(data) : undefined }), { DB: db });
    return { status: result.status, headers: result.headers, json: await result.json() as RoomView & { error?: string } };
  }
  const create = (game: Game = 'ripple') => call('rooms', a, { code, nickname: '하나', game });
  const join = (token = b, nickname = '둘') => call(`rooms/${code}/join`, token, { nickname });
  const action = (path: string, token: string, version: number, payload: object = {}) => call(`rooms/${code}/${path}`, token, { id: crypto.randomUUID(), version, round: 1, ...payload });
  return { db, sqlite, call, create, join, action };
}
test('Nickname validation and room authentication do not leak participant credentials', async () => {
  assert.equal(normalizeNickname('  한 수  '), '한 수');
  for (const name of ['', '가'.repeat(13), '<script>', 'a\u202eb']) assert.throws(() => normalizeNickname(name));
  const h = harness(); const created = await h.create(); assert.equal(created.status, 200);
  assert.equal(created.json.players.length, 1); assert.equal(created.json.phase, 'waiting');
  assert(!JSON.stringify(created.json).includes('"key"')); assert(!JSON.stringify(created.json).includes(a));
  assert.equal((await h.call(`rooms/${code}`, b)).status, 403);
  assert.equal((await h.call(`rooms/${code}`, 'bad')).status, 401);
  assert.equal((await h.action('move', a, 0, { move: { to: 0 } })).status, 409);
  h.sqlite.close();
});
test('Simultaneous joins reserve exactly one remaining seat; duplicate joins are idempotent', async () => {
  const h = harness(); await h.create();
  const responses = await Promise.all([h.join(b, '둘'), h.join(c, '셋')]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const token = responses[0].status === 200 ? b : c;
  assert.equal((await h.join(token, '바뀐이름')).json.players.length, 2);
  assert.equal((await h.call(`rooms/${code}`, a)).json.version, 1);
  h.sqlite.close();
});
test('Duplicate creation recovers the same room without creating a second game', async () => {
  const h = harness(); const [first, second] = await Promise.all([h.create(), h.create()]);
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM rooms').get()?.n, 1);
  assert.equal((await h.call('rooms', b, { code, nickname: '훔치기', game: 'ripple' })).status, 409);
  h.sqlite.close();
});
test('Server rejects wrong-turn, illegal and stale moves and applies duplicate requests only once', async () => {
  const h = harness(); await h.create(); await h.join();
  assert.equal((await h.action('move', b, 1, { move: { to: 8 } })).status, 409);
  assert.equal((await h.action('move', a, 1, { move: { to: 900 } })).status, 400);
  const payload = { id: crypto.randomUUID(), version: 1, move: { to: 24 } };
  const replies = await Promise.all([h.call(`rooms/${code}/move`, a, payload), h.call(`rooms/${code}/move`, a, payload)]);
  assert(replies.every(r => r.status === 200 && r.json.state.ply === 1));
  assert.equal((await h.action('move', b, 1, { move: { to: 8 } })).status, 409);
  assert.equal((await h.action('move', b, 2, { move: { to: 24 } })).status, 400);
  assert.equal((await h.action('move', c, 2, { move: { to: 8 } })).status, 403);
  h.sqlite.close();
});
test('All three games use the same authoritative rules and persist the complete position', async () => {
  for (const game of ['ripple', 'erosion', 'legacy'] as Game[]) {
    const h = harness(); await h.create(game); let view = (await h.join()).json;
    for (let i = 0; i < 10 && view.phase === 'playing'; i++) {
      const moves = legalMoves(view.state); const move = moves[Math.floor(moves.length / 2)];
      const next = await h.action('move', view.state.turn === 1 ? a : b, view.version, { move });
      assert.equal(next.status, 200); view = next.json;
      assert.deepEqual((await h.call(`rooms/${code}`, a)).json.state, (await h.call(`rooms/${code}`, b)).json.state);
      assert.equal(view.moves.length, view.state.ply);
    }
    h.sqlite.close();
  }
});
test('Reconnecting preserves seats; only mutual rematch resets and swaps colors', async () => {
  const h = harness(); await h.create(); let view = (await h.join()).json;
  view = (await h.action('move', a, view.version, { move: { to: 24 } })).json;
  const restored = (await h.call(`rooms/${code}`, a)).json;
  assert.equal(restored.you, 1); assert.equal(restored.state.ply, 1);
  view = (await h.action('resign', b, view.version)).json;
  assert.equal(view.state.winner, 1); assert.equal(view.phase, 'finished');
  view = (await h.action('rematch', a, view.version)).json;
  assert.equal(view.phase, 'finished'); assert.equal(view.state.ply, 1);
  view = (await h.action('rematch', b, view.version)).json;
  assert.equal(view.phase, 'playing'); assert.equal(view.state.ply, 0); assert.equal(view.round, 2);
  assert.equal(view.you, 1); assert.equal((await h.call(`rooms/${code}`, a)).json.you, 2);
  assert.equal((await h.action('move', a, view.version, { move: { to: 24 } })).status, 409);
  assert.equal((await h.action('move', b, view.version, { move: { to: 24 } })).status, 200);
  h.sqlite.close();
});
test('Leaving closes the room and expires old links without allowing a replacement to take a seat', async () => {
  const h = harness(); await h.create(); await h.join();
  const left = (await h.action('leave', a, 1)).json;
  assert.equal(left.phase, 'closed'); assert.equal(left.state.winner, 2);
  assert.equal((await h.join(c, '셋')).status, 410);
  h.sqlite.prepare('UPDATE rooms SET expires_at = 0').run();
  assert.equal((await h.call(`rooms/${code}`, b)).status, 410);
  h.sqlite.close();
});
test('Simultaneous rematch votes succeed once, but an old-round vote cannot start another match', async () => {
  const h = harness(); await h.create(); await h.join();
  const ended = (await h.action('resign', a, 1)).json;
  const votes = await Promise.all([h.action('rematch', a, ended.version), h.action('rematch', b, ended.version)]);
  assert(votes.every(r => r.status === 200));
  const next = (await h.call(`rooms/${code}`, a)).json;
  assert.equal(next.round, 2); assert.equal(next.phase, 'playing');
  const finished = (await h.action('resign', a, next.version)).json;
  assert.equal((await h.action('rematch', a, finished.version)).status, 409);
  assert.equal((await h.call(`rooms/${code}`, a)).json.round, 2);
  h.sqlite.close();
});
test('Allowed origins work; other origins and invalid body sizes are rejected', async () => {
  const h = harness();
  const result = await h.call('health', a, undefined, { Origin: 'https://junfuture1103.github.io' });
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), 'https://junfuture1103.github.io');
  assert.equal((await h.call('health', a, undefined, { Origin: 'https://other.test' })).status, 403);
  assert.equal((await h.call('rooms', a, { padding: 'a'.repeat(5000) })).status, 413);
  const preflight = await roomApi(new Request('https://rooms.test/api/rooms', { method: 'OPTIONS', headers: { Origin: 'https://junfuture1103.github.io' } }), { DB: h.db });
  assert.equal(preflight.status, 204); h.sqlite.close();
});
test('Room creation is bounded per source without storing raw IP addresses', async () => {
  const h = harness();
  for (let i = 0; i < 13; i++) {
    const result = await h.call('rooms', a, { code: `ABCDEFGHJ${String.fromCharCode(65 + i)}`.replace('I', '2'), nickname: '하나', game: 'ripple' }, { 'CF-Connecting-IP': '192.0.2.10' });
    assert.equal(result.status, i < 12 ? 200 : 429);
  }
  assert(!JSON.stringify(h.sqlite.prepare('SELECT * FROM room_limits').all()).includes('192.0.2.10'));
  h.sqlite.close();
});
test('Malformed game values cannot create poisoned room records', async () => {
  const h = harness();
  for (const game of [['ripple'], { toString: 'ripple' }, null, 1, 'toString', 'gomoku']) {
    const result = await h.call('rooms', a, { code, game, nickname: '정상' });
    assert.equal(result.status, 400, `invalid game: ${JSON.stringify(game)}`);
  }
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM rooms').get()?.n, 0);
  h.sqlite.close();
});
test('Leaving after a concurrent move succeeds once, without ending a newer round', async () => {
  const h = harness(); await h.create(); await h.join();
  const moved = (await h.action('move', a, 1, { move: { to: 24 } })).json;
  assert.equal(moved.version, 2);
  const left = await h.action('leave', b, 1);
  assert.equal(left.status, 200); assert.equal(left.json.phase, 'closed');
  h.sqlite.close();
});
test('Room lookup bursts are throttled without growing a rejected rate bucket', async () => {
  const h = harness();
  for (let i = 0; i < 32; i++) {
    const result = await h.join(b, '둘');
    assert.equal(result.status, i < 30 ? 404 : 429);
    if (i >= 30) assert.equal(result.headers.get('Retry-After'), '60');
  }
  assert.equal(h.sqlite.prepare('SELECT MAX(count) AS n FROM room_limits').get()?.n, 30);
  h.sqlite.close();
});
test('Malformed move shapes and injected values do not mutate or crash a room', async () => {
  const h = harness(); await h.create(); await h.join();
  for (const move of [null, [], '24', { to: '24' }, { to: 24, from: null }, { to: -1 }, { to: 24.5 }, { to: 24, card: {} }, { to: 24, board: [1] }, JSON.parse('{"to":24,"__proto__":{"polluted":true}}')]) {
    assert.equal((await h.action('move', a, 1, { move })).status, 400);
  }
  assert.equal((await h.call(`rooms/${code}`, a)).json.state.ply, 0);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  h.sqlite.close();
});
test('Ordinary quoted nicknames are data, and changing a token does not grant another seat', async () => {
  const h = harness();
  assert.equal((await h.call('rooms', a, { code, game: 'ripple', nickname: "돌'친구" })).status, 200);
  await h.join();
  assert.equal((await h.call(`rooms/${code}`, a)).json.players[0].nickname, "돌'친구");
  assert.equal((await h.call(`rooms/${code}`, a.slice(0, 63) + 'b')).status, 403);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM rooms').get()?.n, 1);
  h.sqlite.close();
});
test('Resign and leave from a previous round cannot terminate a new game', async () => {
  const h = harness(); await h.create(); await h.join();
  let room = (await h.action('resign', a, 1)).json;
  room = (await h.action('rematch', a, room.version)).json;
  room = (await h.action('rematch', b, room.version)).json;
  for (const action of ['leave', 'resign']) assert.equal((await h.action(action, a, room.version, { round: 1 })).status, 409);
  assert.equal((await h.call(`rooms/${code}`, a)).json.phase, 'playing');
  h.sqlite.close();
});
