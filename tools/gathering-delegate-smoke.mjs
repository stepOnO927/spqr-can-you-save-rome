import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
async function setup(noDelegate=false){
 await page.evaluate(async noDelegate=>{
  const {newGame}=await import('/engine.js?v=gathering-delegate-1');
  const {advanceMail}=await import('/epistulae.js?v=gathering-delegate-1');
  const s=newGame('caesar');s.wars=[];s.month=8;
  const host=s.world.characters['fictional:1'];
  host.location=s.world.characters.caesar.location='cisalpine';
  for(const p of Object.values(s.world.characters))if(p.faction==='caesar'&&p.id!==host.id&&p.id!=='caesar')p.location=noDelegate?null:'cisalpine';
  advanceMail(s);
  const letter=s.mail.messages.find(m=>m.context?.kind==='banquet');letter.delivery='received';
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 },noDelegate);
 await page.reload();await page.locator('#mail-open').click();
}
async function save(){
 await page.locator('#mail-close').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
 return page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
}
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await setup();
 const select=page.locator('#mail-representative'),send=page.locator('[data-mail-reply="representative"]');
 assert.equal(await send.isDisabled(),true);
 assert.ok(await select.locator('option').count()>=3);
 await select.selectOption('lepidus');
 assert.equal(await send.isEnabled(),true);
 await send.click();
 assert.match(await page.locator('.mail-letter').innerText(),/雷必达/);
 let state=await save(),event=state.mail.events.find(e=>e.id.startsWith('invitation:'));
 assert.equal(event.participantId,'lepidus');
 assert.equal(event.representativeName[1],'马尔库斯·埃米利乌斯·雷必达');
 await page.evaluate(async state=>{
  const {advanceMail}=await import('/epistulae.js?v=gathering-delegate-1');
  const event=state.mail.events.find(e=>e.id.startsWith('invitation:')),year=Math.floor((event.date-1)/12);
  state.year=year;state.month=event.date-year*12;advanceMail(state);
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state}));
 },state);
 await page.reload();
 await page.locator('#mail-open').click();
 await page.locator('[data-mail-select]').filter({hasText:'宴会开始'}).click();
 assert.match(await page.locator('.mail-letter').innerText(),/雷必达/);
 await page.locator('[data-mail-reply="speak_host"]').click();
 state=await save();event=state.mail.events.find(e=>e.id.startsWith('invitation:'));
 assert.equal(event.status,'completed');
 assert.equal(state.world.personalRelations[[event.hostId,'lepidus'].sort().join(':')].trust,2);
 assert.equal(state.world.personalRelations[[event.hostId,'caesar'].sort().join(':')],undefined);
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await setup(true);
 assert.equal(await page.locator('[data-mail-reply="representative"]').isDisabled(),true);
 assert.match(await page.locator('#mail-representative').innerText(),/没有可用代表/);
 assert.equal(await page.locator('[data-mail-reply="decline"]').isEnabled(),true);
 assert.deepEqual(errors,[]);
 console.log('The named delegate attended, met the host and retained the correct saved relationship.');
}finally{await browser.close()}
