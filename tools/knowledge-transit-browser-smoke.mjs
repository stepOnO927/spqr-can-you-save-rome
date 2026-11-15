import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {newGrandGame,knowledgeTrade} from '../engine.js';
import {advanceDevelopment} from '../development.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const game=newGrandGame('caesar');game.relations['caesar:egypt']=60;game.factions.caesar.treasury=300;
assert.equal(knowledgeTrade(game,'caesar','egypt','material','water-control').ok,true);
const owners=new Map(game.regions.map(region=>[region.id,region.owner]));
for(const region of game.regions)region.owner='rebels';
game.regions.find(region=>region.id==='cisalpine').owner='caesar';
game.regions.find(region=>region.id==='egypt').owner='egypt';
advanceDevelopment(game);
assert.equal(game.development.caesar.trade[0].remaining,2);
const blocked=structuredClone(game);
for(const region of game.regions)region.owner=owners.get(region.id);
advanceDevelopment(game);
assert.equal(game.development.caesar.trade[0].remaining,1);

const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 for(const [language,message] of [['en','Paused: civilian route closed'],['zh','民间路线中断，传递暂停']]){
  await page.addInitScript(lang=>localStorage.setItem('spqr-lang',lang),language);
  await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
  await page.locator('#entry-file').setInputFiles({name:`blocked-${language}.json`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(blocked))});
  await page.locator('[data-tab="development"]').click();
  assert.match((await page.locator('.dev-status').allInnerTexts()).join(' '),new RegExp(message));
 }
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.locator('#entry-file').setInputFiles({name:'resumed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});
 await page.locator('[data-tab="development"]').click();
 assert.match((await page.locator('.dev-status').allInnerTexts()).join(' '),/1个月后送达/);
 await page.locator('#step').click();
 assert.match(await page.locator('#tech-water-control').innerText(),/已掌握/);
 assert.deepEqual(errors,[]);
 console.log('Knowledge transit pauses on a blocked route in both languages and arrives after reopening.');
}finally{await browser.close()}
