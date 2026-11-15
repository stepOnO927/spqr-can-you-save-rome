import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('https://**/*',route=>route.abort());
 await context.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),relative=url.pathname==='/legacy/'?'legacy/index.html':url.pathname.slice(1),file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){await route.abort();return}
  try{const body=await readFile(file),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'}[path.extname(file)]||'application/octet-stream';await route.fulfill({status:200,contentType:mime,body})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://spqr.test/legacy/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  localStorage.setItem('spqr-lang','en');
  localStorage.setItem('spqr-legacy-profile-v1',JSON.stringify({coins:150,archive:[{id:'victory-1',result:'victory',faction:'senate',year:-46,month:7,territories:45,summary:{method:'settlement'}},{id:'defeat-1',result:'defeat',faction:'caesar',year:-47,month:4,territories:3},{id:'retired-1',result:'retired',faction:'egypt',year:-45,month:2,territories:12}],achievements:[{id:'victory',runId:'older-victory',claimed:true,year:-49,month:3}],race:{wins:2}}));
 });
 await page.reload();
 await page.locator('[data-building="arch"]').click();
 assert.equal(await page.evaluate(()=>scrollY),0);
 assert.equal(await page.locator('.arch-metrics strong').first().innerText(),'2');
 assert.match(await page.locator('.arch-records').innerText(),/Senate[\s\S]*Earlier unclassified records/);
 assert.doesNotMatch(await page.locator('.arch-factions').innerText(),/Caesar/);
 assert.match(await page.locator('.arch-records').innerText(),/Largest victorious realm[\s\S]*45 territories/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:path.join(root,'outputs','triumphal-arch-mobile-en.png')});
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.arch-records').innerText(),/各阵营胜利记录[\s\S]*元老院/);
 assert.match(await page.locator('.panel-head').innerText(),/战败与自愿结束仍保存在档案馆/);
 await page.reload();await page.locator('[data-building="arch"]').click();
 assert.equal(await page.locator('.arch-metrics strong').first().innerText(),'2');
 assert.match(await page.locator('.panel-head h2').innerText(),/凯旋门/);
 await page.setViewportSize({width:1440,height:900});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:path.join(root,'outputs','triumphal-arch-desktop-zh.png')});
 assert.deepEqual(errors,[]);
 console.log('Triumphal Arch excludes defeat and retirement, migrates older wins, and fits bilingual mobile and desktop views.');
}finally{await browser.close()}
