import {createGame,applyMove,chooseMove,seeded,key} from '../lib/games.ts';
import {writeFileSync} from 'node:fs';
const results=[];
for(let a=0;a<3;a++)for(let b=a+1;b<4;b++)for(let c=b+1;c<5;c++){
  const hand=[a,b,c],r={hand,black:0,white:0,draw:0,plies:[] as number[]};
  for(let seed=1;seed<=12;seed++){
    let s=createGame('legacy');s.hands=[hand,[0,1,2,3,4].filter(i=>!hand.includes(i))];s.positions={[key(s)]:1};const rng=seeded(seed*97);
    while(s.winner===null)s=applyMove(s,chooseMove(s,'normal',rng)!);
    if(s.winner===1)r.black++;else if(s.winner===2)r.white++;else r.draw++;r.plies.push(s.ply);
  }
  results.push(r);console.log(JSON.stringify(r));
}
writeFileSync('docs/opening-experiment.json',JSON.stringify(results,null,2));
