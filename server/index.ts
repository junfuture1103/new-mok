import { roomApi } from './rooms';
export default {
  async fetch(request: Request, env: { DB: D1Database; ASSETS: Fetcher }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return roomApi(request, env);
    // GitHub Pages remains the public game address. This origin serves its API
    // and also contains a complete static copy for a self-contained deployment.
    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  },
};
