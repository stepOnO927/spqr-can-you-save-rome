import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/inspector.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>localStorage.setItem('spqr-save-1','inspector-must-not-touch-this'));
 await page.locator('#all').click();
 await page.locator('#run').click();
 await page.locator('#run:not([disabled])').waitFor({timeout:120000});
 assert.equal(await page.locator('.result').count(),10);
 assert.equal(await page.locator('.result .status.FAIL').count(),0,await page.locator('#results').textContent());
 assert.equal(await page.locator('.result .status.BLOCKED').count(),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('spqr-save-1')),'inspector-must-not-touch-this');
 const promise=page.waitForEvent('download');
 await page.locator('#export').click();
 const download=await promise,report=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(report.schema,'spqr-inspector-v1');
 assert.equal(report.results.length,10);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({categories:report.results.map(x=>({id:x.id,status:x.status})),saveUntouched:true}));
 await context.close();
}finally{await browser.close()}
