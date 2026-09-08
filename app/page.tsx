'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { basePath } from '@/lib/site';
import { RotateCcw, Undo2, Lightbulb, Crown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CARDS, createGame, legalMoves, applyMove, chooseMove, owner, coord, describeMove, winningLines, type Game, type State, type Move } from '@/lib/games';

const GAMES = [
  { id: 'ripple' as Game, name: '파문', subtitle: '돌을 밀어, 네 개를 잇습니다.', rules: [['놓기','흑부터 번갈아 빈칸에 돌 하나를 놓습니다.'],['밀기','상하좌우에 붙은 돌은 한 칸 밀립니다. 다른 돌로 막히면 멈추고, 판 밖이면 사라집니다.'],['잇기','밀림이 끝난 뒤 가로·세로·대각선에 내 돌 네 개가 이어지면 이깁니다.']] },
  { id: 'erosion' as Game, name: '침식', subtitle: '길을 지우며, 마지막까지 남습니다.', rules: [['고르기','흑부터 자기 말 하나를 고릅니다. 말은 각각 세 개입니다.'],['이동하기','상하좌우로 원하는 만큼 이동합니다. 말과 구멍을 넘을 수 없고, 출발한 칸은 사라집니다.'],['가두기','자기 차례에 어떤 말도 움직일 수 없으면 집니다.']] },
  { id: 'legacy' as Game, name: '유산', subtitle: '내가 쓴 패를, 상대에게 건넵니다.', rules: [['패 고르기','패와 말을 고르면 갈 수 있는 칸이 표시됩니다. 자기 차례에는 패가 세 장입니다.'],['건네기','패에 그려진 모양대로 이동하고, 사용한 패를 상대에게 줍니다. 두 칸 이동은 중간 말을 넘습니다.'],['잡기','왕관이 있는 상대 말을 잡으면 이깁니다. 상대가 움직일 수 없어도 이깁니다.']] },
];
type Session = { history: State[] };
const newSessions = ():Record<Game,Session> => ({ripple:{history:[createGame('ripple')]},erosion:{history:[createGame('erosion')]},legacy:{history:[createGame('legacy')]}});
const colorName = (p:number) => p===1?'흑':'백';
function CardPattern({card,turn}:{card:number;turn:number}) {
  return <span className="card-pattern" aria-hidden="true">{Array.from({length:25},(_,i)=>{
    const sign=turn===1?1:-1,x=i%5-2,y=Math.floor(i/5)-2;
    return <i key={i} className={i===12?'origin':CARDS[card].vectors.some(([dx,dy])=>dx*sign===x&&dy*sign===y)?'destination':''}/>;
  })}</span>;
}
export default function Home() {
  const [game,setGame]=useState<Game>('ripple');
  const [sessions,setSessions]=useState(newSessions);
  const [mode,setMode]=useState('ai');
  const [level,setLevel]=useState<'easy'|'normal'>('normal');
  const [selected,setSelected]=useState<number|null>(null);
  const [card,setCard]=useState<number|null>(null);
  const [hover,setHover]=useState<number|null>(null);
  const [hint,setHint]=useState<Move|null>(null);
  const [notice,setNotice]=useState('');
  const info=GAMES.find(g=>g.id===game)!;
  const history=sessions[game].history,state=history[history.length-1];
  const moves=legalMoves(state),thinking=mode==='ai'&&state.turn===2&&state.winner===null;
  const activeCard=card!==null&&state.hands[state.turn-1].includes(card)?card:state.hands[state.turn-1][0];
  const targets=moves.filter(m=>m.from===selected&&(game!=='legacy'||m.card===activeCard)).map(m=>m.to);
  const clear=()=>{setSelected(null);setCard(null);setHover(null);setHint(null);setNotice('');};
  function play(move:Move) {
    const next=applyMove(state,move);
    setSessions(previous=>({...previous,[game]:{history:[...previous[game].history,next]}}));
    clear();
  }
  function reset() {setSessions(previous=>({...previous,[game]:{history:[createGame(game)]}}));clear();}
  function undo() {
    if(history.length<2)return;
    const count=mode==='ai'&&state.turn===1&&history.length>2?2:1;
    setSessions(previous=>({...previous,[game]:{history:previous[game].history.slice(0,-count)}}));clear();
  }
  useEffect(()=>{
    if(!thinking)return;
    const timer=setTimeout(()=>{
      const move=chooseMove(state,level);
      if(move){const next=applyMove(state,move);setSessions(previous=>({...previous,[game]:{history:[...previous[game].history,next]}}));setHint(null);setNotice('');}
    },400);
    return ()=>clearTimeout(timer);
  },[state,thinking,game,level]);
  function clickCell(i:number) {
    if(thinking||state.winner!==null)return;
    if(game==='ripple') {if(state.board[i]===0)play({to:i});return;}
    if(owner(state.board[i])===state.turn) {setSelected(selected===i?null:i);setHint(null);return;}
    const move=moves.find(m=>m.from===selected&&m.to===i&&(game!=='legacy'||m.card===activeCard));
    if(move)play(move);
  }
  const preview=game==='ripple'&&hover!==null&&state.board[hover]===0&&!thinking&&state.winner===null?applyMove(state,{to:hover}):null;
  const display=preview?.board??state.board;
  const winCells=game==='ripple'&&typeof state.winner==='number'?winningLines(state,state.winner):[];
  const caption=notice|| (hint?`추천 수: ${describeMove(state,hint)}. 강조된 칸을 선택하세요.`:thinking?'백이 생각 중입니다.':state.winner!==null?state.reason:game==='ripple'?'빈칸을 가리키면 돌이 밀릴 자리를 미리 볼 수 있습니다.':selected!==null?'점이 찍힌 칸으로 이동하세요.':game==='legacy'?'패를 고른 뒤 움직일 말을 선택하세요.':'내 말을 선택하면 갈 수 있는 칸이 표시됩니다.');
  const api=useRef({state,thinking,play,start:(g:Game)=>{}});
  api.current={state,thinking,play,start:(g:Game)=>{setGame(g);setSessions(p=>({...p,[g]:{history:[createGame(g)]}}));clear();}};
  useEffect(()=>{
    type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};
    const context=(document as Document&{modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>unknown}}).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    const read=()=>({game:api.current.state.game,board:api.current.state.board,turn:api.current.state.turn,winner:api.current.state.winner,hands:api.current.state.hands,legalMoves:api.current.thinking?[]:legalMoves(api.current.state)});
    const definitions:Tool[]=[
      {name:'read_game',description:'Read the active board, turn, cards and currently playable moves.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:read},
      {name:'start_game',description:'Start a fresh Ripple, Erosion or Legacy game, replacing that game’s current local match.',inputSchema:{type:'object',properties:{game:{type:'string',enum:['ripple','erosion','legacy']}},required:['game'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){const g=(input as {game?:unknown})?.game;if(!GAMES.some(x=>x.id===g))throw new Error('Unknown game');flushSync(()=>api.current.start(g as Game));return read();}},
      {name:'play_move',description:'Complete one legal move on the active board. Use read_game to obtain legal moves. Cannot play for the computer.',inputSchema:{type:'object',properties:{to:{type:'integer'},from:{type:'integer'},card:{type:'integer'}},required:['to'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){const m=input as Move;if(api.current.thinking)throw new Error('Computer is thinking');if(!m||!Number.isInteger(m.to)||Object.keys(m).some(k=>!['to','from','card'].includes(k)))throw new Error('Invalid move');applyMove(api.current.state,m);flushSync(()=>api.current.play(m));return read();}},
    ];
    for(const tool of definitions){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser API. */}}
    return ()=>lifecycle.abort();
  },[]);
  return <main className="studio" data-game={game}>
    <header className="masthead">
      <a href={`${basePath}/`} className="wordmark" aria-label="한 수 처음으로">한 수<span className="brand-seal" aria-hidden="true">手</span></a>
      <Tabs value={game} onValueChange={v=>{setGame(v as Game);clear();}}>
        <TabsList className="game-tabs" aria-label="게임 선택">{GAMES.map(g=><TabsTrigger key={g.id} value={g.id} className="game-tab">{g.name}</TabsTrigger>)}</TabsList>
      </Tabs>
      <Button variant="ghost" className="new-game" onClick={reset}><RotateCcw size={15}/>새 대국</Button>
    </header>
    <section className="play-layout">
      <div className="play-surface">
        <div className="game-heading"><div><h1>{info.name}</h1><p>{info.subtitle}</p></div><span className="board-size">{state.size} × {state.size}</span></div>
        <div className="table-top">
          <span role="status" aria-live="polite" data-testid="turn-status"><span className={`tiny-stone ${state.turn===1?'black':'white'}`}/>{state.winner!==null?state.winner==='draw'?'무승부':`${colorName(state.winner)} 승리`:thinking?'백이 생각 중':`${colorName(state.turn)}의 차례`}{thinking&&<span className="thinking-dots">···</span>}</span>
          <span className="table-meta" data-testid="ply">{String(state.ply).padStart(2,'0')}수</span>
        </div>
        {game==='legacy'&&<div className="opponent-hand"><span>{colorName(state.turn===1?2:1)}의 패</span>{state.hands[(state.turn===1?2:1)-1].map(c=><span className="waiting-card" key={c}>{CARDS[c].name}</span>)}</div>}
        <div className="board-frame">
          <div className="column-coordinates" aria-hidden="true" style={{gridTemplateColumns:`repeat(${state.size},1fr)`}}>{Array.from({length:state.size},(_,i)=><span key={i}>{String.fromCharCode(65+i)}</span>)}</div>
          <div className="row-coordinates" aria-hidden="true" style={{gridTemplateRows:`repeat(${state.size},1fr)`}}>{Array.from({length:state.size},(_,i)=><span key={i}>{state.size-i}</span>)}</div>
          <div className="board" role="group" aria-label={`${info.name} 게임판`} style={{gridTemplateColumns:`repeat(${state.size},1fr)`}} onPointerLeave={()=>setHover(null)}>{display.map((v,i)=>{
            const own=owner(v),available=targets.includes(i),hinted=hint?.to===i||hint?.from===i;
            return <button key={i} data-cell={i} data-piece={state.board[i]} aria-label={`${coord(i,state.size)} ${state.board[i]===-1?'사라진 칸':state.board[i]===0?'빈칸':colorName(owner(state.board[i]))+(state.board[i]>=3?' 중심 말':' 돌')}${available?' 이동 가능':''}`} aria-disabled={thinking||state.winner!==null||v===-1} className={`cell ${v===-1?'void':''} ${selected===i?'selected':''} ${available?'available':''} ${hinted?'hinted':''} ${preview&&v!==state.board[i]?'preview':''} ${winCells.includes(i)?'winning':''}`} onPointerEnter={()=>setHover(i)} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)} onClick={()=>clickCell(i)} onKeyDown={e=>{const offsets:Record<string,number>={ArrowUp:-state.size,ArrowDown:state.size,ArrowLeft:-1,ArrowRight:1};if(e.key in offsets){e.preventDefault();const next=i+offsets[e.key];if(next>=0&&next<state.board.length)document.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();}if(e.key==='Escape'){setSelected(null);setHint(null);}}}>
              {v>0&&<span className={`stone ${own===1?'black':'white'}`}>{v>=3&&<Crown size={22} strokeWidth={1.4}/>}<span className="sr-only">{colorName(own)}</span></span>}
              {available&&v===0&&<span className="move-dot"/>}{v===-1&&<span className="void-cross">×</span>}{state.last?.to===i&&!preview&&<span className="last-mark"/>}
            </button>;
          })}</div>
        </div>
        {game==='legacy'&&<div className="hand"><div className="hand-title">{colorName(state.turn)}의 이동 패 <span>그림과 같은 방향으로 이동</span></div><div className="cards">{state.hands[state.turn-1].map(c=><button key={c} aria-label={`${CARDS[c].name} 패`} aria-pressed={activeCard===c} disabled={thinking||state.winner!==null} className={`move-card ${activeCard===c?'active':''}`} onClick={()=>{setCard(c);setHint(null);}}><CardPattern card={c} turn={state.turn}/><span>{CARDS[c].name}{activeCard===c&&<small>선택</small>}</span></button>)}</div></div>}
        <p className="board-caption" aria-live="polite">{caption}</p>
        {state.winner!==null&&<div className="result" data-testid="result"><strong>{state.winner==='draw'?'무승부':`${colorName(state.winner)}이 이겼습니다.`}</strong><Button onClick={reset}>한 판 더</Button></div>}
        <div className="board-bottom"><span>{game==='ripple'?`흑 ${state.board.filter(v=>v===1).length} · 백 ${state.board.filter(v=>v===2).length}`:game==='erosion'?`남은 땅 ${state.board.filter(v=>v!==-1).length}칸`:`흑 ${state.board.filter(v=>owner(v)===1).length} · 백 ${state.board.filter(v=>owner(v)===2).length}`}</span><div><Button variant="ghost" onClick={undo} disabled={history.length<2}><Undo2 size={15}/>무르기</Button><Button variant="ghost" disabled={thinking||state.winner!==null} onClick={()=>{const m=chooseMove(state,'normal');setHint(m);if(m?.from!==undefined)setSelected(m.from);if(m?.card!==undefined)setCard(m.card);setHover(null);}}><Lightbulb size={15}/>힌트</Button></div></div>
      </div>
      <aside className="side-column">
        <section className="match-controls" aria-label="대국 설정"><h2>함께 둘 상대</h2>
          <Tabs value={mode} onValueChange={v=>{setMode(v as string);clear();}}><TabsList aria-label="대전 방식" className="mode-tabs"><TabsTrigger value="ai">AI와 두기</TabsTrigger><TabsTrigger value="local">둘이 두기</TabsTrigger></TabsList></Tabs>
          {mode==='ai'?<div className="settings"><span>나는 흑, 컴퓨터는 백</span><Select value={level} onValueChange={v=>setLevel(v as 'easy'|'normal')}><SelectTrigger aria-label="AI 난이도"><SelectValue>{level==='easy'?'가볍게':'신중하게'}</SelectValue></SelectTrigger><SelectContent><SelectItem value="easy">가볍게</SelectItem><SelectItem value="normal">신중하게</SelectItem></SelectContent></Select></div>:<p className="local-note">한 기기에서 번갈아 둡니다.</p>}
        </section>
        <section className="guide-panel"><h2>두는 법</h2><ol className="rules-list">{info.rules.map(([title,body])=><li key={title}><b>{title}</b><p>{body}</p></li>)}</ol>
          <details className="more-rules"><summary>세부 규칙</summary><p>{game==='ripple'?'돌의 밀림은 동시에 처리됩니다. 두 색이 함께 네 개를 연결하거나 판이 가득 차면 무승부입니다. ':game==='legacy'?'패 다섯 장을 공유합니다. 시작할 때 흑이 세 장, 백이 두 장을 가지며, 자기 차례에는 항상 세 장이 됩니다. 패의 방향은 백에게 180° 회전합니다. ':''}{game!=='erosion'?'차례와 배치(유산은 패 포함)가 세 번 반복되거나 160수가 지나면 무승부입니다.':'출발 칸만 사라집니다. 지나간 칸과 도착 칸은 남습니다.'} 게임을 바꾸어도 현재 판은 유지됩니다. 새로고침하면 초기화됩니다.</p></details>
        </section>
        <section className="move-log"><h2>기보</h2>{history.length===1?<p className="log-empty">아직 놓인 수가 없습니다.</p>:history.slice(Math.max(1,history.length-5)).map(s=><p key={s.ply}><small>{String(s.ply).padStart(2,'0')}</small>{describeMove(history[s.ply-1],s.last!)}</p>)}</section>
      </aside>
    </section>
    <footer><span>한 수 · 실험판</span><span>방향키로 이동 · Enter로 착수</span></footer>
  </main>;
}
