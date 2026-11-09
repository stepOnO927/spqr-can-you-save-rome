// MANDATE OF HEAVEN — technical and integration tests (31–38). The Han world
// runs as NPCs inside the Roman campaign; the player is always Roman.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newGame,tick as romanTick,upgradeSave,PLAYABLE as ROMAN_PLAYABLE} from '../engine.js?v=imperium-1';
import {REGIONS as ROMAN_REGIONS} from '../data.js?v=phase-x-1';
import {finalizeCampaign} from '../legacy.js?v=imperium-1';
import {REGIONS} from '../han/data.js?v=han-1';
import {drawMap} from '../han/map.js?v=han-1';
import {validateTrees} from '../han/focus.js?v=han-1';
import {EDICTS} from '../han/court.js?v=han-1';
import {isLiuClan} from '../han/dynasty.js?v=han-1';
import {attachHanWorld,hanWorld,romanView,sendEmbassyToSeres,embassyConditions,RELAY_MONTHS} from '../han/world.js?v=han-1';
import {eastPanel,eastMap} from '../han/east-ui.js?v=han-1';

const roman=(o={})=>{const s=newGame(o.player||'caesar');if(o.dlc!==false)attachHanWorld(s,{seed:7});return s};

test('31. Roman campaigns work with and without the expansion; only Romans are playable',()=>{
 const plain=newGame('caesar');for(let i=0;i<4;i++)romanTick(plain);assert.equal(hanWorld(plain),null);
 const s=roman();for(let i=0;i<4;i++)romanTick(s);
 assert.ok(!ROMAN_PLAYABLE.some(f=>['han','huhanye','zhizhi','wusun','kangju','qiuci'].includes(f)),'no Chinese power is playable');
 assert.equal(hanWorld(s).state.player,null,'every Han-world power is an NPC');
 const han=new Set(REGIONS.map(r=>r.id));assert.ok(!ROMAN_REGIONS.some(r=>han.has(r.id)));
 assert.equal(fs.existsSync('han/index.html'),false,'no separate playable Han campaign');
});

test('32. existing saves are preserved; saves with the expansion re-validate the Han throne',()=>{
 const plain=newGame('senate');const back=upgradeSave(JSON.parse(JSON.stringify(plain)));assert.equal(back.player,'senate');assert.equal(hanWorld(back),null);
 const s=roman();for(let i=0;i<14;i++)romanTick(s);
 const raw=JSON.parse(JSON.stringify(s));raw.world.hanWorld.state.throne.orthodox='fictional-pang-chong';
 const l=upgradeSave(raw);assert.notEqual(hanWorld(l).state.throne.orthodox,'fictional-pang-chong');
 assert.ok(!hanWorld(l).state.throne.orthodox||isLiuClan(hanWorld(l).state,hanWorld(l).state.throne.orthodox));
});

test('33. the Han world shares the Roman calendar and its 49 BCE history',()=>{
 const s=roman();const h=hanWorld(s).state;
 assert.equal(h.year,-49);assert.equal(h.throne.orthodox,'liu-xun','Emperor Xuan still reigns in January 49 BCE');assert.equal(h.throne.heir,'liu-shi');
 for(let i=0;i<12;i++)romanTick(s);
 assert.equal(h.year,s.year);assert.equal(h.month,s.month);
 assert.equal(h.persons['liu-xun'].alive,false,'Xuan dies in January 48 BCE');assert.equal(h.throne.orthodox,'liu-shi');
 assert.equal(h.court.offices.dasima,'shi-gao','deathbed regents appointed');
});

test('34. Rome sees the East only through delayed merchant reports, in both languages',()=>{
 const s=roman();const v=romanView(s);
 assert.equal(v.snapshot.year,-51,'Rome starts with an old account');assert.equal(v.dispatches.length,0);
 for(let i=0;i<20;i++)romanTick(s);
 assert.equal(romanView(s).dispatches.length,0,'nothing fresh arrives within 20 months');
 assert.equal(romanView(s).snapshot.year,-51,'the map still shows the old account');
 let n=20;while(!romanView(s).dispatches.length&&n<80){romanTick(s);n++}
 assert.ok(n>=RELAY_MONTHS.trade,'first report after '+n+' months');
 const d=romanView(s).dispatches.at(-1);assert.ok((s.year*12+s.month)-(d.origin.year*12+d.origin.month)>=RELAY_MONTHS.trade);
 assert.ok(s.log.some(e=>e.eastern),'reports enter the Roman dispatches');
 for(const lang of [0,1]){const html=eastPanel(s,{lang,selected:'changan'});assert.doesNotMatch(html,/undefined|NaN|\[object/);if(lang)assert.match(html,/[一-鿿]/)}
 assert.match(eastPanel(newGame('caesar'),{lang:0}),/not enabled/);
});

test('35. the eastern map stays responsive and draws only reported control',()=>{
 const s=roman();const t0=performance.now();for(let i=0;i<10;i++)eastMap(s,{lang:i%2,camera:['all','core','hexi','west','steppe'][i%5],mode:['political','circuits','theaters','terrain'][i%4]});
 assert.ok((performance.now()-t0)/10<60);
 const svg=eastMap(s,{});assert.equal((svg.match(/class="territory[^"]*" data-east-region=/g)||[]).length,REGIONS.length);
 assert.ok(!/class="army/.test(svg),'no live army positions reach Rome');
 for(const m of ['political','circuits','theaters','terrain'])assert.ok(drawMap({regions:REGIONS,armies:[],silk:{}},{mode:m}).includes('b-'),m);
});

test('36. the NPC East does not freeze the browser',()=>{
 const a=newGame('caesar'),b=roman();
 let t0=performance.now();for(let i=0;i<24;i++)romanTick(a);const base=(performance.now()-t0)/24;
 t0=performance.now();for(let i=0;i<24;i++)romanTick(b);const withDlc=(performance.now()-t0)/24;
 assert.ok(withDlc-base<15,`expansion adds ${(withDlc-base).toFixed(2)} ms per month`);
});

test('37. no placeholder mechanics: every eastern button and edict works',()=>{
 assert.deepEqual(validateTrees(),[]);
 const court=fs.readFileSync('han/court.js','utf8');for(const [k,e] of Object.entries(EDICTS))assert.ok(court.includes(`case '${e.effect}'`),k);
 const app=fs.readFileSync('app.js','utf8');for(const sel of ['#east-embassy','data-east-region','data-east-mode','data-east-camera'])assert.ok(app.includes(sel),sel);
 const s=roman();assert.equal(sendEmbassyToSeres(s).ok,false,'no embassy before any news has arrived');
});

test('38. the expansion achievement stays hidden until finalization',()=>{
 const s=roman();
 let n=0;while(!embassyConditions(s).reports&&n<80){romanTick(s);n++}
 s.factions[s.player].treasury=500;s.regions.find(r=>r.id==='parthia')||assert.fail('parthia');
 const r=sendEmbassyToSeres(s);assert.ok(r.ok,JSON.stringify(embassyConditions(s)));
 let m=0;while(hanWorld(s).embassy.status!=='returned'&&m<200){romanTick(s);m++}
 assert.equal(hanWorld(s).embassy.status,'returned');assert.ok(m>=30+RELAY_MONTHS.trade,'there and back takes years: '+m);
 assert.ok(!JSON.stringify(s.log).includes('Envoys to the Seres'),'not announced as an achievement during play');
 s.victory=true;const f=finalizeCampaign(s);assert.ok(f.ok);assert.ok(f.archive.achievements.some(a=>a.id==='seric_embassy'));
});
