import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.locator('#entry-continue').click({timeout:15000});
 await page.locator('[data-tab="development"]').click();
 await page.locator('[data-dev-branch="idea"]').click();
 const card=page.locator('#tech-galatian-auxiliary-muster');
 assert.match(await card.innerText(),/Galatian Auxiliary Muster[\s\S]*integration and satisfaction ≥45 \+6/);
 assert.match(await card.locator('a[target="_blank"]').getAttribute('href'),/Civil_Wars\/3A/);
 await page.locator('#lang').click();
 await page.locator('[data-tab="development"]').click();
 await page.locator('[data-dev-branch="idea"]').click();
 assert.match(await card.innerText(),/加拉太辅助兵征募[\s\S]*融合度与满意度均≥45的新兵士气 \+6/);
 assert.deepEqual(errors,[]);
 console.log('Galatian idea card renders in English and Chinese without page errors.');
}finally{await browser.close()}
