import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist/client');
const basePath=(process.env.NEXT_PUBLIC_BASE_PATH||'').replace(/\/$/,'');
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(basePath&&url.pathname===basePath){res.writeHead(301,{Location:basePath+'/'}).end();return;}
    if(basePath&&!url.pathname.startsWith(basePath+'/')){res.writeHead(404).end('Not found');return;}
    const pathname=url.pathname.slice(basePath.length);
    const name=decodeURIComponent(pathname.endsWith('/')?pathname+'index.html':pathname);
    const path=resolve(root,'.'+name);
    if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    if((await stat(path)).isDirectory()){res.writeHead(301,{Location:url.pathname+'/'}).end();return;}
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml','.woff2':'font/woff2','.json':'application/json'})[extname(path)]||'application/octet-stream'}).end(data);
  }catch{res.writeHead(404).end('Not found');}
}).listen(4190,'127.0.0.1',()=>console.log(`HANSU → http://127.0.0.1:4190${basePath}/`));
