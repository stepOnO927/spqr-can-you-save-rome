import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newGrandGame} from '../engine.js';
import {resolveBattle} from '../naval.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const s=newGrandGame('senate'),own=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
own.port=null;own.ships={light:2,trireme:2};own.sailors=490;own.tactic='ramming';enemy.port=null;enemy.zone=own.zone;enemy.ships={quinquereme:2,transport:2};enemy.sailors=760;enemy.hull=50;enemy.order={kind:'intercept',target:enemy.zone,path:[]};s.seed=83;
resolveBattle(s,own,enemy,own.zone,()=>{});
const battle=s.naval.reports.find(r=>r.kind==='battle');assert.ok(battle?.maneuver?.[own.id]);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='spqr.test')return route.abort();if(url.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body><main id="root"></main></body></html>'});const target=path.resolve(root,url.pathname.slice(1));if(!target.startsWith(root+path.sep))return route.abort();try{const body=await readFile(target),type={'.js':'text/javascript','.json':'application/json'}[path.extname(target)]||'application/octet-stream';await route.fulfill({status:200,contentType:type,body})}catch{await route.fulfill({status:404,body:'Not found'})}});
await page.goto('http://spqr.test/');
for(const [lang,expected] of [['en',/Friendly warship maneuver/],['zh',/己方战船机动形势/]]){
 await page.evaluate(async({state,language})=>{const {renderNavalPanel}=await import('/map-lab/naval-ui.js');renderNavalPanel({state,lang:language,root:document.querySelector('#root'),section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}})},{state:s,language:lang});
 const text=await page.locator('.naval-content').innerText();assert.match(text,expected);assert.match(text,lang==='zh'?/敌舰损失目击估计/:/Observed enemy ship losses/);assert.doesNotMatch(text,/Enemy exact ship losses|敌方精确沉船数/);
}
const old=structuredClone(s);delete old.naval.reports.find(r=>r.kind==='battle').maneuver;
await page.evaluate(async state=>{const {renderNavalPanel}=await import('/map-lab/naval-ui.js');renderNavalPanel({state,lang:'en',root:document.querySelector('#root'),section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}})},old);
assert.doesNotMatch(await page.locator('.naval-content').innerText(),/Friendly warship maneuver/);
for(const [lang,label] of [['en',/Pursue reported fleet/],['zh',/追击已目击舰队/]]){
 const sighted=newGrandGame('senate');sighted.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:'ionian',year:sighted.year,month:sighted.month,source:'recon',range:[2,6],confidence:'medium'}};
 await page.evaluate(async({state,language})=>{const {renderNavalPanel}=await import('/map-lab/naval-ui.js'),{orderFleet}=await import('/naval.js');window.pursuitState=state;renderNavalPanel({state,lang:language,root:document.querySelector('#root'),section:'fleets',onAction:(action,id,kind,target)=>action==='order'?orderFleet(state,state.player,id,kind,target):{ok:true},onZone:()=>{},onPort:()=>{}})},{state:sighted,language:lang});
 await page.locator('[data-order-kind="senate-adriatic"]').selectOption('pursue');
 assert.match(await page.locator('[data-order-target="senate-adriatic"]').innerText(),lang==='en'?/2–6 estimated ships/:/估计2–6艘/);
 await page.locator('[data-order="senate-adriatic"]').click();
 assert.deepEqual(await page.evaluate(()=>{const order=window.pursuitState.naval.fleets.find(f=>f.id==='senate-adriatic').order;return {kind:order.kind,reportId:order.reportId,target:order.target}}),{kind:'intercept',reportId:'caesar-adriatic',target:'ionian'});
 await page.evaluate(async language=>{const {renderNavalPanel}=await import('/map-lab/naval-ui.js');renderNavalPanel({state:window.pursuitState,lang:language,root:document.querySelector('#root'),section:'fleets',onAction:()=>{},onZone:()=>{},onPort:()=>{}})},lang);
 assert.match(await page.locator('.naval-content').innerText(),label);
 assert.match(await page.locator('.naval-content').innerText(),lang==='en'?/Last sighting: Ionian Sea/:/上次目击：爱奥尼亚海/);
}
const oldSighting=newGrandGame('senate');oldSighting.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:'ionian',year:oldSighting.year,month:oldSighting.month,source:'sighting',confidence:'low'}};
await page.evaluate(async state=>{const {renderNavalPanel}=await import('/map-lab/naval-ui.js');renderNavalPanel({state,lang:'en',root:document.querySelector('#root'),section:'fleets',onAction:()=>{},onZone:()=>{},onPort:()=>{}})},oldSighting);
await page.locator('[data-order-kind="senate-adriatic"]').selectOption('pursue');
assert.match(await page.locator('[data-order-target="senate-adriatic"]').innerText(),/ship count unknown/);
assert.deepEqual(errors,[]);await browser.close();console.log('Naval battle reports and dated fleet pursuit passed in English and Chinese; older saves remain readable.');
