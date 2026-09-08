// A code-drawn cover using the game's own boards, colors and bundled font.
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const font = (await readFile('public/fonts/PretendardVariable.woff2')).toString('base64');
const boards = [
  {name:'파문',n:7,color:'#d5bb8a',black:[16,23,24,31],white:[17,25,32],voids:[]},
  {name:'침식',n:6,color:'#929891',black:[19,27,35],white:[0,8,16],voids:[2,4,10,21,25,29,31]},
  {name:'유산',n:5,color:'#be9478',black:[15,20,17,23,24],white:[0,1,7,3,9],voids:[]},
];
const boardHtml = boards.map(b=>`<section><div class="board" style="--n:${b.n};background:${b.color}">${Array.from({length:b.n*b.n},(_,i)=>`<div class="cell ${b.voids.includes(i)?'void':''}">${b.black.includes(i)?'<i></i>':b.white.includes(i)?'<i class="white"></i>':''}</div>`).join('')}</div><h2>${b.name}<small>${b.n} × ${b.n}</small></h2></section>`).join('');
const browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
try {
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.setContent(`<!doctype html><html lang="ko"><head><style>
  @font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:45 920}
  *{box-sizing:border-box}body{margin:0;background:#f6f4ee;color:#292620;font-family:Pretendard,sans-serif;padding:40px 64px}
  header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #373029;padding-bottom:20px}h1{font-size:58px;letter-spacing:-4px;margin:0;line-height:1}header p{font-size:22px;margin:0}main{display:flex;gap:58px;margin:31px 0 23px}section{width:319px}.board{height:300px;width:300px;display:grid;grid-template-columns:repeat(var(--n),1fr);padding:14px;border:1px solid #8a72524d;box-shadow:0 3px 0 #3028211a}.cell{border-right:1px solid #493b2940;border-bottom:1px solid #493b2940;display:grid;place-items:center}.cell i{width:76%;aspect-ratio:1;background:#292620;border-radius:50%;box-shadow:1px 2px 2px #0003}.cell i.white{background:#faf8f0;box-shadow:inset 0 0 0 1px #b6ad9e,1px 2px 2px #0003}.cell.void{background:#f6f4ee;border-color:#f6f4ee}h2{font-size:24px;font-weight:600;margin:16px 0 0;display:flex;justify-content:space-between;width:300px;align-items:center}small{font-size:14px;font-weight:400;color:#777267}footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #d8d3c7;padding-top:20px;font-size:17px;color:#6c655a}footer b{color:#993f2e;font-weight:500}
  </style></head><body><header><h1>한 수</h1><p>세 가지 추상전략 보드게임</p></header><main>${boardHtml}</main><footer><span>설치 없이 무료로 · AI와 두기 · 둘이 두기</span><b>파문 · 침식 · 유산</b></footer></body></html>`);
  await page.evaluate(()=>document.fonts.ready);
  await mkdir('public/og',{recursive:true});
  await page.screenshot({path:'public/og/hansu.png'});
  console.log('Created public/og/hansu.png (1200 × 630)');
} finally {await browser.close();}
