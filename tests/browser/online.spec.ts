import { test, expect, type Page, type Browser } from '@playwright/test';
import { applyMove, chooseMove, createGame, CARDS, type Game, type Move } from '../../lib/games';

test.skip(!process.env.NEXT_PUBLIC_ROOM_API?.startsWith('http://127.0.0.1:4191'), 'Use the local rooms API when running automated browser matches.');
async function open(browser: Browser, baseURL: string, mobile = false) {
  const context = await browser.newContext({ baseURL, ...(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {}) });
  return { context, page: await context.newPage() };
}
async function create(page: Page, game: Game = 'ripple') {
  await page.goto('online.html'); await page.getByLabel('내 닉네임', { exact: true }).fill('돌고래');
  await page.getByLabel('함께 둘 게임').selectOption(game); await page.getByRole('button', { name: '방 만들기', exact: true }).click();
  await expect(page.getByTestId('online-status')).toContainText('기다리고');
  return await page.getByLabel('초대 링크', { exact: true }).inputValue();
}
async function join(page: Page, link: string, nickname = '바다') {
  await page.goto(link); await page.getByLabel('내 닉네임', { exact: true }).fill(nickname);
  await page.getByRole('button', { name: '방 입장하기', exact: true }).click();
  await expect(page.getByTestId('online-status')).toBeVisible();
}
async function move(page: Page, move: Move) {
  if (move.card !== undefined) await page.getByRole('button', { name: `${CARDS[move.card].name} 패`, exact: true }).click();
  if (move.from !== undefined) await page.locator(`[data-cell="${move.from}"]`).click();
  await page.locator(`[data-cell="${move.to}"]`).click();
}
const ply = (n: number) => `${String(n).padStart(2, '0')}수`;

for (const game of ['ripple', 'erosion', 'legacy'] as Game[]) {
  test(`${game}: two independent browsers complete a server-synchronized match`, async ({ browser, baseURL }) => {
    test.setTimeout(300000);
    const a = await open(browser, baseURL!), b = await open(browser, baseURL!);
    const errors: string[] = []; for (const page of [a.page, b.page]) page.on('pageerror', e => errors.push(e.message));
    try {
      const link = await create(a.page, game); await join(b.page, link);
      await expect(a.page.getByTestId('online-status')).toHaveText('내 차례입니다');
      let state = createGame(game), seed = 83;
      while (state.winner === null) {
        const active = state.turn === 1 ? a.page : b.page;
        await expect(active.getByTestId('online-status')).toHaveText('내 차례입니다');
        const chosen = chooseMove(state, 'normal', () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; })!;
        await move(active, chosen); state = applyMove(state, chosen);
        for (const page of [a.page, b.page]) await expect(page.getByTestId('ply')).toHaveText(ply(state.ply));
      }
      for (const page of [a.page, b.page]) {
        await expect(page.getByTestId('result')).toBeVisible();
        expect(await page.locator('[data-cell]').evaluateAll(cells => cells.map(c => Number(c.getAttribute('data-piece'))))).toEqual(state.board);
      }
      expect(errors).toEqual([]);
    } finally { await a.context.close(); await b.context.close(); }
  });
}
test('Invite and code entry, refresh, full-room rejection, reconnect and mutual color-swapping rematch', async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  const a = await open(browser, baseURL!), b = await open(browser, baseURL!), c = await open(browser, baseURL!);
  try {
    const link = await create(a.page); await join(b.page, link);
    await expect(a.page.getByTestId('online-status')).toHaveText('내 차례입니다');
    await move(a.page, { to: 24 }); await expect(b.page.getByTestId('ply')).toHaveText(ply(1));
    await a.page.reload(); await expect(a.page.getByTestId('ply')).toHaveText(ply(1));
    await expect(a.page.locator('.game-heading')).toContainText('돌고래 님은 흑');
    await c.page.goto('online.html'); await c.page.getByLabel('내 닉네임', { exact: true }).fill('세번째');
    await c.page.getByLabel('방 코드', { exact: true }).fill(new URL(link).searchParams.get('room')!);
    await c.page.getByRole('button', { name: '방 입장하기' }).click(); await expect(c.page.getByRole('alert')).toContainText('두 명이 이미');
    await b.context.setOffline(true); await expect(b.page.getByTestId('online-status')).toContainText('연결 확인 중', { timeout: 15000 });
    await b.context.setOffline(false); await expect(b.page.getByTestId('online-status')).toHaveText('내 차례입니다', { timeout: 15000 });
    await move(b.page, { to: 8 }); await expect(a.page.getByTestId('ply')).toHaveText(ply(2));
    await b.page.getByRole('button', { name: '기권', exact: true }).click(); await b.page.getByRole('button', { name: '기권하기', exact: true }).click();
    await expect(a.page.getByTestId('result')).toContainText('이겼습니다');
    await a.page.getByRole('button', { name: '흑백 바꿔 다시 두기' }).click();
    await expect(a.page.getByTestId('ply')).toHaveText(ply(2));
    await b.page.getByRole('button', { name: '흑백 바꿔 다시 두기' }).click();
    await expect(a.page.locator('.game-heading')).toContainText('돌고래 님은 백');
    await expect(b.page.locator('.game-heading')).toContainText('바다 님은 흑');
    await expect(b.page.getByTestId('ply')).toHaveText(ply(0));
    await move(b.page, { to: 24 }); await expect(a.page.getByTestId('ply')).toHaveText(ply(1));
    await a.page.getByRole('button', { name: '방 나가기' }).click(); await a.page.getByRole('button', { name: '나가기', exact: true }).click();
    await expect(a.page.getByRole('button', { name: '방 만들기', exact: true })).toBeVisible();
    await expect(b.page.getByTestId('online-status')).toHaveText('닫힌 방');
    await expect(b.page.getByTestId('result')).toContainText('이겼습니다');
  } finally { await a.context.close(); await b.context.close(); await c.context.close(); }
});
test('Touch uses one tap; opponent cannot move; desktop real pointer presses do not disappear', async ({ browser, baseURL }) => {
  const a = await open(browser, baseURL!, true), b = await open(browser, baseURL!);
  try {
    const link = await create(a.page); await join(b.page, link);
    await expect(a.page.getByTestId('online-status')).toHaveText('내 차례입니다');
    const blocked = (await b.page.locator('[data-cell="8"]').boundingBox())!;
    await b.page.mouse.click(blocked.x + blocked.width / 2, blocked.y + blocked.height / 2); await expect(b.page.getByTestId('ply')).toHaveText(ply(0));
    await a.page.locator('[data-cell="24"]').tap(); await expect(b.page.getByTestId('ply')).toHaveText(ply(1));
    const box = (await b.page.locator('[data-cell="8"]').boundingBox())!;
    await b.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await b.page.mouse.down(); await b.page.mouse.up();
    await expect(a.page.getByTestId('ply')).toHaveText(ply(2));
    await a.page.locator('[data-cell="15"]').tap(); await expect(b.page.getByTestId('ply')).toHaveText(ply(3));
    await expect(a.page.locator('.cell.preview')).toHaveCount(0);
    for (const width of [320, 390, 768]) { await a.page.setViewportSize({ width, height: 844 }); expect(await a.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
    await a.page.setViewportSize({ width: 390, height: 844 });
    await a.page.screenshot({ path: 'outputs/online-mobile.png', fullPage: true });
    await b.page.screenshot({ path: 'outputs/online-desktop.png', fullPage: true });
  } finally { await a.context.close(); await b.context.close(); }
});
test('Entry validation, unknown rooms and server failure preserve input and allow recovery', async ({ page }) => {
  await page.goto('online.html'); await expect(page.getByRole('button', { name: '방 만들기', exact: true })).toBeDisabled();
  await page.getByLabel('내 닉네임', { exact: true }).fill('입력유지'); await page.getByLabel('방 코드', { exact: true }).fill('ABCDEABCDE');
  await page.getByRole('button', { name: '방 입장하기' }).click(); await expect(page.getByRole('alert')).toContainText('찾을 수 없어요');
  await page.route('**/api/rooms', route => route.abort());
  await page.getByRole('button', { name: '방 만들기', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('연결이 불안정');
  await expect(page.getByLabel('내 닉네임', { exact: true })).toHaveValue('입력유지');
  await page.unroute('**/api/rooms'); await page.getByRole('button', { name: '방 만들기', exact: true }).click();
  await expect(page.getByTestId('online-status')).toContainText('기다리고');
  await page.reload(); await expect(page.getByTestId('online-status')).toContainText('기다리고');
});
