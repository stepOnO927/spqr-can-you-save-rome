import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=peace-cursus-1');const s=newGame('caesar'),rome=s.regions.find(r=>r.id==='roma');rome.owner='caesar';rome.population.satisfaction=40;s.factions.caesar.treasury=100;s.world.religiousInstitutions.find(o=>o.id==='roman_college').relations.caesar=0;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#status').waitFor({state:'hidden',timeout:60000});
 const canvas=page.locator('#map canvas').first(),before=await canvas.screenshot();await page.locator('#map-mode').selectOption('satisfaction');await page.locator('#map-mode-details summary').click();
 assert.match(await page.locator('#map-mode-note').innerText(),/外国数据不显示/);const row=page.locator('[data-satisfaction-region="roma"]');assert.match(await row.innerText(),/40\/100/);assert.equal(await row.locator('.swatch').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(194, 170, 107)');
 const ids=await page.locator('[data-satisfaction-region]').evaluateAll(nodes=>nodes.map(n=>n.dataset.satisfactionRegion));assert.ok(!ids.includes('egypt'),'foreign theater must not appear in own values');
 await page.waitForTimeout(400);const after=await canvas.screenshot();assert.notDeepEqual(before,after,'the visible map changes when the mode changes');
 await row.click();assert.match(await page.locator('#command-detail').innerText(),/人口满意度\s*40\/100/);
 await page.locator('#campaign-government').click();await page.frameLocator('#campaign-panel-frame').locator('[data-institution="roman_college"][data-religion-action="negotiate"]').click();await page.locator('#campaign-panel-close').click();await page.waitForFunction(()=>document.querySelector('#campaign-panel')?.hidden);await page.locator('#map-mode').selectOption('satisfaction');if(!await page.locator('#map-mode-details details').evaluate(el=>el.open))await page.locator('#map-mode-details summary').click();assert.match(await page.locator('[data-satisfaction-region="roma"]').innerText(),/42\/100/);
 await page.locator('#save').click();await page.locator('#load').click();assert.equal(await page.locator('#map-mode-details details').evaluate(el=>el.open),true);assert.match(await page.locator('[data-satisfaction-region="roma"]').innerText(),/42\/100/);assert.deepEqual(errors,[]);console.log('Population satisfaction mode displays own simulated values, responds to policy, hides foreign values, and survives save/load.');
}finally{await browser.close()}
