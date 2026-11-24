import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.locator('#entry-continue').click();
 await page.locator('[data-tab="development"]').click();
 assert.match(await page.locator('#tech-grain-processing').innerText(),/Cato, On Agriculture 10–11/);
 await page.locator('[data-dev-branch="idea"]').click();
 const card=page.locator('#tech-senatorial-consultation');
 assert.match(await card.innerText(),/Caesar says he convened the Senate in Rome in 49 BCE[\s\S]*no one agreed to go/);
 assert.match(await card.locator('a[target="_blank"]').getAttribute('href'),/Civil_Wars\/1B/);
 for(const id of ['rhetorical-education','civic-education'])assert.match(await page.locator(`#tech-${id}`).innerText(),/Crassus, speaking in Cicero’s dialogue/);
 await page.locator('#lang').click();
 assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
 assert.match(await card.innerText(),/凯撒记载[\s\S]*讨论三日后仍无人愿意出使/);
 for(const id of ['rhetorical-education','civic-education'])assert.match(await page.locator(`#tech-${id}`).innerText(),/西塞罗的对话作品中，克拉苏/);
 assert.deepEqual(errors,[]);
 console.log('Development source browser smoke passed in English and Chinese');
}finally{await browser.close()}
