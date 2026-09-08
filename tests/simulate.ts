import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createGame,applyMove,legalMoves,chooseMove,seeded,type Game,type State} from '../lib/games.ts';
const results=[];
const games:Game[]=process.argv[2]? [process.argv[2] as Game]:['ripple','erosion','legacy'];
for(const game of games)for(const matchup of ['random-random','normal-normal','normal-easy','easy-normal']){
  const count=matchup==='random-random'?60:20,entry={game,matchup,games:count,black:0,white:0,draws:0,averagePlies:0,minPlies:999,maxPlies:0,maxMoveMs:0,reasons:{} as Record<string,number>,sample:[] as unknown[]};
  for(let seed=1;seed<=count;seed++){
    let state=createGame(game);const rng=seeded(seed*179+41),sample=[];
    while(state.winner===null){
      const started=performance.now(),moves=legalMoves(state);
      const mode=matchup.split('-')[state.turn-1];
      const m=mode==='random'?moves[Math.floor(rng()*moves.length)]:chooseMove(state,mode as 'normal'|'easy',rng)!;
      entry.maxMoveMs=Math.max(entry.maxMoveMs,performance.now()-started);
      state=applyMove(state,m);if(seed===1)sample.push({ply:state.ply,move:m,board:state.board});
    }
    if(state.winner===1)entry.black++;else if(state.winner===2)entry.white++;else entry.draws++;
    entry.averagePlies+=state.ply;entry.minPlies=Math.min(entry.minPlies,state.ply);entry.maxPlies=Math.max(entry.maxPlies,state.ply);
    entry.reasons[state.reason]=(entry.reasons[state.reason]??0)+1;
    if(seed===1)entry.sample=sample;
  }
  entry.averagePlies=Math.round(entry.averagePlies/count*10)/10;entry.maxMoveMs=Math.round(entry.maxMoveMs);results.push(entry);
  console.log(JSON.stringify({...entry,sample:undefined}));
}
mkdirSync('docs',{recursive:true});
const retained=process.argv[2]?JSON.parse(readFileSync('docs/simulation.json','utf8')).results.filter((r:{game:Game})=>!games.includes(r.game)):[];
writeFileSync('docs/simulation.json',JSON.stringify({seedRule:'seed * 179 + 41',version:'0.1',results:[...retained,...results]},null,2));
