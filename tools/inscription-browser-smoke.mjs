import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave} from '../engine.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('http://spqr.test/**',async route=>{
 const url=new URL(route.request().url()),file=path.resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+path.sep))return route.abort();
 try{await route.fulfill({status:200,contentType:{'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream',body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
});
try{
 for(const lang of ['en','zh']){
  const state=newGrandGame('senate');state.factions.senate.treasury=300;
  state.development.senate.knownMaterial.push('stone-inscription');state.development.senate.materials.stone=20;
  await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
  await page.evaluate(language=>localStorage.setItem('spqr-lang',language),lang);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#entry-file').setInputFiles({name:`senate-${lang}.json`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
  await page.locator('[data-tab="map"]').click();
  await page.locator('#region-choice').selectOption('roma');
  const build=page.locator('[data-build="monument"]');assert.equal(await build.isEnabled(),true);
  await build.click();
  const editor=page.locator('.dev-inscription-editor');
  assert.match(await editor.innerText(),lang==='zh'?/撰写石刻铭文/:/Draft the inscription/);
  await editor.locator('textarea').fill('LVCIVS · CIVIBVS ROMANIS');
  assert.match(await editor.locator('blockquote').innerText(),/LVCIVS · CIVIBVS ROMANIS/);
  if(lang==='en')await editor.screenshot({path:'outputs/inscription-editor-en.png'});
  await editor.locator('[data-inscription-cancel]').click();
  assert.equal(await editor.count(),0);
  await build.click();await editor.locator('textarea').fill('LVCIVS · CIVIBVS ROMANIS');
  await editor.locator('button[type="submit"]').click();
  assert.match(await page.locator('.dev-status').allInnerTexts().then(lines=>lines.join(' ')),lang==='zh'?/建造中/:/Building/);
  await page.locator('#new').click();
  page.once('dialog',dialog=>dialog.accept('1'));
  await page.locator('.setup-saves [data-slot="save"]').click();
  const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('spqr-save-1')));
  assert.equal(saved.regions.find(r=>r.id==='roma').construction.inscription,'LVCIVS · CIVIBVS ROMANIS');
  const loaded=upgradeSave(JSON.parse(JSON.stringify(saved)));
  assert.equal(loaded.regions.find(r=>r.id==='roma').construction.inscription,'LVCIVS · CIVIBVS ROMANIS');
  await page.locator('#step').click();await page.locator('#step').click();await page.locator('#step').click();await page.locator('#step').click();
  await page.locator('#region-choice').selectOption('roma');
  assert.match(await page.locator('.dev-inscriptions').innerText(),/LVCIVS · CIVIBVS ROMANIS/);
  await page.locator('#new').click();page.once('dialog',dialog=>dialog.accept('1'));
  await page.locator('.setup-saves [data-slot="save"]').click();
  assert.match(JSON.stringify(JSON.parse(await page.evaluate(()=>localStorage.getItem('spqr-save-1'))).regions.find(r=>r.id==='roma').inscriptions),/LVCIVS · CIVIBVS ROMANIS/);
 }
 const atlasState=newGrandGame('senate');atlasState.factions.senate.treasury=300;
 atlasState.development.senate.knownMaterial.push('stone-inscription');atlasState.development.senate.materials.stone=20;
 await page.evaluate(state=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state})),atlasState);
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-city="ROMA"]').waitFor({state:'attached'});
 await page.locator('[data-city="ROMA"]').evaluate(button=>button.click());
 await page.locator('#city-region').click();
 await page.locator('#command-detail [data-build="monument"]').click();
 const atlasEditor=page.locator('#command-detail .dev-inscription-editor');
 assert.match(await atlasEditor.innerText(),/撰写石刻铭文/);
 await atlasEditor.locator('textarea').fill('ROMA · CIVITAS');
 await atlasEditor.locator('button[type="submit"]').click();
 assert.match(await page.locator('#command-detail').innerText(),/建造中/);
 assert.deepEqual(errors,[]);
 console.log('Inline monument inscription, cancel, preview, construction and save passed in English and Chinese; atlas order passed.');
}finally{await browser.close()}
