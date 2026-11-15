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
assert.doesNotMatch(await page.locator('.naval-content').innerText(),/Friendly warship maneuver/);assert.deepEqual(errors,[]);await browser.close();console.log('Naval battle reports passed in English and Chinese; older saves remain readable.');
