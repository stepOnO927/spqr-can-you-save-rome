import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base+'/han/',{waitUntil:'domcontentloaded'});
 await page.locator('#factionSelect').selectOption('han');await page.locator('#begin').click();
 await page.locator('#overview [data-select-army]').nth(1).click();
 const commander=page.locator('#inspector dt', {hasText:/Commander|统帅/}).locator('xpath=following-sibling::dd[1]');
 const english=await commander.innerText();assert.match(english,/^[A-Z][a-z]+ [A-Z][a-z]+$/);
 await page.locator('#save').click();await page.reload();await page.locator('#load').click();
 await page.locator('#overview [data-select-army]').nth(1).click();assert.equal(await commander.innerText(),english);
 await page.locator('#lang').click();assert.match(await commander.innerText(),/[\u3400-\u9fff]/);
 assert.deepEqual(errors,[]);
 console.log('Han field commander browser smoke passed: named officer, save/load and both languages.');
}finally{await browser.close()}
