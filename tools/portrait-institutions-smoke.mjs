import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const council=await page.evaluate(async()=>{const e=await import('/engine.js?v=faces-name-disagreement-1'),s=e.newGame('senate');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return Object.fromEntries(s.world.religiousInstitutions.map(institution=>[institution.id,institution.council]))});await page.reload();
 await page.locator('[data-tab="government"]').click();
 for(const [id,key] of [[council.roman_college[0],'fictional-fabius'],[council.roman_college[1],'fictional-flavia'],[council.syrian_association[0],'fictional-maron'],[council.syrian_association[1],'fictional-helena']]){
  const img=page.locator(`[data-gene-person="${id}"] img`);assert.match(await img.getAttribute('src'),new RegExp(`${key}-128\\.jpg`));await img.evaluate(async element=>{await element.decode();if(element.naturalWidth!==128)throw Error('portrait did not load')});
 }
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();assert.match(await page.locator(`[data-gene-person="${council.roman_college[0]}"] img`).getAttribute('src'),/fictional-fabius-128/);
 const replacement=await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=faces-name-disagreement-1'),{advanceReligion}=await import('/religion.js?v=faces-name-disagreement-1');const s=newGame('egypt'),temple=s.world.religiousInstitutions.find(o=>o.id==='theban_temples');s.world.characters[temple.council[0]].alive=false;s.month=6;advanceReligion(s);s.year++;s.month=1;advanceReligion(s);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return temple.council[0]});
 await page.reload();await page.locator('[data-tab="government"]').click();await page.locator(`[data-gene-person="${replacement}"]`).click();assert.match(await page.locator('[data-gene-origin]').innerText(),/文化来源: 埃及神庙社群/);
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();await page.locator(`[data-gene-person="${replacement}"]`).click();assert.match(await page.locator('[data-gene-origin]').innerText(),/文化来源: 埃及神庙社群/);
 assert.deepEqual(errors,[]);console.log('Distinct opening portraits and a funded Egyptian temple successor load through the family tree and survive save/load.');
}finally{await browser.close()}
