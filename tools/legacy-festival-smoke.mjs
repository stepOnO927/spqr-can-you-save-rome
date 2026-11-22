import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>{if(!localStorage.getItem('spqr-legacy-profile-v1'))localStorage.setItem('spqr-legacy-profile-v1',JSON.stringify({coins:200,buildings:['temple'],rewards:['founder-grant']}))});
 await page.goto('http://spqr.test/legacy/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-building="temple"]').click();
 assert.match(await page.locator('.temple-festival').innerText(),/Festival of Mars/);
 await page.locator('[data-festival-plan="modest"]').click();
 assert.equal(await page.locator('[data-festival-counsel]').count(),2);
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.temple-festival').innerText(),/听取地方祭司与居民意见/);
 await page.locator('[data-festival-counsel="consult"]').click();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-building="temple"]').click();
 assert.equal(await page.locator('[data-festival-priority]').count(),2);
 await page.locator('[data-festival-priority="provisions"]').click();
 assert.match(await page.locator('.temple-festival').innerText(),/永久城邦影响/);
 await page.screenshot({path:resolve(root,'outputs','legacy-temple-festival.png')});
 const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.equal(result.templeFestival.status,'complete');
 assert.equal(result.templeFestival.coinsClaimed,50);
 assert.equal(result.coins,230);
 assert.ok(result.collectibles.includes('festival-programme'));
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.temple-festival').innerText(),/Permanent civic effects/);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-building="temple"]').click();
 assert.equal(await page.locator('[data-festival-step]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('Legacy festival bilingual save smoke passed');
}finally{await browser.close()}
