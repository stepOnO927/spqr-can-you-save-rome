import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..'),output=resolve(root,'outputs','legacy-library');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)missing.push(`${response.status()} ${response.url()}`)});
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname,file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>{if(!localStorage.getItem('spqr-legacy-profile-v1'))localStorage.setItem('spqr-legacy-profile-v1',JSON.stringify({coins:2000,buildings:[],rewards:['founder-grant']}))});
 await page.goto('http://spqr.test/legacy/',{waitUntil:'domcontentloaded'});
 await page.locator('#nav-shop').click();
 await page.locator('[data-buy="library"]').click();
 await page.locator('#nav-city').click();
 assert.equal(await page.locator('.city-building.library.built').count(),1);
 await page.locator('[data-building="library"]').click();
 assert.ok(await page.locator('.library-inquiry').isVisible());
 await page.locator('[data-library-start]').click();
 await page.locator('[data-library-answer="1"]').click();
 assert.equal(await page.locator('.camp-drill-progress').last().innerText(),'Source question 2 / 3');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-building="library"]').click();
 assert.equal(await page.locator('.camp-drill-progress').last().innerText(),'Source question 2 / 3');
 await page.locator('#nav-lang').click();
 assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
 assert.match(await page.locator('.library-inquiry').innerText(),/史料问题 2 \/ 3/);
 await page.locator('[data-library-answer="0"]').click();
 await page.locator('[data-library-answer="2"]').click();
 const settled=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.equal(settled.libraryInquiry.score,6);
 assert.equal(settled.libraryInquiryBest,6);
 assert.equal(settled.coins,1550);
 assert.ok(settled.collectibles.includes('massilia-source-dossier'));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:resolve(output,'library-complete-mobile-zh.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.library-inquiry').innerText(),/source inquiry/i);
 await page.locator('[data-library-start]').click();
 for(const choice of [0,1,0])await page.locator(`[data-library-answer="${choice}"]`).click();
 const replay=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.equal(replay.coins,1550);
 assert.equal(replay.libraryInquiryBest,6);
 assert.equal(replay.libraryInquiryRuns,2);
 await page.locator('#nav-shop').click();
 await page.locator('[data-buy="museum"]').click();
 await page.locator('#nav-museum').click();
 assert.ok(await page.getByText('Massilia source dossier').isVisible());
 assert.ok(await page.locator('.artifact').filter({hasText:'Massilia source dossier'}).getByText('IN COLLECTION').isVisible());
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#nav-museum').click();
 assert.ok(await page.locator('.artifact').filter({hasText:'Massilia source dossier'}).getByText('IN COLLECTION').isVisible());
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log(JSON.stringify({coins:replay.coins,runs:replay.libraryInquiryRuns,errors,missing}));
}finally{await browser.close()}
