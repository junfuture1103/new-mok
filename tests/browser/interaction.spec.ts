import { test, expect, type Page, type Locator } from '@playwright/test';

// Keep pointer movement and press separate: Locator.click() waits for layout
// stability and hid the disappearing preview node that ate real clicks.
async function singleClick(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
}
const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`);

test('Moving from a focused cell to a preview stone always places with one mouse press', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('tab', { name: '둘이 두기', exact: true }).click();
  for (const [turn, index] of [24, 8, 15, 22, 29, 36].entries()) {
    await singleClick(page, cell(page, index));
    await expect(page.getByTestId('ply')).toContainText(`${String(turn + 1).padStart(2, '0')}수`, { timeout: 1000 });
  }
});

test('Board arrow keys stop at left and right edges', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('main.studio')).toHaveAttribute('data-ready', 'true');
  await cell(page, 6).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cell(page, 6)).toBeFocused();
  await cell(page, 7).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(cell(page, 7)).toBeFocused();
  await page.keyboard.press('End');
  await expect(cell(page, 13)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(cell(page, 7)).toBeFocused();
  await expect(page.locator('.cell[tabindex="0"]')).toHaveCount(1);
});

test('Tabs, hint, undo, new match and difficulty work on the first click', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('main.studio')).toHaveAttribute('data-ready', 'true');
  for (const [name, id] of [['침식', 'erosion'], ['유산', 'legacy'], ['파문', 'ripple']]) {
    await singleClick(page, page.getByRole('tab', { name, exact: true }));
    await expect(page.locator('main.studio')).toHaveAttribute('data-game', id);
  }
  await singleClick(page, page.getByRole('combobox', { name: 'AI 난이도' }));
  await expect(page.getByRole('option', { name: '가볍게', exact: true })).toBeVisible();
  await singleClick(page, page.getByRole('option', { name: '가볍게', exact: true }));
  await expect(page.getByRole('combobox')).toContainText('가볍게');
  await singleClick(page, page.getByRole('tab', { name: '둘이 두기', exact: true }));
  await expect(page.getByRole('tab', { name: '둘이 두기', exact: true })).toHaveAttribute('aria-selected', 'true');
  await singleClick(page, page.getByRole('button', { name: '힌트', exact: true }));
  await expect(page.locator('.cell.hinted')).toHaveCount(1);
  await singleClick(page, page.locator('.cell.hinted'));
  await expect(page.getByTestId('ply')).toContainText('01수');
  await singleClick(page, page.getByRole('button', { name: '무르기', exact: true }));
  await expect(page.getByTestId('ply')).toContainText('00수');
  await singleClick(page, cell(page, 24));
  await singleClick(page, page.getByRole('button', { name: '새 대국', exact: true }));
  await expect(page.getByTestId('ply')).toContainText('00수');
});

test('Touch taps place, select and move once without creating hover stones', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('./');
  await page.getByRole('tab', { name: '둘이 두기', exact: true }).tap();
  for (const [turn, index] of [24, 8, 15].entries()) {
    await cell(page, index).tap();
    await expect(page.getByTestId('ply')).toContainText(`0${turn + 1}수`);
    await expect(page.locator('.cell.preview')).toHaveCount(0);
  }
  await page.getByRole('tab', { name: '침식', exact: true }).tap();
  await cell(page, 35).tap();
  await expect(cell(page, 35)).toHaveAttribute('aria-pressed', 'true');
  await cell(page, 17).tap();
  await expect(cell(page, 35)).toHaveAttribute('data-piece', '-1');
  await expect(page.getByTestId('ply')).toContainText('01수');
  await page.getByRole('tab', { name: '유산', exact: true }).tap();
  await page.getByRole('button', { name: '날개 패', exact: true }).tap();
  await expect(page.getByRole('button', { name: '날개 패', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await cell(page, 22).tap();
  await cell(page, 17).tap();
  await expect(page.getByTestId('ply')).toContainText('01수');
  await page.getByRole('button', { name: '무르기', exact: true }).tap();
  await expect(page.getByTestId('ply')).toContainText('00수');
  await page.getByRole('button', { name: '힌트', exact: true }).tap();
  await expect(page.locator('.cell.hinted.available')).toHaveCount(1);
  await page.locator('.cell.hinted.available').tap();
  await expect(page.getByTestId('ply')).toContainText('01수');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await context.close();
});

test('Reload and a rules round trip preserve all games, settings and undo', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('tab', { name: '둘이 두기', exact: true }).click();
  await cell(page, 24).click();
  await page.getByRole('tab', { name: '침식', exact: true }).click();
  await cell(page, 35).click(); await cell(page, 17).click();
  await page.getByRole('tab', { name: '유산', exact: true }).click();
  await cell(page, 22).click(); await cell(page, 12).click();
  await page.reload();
  await expect(page.locator('main.studio')).toHaveAttribute('data-game', 'legacy');
  await expect(page.getByTestId('ply')).toContainText('01수');
  await expect(page.getByRole('tab', { name: '둘이 두기', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('link', { name: '유산 규칙과 첫 수 팁 →', exact: true }).click();
  await page.getByRole('link', { name: '유산 바로 두기' }).click();
  await expect(cell(page, 12)).toHaveAttribute('data-piece', '3');
  await page.getByRole('button', { name: '무르기', exact: true }).click();
  await expect(cell(page, 22)).toHaveAttribute('data-piece', '3');
  await page.getByRole('tab', { name: '침식', exact: true }).click();
  await expect(cell(page, 35)).toHaveAttribute('data-piece', '-1');
  await page.getByRole('tab', { name: '파문', exact: true }).click();
  await expect(cell(page, 24)).toHaveAttribute('data-piece', '1');
});

test('Invalid destinations explain the next step; pending AI is canceled by undo and mode changes', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('tab', { name: '침식', exact: true }).click();
  await cell(page, 17).click();
  await expect(page.locator('#board-feedback')).toContainText('먼저 움직일 내 말을');
  await page.getByRole('tab', { name: '파문', exact: true }).click();
  await cell(page, 24).click();
  await page.getByRole('button', { name: '무르기', exact: true }).click();
  await page.waitForTimeout(600);
  await expect(page.getByTestId('ply')).toContainText('00수');
  await cell(page, 24).click();
  await page.getByRole('tab', { name: '둘이 두기', exact: true }).click();
  await page.waitForTimeout(600);
  await expect(page.getByTestId('ply')).toContainText('01수');
  await cell(page, 8).click();
  await expect(page.getByTestId('ply')).toContainText('02수');
});

test('Slow loading exposes disabled controls until the first click can be handled', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/static/chunks/*.js', async route => { await gate; await route.continue(); });
  try {
    await page.goto('./', { waitUntil: 'commit' });
    await expect(page.locator('main.studio')).toHaveAttribute('data-ready', 'false');
    await expect(cell(page, 24)).toBeDisabled();
    await expect(page.locator('#board-feedback')).toContainText('준비');
  } finally { release(); }
  await expect(page.locator('main.studio')).toHaveAttribute('data-ready', 'true');
  await singleClick(page, cell(page, 24));
  await expect(page.getByTestId('ply')).toContainText('02수');
});

test('Unavailable browser storage never prevents starting a game', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Unavailable', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Unavailable', 'SecurityError'); };
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('tab', { name: '둘이 두기', exact: true }).click();
  await singleClick(page, cell(page, 24));
  await expect(page.getByTestId('ply')).toContainText('01수');
  expect(errors).toEqual([]);
});
