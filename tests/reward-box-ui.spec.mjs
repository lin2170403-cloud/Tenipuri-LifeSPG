import {test,expect} from '@playwright/test';
async function openApp(page){
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.goto('/reward-box/index.html');
 await expect(page.locator('#cp-home')).not.toBeEmpty();
}
test('points are visible beneath the canonical character screen and switch tabs',async({page})=>{
 await openApp(page);
 const panel=page.locator('#canonical-point-history');
 await expect(panel).toBeVisible();
 await expect(panel.getByText('育成ポイント履歴')).toBeVisible();
 await panel.locator('[data-point-view="spent"]').click();
 await expect(panel.locator('[data-point-view="spent"]')).toHaveAttribute('aria-pressed','true');
});
test('new earned points appear without refreshing the page',async({page})=>{
 await openApp(page);
 await page.evaluate(()=>{
  const date='2026-10-16';
  document.querySelector('#training-date').value=date;
  document.querySelector('#earn-physical').value='5';
  document.querySelector('#training-form').requestSubmit();
 });
 await expect(page.locator('#point-history-list')).toContainText('physical');
 await expect(page.locator('#point-history-list')).toContainText('+5');
});
test('crop box can be moved and saved, and portrait remains after browser refresh',async({page})=>{
 await openApp(page);
 await page.evaluate(()=>window.CharacterStamps.open('niou'));
 await expect(page.locator('#cp-settings input[data-cp-file="avatar"]')).toHaveCount(1);
 const image='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#ad82bd"/><circle cx="128" cy="110" r="72" fill="#fcddb3"/></svg>';
 await page.locator('#cp-settings input[data-cp-file="avatar"]').setInputFiles({
  name:'avatar.svg',mimeType:'image/svg+xml',buffer:Buffer.from(image)
 });
 const editor=page.locator('.hime-image-editor');
 await expect(editor).toBeVisible();
 await expect(editor.locator('.hime-crop-frame')).toBeVisible();
 const box=await editor.locator('.hime-crop-frame').boundingBox();
 expect(box).toBeTruthy();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.54,box.y+box.height*.54);
 await page.mouse.up();
 await editor.locator('[data-crop-confirm]').click();
 await expect(editor).toHaveCount(0);
 await expect(page.locator('#cp-settings .cp-avatar-circle img')).toHaveAttribute('src',/^data:image\//);
 await page.reload();
 await page.evaluate(()=>window.CharacterStamps.open('niou'));
 await expect(page.locator('#cp-settings .cp-avatar-circle img')).toHaveAttribute('src',/^data:image\//);
});


test('theme and system language update without page refresh',async({page})=>{
 await openApp(page);
 const before=await page.evaluate(()=>document.documentElement.style.getPropertyValue('--theme-accent'));
 await page.evaluate(()=>document.querySelector('[data-basic-theme="mint"]').click());
 await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.theme)).toBe('mint');
 const after=await page.evaluate(()=>document.documentElement.style.getPropertyValue('--theme-accent'));
 expect(after).not.toBe(before);
 await page.evaluate(()=>document.querySelector('[data-basic-language="CN"]').click());
 await expect.poll(()=>page.evaluate(()=>document.documentElement.lang)).toBe('zh-Hans');
 await page.evaluate(()=>document.querySelector('[data-basic-language="JP"]').click());
 await expect.poll(()=>page.evaluate(()=>document.documentElement.lang)).toBe('ja');
});
test('funds can be topped up with immediately visible transaction history',async({page})=>{
 await openApp(page);
 await page.locator('.bottom-tabs [data-tab="wallet"]').click();
 await page.locator('[data-walletview="funds"]').click();
 const cards=page.locator('#fund-grid [data-wallet-fund]');
 await expect(cards).toHaveCount(9);
 await page.locator('#fund-grid [data-wallet-fund="unallocated"]').click();
 const popup=page.locator('.wallet-up-modal');
 await expect(popup).toBeVisible();
 await popup.locator('input[name="amount"]').fill('200');
 await popup.locator('[type="submit"]').click();
 await expect(popup).toHaveCount(0);
 await expect(page.locator('#fund-grid [data-wallet-fund="unallocated"]')).toContainText('200円');
 await expect(page.locator('#fund-operation-history')).toContainText('200円');
});
