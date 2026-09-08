import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist/client');
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    const path=resolve(root,'.'+name);
    if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[extname(path)]||'application/octet-stream'}).end(data);
  }catch{res.writeHead(404).end('Not found');}
}).listen(4190,'127.0.0.1',()=>console.log('HANSU → http://127.0.0.1:4190/'));
