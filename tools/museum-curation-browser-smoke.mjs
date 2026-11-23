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
 await page.evaluate(()=>{const key='spqr-legacy-profile-v1',p=JSON.parse(localStorage.getItem(key)||'null')||{coins:3000};p.coins=3000;localStorage.setItem(key,JSON.stringify(p));localStorage.setItem('spqr-lang','zh')});
 await page.reload();
 await page.locator('#nav-museum').click();
 assert.match(await page.locator('.hub-panel').innerText(),/建造博物馆后/);
 assert.equal(await page.locator('.artifact').count(),0);
 await page.evaluate(()=>{const key='spqr-legacy-profile-v1',p=JSON.parse(localStorage.getItem(key));p.achievements=[{id:'first-recon',category:'hidden',year:-49,month:2,coins:75},{id:'survive:12',category:'ordinary',year:-48,month:1,coins:60}];localStorage.setItem(key,JSON.stringify(p))});
 await page.reload();await page.locator('#nav-museum').click();
 assert.equal(await page.locator('.museum-achievements article').count(),2,'earned achievements remain reviewable before buying the physical museum');
 assert.match(await page.locator('.museum-achievements').innerText(),/边境之眼/);
 assert.doesNotMatch(await page.locator('.museum-achievements').innerText(),/执掌历史/);
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.museum-achievements').innerText(),/Eyes Across the Frontier/);
 await page.evaluate(()=>{const key='spqr-legacy-profile-v1',p=JSON.parse(localStorage.getItem(key));p.achievements=[];localStorage.setItem(key,JSON.stringify(p));localStorage.setItem('spqr-lang','zh')});
 await page.reload();await page.locator('#nav-museum').click();
 await page.locator('[data-shop]').click();
 for(const id of ['museum','camp','museum-figures','museum-ritual'])await page.locator(`[data-buy="${id}"]`).click();
 await page.locator('#nav-museum').click();
 assert.equal(await page.locator('.museum-halls button').count(),8);
 assert.equal(await page.locator('.museum-standing strong').innerText(),'12');
 assert.equal(await page.locator('[data-feature]').count(),4);
 assert.equal(await page.locator('.artifact h3').filter({hasText:'尤利乌斯·凯撒胸像'}).count(),0,'unearned campaign portrait stays undisclosed');
 for(const id of ['senate-tablet','legion-sword','cato-bust','votive-lamp'])await page.locator(`[data-feature="${id}"]`).click();
 assert.equal(await page.locator('.museum-pedestal:not(.empty)').count(),3);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')));
 assert.deepEqual(saved.featuredArtifacts,['votive-lamp','cato-bust','legion-sword']);
 await page.locator('[data-filter="figures"]').click();
 assert.match(await page.locator('.museum-grid').innerText(),/小加图胸像/);
 await page.locator('#nav-lang').click();
 assert.match(await page.locator('.museum-showcase').innerText(),/Featured collection/);
 await page.reload();await page.locator('#nav-museum').click();
 assert.equal(await page.locator('.museum-pedestal:not(.empty)').count(),3);
 await page.locator('[data-unfeature="cato-bust"]').click();
 assert.equal(await page.locator('.museum-pedestal:not(.empty)').count(),2);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('.museum-showcase').screenshot({path:path.join(root,'outputs','legacy-museum-mobile.png')});
 await page.setViewportSize({width:1440,height:900});
 await page.locator('[data-filter="all"]').click();
 await page.locator('.museum-showcase').screenshot({path:path.join(root,'outputs','legacy-museum-desktop.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('Museum gate, seven halls, saved curation, bilingual labels and mobile layout pass.');
}finally{await browser.close()}
