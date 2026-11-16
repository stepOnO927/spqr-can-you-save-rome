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
 for(const [language,name,effect] of [['en','Seasonal Free-Labor Contracts','distressed outmigration cap 300'],['zh','季节性自由劳工契约','不满人口迁出上限 300']]){
  await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
  await page.evaluate(value=>localStorage.setItem('spqr-lang',value),language);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#entry-continue').click();
  await page.locator('[data-tab="development"]').click();
  await page.locator('[data-dev-branch="idea"]').click();
  const card=page.locator('#tech-seasonal-labor-contracts');
  assert.match(await card.innerText(),new RegExp(name));
  assert.match(await card.innerText(),new RegExp(effect));
  assert.match(await card.locator('a[target="_blank"]').getAttribute('href'),/Varro\/de_Re_Rustica/);
  assert.equal(await card.locator('[data-research="seasonal-labor-contracts"]').isDisabled(),true);
  await page.locator('[data-tree-pan="right"]').click({timeout:10000});
  assert.ok(await page.locator('.dev-tree').evaluate(element=>element.scrollLeft)>100);
  await page.locator('[data-tree-pan="left"]').click({timeout:10000});
  assert.ok(await page.locator('.dev-tree').evaluate(element=>element.scrollLeft)<2);
  console.log(`${language}: seasonal labor card and prerequisite visible`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
