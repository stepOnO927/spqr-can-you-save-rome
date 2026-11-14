import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(process.env.SPQR_TEST_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 async function campaign(delivered){
  await page.evaluate(async delivered=>{const {newGame}=await import('/engine.js?v=coalition-courier-1');const s=newGame('caesar');
   const warning={id:'warning:test',from:'numidia',to:'caesar',threat:'senate',near:'italiaN',sentYear:s.year,sentMonth:s.month,status:delivered?'unresponded':'delayed',sighting:{armyId:'test-army',region:'italiaN',year:s.year,month:s.month,strengthBand:[9999,12345]},history:[{status:'sent',year:s.year,month:s.month}]};
   if(delivered){warning.deliveredYear=s.year;warning.deliveredMonth=s.month;warning.decision={kind:'player_discretion'};warning.history.push({status:'unresponded',year:s.year,month:s.month})}
   s.warningLetters=[warning];sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
  },delivered);
  await page.reload();await page.locator('[data-tab="chessboard"]').click();return page.locator('.board-evidence').innerText();
 }
 assert.doesNotMatch(await campaign(false),/9999–12345/);
 const delivered=await campaign(true);assert.match(delivered,/收到的盟友预警/);assert.match(delivered,/9999–12345/);assert.match(delivered,/可能已过时/);assert.deepEqual(errors,[]);
 console.log('Only delivered warnings appear in the chessboard dossier.');
}finally{await browser.close()}
