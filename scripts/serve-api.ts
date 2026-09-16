import http from 'node:http';
import { mkdirSync } from 'node:fs';
import { testDatabase } from '../tests/support/sqlite.ts';
import { roomApi } from '../server/rooms.ts';
mkdirSync('work', { recursive: true });
const { db } = testDatabase('work/rooms-local.sqlite');
http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const request = new Request(`http://127.0.0.1:4191${req.url}`, { method: req.method, headers: req.headers as Record<string, string>, ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) });
  const result = await roomApi(request, { DB: db });
  res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(Buffer.from(await result.arrayBuffer()));
}).listen(4191, '127.0.0.1', () => console.log('Local rooms API → http://127.0.0.1:4191'));
