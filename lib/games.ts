export type Game = 'ripple' | 'erosion' | 'legacy';
export type Player = 1 | 2;
export type Move = { to: number; from?: number; card?: number };
export type State = {
  game: Game; size: number; board: number[]; turn: Player; ply: number;
  winner: Player | 'draw' | null; reason: string; hands: number[][];
  positions: Record<string, number>; last: Move | null; shifted: number[];
};
export const CARDS = [
  { name: '걸음', vectors: [[0,-1],[-1,0],[1,0]] },
  { name: '빗길', vectors: [[-1,-1],[1,-1],[0,1]] },
  { name: '도약', vectors: [[0,-2],[0,1]] },
  { name: '날개', vectors: [[-2,0],[2,0],[0,-1]] },
  { name: '갈고리', vectors: [[-1,-1],[1,0],[0,1]] },
];
export const ORTHO = [[0,-1],[1,0],[0,1],[-1,0]];
export const owner = (piece: number): number => piece > 0 ? (piece - 1) % 2 + 1 : 0;
export const other = (p: Player): Player => p === 1 ? 2 : 1;
export const coord = (i: number,n: number) => `${String.fromCharCode(65+i%n)}${n-Math.floor(i/n)}`;
const inside = (x: number,y: number,n: number) => x>=0 && y>=0 && x<n && y<n;
export const key = (s: State) => `${s.board.join(',')}/${s.turn}/${s.hands.map(h=>[...h].sort().join('')).join('/')}`;
export function createGame(game: Game): State {
  const size = game === 'ripple' ? 7 : game === 'erosion' ? 6 : 5;
  const s: State = { game, size, board: Array(size*size).fill(0), turn:1, ply:0, winner:null, reason:'', hands: game==='legacy'?[[2,3,4],[0,1]]:[[],[]], positions:{}, last:null, shifted:[] };
  if (game==='erosion') { for(const i of [0,2,4]) { s.board[i]=2; s.board[35-i]=1; } }
  if (game==='legacy') { for(let i=0;i<5;i++) { s.board[i]=i===2?4:2; s.board[20+i]=i===2?3:1; } }
  s.positions[key(s)] = 1;
  return s;
}
export function legalMoves(s: State, player: Player = s.turn): Move[] {
  if(s.winner!==null) return [];
  const result: Move[] = [], n=s.size;
  if(s.game==='ripple') return s.board.flatMap((v,to)=>v===0?[{to}]:[]);
  s.board.forEach((v,from)=>{
    if(owner(v)!==player) return;
    const x=from%n,y=Math.floor(from/n);
    if(s.game==='erosion') {
      for(const [dx,dy] of ORTHO) for(let step=1;step<n;step++) {
        const nx=x+dx*step,ny=y+dy*step,to=ny*n+nx;
        if(!inside(nx,ny,n)||s.board[to]!==0) break;
        result.push({from,to});
      }
    } else {
      const direction=player===1?1:-1;
      for(const card of s.hands[player-1]) for(const [dx,dy] of CARDS[card].vectors) {
        const nx=x+dx*direction,ny=y+dy*direction,to=ny*n+nx;
        if(inside(nx,ny,n)&&owner(s.board[to])!==player) result.push({from,to,card});
      }
    }
  });
  return result;
}
export function winningLines(s: State, player: Player): number[] {
  const cells = new Set<number>(), n=s.size;
  for(let i=0;i<n*n;i++) for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,1]]) {
    const x=i%n,y=Math.floor(i/n);
    if(!inside(x+dx*3,y+dy*3,n)) continue;
    const line=Array.from({length:4},(_,k)=>(y+dy*k)*n+x+dx*k);
    if(line.every(j=>s.board[j]===player)) line.forEach(j=>cells.add(j));
  }
  return [...cells];
}
export function sameMove(a: Move,b: Move) { return a.to===b.to && a.from===b.from && a.card===b.card; }
/** Pure transition. Public callers validate; search skips duplicate move generation. */
export function applyMove(s: State, move: Move, validate=true): State {
  if(s.winner!==null) throw new Error('이미 끝난 대국입니다.');
  if(validate&&!legalMoves(s).some(m=>sameMove(m,move))) throw new Error('둘 수 없는 수입니다.');
  const n=s.size,p=s.turn,next: State={...s,board:[...s.board],hands:s.hands.map(h=>[...h]),positions:{...s.positions},turn:other(p),ply:s.ply+1,last:{...move},shifted:[]};
  if(s.game==='ripple') {
    next.board[move.to]=p;
    const x=move.to%n,y=Math.floor(move.to/n);
    // Read every neighbour and blocker from the pre-move board: pushes are simultaneous.
    for(const [dx,dy] of ORTHO) {
      const ax=x+dx,ay=y+dy,source=ay*n+ax;
      if(!inside(ax,ay,n)||s.board[source]===0) continue;
      const bx=x+2*dx,by=y+2*dy,dest=by*n+bx;
      if(!inside(bx,by,n)) { next.board[source]=0;next.shifted.push(source); }
      else if(s.board[dest]===0) { next.board[dest]=s.board[source];next.board[source]=0;next.shifted.push(source,dest); }
    }
    const black=winningLines(next,1).length>0,white=winningLines(next,2).length>0;
    if(black&&white) {next.winner='draw';next.reason='두 색이 동시에 네 돌을 연결했습니다.';}
    else if(black||white) {next.winner=black?1:2;next.reason='네 돌을 일렬로 연결했습니다.';}
    else if(!next.board.includes(0)) {next.winner='draw';next.reason='판이 가득 찼습니다.';}
  } else {
    const captured=s.board[move.to];
    next.board[move.to]=s.board[move.from!];
    next.board[move.from!]=s.game==='erosion'?-1:0;
    if(s.game==='legacy') {
      next.hands[p-1]=next.hands[p-1].filter(c=>c!==move.card);
      next.hands[other(p)-1].push(move.card!);
      if(captured>=3) {next.winner=p;next.reason='상대의 중심 말을 잡았습니다.';}
    }
    if(next.winner===null && legalMoves(next).length===0) {next.winner=p;next.reason='상대가 더는 움직일 수 없습니다.';}
  }
  const position=key(next);
  next.positions[position]=(next.positions[position]??0)+1;
  if(next.winner===null && next.positions[position]>=3) {next.winner='draw';next.reason='같은 차례·배치가 세 번 반복되었습니다.';}
  if(next.winner===null && next.ply>=160) {next.winner='draw';next.reason='160수 제한에 도달했습니다.';}
  return next;
}
export function describeMove(s: State,m: Move) {
  return `${s.turn===1?'흑':'백'} · ${m.from===undefined?'':coord(m.from,s.size)+' → '}${coord(m.to,s.size)}${m.card===undefined?'':' · '+CARDS[m.card].name}`;
}
function territory(s: State,p: Player) {
  const seen=new Set<number>(),queue:number[]=[];
  s.board.forEach((v,i)=>{if(v===p)queue.push(i)});
  for(let q=0;q<queue.length;q++) {
    const i=queue[q];
    for(const [dx,dy] of ORTHO) {
      const x=i%s.size+dx,y=Math.floor(i/s.size)+dy,j=y*s.size+x;
      if(inside(x,y,s.size)&&s.board[j]===0&&!seen.has(j)) {seen.add(j);queue.push(j);}
    }
  }
  return seen.size;
}
export function evaluate(s: State,p: Player): number {
  if(s.winner!==null) return s.winner==='draw'?0:s.winner===p?100000-s.ply:-100000+s.ply;
  let score=0;const enemy=other(p),n=s.size;
  if(s.game==='ripple') {
    for(let i=0;i<n*n;i++) for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,1]]) {
      const x=i%n,y=Math.floor(i/n);if(!inside(x+dx*3,y+dy*3,n))continue;
      let mine=0,theirs=0;
      for(let k=0;k<4;k++){const v=s.board[(y+dy*k)*n+x+dx*k];if(v===p)mine++;if(v===enemy)theirs++;}
      if(!theirs)score += [0,1,8,65,10000][mine];
      if(!mine)score -= [0,1,8,65,10000][theirs];
    }
    s.board.forEach((v,i)=>{if(v)score+=(v===p?1:-1)*(3-Math.abs(i%n-3)*.3-Math.abs(Math.floor(i/n)-3)*.3)});
  } else if(s.game==='erosion') {
    score=3*(legalMoves(s,p).length-legalMoves(s,enemy).length)+7*(territory(s,p)-territory(s,enemy));
    for(const who of [p,enemy]) {
      const movable=new Set(legalMoves(s,who).map(m=>m.from)).size;
      score+=(who===p?1:-1)*movable*6;
    }
  } else {
    s.board.forEach((v,i)=>{if(v>0)score+=(owner(v)===p?1:-1)*(v>=3?0:35)+ (v>0?(owner(v)===p?1:-1)*(4-Math.abs(i%n-2)-Math.abs(Math.floor(i/n)-2)):0)});
    score += 2*(legalMoves(s,p).length-legalMoves(s,enemy).length);
    for(const who of [p,enemy]) if(legalMoves(s,who).some(m=>s.board[m.to]>=3))score+=(who===p?1:-1)*180;
  }
  return score;
}
export function chooseMove(s: State,level:'easy'|'normal'='normal',random:()=>number=Math.random): Move | null {
  const all=legalMoves(s);if(!all.length)return null;
  const p=s.turn;
  const ranked=all.map(move=>{const state=applyMove(s,move,false);return {move,state,value:evaluate(state,p),tie:random()};}).sort((a,b)=>b.value-a.value||a.tie-b.tie);
  if(ranked[0].state.winner===p)return ranked[0].move;
  if(level==='easy')return random()<.3?all[Math.floor(random()*all.length)]:ranked[0].move;
  // All replies are considered for each candidate, including immediate tactical losses.
  let best=-Infinity,pick=ranked[0].move;
  for(const candidate of ranked.slice(0,14)) {
    let worst=candidate.value;
    if(candidate.state.winner===null) {
      worst=Infinity;
      for(const reply of legalMoves(candidate.state)) {
        const child=applyMove(candidate.state,reply,false);
        worst=Math.min(worst,evaluate(child,p));
        if(worst<best)break;
      }
    }
    const value=worst+candidate.value*.025;
    if(value>best){best=value;pick=candidate.move;}
  }
  return pick;
}
export function seeded(seed:number) { return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}; }
