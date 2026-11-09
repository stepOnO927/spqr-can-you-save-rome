// MANDATE OF HEAVEN — technical acceptance tests 31–38.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newGame,tick as romanTick,upgradeSave} from '../engine.js?v=imperium-1';
import {REGIONS as ROMAN_REGIONS} from '../data.js?v=phase-x-1';
import {newHanGame,tick,serialize,loadHanSave,SAVE_KEY,finalizeHan,canFinalize,visibleProgress,DLC_ID} from '../han/engine.js?v=han-1';
import {REGIONS} from '../han/data.js?v=han-1';
import {drawMap} from '../han/map.js?v=han-1';
import {validateTrees} from '../han/focus.js?v=han-1';
import {EDICTS} from '../han/court.js?v=han-1';
import {__test} from '../han/ui.js?v=han-1';

test('31. existing Roman campaigns still work and contain no Han data',()=>{
 const s=newGame('caesar');for(let i=0;i<6;i++)romanTick(s);
 assert.ok(s.year<=-48);
 const han=new Set(REGIONS.map(r=>r.id));
 assert.ok(!ROMAN_REGIONS.some(r=>han.has(r.id)),'no shared territory ids');
 assert.ok(!s.regions.some(r=>han.has(r.id)));
 const app=fs.readFileSync('app.js','utf8');assert.ok(app.includes("spqr-save-"),'Roman save keys unchanged');
});

test('32. existing saves are preserved: Roman saves load as before and are never read as Han saves',()=>{
 const roman=newGame('senate');const raw=JSON.stringify(roman);
 const back=upgradeSave(JSON.parse(raw));assert.equal(back.player,'senate');
 assert.throws(()=>loadHanSave(raw),/Not a Mandate of Heaven save/);
 assert.notEqual(SAVE_KEY(1),'spqr-save-1');assert.match(SAVE_KEY(1),/^spqr-han-save-/);
});

test('33. a Chinese campaign saves and loads correctly',()=>{
 const s=newHanGame('han',{seed:9});for(let i=0;i<30;i++)tick(s);
 const l=loadHanSave(serialize(s));
 assert.equal(l.dlc,DLC_ID);assert.equal(l.year,s.year);assert.equal(l.month,s.month);
 assert.deepEqual(l.regions,s.regions);assert.deepEqual(l.armies,s.armies);assert.deepEqual(l.throne,s.throne);assert.deepEqual(l.silk,s.silk);
 for(let i=0;i<6;i++){tick(l);tick(s)}
 assert.equal(l.throne.orthodox,s.throne.orthodox);assert.deepEqual(l.factions.han,s.factions.han,'deterministic after load');
 for(const p of ['huhanye','qiuci','wusun']){const x=newHanGame(p,{seed:2});for(let i=0;i<12;i++)tick(x);assert.equal(loadHanSave(serialize(x)).player,p)}
});

test('34. Chinese and English both work in every panel',()=>{
 const s=newHanGame('han',{seed:3});for(let i=0;i<14;i++)tick(s);__test.state=s;
 for(const [k,v] of Object.entries(__test.T))assert.ok(Array.isArray(v)&&v.length===2&&v.every(x=>x.trim()),k);
 for(const lang of [0,1]){__test.setLang(lang);
  for(const [name,fn] of Object.entries(__test.panels)){const html=fn();assert.ok(html.length>80,name);assert.doesNotMatch(html,/undefined|NaN|\[object/,`${name} lang ${lang}`);
   if(lang)assert.match(html,/[一-鿿]/,name)}}
 __test.setLang(0);
 // non-Han players see a working, smaller set of panels
 const q=newHanGame('qiuci',{seed:3});__test.state=q;for(const n of ['panelFocus','panelFrontier','panelSilk','panelArmy','panelProvinces','panelRecords','panelEmperor'])assert.doesNotMatch(__test.panels[n](),/undefined|NaN/,n);
});

test('35. the strategic map stays responsive',()=>{
 const s=newHanGame('han',{seed:3});drawMap(s,{});
 const t0=performance.now();for(let i=0;i<20;i++)drawMap(s,{lang:i%2,camera:['all','core','hexi','west','steppe'][i%5]});const per=(performance.now()-t0)/20;
 assert.ok(per<40,`map render ${per.toFixed(1)} ms`);
 const svg=drawMap(s,{});assert.equal((svg.match(/class="territory[^"]*" data-region=/g)||[]).length,REGIONS.length,'every drawn territory is a simulation region');
 for(const m of ['political','circuits','theaters','terrain'])assert.ok(drawMap(s,{mode:m}).includes('b-'),m+' draws borders');
 assert.ok(svg.includes('b-state')&&svg.includes('b-theater-soft'),'state and theatre borders are drawn');
});

test('36. AI planning does not freeze the browser',()=>{
 for(const sc of ['historical','usurper','disputed']){
  const s=newHanGame('kangju',{scenario:sc,seed:13});let worst=0;const t0=performance.now();
  for(let i=0;i<120;i++){const a=performance.now();tick(s);worst=Math.max(worst,performance.now()-a)}
  const avg=(performance.now()-t0)/120;assert.ok(avg<15,`${sc} avg ${avg.toFixed(2)} ms`);assert.ok(worst<120,`${sc} worst ${worst.toFixed(1)} ms`);
 }
});

test('37. no empty placeholder mechanics are presented as complete',()=>{
 assert.deepEqual(validateTrees(),[]);
 const ui=fs.readFileSync('han/ui.js','utf8');
 const acts=[...new Set([...ui.matchAll(/data-act="([a-z-]+)"/g)].map(m=>m[1]))];
 for(const a of acts)assert.ok(ui.includes(`case '${a}'`),`button ${a} has a handler`);
 const court=fs.readFileSync('han/court.js','utf8');
 for(const [k,e] of Object.entries(EDICTS))assert.ok(court.includes(`case '${e.effect}'`),`edict ${k} has an effect`);
 // the eleven required panels exist and render
 for(const p of ['panelEmperor','panelGenealogy','panelCourt','panelOfficials','panelSuccession','panelFocus','panelFinance','panelFrontier','panelSilk','panelArmy','panelProvinces'])assert.equal(typeof __test.panels[p],'function',p);
});

test('38. hidden achievements stay concealed during play and are paid once',()=>{
 const s=newHanGame('han',{seed:17});__test.state=s;__test.setLang(0);
 for(let i=0;i<121;i++)tick(s);
 assert.equal(visibleProgress(s).achievements,null);
 assert.doesNotMatch(__test.panels.panelRecords(),/The Liu Line Unbroken|Laurel Coins: \+/);
 assert.ok(canFinalize(s));
 const store=new Map();const ls={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
 const r=finalizeHan(s,ls);assert.ok(r.ok);assert.ok(Array.isArray(r.archive.achievements));
 assert.equal(finalizeHan(s,ls).ok,false,'cannot finalize twice');
 const coins=Number(ls.getItem('spqr-laurel-coins'));
 const t=newHanGame('han',{seed:17});for(let i=0;i<121;i++)tick(t);finalizeHan(t,ls);
 assert.equal(Number(ls.getItem('spqr-laurel-coins')),coins,'the same achievements never pay again');
 // continuing play after finalization does not change the archive
 const before=JSON.stringify(s.finalized);tick(s);assert.equal(JSON.stringify(s.finalized),before);
});
