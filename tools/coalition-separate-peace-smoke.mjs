import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}/`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const engine=await import('/engine.js?v=world-kings-massilia-1');
  const {formCoalition}=await import('/coalitions.js?v=world-kings-massilia-1');
  const s=engine.newGame('caesar');
  s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
  if(!formCoalition(s,'caesar',['egypt','numidia'],'senate',engine.estimatedStrength).ok)throw Error('coalition not formed');
  if(!engine.diplomacy(s,'senate','egypt','war'))throw Error('coalition war not started');
  if(!engine.diplomacy(s,'caesar','senate','peace',{acceptedByPlayer:true}))throw Error('separate peace not reached');
  if(engine.isWar(s,'caesar','senate')||!engine.isWar(s,'egypt','senate'))throw Error('bilateral peace changed ally war');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();
 await page.locator('[data-tab="government"]').click();
 assert.match(await page.locator('body').innerText(),/Your separate peace exempts coalition call to arms until/);
 assert.deepEqual(errors,[]);
 console.log('Built campaign shows the separate-peace charter consequence while an ally remains at war.');
}finally{await browser.close()}
