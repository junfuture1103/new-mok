'use client';
import { useEffect, useMemo, useState } from 'react';
import { Crown } from 'lucide-react';
import { CARDS, applyMove, coord, legalMoves, owner, winningLines, type Move, type State } from '@/lib/games';
import { GAME_NAMES } from '@/lib/online';

export default function OnlineBoard({ state, enabled, onMove }: { state: State; enabled: boolean; onMove: (move: Move) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [card, setCard] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState(0);
  const [notice, setNotice] = useState('');
  const moves = useMemo(() => legalMoves(state), [state]);
  const activeCard = card !== null && state.hands[state.turn - 1].includes(card) ? card : state.hands[state.turn - 1][0];
  const targets = moves.filter(m => m.from === selected && (state.game !== 'legacy' || m.card === activeCard)).map(m => m.to);
  useEffect(() => { setSelected(null); setCard(null); setHover(null); setNotice(''); }, [state.ply, state.game, state.winner]);
  const preview = useMemo(() => enabled && state.game === 'ripple' && hover !== null && state.board[hover] === 0 ? applyMove(state, { to: hover }) : null, [enabled, state, hover]);
  const display = preview?.board ?? state.board;
  const winners = state.game === 'ripple' && typeof state.winner === 'number' ? winningLines(state, state.winner) : [];
  function click(i: number) {
    if (!enabled) return;
    if (state.game === 'ripple') {
      if (state.board[i] === 0) { setHover(null); onMove({ to: i }); }
      else setNotice('돌이 없는 빈칸에 놓아주세요.');
      return;
    }
    if (owner(state.board[i]) === state.turn) { setSelected(selected === i ? null : i); setNotice(''); return; }
    const move = moves.find(m => m.from === selected && m.to === i && (state.game !== 'legacy' || m.card === activeCard));
    if (move) onMove(move);
    else setNotice(selected === null ? '먼저 움직일 내 말을 골라주세요.' : '이 칸으로는 갈 수 없어요. 표시된 칸을 골라주세요.');
  }
  return <>
    {state.game === 'legacy' && <div className="opponent-hand"><span>{state.turn === 1 ? '백' : '흑'}의 패</span>{state.hands[state.turn === 1 ? 1 : 0].map(c => <span className="waiting-card" key={c}>{CARDS[c].name}</span>)}</div>}
    <div className="board-frame">
      <div className="column-coordinates" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${state.size},1fr)` }}>{Array.from({ length: state.size }, (_, i) => <span key={i}>{String.fromCharCode(65 + i)}</span>)}</div>
      <div className="row-coordinates" aria-hidden="true" style={{ gridTemplateRows: `repeat(${state.size},1fr)` }}>{Array.from({ length: state.size }, (_, i) => <span key={i}>{state.size - i}</span>)}</div>
      <div className="board" role="group" aria-label={`${GAME_NAMES[state.game]} 온라인 게임판`} style={{ gridTemplateColumns: `repeat(${state.size},1fr)` }} onPointerLeave={() => setHover(null)}>
        {display.map((v, i) => <button key={i} type="button" data-cell={i} data-piece={state.board[i]}
          className={`cell ${v === -1 ? 'void' : ''} ${selected === i ? 'selected' : ''} ${targets.includes(i) ? 'available' : ''} ${preview && v !== state.board[i] ? 'preview' : ''} ${winners.includes(i) ? 'winning' : ''}`}
          tabIndex={i === focus ? 0 : -1} aria-disabled={!enabled || v === -1} aria-pressed={state.game === 'ripple' ? undefined : selected === i}
          aria-label={`${coord(i, state.size)} ${state.board[i] === 0 ? '빈칸' : state.board[i] === -1 ? '사라진 칸' : owner(state.board[i]) === 1 ? '흑 돌' : '백 돌'}${targets.includes(i) ? ' 이동 가능' : ''}`}
          onFocus={() => setFocus(i)} onPointerEnter={e => { if (e.pointerType === 'mouse') setHover(i); }} onPointerDown={e => { if (e.pointerType !== 'mouse') setHover(null); }} onClick={() => click(i)}
          onKeyDown={e => {
            const x = i % state.size, y = Math.floor(i / state.size);
            const map: Record<string, number> = { ArrowLeft: x > 0 ? i - 1 : i, ArrowRight: x < state.size - 1 ? i + 1 : i, ArrowUp: y > 0 ? i - state.size : i, ArrowDown: y < state.size - 1 ? i + state.size : i, Home: e.ctrlKey ? 0 : i - x, End: e.ctrlKey ? state.board.length - 1 : i - x + state.size - 1 };
            if (e.key in map) { e.preventDefault(); e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-cell="${map[e.key]}"]`)?.focus(); }
            if (e.key === 'Escape') { setSelected(null); setHover(null); }
            if ((e.key === 'Enter' || e.key === ' ') && e.repeat) e.preventDefault();
          }}>
          {v > 0 && <span className={`stone ${owner(v) === 1 ? 'black' : 'white'}`}>{v >= 3 && <Crown size={22} strokeWidth={1.4} />}</span>}
          {targets.includes(i) && v === 0 && <span className="move-dot" />}{v === -1 && <span className="void-cross">×</span>}
          {state.last?.to === i && !preview && <span className="last-mark" />}
        </button>)}
      </div>
    </div>
    {state.game === 'legacy' && <div className="hand"><div className="hand-title">{state.turn === 1 ? '흑' : '백'}의 이동 패 <span>패와 말을 고르면 이동할 칸이 보여요</span></div><div className="cards">{state.hands[state.turn - 1].map(c => <button key={c} type="button" className={`move-card ${activeCard === c ? 'active' : ''}`} disabled={!enabled} aria-label={`${CARDS[c].name} 패`} aria-pressed={activeCard === c} onClick={() => { setCard(c); setNotice(''); }}>
      <span className="card-pattern" aria-hidden="true">{Array.from({ length: 25 }, (_, i) => { const sign = state.turn === 1 ? 1 : -1; return <i key={i} className={i === 12 ? 'origin' : CARDS[c].vectors.some(([dx, dy]) => dx * sign === i % 5 - 2 && dy * sign === Math.floor(i / 5) - 2) ? 'destination' : ''} />; })}</span><span>{CARDS[c].name}{activeCard === c && <small>선택</small>}</span>
    </button>)}</div></div>}
    <p className="board-caption" aria-live="polite">{notice || (!enabled ? '대국 상태와 차례는 위에서 확인할 수 있어요.' : state.game === 'ripple' ? '빈칸을 누르면 바로 놓습니다. 마우스를 올려 밀림을 미리 볼 수 있어요.' : selected !== null ? targets.length ? `${coord(selected, state.size)} 선택 · 표시된 칸을 누르면 이동합니다.` : '움직일 수 있는 다른 패나 말을 골라주세요.' : state.game === 'legacy' ? '이동 패와 내 말을 고른 뒤, 표시된 칸을 누르세요.' : '내 말을 고른 뒤, 표시된 칸을 누르세요.')}</p>
  </>;
}
