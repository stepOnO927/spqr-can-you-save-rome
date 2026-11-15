import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:390,height:844}});
await context.route('https://**/*',route=>route.abort());
await context.route('http://spqr.test/**',async route=>{
 const url=new URL(route.request().url()),relative=url.pathname==='/legacy/'?'legacy/index.html':url.pathname.slice(1),target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep)){await route.abort();return}
 try{const body=await readFile(target),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(target)]||'application/octet-stream';await route.fulfill({status:200,contentType:type,body})}catch{await route.fulfill({status:404,body:'Not found'})}
});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto('http://spqr.test/legacy/',{waitUntil:'domcontentloaded'});
 await page.locator('.city-building').first().waitFor();
 await page.evaluate(()=>{const key='spqr-legacy-profile-v1',profile=JSON.parse(localStorage.getItem(key)||'{}');profile.coins=2000;localStorage.setItem(key,JSON.stringify(profile));localStorage.setItem('spqr-lang','zh')});
 await page.reload();await page.locator('#nav-shop').click();await page.locator('[data-buy="court"]').click();await page.locator('#nav-city').click();await page.locator('[data-building="court"]').click();
 assert.match(await page.locator('.boundary-case').innerText(),/台伯河界址案 · 虚构/);
 await page.locator('[data-boundary="begin"][data-source="registry"]').click();
 assert.match(await page.locator('.boundary-case').innerText(),/仅有一份文书/);
 const opened=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.equal(opened.legalCases[0].status,'open');assert.equal(opened.legalCases[0].evidence.length,1);
 await page.locator('#nav-lang').click();assert.match(await page.locator('.boundary-case').innerText(),/Tiber boundary case · fictional/);
 await page.locator('[data-boundary="corroborate"]').click();
 assert.match(await page.locator('.boundary-case').innerText(),/Both documents disagree/);
 await page.reload();await page.locator('[data-building="court"]').click();
 assert.equal(await page.locator('[data-boundary="corroborate"]').count(),0);
 await page.locator('[data-boundary="close"][data-verdict="provisional"]').click();
 const settled=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.equal(settled.legalCases[0].status,'closed');assert.equal(settled.legalCases[0].coinsClaimed,45);
 assert.equal(settled.politics.people,53);assert.equal(settled.politics.corruption,19);
 assert.match(await page.locator('.boundary-case').innerText(),/Shared access pending further hearing/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.hub-header')).backgroundColor),'rgb(23, 39, 35)');
 await page.screenshot({path:path.join(root,'outputs','legacy-boundary-case-mobile.png')});
 await page.locator('#nav-shop').click();await page.locator('[data-buy="museum"]').click();await page.locator('#nav-museum').click();
 assert.match(await page.locator('.museum-grid').innerText(),/Boundary ruling tablet/);
 const coins=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')).coins);
 await page.reload();await page.locator('[data-building="court"]').click();
 assert.equal(await page.locator('[data-boundary]').count(),0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')).coins),coins);
 await page.locator('#nav-lang').click();assert.match(await page.locator('.boundary-case').innerText(),/案件已结/);
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(root,'outputs','legacy-boundary-case-desktop.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('Court case EN/ZH browser smoke passed: evidence, ruling, museum, reload and mobile.');
}finally{await browser.close()}
