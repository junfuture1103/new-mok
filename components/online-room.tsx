'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Copy, Link2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OnlineBoard from '@/components/online-board';
import { basePath } from '@/lib/site';
import { coord, CARDS, type Game, type Move } from '@/lib/games';
import { formatCode, GAME_NAMES, normalizeCode, normalizeNickname, ONLINE_API, ROOM_ALPHABET, ROOM_CODE, type RoomView } from '@/lib/online';

type Entry = { code: string; token: string; nickname: string; game: Game; kind: 'create' | 'join' };
const entryKey = (code: string) => `hansu:online:${code}`;
const lastKey = 'hansu:online:last';
function readEntry(value: string | null, code: string): Entry | null {
  try {
    const saved = JSON.parse(value || 'null');
    return saved && saved.code === code && ROOM_CODE.test(code) && typeof saved.token === 'string' && /^[a-f0-9]{64}$/.test(saved.token) &&
      typeof saved.nickname === 'string' && normalizeNickname(saved.nickname) === saved.nickname && ['create', 'join'].includes(saved.kind) && typeof saved.game === 'string' && Object.hasOwn(GAME_NAMES, saved.game) ? saved : null;
  } catch { return null; }
}
class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
function randomToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''); }
function randomCode() { return Array.from(crypto.getRandomValues(new Uint8Array(10)), b => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join(''); }
async function api(entry: Entry, path = '', payload?: object): Promise<RoomView> {
  const url = path === 'create' ? `${ONLINE_API}/api/rooms` : `${ONLINE_API}/api/rooms/${entry.code}${path ? `/${path}` : ''}`;
  let response: Response;
  try {
    response = await fetch(url, { method: payload ? 'POST' : 'GET', headers: { Authorization: `Bearer ${entry.token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) }, body: payload ? JSON.stringify(payload) : undefined, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  } catch { throw new ApiError(0, '연결이 불안정해요. 인터넷 연결을 확인한 뒤 다시 시도해주세요.'); }
  let data: RoomView & { error?: string };
  try { data = await response.json() as RoomView & { error?: string }; } catch { throw new ApiError(503, '대국 서버가 응답하지 않아요. 잠시 후 다시 시도해주세요.'); }
  if (!response.ok) throw new ApiError(response.status, data.error || '요청을 처리하지 못했어요.');
  return data as RoomView;
}
export default function OnlineRoom() {
  const [ready, setReady] = useState(false), [room, setRoom] = useState<RoomView | null>(null);
  const [nickname, setNickname] = useState(''), [game, setGame] = useState<Game>('ripple'), [code, setCode] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [connected, setConnected] = useState(false), [storageWarning, setStorageWarning] = useState(false);
  const [terminal, setTerminal] = useState(false), [resume, setResume] = useState<Entry | null>(null);
  const [confirmation, setConfirmation] = useState<'leave' | 'resign' | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const current = useRef<RoomView | null>(null), entry = useRef<Entry | null>(null), locked = useRef(false), alive = useRef(true);
  function accept(next: RoomView, expected: Entry) {
    if (!alive.current || entry.current !== expected) return;
    if (!current.current || next.code !== current.current.code || next.version >= current.current.version) {
      current.current = next; setRoom(next); setGame(next.game);
    }
    setConnected(navigator.onLine); setTerminal(false);
  }
  function persist(next: Entry) {
    entry.current = next;
    try { sessionStorage.setItem(entryKey(next.code), JSON.stringify(next)); sessionStorage.setItem(lastKey, next.code); }
    catch { setStorageWarning(true); }
    try { localStorage.setItem('hansu:nickname', next.nickname); } catch { /* Nickname preference must not affect room recovery. */ }
  }
  function roomUrl(next: Entry) {
    const url = new URL(`${basePath}/online.html`, window.location.origin); url.searchParams.set('room', next.code); return url.href;
  }
  async function enter(kind: 'create' | 'join', restore?: Entry) {
    if (locked.current) return;
    setError(''); setMessage(''); setTerminal(false);
    let next: Entry;
    try {
      const name = restore?.nickname ?? normalizeNickname(nickname), requested = normalizeCode(code);
      if (!restore && kind === 'join' && !ROOM_CODE.test(requested)) throw new Error('초대받은 10자리 방 코드를 입력해주세요.');
      const pending = entry.current;
      next = restore ?? (pending && pending.kind === kind && pending.game === game && (kind === 'create' || pending.code === requested) ? { ...pending, nickname: name } : { kind, code: kind === 'create' ? randomCode() : requested, token: randomToken(), nickname: name, game });
    } catch (e) { setError((e as Error).message); return; }
    locked.current = true; setBusy(true); persist(next);
    try {
      let result: RoomView;
      if (restore) {
        try { result = await api(next); }
        catch (e) { if (![403, 404].includes((e as ApiError).status)) throw e; result = await api(next, next.kind === 'create' ? 'create' : 'join', { code: next.code, nickname: next.nickname, game: next.game }); }
      } else result = await api(next, kind === 'create' ? 'create' : 'join', { code: next.code, nickname: next.nickname, game: next.game });
      accept(result, next); setConfirmation(null); setResume(null); history.replaceState(null, '', roomUrl(next));
    } catch (e) {
      setError((e as Error).message);
      if (restore && [0, 503, 429].includes((e as ApiError).status)) setResume(next);
      if ([401, 403, 404, 409, 410].includes((e as ApiError).status)) {
        try { sessionStorage.removeItem(entryKey(next.code)); sessionStorage.removeItem(lastKey); } catch { /* Optional storage. */ }
        entry.current = null; setResume(null);
      }
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  useEffect(() => {
    alive.current = true;
    const params = new URLSearchParams(location.search), requested = normalizeCode(params.get('room') || '');
    const requestedGame = params.get('game'); if (requestedGame && Object.hasOwn(GAME_NAMES, requestedGame)) setGame(requestedGame as Game);
    if (requested) setCode(requested);
    try { const name = localStorage.getItem('hansu:nickname'); if (name) setNickname(normalizeNickname(name)); } catch { /* Optional nickname preference. */ }
    try {
      const previous = requested || sessionStorage.getItem(lastKey);
      if (previous && ROOM_CODE.test(previous)) {
        const saved = readEntry(sessionStorage.getItem(entryKey(previous)), previous);
        if (saved) {
          setNickname(saved.nickname); setGame(saved.game); setCode(previous); void enter(saved.kind, saved);
        }
      } else if (requested) setError('방 코드가 올바르지 않아요. 초대 링크를 다시 확인해주세요.');
    } catch { setStorageWarning(true); }
    setReady(true);
    return () => { alive.current = false; };
    // Restore once; later room state is server-authoritative.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const node = dialog.current;
    if (confirmation && node && !node.open) { node.showModal(); node.querySelector<HTMLButtonElement>('[data-keep-playing]')?.focus(); }
    if (!confirmation && node?.open) node.close();
  }, [confirmation]);
  function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  useEffect(() => {
    const offline = () => setConnected(false);
    window.addEventListener('offline', offline);
    return () => window.removeEventListener('offline', offline);
  }, []);
  useEffect(() => {
    if (!room) return;
    const expected = entry.current!; let stopped = false, inFlight = false, failures = 0, timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (stopped || inFlight) return;
      inFlight = true;
      try { const next = await api(expected); if (!stopped) { accept(next, expected); failures = 0; if (next.phase === 'closed') stopped = true; } }
      catch (e) {
        if (!stopped && entry.current === expected) {
          setConnected(false); failures++;
          if ([401, 403, 404, 410].includes((e as ApiError).status)) { setError((e as Error).message); setTerminal(true); stopped = true; }
        }
      } finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(poll, document.hidden ? 10000 : Math.min(10000, failures ? 1500 * 2 ** failures : 1200));
      }
    }
    const wake = () => { clearTimeout(timer); void poll(); };
    timer = setTimeout(poll, 500);
    window.addEventListener('online', wake); document.addEventListener('visibilitychange', wake);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); };
  }, [room?.code]);
  function exitRoom(preserveSeat = false) {
    const previous = entry.current;
    if (previous && !preserveSeat) { try { sessionStorage.removeItem(entryKey(previous.code)); sessionStorage.removeItem(lastKey); } catch { /* Optional storage. */ } }
    setResume(preserveSeat ? previous : null); setTerminal(false);
    entry.current = null; current.current = null; setRoom(null); setCode(''); setConfirmation(null); setError(''); setMessage('');
    history.replaceState(null, '', `${basePath}/online.html`);
  }
  async function action(path: 'move' | 'rematch' | 'resign' | 'leave', move?: Move) {
    if (locked.current || !entry.current || !current.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    const expected = entry.current, payload = { version: current.current.version, round: current.current.round, id: crypto.randomUUID(), ...(move ? { move } : {}) };
    try {
      let next: RoomView;
      try { next = await api(expected, path, payload); }
      catch (e) { if ((e as ApiError).status !== 0 && (e as ApiError).status !== 503) throw e; next = await api(expected, path, payload); }
      accept(next, expected); setConfirmation(null);
      if (path === 'leave') exitRoom();
    } catch (e) {
      setError((e as Error).message);
      try { accept(await api(expected), expected); } catch { setConnected(false); }
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setMessage(`${label}를 복사했어요.`); }
    catch { setMessage('자동 복사가 안 되면 아래 초대 링크를 선택해 복사해주세요.'); }
  }
  const mine = room?.players[(room?.you ?? 1) - 1], opponent = room?.players[room.you === 1 ? 1 : 0];
  const canMove = !!room && connected && !busy && room.phase === 'playing' && room.state.turn === room.you;
  const status = !room ? '' : terminal ? '이 방에 더 이상 연결할 수 없어요' : !connected ? '연결 확인 중 · 자동으로 다시 연결합니다' : room.phase === 'waiting' ? '친구를 기다리고 있어요' : room.phase === 'closed' ? '닫힌 방' : room.phase === 'finished' ? room.state.winner === 'draw' ? '무승부' : `${room.players[Number(room.state.winner) - 1]?.nickname} 님 승리` : busy ? '요청을 전송하고 있어요' : room.state.turn === room.you ? '내 차례입니다' : `${opponent?.nickname} 님의 차례`;
  return <main className="studio online-studio" data-game={room?.game ?? game} data-ready={ready}>
    <header className="masthead online-masthead"><a href={`${basePath}/`} className="wordmark" aria-label="한 수 처음으로">한 수<span className="brand-seal" aria-hidden="true">手</span></a><span className="online-label"><Users size={16} />온라인 대국</span><a className="back-link" href={`${basePath}/`}><ArrowLeft size={14} />혼자 두기</a></header>
    {!room ? <section className="online-lobby" aria-busy={busy}>
      <div className="lobby-heading"><span className="guide-eyebrow">서로 다른 곳에서, 같은 판으로</span><h1>함께 한 수.</h1><p>닉네임을 정하고 친구를 초대하세요.<br />파문·침식·유산, 세 가지 게임을 함께 둡니다.</p></div>
      {resume && <div className="resume-panel"><p>내 자리를 보관하고 있어요. 연결이 돌아오면 이어둘 수 있습니다.</p><Button disabled={busy} onClick={() => { void enter(resume.kind, resume); }}>이전 방 이어두기</Button></div>}
      <fieldset className="lobby-form" disabled={!ready || busy}>
        <label htmlFor="online-nickname">내 닉네임</label><input id="online-nickname" value={nickname} maxLength={24} placeholder="1~12자" autoComplete="nickname" onChange={e => setNickname(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); void enter(code ? 'join' : 'create'); } }} />
        <form onSubmit={e => { e.preventDefault(); void enter('create'); }}><label htmlFor="online-game">함께 둘 게임</label><select id="online-game" value={game} onChange={e => setGame(e.target.value as Game)}>{Object.entries(GAME_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><Button type="submit" className="online-primary" disabled={!nickname.trim()}>방 만들기</Button></form>
        <div className="lobby-divider"><span>초대받았다면</span></div>
        <form onSubmit={e => { e.preventDefault(); void enter('join'); }}><label htmlFor="online-code">방 코드</label><input id="online-code" value={code} maxLength={14} placeholder="예: ABCDE FG234" autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={e => setCode(normalizeCode(e.target.value))} /><Button type="submit" variant="outline" className="online-join" disabled={!nickname.trim() || !code.trim()}>방 입장하기</Button></form>
      </fieldset>
      <p className="lobby-footnote">회원가입 없이 2인 대국 · 방은 만든 시점부터 24시간 유지됩니다.</p>
      {busy && <p role="status" className="online-notice">대국에 연결하고 있어요…</p>}
      {error && <p role="alert" className="online-error">{error}</p>}
    </section> : <section className="play-layout online-layout" aria-busy={busy}>
      <div className="play-surface">
        <div className="game-heading"><div><h1>{GAME_NAMES[room.game]}</h1><p>{room.round}번째 대국 · {mine?.nickname} 님은 {room.you === 1 ? '흑' : '백'}입니다</p></div><span className="board-size">{room.state.size} × {room.state.size}</span></div>
        <div className="online-players">{[0, 1].map(i => <div key={i} className={room.state.turn === i + 1 && room.phase === 'playing' ? 'current' : ''}><span className={`tiny-stone ${i === 0 ? 'black' : 'white'}`} /><b>{room.players[i]?.nickname ?? '입장 대기'}</b><small>{room.you === i + 1 ? '나' : room.players[i] ? room.players[i].connected ? '접속 중' : '연결 확인 중' : '친구'}</small></div>)}</div>
        <div className="table-top"><span role="status" aria-live="polite" data-testid="online-status">{status}</span><span className="table-meta" data-testid="ply">{String(room.state.ply).padStart(2, '0')}수</span></div>
        {room.phase === 'waiting' && <div className="waiting-share"><span>방 코드 <b>{formatCode(room.code)}</b></span><Button className="online-primary" onClick={() => { if (entry.current) void copy(roomUrl(entry.current), '초대 링크'); }}><Link2 size={15} />친구 초대 링크 복사</Button><small role="status">{message || '친구가 들어오면 바로 시작해요.'}</small></div>}
        <OnlineBoard key={`${room.code}:${room.round}`} state={room.state} enabled={canMove} onMove={move => { void action('move', move); }} />
        {room.phase === 'waiting' && <p className="online-waiting">초대 링크를 친구에게 보내주세요. 두 명이 입장하면 흑부터 바로 시작합니다.</p>}
        {room.phase === 'playing' && opponent && !opponent.connected && <p className="online-notice">상대의 연결을 기다리고 있어요. 대국은 보관되며, 다시 접속하면 이어집니다.</p>}
        {room.state.winner !== null && <div className="result" data-testid="result"><div><strong>{room.state.winner === 'draw' ? '무승부입니다.' : room.state.winner === room.you ? '이겼습니다.' : '다음 한 수를 기약해요.'}</strong><p>{room.state.reason}</p></div></div>}
        {room.phase === 'finished' && <div className="rematch-panel"><p>{room.rematch[room.you - 1] ? '다시 두기를 요청했어요. 상대의 동의를 기다립니다.' : room.rematch[room.you === 1 ? 1 : 0] ? '상대가 다시 두기를 요청했어요.' : '한 판 더? 두 사람이 동의하면 흑백을 바꿔 시작합니다.'}</p><Button disabled={busy || !connected || room.rematch[room.you - 1]} onClick={() => { void action('rematch'); }}>{room.rematch[room.you - 1] ? '상대 동의 기다리는 중' : '흑백 바꿔 다시 두기'}</Button></div>}
        {error && <p role="alert" className="online-error">{error}</p>}
        {terminal && <Button variant="outline" onClick={() => exitRoom()}>대기실로 돌아가기</Button>}
        <div className="board-bottom"><span>온라인에서는 무르기 없이 둡니다.</span><div>{room.phase === 'playing' && <Button variant="ghost" disabled={busy || !connected} onClick={() => setConfirmation('resign')}>기권</Button>}<Button variant="ghost" disabled={busy} onClick={() => room.phase === 'closed' ? exitRoom() : setConfirmation('leave')}>방 나가기</Button></div></div>
        <dialog ref={dialog} onKeyDown={keepDialogFocus} className="online-confirm" aria-labelledby="confirm-title" onCancel={e => { if (busy) e.preventDefault(); else setConfirmation(null); }} onClose={() => setConfirmation(null)}><p id="confirm-title">{confirmation === 'resign' ? '기권하고 이 대국을 마칠까요?' : room.phase === 'playing' ? '지금 나가면 상대의 승리로 대국이 끝나요. 나갈까요?' : '방을 닫고 나갈까요?'}</p><Button disabled={busy || !connected} onClick={() => { if (confirmation) void action(confirmation); }}>{confirmation === 'resign' ? '기권하기' : '나가기'}</Button><Button data-keep-playing variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>계속 머물기</Button>{!connected && <><p>내 자리를 보관한 채 대기실로 돌아갈 수 있어요. 대국은 종료되지 않습니다.</p><Button variant="ghost" disabled={busy} onClick={() => exitRoom(!terminal)}>대기실로 돌아가기</Button></>}</dialog>
      </div>
      <aside className="side-column online-side">
        <section className="invite-panel"><h2>대국방 <small>{room.players.length} / 2명</small></h2><span className="room-code" data-testid="room-code">{formatCode(room.code)}</span><Button variant="outline" onClick={() => { void copy(room.code, '방 코드'); }}><Copy size={14} />방 코드 복사</Button><Button className="online-primary" onClick={() => { if (entry.current) void copy(roomUrl(entry.current), '초대 링크'); }}><Link2 size={15} />초대 링크 복사</Button><label className="sr-only" htmlFor="invite-link">초대 링크</label><input id="invite-link" value={entry.current ? roomUrl(entry.current) : ''} readOnly onFocus={e => e.target.select()} /><p className="online-notice" role="status">{message || '링크를 받은 친구 한 명이 입장할 수 있어요.'}</p></section>
        <section className="guide-panel"><h2>두는 법</h2><p className="online-rules">{room.game === 'ripple' ? '빈칸에 돌을 놓으면 상하좌우의 돌이 한 칸 밀립니다. 밀림이 끝난 뒤 내 돌 네 개를 이으면 승리합니다.' : room.game === 'erosion' ? '말을 상하좌우로 옮기면 출발한 칸이 사라집니다. 내 차례에 움직일 말이 없으면 집니다.' : '이동 패와 말을 골라 움직입니다. 사용한 패는 상대에게 넘어갑니다. 왕관이 있는 상대 말을 잡거나 움직일 수 없게 하면 승리합니다.'}</p><a className="rules-link" target="_blank" rel="noopener noreferrer" href={`${basePath}/rules/${room.game}.html`}>세부 규칙 새 탭에서 보기 ↗</a></section>
        <section className="move-log"><h2>기보</h2>{room.moves.length === 0 ? <p className="log-empty">아직 놓인 수가 없습니다.</p> : room.moves.slice(-5).map((move, i) => { const ply = Math.max(0, room.moves.length - 5) + i; return <p key={ply}><small>{String(ply + 1).padStart(2, '0')}</small>{ply % 2 === 0 ? '흑' : '백'} · {move.from === undefined ? '' : `${coord(move.from, room.state.size)} → `}{coord(move.to, room.state.size)}{move.card === undefined ? '' : ` · ${CARDS[move.card].name}`}</p>; })}</section>
      </aside>
    </section>}
    {storageWarning && <p className="online-notice">이 브라우저는 임시 저장을 허용하지 않아 새로고침하면 내 자리에 돌아오지 못할 수 있어요. 대국 중에는 이 탭을 유지해주세요.</p>}
    <footer><span>한 수 · 온라인 대국</span><span>방향키로 이동 · Enter로 착수</span></footer>
  </main>;
}
