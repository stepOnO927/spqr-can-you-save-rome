import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=regional-mail-merge-1'),{createPlan,assignRole}=await import('/battle-plans.js?v=regional-court-1');const s=newGame('caesar');s.regions.find(r=>r.id==='italiaN').fort=5;delete s.fortKnowledge.caesar.italiaN;const plan=createPlan(s,'caesar',{name:'观察测试'}).plan;if(!assignRole(s,'caesar',plan.id,{armyId:'xiii',role:'siege',target:'italiaN'}).ok)throw Error('Cannot plan unknown target');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});
 await page.reload();await page.locator('[data-tab="plans"]').click();await page.locator('[data-imp-plan="plan:1"]').click();let text=await page.locator('.imp-plan').innerText();assert.match(text,/意大利北部\s*·\s*未知/);assert.doesNotMatch(text,/意大利北部\s*·\s*5/);
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="plans"]').click();await page.locator('[data-imp-plan="plan:1"]').click();text=await page.locator('.imp-plan').innerText();assert.match(text,/意大利北部\s*·\s*未知/);assert.deepEqual(errors,[]);console.log('Unknown fortifications remain unknown in operation planning after save/load.');
}finally{await browser.close()}
