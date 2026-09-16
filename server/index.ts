import { roomApi } from './rooms';
export default {
  async fetch(request: Request, env: { DB: D1Database; ASSETS: Fetcher }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return roomApi(request, env);
    // GitHub Pages remains the public game address. This origin serves its API
    // and also contains a complete static copy for a self-contained deployment.
    return env.ASSETS.fetch(request);
  },
};
