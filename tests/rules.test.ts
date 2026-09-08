import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyMove,legalMoves,winningLines,chooseMove,seeded,key,CARDS,owner,type State,type Game} from '../lib/games.ts';

test('Ripple pushes all four neighbors at once, independent of owner',()=>{
  const s=createGame('ripple');s.board[17]=1;s.board[25]=2;s.board[31]=1;s.board[23]=2;
  const n=applyMove(s,{to:24});assert.equal(n.board[24],1);
  for(const i of [17,25,31,23])assert.equal(n.board[i],0);
  assert.deepEqual([n.board[10],n.board[26],n.board[38],n.board[22]],[1,2,1,2]);
  assert.equal(s.board[24],0);assert.equal(s.turn,1);
});
test('Ripple blocking prevents chain pushes; border ejects a stone',()=>{
  const s=createGame('ripple');s.board[0]=2;s.board[3]=2;s.board[4]=1;
  const n=applyMove(s,{to:2});assert.equal(n.board[3],2);assert.equal(n.board[4],1);
  const e=applyMove(s,{to:1});assert.equal(e.board[0],0);
});
test('Ripple detects horizontal, vertical and both diagonal wins',()=>{
  for(const line of [[0,1,2,3],[0,7,14,21],[0,8,16,24],[3,9,15,21]]) {
    const s=createGame('ripple');line.forEach(i=>s.board[i]=1);assert.ok(winningLines(s,1).length>=4);
  }
  const s=createGame('ripple');[5,6,7,8].forEach(i=>s.board[i]=1);assert.equal(winningLines(s,1).length,0);
});
test('Ripple evaluates victory after pushing, including opponent and simultaneous wins',()=>{
  const s=createGame('ripple');[0,1,2].forEach(i=>s.board[i]=2);s.board[10]=2;
  const n=applyMove(s,{to:17});assert.equal(n.winner,2);
  const both=createGame('ripple');[0,1,2].forEach(i=>both.board[i]=2);both.board[10]=2;
  [21,22,23].forEach(i=>both.board[i]=1);both.board[18]=1;
  const d=applyMove(both,{to:17});
  // Separate known two-line state tests simultaneous terminal adjudication.
  const two=createGame('ripple');[0,1,2,3].forEach(i=>two.board[i]=1);[42,43,44,45].forEach(i=>two.board[i]=2);
  assert.equal(applyMove(two,{to:24}).winner,'draw');
  assert.equal(d.winner,2);
});
test('Erosion starts with rotational symmetry and cannot jump pieces or holes',()=>{
  const s=createGame('erosion');assert.equal(s.board.filter(v=>v===1).length,3);
  s.board.forEach((v,i)=>{if(v>0)assert.equal(s.board[35-i],3-v)});
  s.board[29]=-1;const m=legalMoves(s).filter(m=>m.from===35);
  assert.ok(!m.some(m=>m.to===29||m.to===23));
  assert.ok(!m.some(m=>m.to===32));
});
test('Erosion removes only the origin and preserves every playing piece',()=>{
  const s=createGame('erosion'),n=applyMove(s,{from:35,to:17});
  assert.equal(n.board[35],-1);assert.equal(n.board[29],0);assert.equal(n.board[23],0);assert.equal(n.board[17],1);
  assert.equal(n.board.filter(v=>v>0).length,6);
});
test('Erosion loses when the next player has no move',()=>{
  const s=createGame('erosion');s.board.fill(-1);s.board[0]=2;s.board[35]=1;s.board[34]=0;
  assert.equal(applyMove(s,{from:35,to:34}).winner,1);
});
test('Legacy transfers the selected card directly and always offers three per active turn',()=>{
  let s=createGame('legacy');const random=seeded(91);
  for(let i=0;i<45&&s.winner===null;i++){
    assert.equal(s.hands[s.turn-1].length,3);assert.equal(new Set(s.hands.flat()).size,5);
    const moves=legalMoves(s),move=moves[Math.floor(random()*moves.length)],p=s.turn;
    s=applyMove(s,move);assert.ok(!s.hands[p-1].includes(move.card!));assert.ok(s.hands[s.turn-1].includes(move.card!));
  }
});
test('Legacy rotates directions for white and leap jumps intervening pieces',()=>{
  const s=createGame('legacy');const jump=legalMoves(s).find(m=>m.from===22&&m.to===12&&m.card===2);
  assert.ok(jump);s.board[17]=1;assert.ok(legalMoves(s).some(m=>m.from===22&&m.to===12&&m.card===2));
  s.turn=2;s.hands=[[3,4],[0,1,2]];assert.ok(legalMoves(s).some(m=>m.from===2&&m.to===12&&m.card===2));
  assert.ok(!legalMoves(s).some(m=>m.from===2&&m.to===1));
});
test('Legacy captures the core, cannot capture friendly pieces',()=>{
  const s=createGame('legacy');s.hands=[[0,2,3],[1,4]];s.board.fill(0);s.board[12]=3;s.board[7]=4;
  assert.equal(applyMove(s,{from:12,to:7,card:0}).winner,1);
  s.board[7]=1;assert.throws(()=>applyMove(s,{from:12,to:7,card:0}));
});
test('Repetition includes turn and hands, and triggers only on third occurrence',()=>{
  const s=createGame('legacy'),move=legalMoves(s)[0],next=applyMove(s,move);
  s.positions[key(next)]=2;assert.equal(applyMove(s,move).winner,'draw');
  const turn={...s,turn:2 as const};assert.notEqual(key(s),key(turn));
  const cards={...s,hands:[[0,1,3],[2,4]]};assert.notEqual(key(s),key(cards));
});
test('Ply cap is explicit and cannot override a win',()=>{
  const s=createGame('ripple');s.ply=159;assert.equal(applyMove(s,{to:24}).winner,'draw');
  [0,1,2,3].forEach(i=>s.board[i]=1);assert.equal(applyMove(s,{to:24}).winner,1);
});
test('Invalid moves and terminal moves reject without mutation',()=>{
  for(const game of ['ripple','erosion','legacy'] as Game[]){
    const s=createGame(game),before=JSON.stringify(s);assert.throws(()=>applyMove(s,{to:-1}));assert.equal(JSON.stringify(s),before);
    s.winner=1;assert.equal(legalMoves(s).length,0);assert.equal(chooseMove(s),null);assert.throws(()=>applyMove(s,{to:0}));
  }
});
test('AI takes immediate king capture and always returns legal moves',()=>{
  const s=createGame('legacy');s.hands=[[0,2,3],[1,4]];s.board.fill(0);s.board[12]=3;s.board[7]=4;
  const move=chooseMove(s,'normal',seeded(4));assert.ok(move);assert.equal(applyMove(s,move).winner,1);
});
test('Random state invariants across 150 complete matches',()=>{
  let completed=0;
  for(const game of ['ripple','erosion','legacy'] as Game[])for(let seed=1;seed<=50;seed++) {
    let s=createGame(game);const random=seeded(seed);
    while(s.winner===null){
      const choices=legalMoves(s);assert.ok(choices.length>0);const old=JSON.stringify(s);const move=choices[Math.floor(random()*choices.length)];const n=applyMove(s,move);
      assert.equal(JSON.stringify(s),old);assert.equal(n.ply,s.ply+1);assert.equal(n.turn,3-s.turn);assert.equal(n.board.length,n.size*n.size);
      if(game==='erosion'){assert.equal(n.board.filter(v=>v===-1).length,n.ply);assert.equal(n.board.filter(v=>v>0).length,6);}
      if(game==='legacy'){assert.equal(n.hands.flat().length,5);assert.equal(new Set(n.hands.flat()).size,5);assert.equal(n.hands[n.turn-1].length,3);}
      assert.ok(n.board.every(v=>Number.isInteger(v)&&v>=-1&&v<=4));s=n;
    }
    assert.ok(s.ply<=160);completed++;
  }
  assert.equal(completed,150);
});
