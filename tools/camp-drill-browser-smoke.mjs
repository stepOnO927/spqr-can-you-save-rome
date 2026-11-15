import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('https://**/*',route=>route.abort());
 await context.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),relative=url.pathname==='/legacy/'?'legacy/index.html':url.pathname.slice(1),target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep)){await route.abort();return}
  try{const body=await readFile(target),ext=path.extname(target),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[ext]||'application/octet-stream';await route.fulfill({status:200,contentType:type,body})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://spqr.test/legacy/',{waitUntil:'domcontentloaded'});
 await page.locator('.city-building').first().waitFor();
 await page.evaluate(()=>{const key='spqr-legacy-profile-v1',p=JSON.parse(localStorage.getItem(key)||'null')||{coins:2000};p.coins=2000;localStorage.setItem(key,JSON.stringify(p));localStorage.setItem('spqr-lang','zh')});
 await page.reload();
 await page.locator('#nav-shop').click();await page.locator('[data-buy="camp"]').click();
 await page.locator('#nav-city').click();await page.locator('[data-building="camp"]').click();
 assert.match(await page.locator('.camp-drill').innerText(),/军营准备演练/);
 const coinsBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')).coins);
 await page.locator('[data-drill-start]').click();
 assert.match(await page.locator('.camp-drill').innerText(),/阶段 1 \/ 3/);
 await page.locator('[data-drill-choice="0"]').click();
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.camp-drill').innerText(),/Station 2 \/ 3/);
 await page.locator('[data-drill-choice="1"]').click();
 await page.reload();await page.locator('[data-building="camp"]').click();
 assert.match(await page.locator('.camp-drill').innerText(),/Station 3 \/ 3/);
 await page.locator('[data-drill-choice="0"]').click();
 assert.match(await page.locator('.camp-drill').innerText(),/Careful stewardship/);
 const complete=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.equal(complete.campDrill.score,5);assert.equal(complete.campDrill.coinsClaimed,50);
 assert.equal(complete.coins,coinsBefore+50);assert.equal(complete.politics.reputation,53);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:path.join(root,'outputs','legacy-camp-drill-mobile.png')});
 await page.locator('[data-drill-start]').click();
 for(let i=0;i<3;i++)await page.locator('[data-drill-choice="2"]').click();
 const replay=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.equal(replay.campDrill.score,0);assert.equal(replay.campDrillBest,5);
 assert.equal(replay.campDrill.coinsClaimed,0);assert.equal(replay.coins,coinsBefore+50);
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.camp-drill').innerText(),/记录失真/);
 await page.setViewportSize({width:1440,height:900});
 await page.screenshot({path:path.join(root,'outputs','legacy-camp-drill-desktop.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('Camp drill persists across language changes and reloads; one-time reward and mobile layout pass.');
}finally{await browser.close()}
