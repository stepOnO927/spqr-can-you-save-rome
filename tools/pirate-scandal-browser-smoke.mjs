import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname==='/test-shell'){await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body><div id="reports"></div></body></html>'});return}
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/test-shell');
 const views=await page.evaluate(async()=>{
  const {newGrandGame}=await import('/engine.js?v=255');
  const {supportPirates,advanceNaval}=await import('/naval.js?v=75');
  const {renderNavalPanel}=await import('/map-lab/naval-ui.js?v=99');
  const s=newGrandGame('senate');s.seed=Math.imul(35,2654435761)>>>0;
  s.regions.find(r=>r.id==='illyricum').owner='caesar';
  s.naval.routes.find(r=>r.id==='adriatic-commerce').lastDispatch={year:s.year,month:s.month};
  supportPirates(s,'senate','illyrian-raiders');
  const root=document.querySelector('#reports');
  const view=(player,lang)=>{s.player=player;renderNavalPanel({state:s,lang,root,section:'reports',onAction:()=>({ok:true})});return root.innerText};
  renderNavalPanel({state:s,lang:'en',root,section:'intelligence',onAction:()=>({ok:true})});
  const fundedButton=root.querySelector('[data-support-pirates="illyrian-raiders"]');
  const funded={disabled:fundedButton.disabled,label:fundedButton.innerText,risk:root.innerText};
  renderNavalPanel({state:s,lang:'zh',root,section:'intelligence',onAction:()=>({ok:true})});
  const chineseRisk=root.innerText;
  const before=view('caesar','en');s.player='senate';advanceNaval(s);
  const sponsor=view('senate','en'),victim=view('caesar','zh'),unrelated=view('egypt','en');
  s.naval.reports.unshift({id:'older-scandal',kind:'scandal',zone:'adriatic',owner:'senate',year:s.year,month:s.month});
  const older=view('senate','en');
  s.player='senate';renderNavalPanel({state:s,lang:'en',root,section:'intelligence',onAction:()=>({ok:true})});
  return {before,funded,chineseRisk,sponsor,victim,unrelated,older,afterExposureCanFund:!root.querySelector('[data-support-pirates="illyrian-raiders"]').disabled};
 });
 assert.doesNotMatch(views.before,/PIRATE SPONSORSHIP EXPOSED/);
 assert.equal(views.funded.disabled,true);
 assert.equal(views.funded.label,'ALREADY FUNDED');
 assert.match(views.funded.risk,/may still raid your own trade/);
 assert.match(views.chineseRisk,/可能伤及自己的商路/);
 assert.match(views.sponsor,/PIRATE SPONSORSHIP EXPOSED/);
 assert.match(views.sponsor,/Legitimacy fell by 3/);
 assert.match(views.victim,/海盗资助丑闻/);
 assert.match(views.victim,/关系下降4/);
 assert.doesNotMatch(views.unrelated,/PIRATE SPONSORSHIP EXPOSED/);
 assert.match(views.older,/older report did not preserve affected states/);
 assert.equal(views.afterExposureCanFund,true);
 assert.deepEqual(errors,[]);
 console.log('Pirate scandal browser smoke passed: secret before exposure, bilingual sponsor and victim reports, unrelated command hidden');
}finally{await browser.close()}
