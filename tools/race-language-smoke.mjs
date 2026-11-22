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
  if(!localStorage.getItem('spqr-lang'))localStorage.setItem('spqr-lang','zh');
  if(!localStorage.getItem('spqr-legacy-profile-v1'))localStorage.setItem('spqr-legacy-profile-v1',JSON.stringify({buildings:['temple','circus'],race:{eliminated:['Lucius','Aurelia']}}));
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
  assert.equal((await page.locator('#race-driver option').allTextContents()).includes('Aurelia'),false);
  assert.doesNotMatch(await page.locator('#race-opponents').textContent(),/Lucius/);
  assert.match(await page.locator('#race-opponents').textContent(),/Claudia/);
  if(language==='zh')await page.screenshot({path:resolve(root,'outputs','legacy-race-roster-zh.png')});
  assert.equal(await page.locator('#race-canvas').getAttribute('aria-label'),aria);
  await page.locator('#race-start').click();
  await page.waitForFunction(word=>document.querySelector('#race-hud')?.textContent.includes(word),hudWord);
  await page.waitForFunction(word=>window.raceLabels?.some(label=>label.includes(word)),canvasWord);
  const hud=await page.locator('#race-hud').textContent();
  assert.ok(hud.includes(hudWord),`${language} HUD did not use the selected language`);
  assert.ok(hud.includes(language==='zh'?'观众支持':'FAVOR'),`${language} HUD omitted crowd favor`);
  assert.match(await page.locator('.race-card small').last().textContent(),language==='zh'?/观众支持高时/:/Strong crowd favor/);
  if(language==='zh'){
   assert.ok(!hud.includes('SPEED'));
   await page.locator('#nav-lang').click();
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#nav-race').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'the race page must fit a phone viewport');
 await page.screenshot({path:resolve(root,'outputs','legacy-race-mobile.png')});
 await page.evaluate(()=>{let virtualTime=performance.now();window.requestAnimationFrame=callback=>setTimeout(()=>callback(virtualTime+=50),0);window.cancelAnimationFrame=id=>clearTimeout(id)});
 await page.locator('#race-start').click();
 await page.waitForFunction(()=>document.querySelector('#race-result')?.textContent.includes('5/5'),null,{timeout:30000});
 assert.equal((await page.locator('#race-driver option').allTextContents()).includes('Titus'),false,'last-place player must leave the current roster');
 assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')).race.eliminated)).includes('Titus'));
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#nav-race').click();
 assert.equal((await page.locator('#race-driver option').allTextContents()).includes('Titus'),false,'elimination must survive refresh');
 assert.deepEqual(errors,[]);
 console.log('Chariot race language, replacement rivals, last-place roster removal and reload: PASS');
}finally{await browser.close()}
