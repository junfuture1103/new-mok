import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, legalMoves, type Game } from '../lib/games.ts';
import { newSessions, encodeSession, decodeSession } from '../lib/session.ts';

test('Saved moves rebuild all three games and their exact undo histories', () => {
  const sessions = newSessions();
  for (const game of ['ripple', 'erosion', 'legacy'] as Game[]) {
    const history = sessions[game].history;
    for (let ply = 0; ply < 6; ply++) history.push(applyMove(history.at(-1)!, legalMoves(history.at(-1)!)[0]));
  }
  const saved = { game: 'legacy' as const, mode: 'local' as const, level: 'easy' as const, sessions };
  assert.deepEqual(decodeSession(encodeSession(saved)), saved);
  sessions.legacy.history = sessions.legacy.history.slice(0, -2);
  assert.deepEqual(decodeSession(encodeSession(saved)), saved);
});

test('Invalid, obsolete and illegal saved data is safely rejected', () => {
  assert.equal(decodeSession(null), null);
  assert.equal(decodeSession('{broken'), null);
  assert.equal(decodeSession('{"version":0}'), null);
  const saved = JSON.parse(encodeSession({game:'ripple', mode:'ai', level:'normal', sessions:newSessions()}));
  saved.moves.ripple = [{to:24}, {to:24}];
  assert.equal(decodeSession(JSON.stringify(saved)), null);
  saved.moves.ripple = Array(161).fill({to:0});
  assert.equal(decodeSession(JSON.stringify(saved)), null);
});
