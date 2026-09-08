import { test, expect } from '@playwright/test';

const canonicalBase = 'https://junfuture1103.github.io/new-mok/';
const routes = ['', 'rules/ripple.html', 'rules/erosion.html', 'rules/legacy.html'];

test('Every indexable page has readable HTML, unique metadata and valid structured data without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const titles = new Set<string>();
  for (const route of routes) {
    const response = await page.goto(new URL(route, baseURL!).href);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    expect((await page.locator('main').innerText()).length).toBeGreaterThan(650);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalBase + route);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /보드게임/);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonicalBase + route);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', canonicalBase + 'og/hansu.png');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('index');
    expect(robots).not.toContain('noindex');
    titles.add(await page.title());
    const data = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@graph'].length).toBeGreaterThanOrEqual(2);
    for (const href of await page.locator('a[href]').evaluateAll(links => links.map(a => (a as HTMLAnchorElement).href))) {
      expect(new URL(href).pathname).toContain(new URL(baseURL!).pathname);
      expect((await page.request.get(href)).status()).toBe(200);
    }
  }
  expect(titles.size).toBe(4);
  await context.close();
});

test('Sitemap lists exactly the four canonical pages and the share image is a 1200 by 630 PNG', async ({ request, baseURL }) => {
  const response = await request.get(new URL('sitemap.xml', baseURL!).href);
  expect(response.status()).toBe(200);
  const urls = [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  expect(urls).toEqual(routes.map(route => canonicalBase + route));
  const image = await request.get(new URL('og/hansu.png', baseURL!).href);
  expect(image.status()).toBe(200);
  const png = await image.body();
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test('Rule page links open the matching game and remain readable on mobile', async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, name] of [['ripple', '파문'], ['erosion', '침식'], ['legacy', '유산']]) {
    await page.goto(new URL(`rules/${id}.html`, baseURL!).href);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: `${name} 바로 두기` }).click();
    await expect(page.locator('main.studio')).toHaveAttribute('data-game', id);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await page.getByRole('button', { name: '힌트', exact: true }).click();
    await expect(page.locator('.cell.hinted').first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});
