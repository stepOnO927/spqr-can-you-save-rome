import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base+'/han/',{waitUntil:'domcontentloaded'});
 await page.locator('#factionSelect').selectOption('han');await page.locator('#begin').click();
 const armyId=await page.locator('#overview [data-select-army]').nth(1).getAttribute('data-select-army');
 await page.locator('#overview [data-select-army]').nth(1).click();
 const commander=page.locator('#inspector dt', {hasText:/Commander|统帅/}).locator('xpath=following-sibling::dd[1]');
 const english=await commander.innerText();assert.match(english,/^[A-Z][a-z]+ [A-Z][a-z]+$/);
 assert.match(await page.locator('#inspector h3').last().innerText(),new RegExp(english));
 assert.doesNotMatch(await page.locator('#inspector h3').last().innerText(),new RegExp(`\\b${armyId}\\b`));
 assert.match(await page.locator('#overview [data-select-army]').nth(1).innerText(),new RegExp(english));
 await page.locator('#overview [data-select-army]').first().click();
 assert.match(await page.locator('#inspector').innerText(),/local iron batch/);
 await page.locator('#recruit').click();
 assert.match(await page.locator('#message').innerText(),/local iron \d+ → \d+/);
 assert.equal(await page.locator('#recruit').isDisabled(),true);
 await page.locator('#save').click();await page.reload();await page.locator('#load').click();
 await page.locator('#overview [data-select-army]').nth(1).click();assert.equal(await commander.innerText(),english);
 assert.match(await page.locator('#inspector h3').last().innerText(),new RegExp(english));
 await page.locator('#lang').click();const chinese=await commander.innerText();assert.match(chinese,/[\u3400-\u9fff]/);
 assert.match(await page.locator('#inspector h3').last().innerText(),new RegExp(chinese));
 assert.doesNotMatch(await page.locator('#overview [data-select-army]').nth(1).innerText(),new RegExp(`\\b${armyId}\\b`));
 await page.locator('#overview [data-select-army]').first().click();
 assert.match(await page.locator('#inspector').innerText(),/当地铁料/);
 assert.equal(await page.locator('#recruit').isDisabled(),true);
 assert.deepEqual(errors,[]);
 console.log('Han field commander browser smoke passed: named officer, save/load and both languages.');
}finally{await browser.close()}
