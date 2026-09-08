import {createGame,applyMove,chooseMove,seeded,key} from '../lib/games.ts';
import {writeFileSync} from 'node:fs';
const results=[];
for(const hand of [[0,2,3],[1,2,4],[2,3,4],[0,1,4]]){
  const r={hand,black:0,white:0,draw:0,averagePlies:0};
  for(let seed=1001;seed<=1100;seed++){
    let s=createGame('legacy');s.hands=[hand,[0,1,2,3,4].filter(i=>!hand.includes(i))];s.positions={[key(s)]:1};const rng=seeded(seed*233);
    while(s.winner===null)s=applyMove(s,chooseMove(s,'normal',rng)!);
    if(s.winner===1)r.black++;else if(s.winner===2)r.white++;else r.draw++;r.averagePlies+=s.ply;
  }
  r.averagePlies/=100;results.push(r);console.log(JSON.stringify(r));
}
writeFileSync('docs/opening-validation.json',JSON.stringify({seedRange:[1001,1100],multiplier:233,results},null,2));
