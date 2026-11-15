import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 if(await page.locator('#start-campaign').count())await page.locator('#start-campaign').click();
 await page.locator('[data-tab="military"]').click();
 await page.locator('#open-expedition-planner').click();
 await page.waitForURL(/\/map-lab\//);
 await page.locator('.route-planner select').selectOption('gaul');
 await page.getByRole('button',{name:'COMPARE ROUTES'}).click();
 const brief=page.locator('.route-brief').first();
 await brief.locator('summary').click();
 const text=await brief.innerText();
 for(const phrase of ['Territorial objective: Further Gaul','Home base: Cisalpine Gaul','Supply requirement','Political access by leg','Known risks'])assert.ok(text.includes(phrase),phrase);
 await page.locator('.route-choice').first().getByRole('button',{name:'START EXPEDITION'}).click();
 assert.match(await page.locator('#command-detail').innerText(),/LEG-BY-LEG EXPEDITION/);
 await page.locator('#save').click();
 await page.locator('#load').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.armies.find(army=>army.id==='xiii').expedition.destination,'gaul');
 await page.locator('.army[data-army="xiii"]').click();
 assert.match(await page.locator('#command-detail').innerText(),/LEG-BY-LEG EXPEDITION/);
 assert.deepEqual(errors,[]);
 console.log('War Council opens the real route brief; a leg-by-leg expedition starts and survives save/load.');
}finally{await browser.close()}
