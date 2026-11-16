import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1100,height:820}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='spqr.test')return route.abort();
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>{
  localStorage.setItem('spqr-lang','zh');
  localStorage.setItem('spqr-legacy-profile-v1',JSON.stringify({buildings:['temple','circus']}));
  window.raceLabels=[];
  const old=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(label,...args){window.raceLabels.push(String(label));return old.call(this,label,...args)};
 });
 await page.goto('http://spqr.test/legacy/',{waitUntil:'domcontentloaded'});
 for(const [language,hudWord,canvasWord,aria] of [
  ['zh','速度','加速','俯视战车竞速'],
  ['en','SPEED','accelerate','Top-down chariot race']
 ]){
  await page.locator('#nav-race').click();
  assert.equal(await page.locator('#race-canvas').getAttribute('aria-label'),aria);
  await page.locator('#race-start').click();
  await page.waitForFunction(word=>document.querySelector('#race-hud')?.textContent.includes(word),hudWord);
  await page.waitForFunction(word=>window.raceLabels?.some(label=>label.includes(word)),canvasWord);
  const hud=await page.locator('#race-hud').textContent();
  assert.ok(hud.includes(hudWord),`${language} HUD did not use the selected language`);
  if(language==='zh'){
   assert.ok(!hud.includes('SPEED'));
   await page.locator('#nav-lang').click();
  }
 }
 assert.deepEqual(errors,[]);
 console.log('Chariot race HUD, canvas instructions and accessibility label follow Chinese and English settings.');
}finally{await browser.close()}
