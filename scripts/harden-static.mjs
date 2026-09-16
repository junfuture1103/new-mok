import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export async function hardenStatic(directory) {
  const api = new URL(process.env.NEXT_PUBLIC_ROOM_API || 'https://abstract-trilogy-jun.hacktheworld2024.chatgpt.site');
  if (!['http:', 'https:'].includes(api.protocol)) throw Error('Room API must use HTTP(S).');
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) { await hardenStatic(path); continue; }
    if (!item.name.endsWith('.html')) continue;
    const html = (await readFile(path, 'utf8')).replace(/\r\n?/g, '\n');
    const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
      .filter(([, attrs, body]) => !/\bsrc\s*=/i.test(attrs) && body.trim())
      .map(([, , body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
    const policy = `default-src 'self'; script-src 'self' ${[...new Set(hashes)].join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${api.origin}; object-src 'none'; base-uri 'none'; form-action 'self'`;
    await writeFile(path, html.replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">`));
  }
}
