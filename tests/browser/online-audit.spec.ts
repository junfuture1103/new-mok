import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.skip(!process.env.NEXT_PUBLIC_ROOM_API?.startsWith('http://127.0.0.1:4191'), 'Local adversarial/recovery tests only.');
async function create(page: Page) {
  await page.goto('online.html'); await page.getByLabel('내 닉네임', { exact: true }).fill('안전검사');
  await page.getByRole('button', { name: '방 만들기', exact: true }).click(); await expect(page.getByTestId('online-status')).toContainText('기다리고');
}
async function guest(context: BrowserContext, host: Page) {
  const page = await context.newPage(); await page.goto(await host.getByLabel('초대 링크', { exact: true }).inputValue());
  await page.getByLabel('내 닉네임', { exact: true }).fill('다른기기'); await page.getByRole('button', { name: '방 입장하기', exact: true }).click();
  await expect(host.getByTestId('online-status')).toHaveText('내 차례입니다'); return page;
}
test('Preference-storage failure cannot hide a valid tab credential during reload', async ({ page }) => {
  await create(page);
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } }); });
  await page.reload(); await expect(page.getByTestId('online-status')).toContainText('기다리고');
  await expect(page.locator('.game-heading')).toContainText('안전검사 님은 흑');
});
test('Offline lobby escape preserves the seat and expired rooms offer a clear exit', async ({ page, context }) => {
  await create(page); await context.setOffline(true);
  await expect(page.getByTestId('online-status')).toContainText('연결 확인 중', { timeout: 2000 });
  await page.getByRole('button', { name: '방 나가기', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '대기실로 돌아가기', exact: true }).click();
  await expect(page.getByRole('button', { name: '이전 방 이어두기' })).toBeVisible();
  await context.setOffline(false); await page.getByRole('button', { name: '이전 방 이어두기' }).click();
  await expect(page.getByTestId('online-status')).toContainText('기다리고');
  await page.route('**/api/rooms/*', route => route.fulfill({ status: 410, contentType: 'application/json', body: '{"error":"유효기간이 지난 방이에요."}' }));
  await expect(page.getByTestId('online-status')).toHaveText('이 방에 더 이상 연결할 수 없어요');
  await page.getByRole('button', { name: '대기실로 돌아가기', exact: true }).click();
  await expect(page.getByRole('button', { name: '방 만들기', exact: true })).toBeVisible();
});
test('A lost join response and edited nickname do not orphan the assigned seat', async ({ page, browser, baseURL }) => {
  await create(page); const other = await browser.newContext({ baseURL }); const g = await other.newPage();
  try {
    await g.goto(await page.getByLabel('초대 링크', { exact: true }).inputValue());
    await g.getByLabel('내 닉네임', { exact: true }).fill('처음이름');
    await g.route('**/join', async route => { await route.fetch(); await route.abort(); });
    await g.getByRole('button', { name: '방 입장하기', exact: true }).click(); await expect(g.getByRole('alert')).toContainText('연결이 불안정');
    await g.unroute('**/join'); await g.getByLabel('내 닉네임', { exact: true }).fill('다른이름');
    await g.getByRole('button', { name: '방 입장하기', exact: true }).click();
    await expect(g.locator('.game-heading')).toContainText('처음이름 님은 백');
  } finally { await other.close(); }
});
test('Leave confirmation traps focus, supports Escape, and survives an opponent move', async ({ page, browser, baseURL }) => {
  await create(page); const other = await browser.newContext({ baseURL });
  try {
    const g = await guest(other, page);
    await g.getByRole('button', { name: '방 나가기' }).click();
    await expect(g.getByRole('button', { name: '계속 머물기' })).toBeFocused();
    await g.keyboard.press('Tab'); await expect(g.getByRole('dialog')).toBeVisible();
    expect(await g.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
    await expect(g.getByRole('button', { name: '나가기', exact: true })).toBeFocused();
    await g.keyboard.press('Shift+Tab'); await expect(g.getByRole('button', { name: '계속 머물기' })).toBeFocused();
    await g.keyboard.press('Escape'); await expect(g.getByRole('dialog')).not.toBeVisible();
    await g.getByRole('button', { name: '방 나가기' }).click();
    await page.locator('[data-cell="24"]').click(); await expect(page.getByTestId('ply')).toHaveText('01수');
    await g.getByRole('button', { name: '나가기', exact: true }).click(); await expect(g.getByRole('button', { name: '방 만들기', exact: true })).toBeVisible();
    await expect(page.getByTestId('online-status')).toHaveText('닫힌 방');
  } finally { await other.close(); }
});
test('Built CSP blocks injected scripts while normal games and keyboard controls work', async ({ page }) => {
  await page.goto('online.html?game=__proto__'); await expect(page.getByLabel('함께 둘 게임')).toHaveValue('ripple');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /sha256-/);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
  await page.evaluate(() => {
    const script = document.createElement('script'); script.textContent = 'window.__unexpectedScript = true'; document.head.appendChild(script);
  });
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__unexpectedScript)).toBeUndefined();
  await page.getByLabel('내 닉네임', { exact: true }).fill('키보드'); await page.getByLabel('내 닉네임', { exact: true }).press('Enter');
  await expect(page.getByTestId('online-status')).toContainText('기다리고');
  await page.locator('[data-cell="6"]').focus(); await page.keyboard.press('ArrowRight'); await expect(page.locator('[data-cell="6"]')).toBeFocused();
});
test('Lobby, mobile room and confirmation meet automated WCAG 2.2 AA checks', async ({ page, browserName }) => {
  const findings: unknown[] = [];
  await page.goto('online.html');
  for (const stage of ['lobby', 'room', 'dialog', 'home']) {
    if (stage === 'room') { await create(page); await page.setViewportSize({ width: 390, height: 844 }); }
    if (stage === 'dialog') await page.getByRole('button', { name: '방 나가기' }).click();
    if (stage === 'home') await page.goto('./');
    await page.screenshot({ path: `outputs/audit-${browserName}-${stage}.png`, fullPage: true });
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    findings.push(...result.violations.map(v => ({ stage, id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
  }
  expect(findings).toEqual([]);
});
