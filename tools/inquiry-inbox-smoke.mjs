import {chromium} from 'playwright';import assert from 'node:assert/strict';
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
try{for(const [seed,expected] of [[1,'no_reply'],[2,'answered'],[8,'refused']]){
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async seed=>{const {newGame}=await import('/engine.js?v=official-inquiries-1'),s=newGame('caesar');s.wars=[];s.seed=(seed*7000013)>>>0;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))},seed);
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});await page.locator('.city-marker').first().waitFor();await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();await page.locator('#inquiry-subject').selectOption('leaders');await page.locator('#send-inquiry').click();
 const requested=s=>s.inquiries.find(r=>r.actor==='caesar'&&r.target==='egypt'&&r.subject==='leaders');
 const inquiryReplies=s=>s.mail.messages.filter(m=>m.context?.kind==='inquiry_result'&&m.context?.target==='egypt'&&m.context?.subject==='leaders');
 for(let i=0;i<3;i++)await page.locator('#advance').click();await page.locator('#save').click();let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(requested(s)?.status,'pending');assert.equal(inquiryReplies(s).length,0);
 await page.locator('#load').click();await page.locator('#advance').click();await page.locator('#save').click();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(requested(s)?.status,expected);const replies=inquiryReplies(s);assert.equal(replies.length,expected==='no_reply'?0:1);
 if(replies.length){await page.locator('#atlas-mail').click();await page.locator(`[data-mail-select="${replies[0].id}"]`).click();const text=await page.locator('.mail-letter').innerText();assert.match(text,expected==='refused'?/不愿回答/:/未经独立核实/);if(expected==='answered')assert.match(text,/克娄巴特拉|托勒密/)}await page.close();
 }assert.deepEqual(errors,[]);console.log('Official inquiries deliver answers or refusals to the inbox; lost replies stay absent.');
}finally{await browser.close()}
