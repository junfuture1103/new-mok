export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
// The public Pages site is canonical, including for preview builds.
export const siteUrl = 'https://junfuture1103.github.io/new-mok/';
export const absoluteUrl = (path = '') => new URL(path, siteUrl).href;
