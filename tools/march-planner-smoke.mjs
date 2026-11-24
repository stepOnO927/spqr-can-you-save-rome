import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
async function openGame(page,language){
 await page.addInitScript(lang=>localStorage.setItem('spqr-lang',lang),language);
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});
 await page.locator('#start-free').click();
 await page.locator('[data-army="xiii"]').click();
 await page.locator('#open-march-planner').click();
 await page.locator('#march-planner:not([hidden])').waitFor();
}
async function clickByCity(page,city){
 const box=await page.locator(`[data-city="${city}"]`).boundingBox();assert.ok(box,`city ${city} visible`);
 for(const offset of [10,22,35]){await page.mouse.click(box.x-offset,box.y+box.height/2);if(await page.locator('#march-planner [data-plan="confirm"]').isEnabled())break}
 assert.equal(await page.locator('#march-planner [data-plan="confirm"]').isEnabled(),true,'a real map click must produce a valid route');
}
try{
 const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1}),page=await context.newPage();
 await openGame(page,'en');assert.match(await page.locator('#march-planner').innerText(),/MARCH PLANNER/);
 await clickByCity(page,'ARIMINUM');
 assert.match(await page.locator('.march-report').innerText(),/MARCH ESTIMATE|Validated route/);
 assert.ok(await page.locator('.march-waypoint').count());
 await page.locator('[data-plan="priority"]').selectOption('safest');await page.locator('[data-plan="pace"]').selectOption('cautious');
 await page.locator('#zoom-in').click();
 const canvas=page.locator('.maplibregl-canvas'),rect=await canvas.boundingBox();await page.mouse.move(rect.x+rect.width*.72,rect.y+rect.height*.42);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.68,rect.y+rect.height*.42,{steps:5});await page.mouse.up();
 assert.equal(await page.locator('#march-planner [data-plan="confirm"]').isEnabled(),true,'route must survive map movement');
 await page.locator('[data-plan="undo"]').click();assert.equal(await page.locator('[data-plan="confirm"]').isDisabled(),true);
 await clickByCity(page,'ARIMINUM');await page.locator('[data-plan="confirm"]').click();
 assert.equal(await page.locator('#march-planner').isHidden(),true);assert.match(await page.locator('#command-detail').innerText(),/Army provisions|Current leg/);
 await page.locator('#advance').click();assert.match(await page.locator('#command-detail').innerText(),/Fatigue|provisions/);
 await page.locator('#save').click();await page.locator('#load').click();await page.locator('[data-army="xiii"]').click();assert.match(await page.locator('#command-detail').innerText(),/Army provisions/);
 await page.locator('#language').click();await page.locator('[data-army="xiii"]').click();await page.locator('#open-march-planner').click();assert.match(await page.locator('#march-planner').innerText(),/行军规划/);await page.locator('[data-plan="cancel"]').click();
 await context.close();

 const touchContext=await browser.newContext({viewport:{width:430,height:900},deviceScaleFactor:1,hasTouch:true,isMobile:true}),touch=await touchContext.newPage();
 await openGame(touch,'zh');assert.match(await touch.locator('#march-planner').innerText(),/行军规划/);
 await touch.locator('[data-plan="draw"]').tap();assert.equal(await touch.locator('[data-plan="draw"]').getAttribute('aria-pressed'),'true');
 await touch.locator('[data-plan="draw"]').tap();assert.equal(await touch.locator('[data-plan="draw"]').getAttribute('aria-pressed'),'false');
 await touch.locator('[data-plan="cancel"]').tap();assert.equal(await touch.locator('#march-planner').isHidden(),true);
 await touchContext.close();
 assert.deepEqual(errors,[]);console.log('March Planner: real map click, zoom/pan, route edit, confirmation, time, save/load, bilingual UI and touch controls passed.');
}finally{await browser.close()}
