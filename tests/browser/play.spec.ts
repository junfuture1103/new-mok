import {test,expect,type Page} from '@playwright/test';
const cell=(page:Page,i:number)=>page.locator(`[data-cell="${i}"]`);
test.beforeEach(async({page})=>{await page.goto('/');await page.getByRole('tab',{name:'둘이 두기',exact:true}).click();});
test('Ripple pushes and undo restores the board; invalid occupied move does nothing',async({page})=>{
  await cell(page,24).click();await cell(page,24).click();await expect(page.getByTestId('ply')).toContainText('01수');
  await cell(page,23).click();await expect(cell(page,25)).toHaveAttribute('data-piece','1');
  await expect(cell(page,24)).toHaveAttribute('data-piece','0');
  await page.getByRole('button',{name:'무르기',exact:true}).click();await expect(cell(page,24)).toHaveAttribute('data-piece','1');
  await page.getByRole('tab',{name:/침식/}).click();await page.getByRole('tab',{name:/파문/}).click();await expect(page.getByTestId('ply')).toContainText('01수');
});
test('Erosion highlights legal paths and removes only the departure',async({page})=>{
  await page.getByRole('tab',{name:/침식/}).click();await cell(page,35).click();
  await expect(cell(page,17)).toHaveClass(/available/);await cell(page,17).click();
  await expect(cell(page,35)).toHaveAttribute('data-piece','-1');await expect(cell(page,29)).toHaveAttribute('data-piece','0');await expect(cell(page,17)).toHaveAttribute('data-piece','1');
});
test('Legacy jumps and transfers exactly the used card to white',async({page})=>{
  await page.getByRole('tab',{name:/유산/}).click();await page.getByRole('button',{name:'도약 패',exact:true}).click();await cell(page,22).click();await cell(page,12).click();
  await expect(cell(page,12)).toHaveAttribute('data-piece','3');await expect(page.locator('.cards .move-card')).toHaveCount(3);
  await expect(page.getByRole('button',{name:'도약 패',exact:true})).toBeVisible();await expect(page.getByTestId('turn-status')).toContainText('백의 차례');
});
test('AI replies, undo rewinds a pair, reset cancels a pending reply',async({page})=>{
  await page.getByRole('tab',{name:'AI와 두기',exact:true}).click();await cell(page,24).click();await expect(page.getByTestId('ply')).toContainText('02수');
  await page.getByRole('button',{name:'무르기',exact:true}).click();await expect(page.getByTestId('ply')).toContainText('00수');
  await cell(page,24).click();await page.getByRole('button',{name:'새 대국',exact:true}).click();await page.waitForTimeout(600);await expect(page.getByTestId('ply')).toContainText('00수');
});
for(const [label,game] of [['파문','ripple'],['침식','erosion'],['유산','legacy']])test(`${label} complete UI match, terminal lock, and replay`,async({page})=>{
  await page.getByRole('tab',{name:new RegExp(label)}).click();let plies=0;
  while(await page.getByTestId('result').count()===0&&plies<160){
    await page.getByRole('button',{name:'힌트',exact:true}).click();
    const target=page.locator(game==='ripple'?'.cell.hinted':'.cell.hinted.available');await expect(target).toHaveCount(1);await target.click();plies++;
  }
  await expect(page.getByTestId('result')).toBeVisible();await expect(page.getByRole('button',{name:'힌트',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'한 판 더'}).click();await expect(page.getByTestId('ply')).toContainText('00수');
});
test('Mobile has no overflow, and keyboard operates the board',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const label of ['파문','침식','유산']){
    await page.getByRole('tab',{name:new RegExp(label)}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  }
  await page.getByRole('tab',{name:/파문/}).click();await cell(page,24).focus();await page.keyboard.press('ArrowRight');await expect(cell(page,25)).toBeFocused();await page.keyboard.press('Enter');await expect(cell(page,25)).toHaveAttribute('data-piece','1');
});
test('No browser errors during game changes',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const label of ['파문','침식','유산']){await page.getByRole('tab',{name:new RegExp(label)}).click();await page.getByRole('button',{name:'힌트',exact:true}).click();}
  expect(errors).toEqual([]);
});
