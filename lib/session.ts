import { applyMove, createGame, type Game, type Move, type State } from './games.ts';

export type Mode = 'ai' | 'local';
export type Level = 'easy' | 'normal';
export type Sessions = Record<Game, { history: State[] }>;
export const SESSION_KEY = 'hansu:session:v1';
const games: Game[] = ['ripple', 'erosion', 'legacy'];
export const newSessions = (): Sessions => ({
  ripple: { history: [createGame('ripple')] },
  erosion: { history: [createGame('erosion')] },
  legacy: { history: [createGame('legacy')] },
});
type SavedGame = { game: Game; mode: Mode; level: Level; sessions: Sessions };

export function encodeSession({ game, mode, level, sessions }: SavedGame): string {
  // Store moves, not every duplicated position map in the undo history.
  return JSON.stringify({ version: 1, game, mode, level, moves: Object.fromEntries(
    games.map(id => [id, sessions[id].history.slice(1).map(state => state.last)]),
  ) });
}

export function decodeSession(raw: string | null): SavedGame | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (saved.version !== 1 || !games.includes(saved.game) || !['ai', 'local'].includes(saved.mode) || !['easy', 'normal'].includes(saved.level)) return null;
    const sessions = newSessions();
    for (const game of games) {
      const moves: Move[] = saved.moves?.[game];
      if (!Array.isArray(moves) || moves.length > 160) return null;
      for (const move of moves) {
        if (!move || typeof move !== 'object' || !Number.isInteger(move.to) || Object.keys(move).some(key => !['to', 'from', 'card'].includes(key))) return null;
        const history = sessions[game].history;
        history.push(applyMove(history[history.length - 1], move));
      }
    }
    return { game: saved.game, mode: saved.mode, level: saved.level, sessions };
  } catch { return null; }
}
