import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-name-disagreement-1');
  const state=newGame('senate');
  state.wars=[];
  for(const army of state.armies){army.move=null;army.siege=null}
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#inventions').click();
 await page.locator('[data-node="ritual_precinct"]').click();
 assert.match(await page.locator('.invention-detail').innerText(),/地方祭仪场所（游戏复原）/);
 await page.locator('#invention-research').click();
 await page.locator('#invention-close').click();
 for(let i=0;i<4;i++)await page.locator('#advance').click();
 await page.locator('[data-city="ROMA"]').click({force:true});
 await page.locator('#city-region').click();
 await page.locator('#construct-choice').selectOption('ritual_precinct');
 await page.locator('#construct-start').click();
 assert.match(await page.locator('#construct-feedback').innerText(),/已开工/);
 await page.locator('#save').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.regions.find(r=>r.id==='roma').construction.id,'ritual_precinct');
 for(let i=0;i<4;i++)await page.locator('#advance').click();
 await page.locator('#save').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.ok(saved.regions.find(r=>r.id==='roma').buildings.includes('ritual_precinct'));
 await page.locator('#language').click();
 await page.locator('[data-city="ROMA"]').click({force:true});
 await page.locator('#city-region').click();
 assert.match(await page.locator('#command-detail').innerText(),/Local ritual precinct \(game reconstruction\)/);
 assert.deepEqual(errors,[]);
 console.log('Local ritual precinct researched, constructed, saved and shown in both languages.');
}finally{await browser.close()}
