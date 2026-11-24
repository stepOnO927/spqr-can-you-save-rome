import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'outputs','legacy-cosmetic');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>{localStorage.setItem('spqr-lang','en');if(!localStorage.getItem('spqr-legacy-profile-v1'))localStorage.setItem('spqr-legacy-profile-v1',JSON.stringify({coins:2000,buildings:[],rewards:['founder-grant']}))});
 await page.goto('http://spqr.test/legacy/');
 await page.locator('#nav-shop').click();
 for(const id of ['camp','banner-eagle','race-blue'])await page.locator(`[data-buy="${id}"]`).click();
 assert.equal(await page.locator('[data-apply="banner-eagle"]').isDisabled(),true);
 assert.equal(await page.locator('[data-apply="race-blue"]').isDisabled(),true);
 await page.screenshot({path:resolve(output,'wardrobe-en.png'),fullPage:true});
 const balance=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')).coins);
 await page.locator('[data-apply="banner-classic"]').click();
 await page.locator('[data-apply="race-gold"]').click();
 await page.locator('[data-apply="banner-eagle"]').click();
 await page.locator('[data-apply="race-blue"]').click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')).coins),balance);
 await page.locator('#nav-city').click();
 await page.locator('[data-building="camp"]').click();
 assert.match(await page.locator('.camp-standard-preview').innerText(),/Eagle standard equipped/);
 assert.equal(await page.locator('.camp-standard-preview .legacy-eagle-mark').count(),1);
 await page.reload();
 await page.locator('[data-building="camp"]').click();
 assert.equal(await page.locator('.camp-standard-preview .legacy-eagle-mark').count(),1);
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.camp-standard-preview').innerText(),/已装备鹰旗/);
 await page.locator('#nav-shop').click();
 await page.locator('[data-apply="banner-classic"]').click();
 await page.locator('#nav-city').click();
 await page.locator('[data-building="camp"]').click();
 assert.match(await page.locator('.camp-standard-preview').innerText(),/已装备经典军旗/);
 await page.evaluate(()=>{const key='spqr-legacy-profile-v1',profile=JSON.parse(localStorage.getItem(key));profile.banner='eagle';localStorage.setItem(key,JSON.stringify(profile))});
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('.maplibregl-canvas').waitFor();
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',null,{timeout:60000});
 await page.locator('#start-free').click();
 await page.locator('.army.legacy-eagle').first().waitFor();
 assert.ok(await page.locator('.army.legacy-eagle .legacy-eagle-mark').count()>0);
 assert.equal(await page.locator('.army:not(.legacy-eagle) .legacy-eagle-mark').count(),0);
 assert.ok(await page.locator('.army.legacy-eagle .faction-mark').count()>0);
 await page.screenshot({path:resolve(output,'atlas-eagle-zh.png')});
 assert.deepEqual(errors,[]);
 console.log('Legacy cosmetic browser smoke passed: purchase, equip, reset, reload, English, Chinese and atlas standards');
}finally{await browser.close()}
