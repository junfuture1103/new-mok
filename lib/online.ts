import type { Game, Move, Player, State } from './games';

export const ROOM_CODE = /^[A-HJ-NP-Z2-9]{10}$/;
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const GAME_NAMES: Record<Game, string> = { ripple: '파문', erosion: '침식', legacy: '유산' };
export const ONLINE_API = process.env.NEXT_PUBLIC_ROOM_API || 'https://abstract-trilogy-jun.hacktheworld2024.chatgpt.site';
export type RoomView = {
  code: string; game: Game; version: number; round: number;
  phase: 'waiting' | 'playing' | 'finished' | 'closed';
  players: { nickname: string; color: Player; connected: boolean }[];
  you: Player; state: State; moves: Move[]; rematch: boolean[]; expiresAt: number;
};
export function normalizeCode(value: string) { return value.toUpperCase().replace(/[\s-]/g, ''); }
export function formatCode(value: string) { return `${value.slice(0, 5)} ${value.slice(5)}`; }
export function normalizeNickname(value: unknown): string {
  if (typeof value !== 'string') throw new Error('닉네임을 입력해주세요.');
  const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if ([...name].length < 1 || [...name].length > 12 || /[\p{Cc}\p{Cf}<>]/u.test(name)) {
    throw new Error('닉네임은 특수 제어문자 없이 1~12자로 입력해주세요.');
  }
  return name;
}
