import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const [side,army,destination] of [['caesar','xiii','italiaN'],['senate','italy','cisalpine']]){
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
  await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});
  await page.locator('#roman-faction').selectOption(side);
  await page.locator('#start-free').click();
  const marker=page.locator(`[data-army="${army}"]`);await marker.waitFor();
  if(await marker.isVisible())await marker.click({force:true});else await marker.dispatchEvent('click');
  const dossier=page.locator('#command-detail');
  assert.match(await dossier.innerText(),/士气|Morale/);
  assert.match(await dossier.innerText(),/附近已知威胁|Known nearby threats/);
  assert.equal(await dossier.locator('.army-portrait').count(),1);
  await dossier.locator('[data-order="defend"]').click();
  assert.match(await dossier.innerText(),/防御|Defend/);
  await dossier.locator('[data-order="cancel"]').click();
  await page.locator('#lab-orders select').selectOption(destination);
  assert.match(await dossier.locator('.preview-detail').innerText(),/个月|month/);
  await page.locator('#lab-orders button').click();
  for(let i=0;i<4&&await page.locator('#recent-battle').count()===0;i++)await page.locator('#advance').click();
  assert.equal(await page.locator('#recent-battle').count(),1,`${side} should fight`);
  await page.locator('#recent-battle').click();
  assert.match(await dossier.innerText(),/防守方地形系数|Defender terrain factor/);
  assert.match(await dossier.innerText(),/敌方具体数据未经核实|Enemy details remain unverified/);
  await page.locator('#save').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  assert.ok(saved.battles.some(b=>b.attacker.owner===side||b.defender.owner===side));
  assert.ok(saved.battles[0].lossA>0&&saved.battles[0].lossD>0);
  assert.ok(saved.armies.some(a=>a.owner!==side&&(a.move||a.order)),`${side} should see an AI response in simulation`);
  const ready=saved.armies.find(a=>a.owner===side&&!a.move&&!a.siege);
  assert.ok(ready,`${side} should retain a field command`);
  const next=page.locator(`[data-army="${ready.id}"]`);if(await next.isVisible())await next.click({force:true});else await next.dispatchEvent('click');
  await page.locator('#command-detail [data-order="hold"]').click();
  await page.locator('#save').click();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  assert.equal(after.armies.find(a=>a.id===ready.id).order.kind,'hold');
  assert.deepEqual(errors,[]);
  console.log(`${side}: commander, march, battle, AI, second order verified`);
  await page.close();
 }
}finally{await browser.close()}
