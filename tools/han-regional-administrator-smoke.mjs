import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>{localStorage.setItem('spqr-han-lang','en');Date.now=()=>500});
 await page.goto(base+'/han/',{waitUntil:'domcontentloaded'});
 await page.locator('#factionSelect').selectOption('han');await page.locator('#begin').click();
 await page.locator('#map path.territory[data-region="hongnong"]').click();
 const profile=page.locator('.han-regional-administrator'),id=await profile.getAttribute('data-administrator');
 assert.ok(id?.startsWith('regional-administrator:'));
 assert.match(await profile.innerText(),/Commandery administrator.*Original game character/s);
 assert.equal(await profile.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.locator('#save').click();const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-han-save-browser')));
 await page.locator('#han-audit-administrator').click();await page.locator('#save').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-han-save-browser')));
 assert.equal(saved.regions.find(r=>r.id==='hongnong').administratorId,id);
 assert.equal(saved.court.audits.at(-1).target,id);
 assert.ok(saved.persons[id].career.some(event=>event.kind==='regional_appointment'&&event.region==='hongnong'));
 assert.equal(saved.persons[id].record,'fictional');
 assert.equal(saved.factions.han.treasury,before.factions.han.treasury-15);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#load').click();
 await page.locator('#map path.territory[data-region="hongnong"]').click();assert.equal(await profile.getAttribute('data-administrator'),id);
 assert.equal(await page.locator('#han-audit-administrator').isDisabled(),true);
 await page.locator('#lang').click();assert.match(await profile.innerText(),/郡守.*游戏原创人物/s);
 assert.deepEqual(errors,[]);
 console.log('Han commandery administrator has a saved identity and portrait; a paid audit survives reload in both languages.');
}finally{await browser.close()}
