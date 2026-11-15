import {chromium} from 'playwright';import assert from 'node:assert/strict';
// IMPERIUM browser smoke: focus tree, legion designer and operational planner in Chrome.
const b=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await p.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await p.evaluate(async()=>{const e=await import('/engine.js?v=player-aid-letter-1'),s=e.newGame('caesar');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});await p.reload();
 await p.locator('[data-tab="focus"]').click();await p.locator('[data-imp-open-focus]').click();
 await p.locator('g[data-imp-focus="cae_fate_republic"]').click();await p.locator('[data-imp-start-focus="cae_fate_republic"]').click();
 assert.match(await p.locator('g[data-imp-focus="cae_fate_republic"]').innerHTML(),/进行中/);
 await p.locator('g[data-imp-focus="cae_appeal_senate"]').click();assert.match(await p.locator('.imp-drawer').innerText(),/元老院/);
 await p.locator('[data-imp-zoom="in"]').click();await p.locator('[data-imp-close-focus]').click();
 await p.locator('[data-tab="legions"]').click();await p.locator('[data-imp-slot="roman_cavalry"][data-d="1"]').click();
 await p.fill('#imp-tname','LEGIO XIII');await p.locator('[data-imp-save-new]').click();
 assert.ok(await p.locator('.imp-col-list li',{hasText:'LEGIO XIII'}).count());
 await p.selectOption('#imp-army','viii');assert.match(await p.locator('.imp-col-stats').innerText(),/需要/);
 await p.locator('[data-tab="plans"]').click();await p.fill('#imp-pname','Italia');await p.locator('[data-imp-new-plan]').click();
 await p.selectOption('#imp-mode','automatic');await p.selectOption('#imp-add-army','xiii');await p.locator('[data-imp-draw]').click();
 await p.evaluate(()=>document.querySelector('[data-map-group*="italiaN"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
 assert.match(await p.locator('.imp-path').innerText(),/意大利北部/);await p.locator('[data-imp-finish]').click();
 await p.locator('[data-imp-approve]').click();await p.locator('#step').click();
 assert.ok(await p.locator('#imp-overlay .imp-arrow, #imp-overlay .imp-sym').count()>0);
 assert.match(await p.locator('.imp-plan').innerText(),/风险评估/);
 await p.locator('#lang').click();assert.match(await p.locator('.imp-plan').innerText(),/Risk assessment/i);
 assert.deepEqual(errors,[]);console.log('IMPERIUM focus tree, legion designer and battle planner verified in Chrome');
}finally{await b.close()}
