// MANDATE OF HEAVEN — strategic acceptance tests 11–20.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,tick,moveArmy} from '../han/engine.js?v=peace-cursus-1';
import {ROUTES,REGIONS,OASIS} from '../han/data.js?v=han-1';
import {PRESETS,templateStats,supplyFor,resolveBattle,marchMonths,recruitQuote,recruit,validateMix,saveTemplate} from '../han/military.js?v=han-1';
import {propose,proposalScore,protectorateAction,access,declareWar,knownStrength,aiMilitary,observe,relation} from '../han/frontier.js?v=han-1';
import {tradePath,legOpen,advanceSilk,embassyConditions,sendTradeEmbassy} from '../han/silk-road.js?v=han-1';
import {monthIndex} from '../han/util.js?v=han-1';

const game=(p='han',o={})=>newHanGame(p,{seed:5,...o});
const army=(s,owner,region,tpl,men=10000)=>{const t=PRESETS[tpl];const a={id:'t'+Math.random().toString(36).slice(2),owner,region,men,morale:70,training:50,supply:100,template:{id:t.id,name:t.name,mix:{...t.mix}},commander:null,move:null};s.armies.push(a);return a};

test('11. Han troops march across valid Chinese territories along real routes',()=>{
 const s=game();const a=s.armies.find(x=>x.owner==='han'&&x.region==='changan');
 assert.equal(moveArmy(s,a.id,'shu').ok,false,'Chang’an and Shu are not adjacent');
 const r=moveArmy(s,a.id,'tianshui');assert.ok(r.ok);
 for(let i=0;i<r.months;i++)tick(s);assert.equal(a.region,'tianshui');
 // every route joins two existing regions; the graph is connected from Chang’an
 const ids=new Set(REGIONS.map(x=>x.id));for(const l of ROUTES){assert.ok(ids.has(l.a)&&ids.has(l.b),`${l.a}-${l.b}`)}
 const seen=new Set(['changan']),q=['changan'];while(q.length){const c=q.shift();for(const l of ROUTES){const n=l.a===c?l.b:l.b===c?l.a:null;if(n&&!seen.has(n)){seen.add(n);q.push(n)}}}
 assert.equal(seen.size,REGIONS.length,'all territories reachable');
 // passes and deserts take longer than roads
 const t=army(s,'han','changan','field');t.region='hanzhong';const pass=marchMonths(s,t,'shu');t.region='henan';const road=marchMonths(s,t,'huaiyang');assert.ok(pass>road);
});

test('12. supply works through roads, passes and frontier routes; deserts punish the unprepared',()=>{
 const s=game();
 const field=army(s,'han','shanshan','field',30000);const sp1=supplyFor(s,field,{access:(a,b)=>access(s,a,b)});
 const home=army(s,'han','henan','field',30000);const sp2=supplyFor(s,home,{access:(a,b)=>access(s,a,b)});
 assert.ok(sp1.capacity<sp2.capacity,'an oasis supports fewer troops than the Central Plain');
 const inf=army(s,'han','monan','field',30000);s.regions.find(r=>r.id==='monan').owner='zhizhi';
 const sp3=supplyFor(s,inf,{access:()=>false});assert.ok(sp3.attrition>0,'a large infantry army starves in enemy steppe');
 const horde=army(s,'zhizhi','monan','chanyu',30000);const sp4=supplyFor(s,horde,{access:()=>true});assert.ok(sp4.attrition<sp3.attrition,'herds sustain a steppe host');
 // attrition really removes soldiers
 const before=inf.men;for(let i=0;i<3;i++)tick(s);assert.ok(s.armies.find(a=>a.id===inf.id)===undefined||s.armies.find(a=>a.id===inf.id).men<before);
});

test('13. Han units use their own formation rules (Han Army Organizer)',()=>{
 const s=game();
 const field=templateStats(PRESETS.field),cav=templateStats(PRESETS.cavalry),gar=templateStats(PRESETS.garrison),siege=templateStats(PRESETS.siege);
 assert.ok(cav.speed>field.speed);assert.ok(gar.def>field.def);assert.ok(siege.siege>field.siege*2);assert.ok(field.antiCavalry>0,'crossbows counter cavalry');
 assert.deepEqual(validateMix('han',{kongxian:100}),['culture:kongxian'],'Han cannot field Xiongnu components');
 assert.ok(saveTemplate(s,'han',{name:'Western column',mix:{qishi:40,nu:30,zhuanshu:30}}).ok);
 const q=recruitQuote(s,'han','changan','garrison');assert.ok(q.problems.includes('frontier_only'),'garrisons are raised on the frontier');
 const ok=recruitQuote(s,'han','wuwei','garrison');assert.ok(ok.ok,JSON.stringify(ok.problems));
 s.factions.han.horses=0;assert.ok(recruitQuote(s,'han','beidi','cavalry').problems.includes('horses'),'cavalry needs horses');
});

test('14. Xiongnu forces fight differently: mounted archery, withdrawal and pursuit',()=>{
 const s=game();
 const horde=templateStats(PRESETS.chanyu);assert.ok(horde.speed>1.5&&horde.herd>0.9&&horde.withdraw>0.9);
 // outmatched, the steppe host withdraws instead of being destroyed
 const han=army(s,'han','monan','field',40000),hu=army(s,'zhizhi','monan','raiders',8000);
 const r=resolveBattle(s,[han],[hu],'monan',{rand:()=>0.5});assert.equal(r.outcome,'defender_withdrew');assert.ok(hu.men>=7700);
 // victorious horsemen pursue: losses to a beaten infantry army exceed normal
 const s2=game();const inf=army(s2,'han','monan','field',8000),big=army(s2,'zhizhi','monan','chanyu',30000);
 const r2=resolveBattle(s2,[inf],[big],'monan',{rand:()=>0.5});assert.equal(r2.outcome,'defender_won');assert.ok(r2.losses.attacker>8000*0.25);
 // subject tribes melt away after defeat
 const s3=game();const t=army(s3,'zhizhi','yunzhong','tribal',12000);const h=army(s3,'han','yunzhong','field',40000);t.withdrawing=false;
 const r3=resolveBattle(s3,[t],[h],'yunzhong',{rand:()=>0.5});assert.ok(r3.outcome==='attacker_withdrew'||r3.losses.tribalDesertion>0);
});

test('15. oasis kingdoms make autonomous political decisions',()=>{
 const s=game();for(const o of OASIS){s.protectorate.oasis[o].concern=70;s.protectorate.oasis[o].han=30;s.protectorate.oasis[o].xiongnu=60}
 for(let i=0;i<24;i++)tick(s);
 const acts=OASIS.map(o=>s.protectorate.oasis[o].lastAct).filter(Boolean);
 assert.ok(acts.length>0,'rulers act on their own');
 assert.ok(acts.some(a=>['courts_xiongnu','refuses_levy'].includes(a)),'resentful rulers resist: '+acts.join(','));
});

test('16. Han and foreign AI negotiate; answers come from each court’s own interests',()=>{
 const s=game();
 const r=propose(s,'han','huhanye','market');assert.ok(r.ok);assert.notEqual(r.proposal.status,'pending');
 assert.ok(proposalScore(s,{from:'han',to:'zhizhi',type:'tributary'})<0,'Zhizhi refuses to submit');
 const p=propose(s,'han','zhizhi','hostage');assert.equal(p.proposal.status,'rejected');
 // the player receives proposals addressed to them and decides
 const q=propose(s,'qiuci','han','protection');assert.equal(q.proposal.status,'pending');
});

test('17. Western Regions diplomacy has real effects (access, supply, tribute, standing)',()=>{
 const s=game();const o='yanqi';s.protectorate.oasis[o].han=45;
 assert.equal(access(s,'han',o),false,'below 50 standing, no route access for troops');
 s.court.offices.duhu='gan-yanshou';
 const before=s.protectorate.oasis[o].han;protectorateAction(s,o,'envoy');assert.ok(s.protectorate.oasis[o].han>before);
 assert.equal(access(s,'han',o),true,'the envoy opens the road');
 const t=s.factions.han.treasury;s.protectorate.oasis[o].han=90;let tribute=0;for(let i=0;i<24;i++){tick(s);tribute+=s.protectorate.oasis[o].tribute}
 assert.ok(s.protectorate.oasis[o].tribute>0,'a loyal oasis sends tribute');
 // a garrison raises concern for autonomy
 const c=s.protectorate.oasis.qiuci.concern;protectorateAction(s,'qiuci','garrison');assert.ok(s.protectorate.oasis.qiuci.concern>c);
});

test('18. trade routes require geographic connectivity and political access',()=>{
 const s=game();
 const p=tradePath(s);assert.ok(p,'the road is open at the start');assert.equal(p[0],'changan');assert.equal(p[p.length-1],'mediterranean_gate');
 assert.ok(p.includes('dunhuang'),'caravans pass the Hexi Corridor and Dunhuang');
 for(let i=0;i<p.length-1;i++)assert.ok(ROUTES.some(l=>(l.a===p[i]&&l.b===p[i+1])||(l.b===p[i]&&l.a===p[i+1])),'only real routes');
 // close Dunhuang: no alternative route exists
 s.regions.find(r=>r.id==='dunhuang').owner='qiang';s.wars.push(['han','qiang']);
 assert.equal(tradePath(s),null);advanceSilk(s);assert.ok(s.silk.blocked);
});

test('19. distant Roman–Han contact is not instantaneous',()=>{
 const s=game();
 assert.equal(s.silk.contact.lijian.level,'unknown','no knowledge of the far west at the start');
 assert.equal(embassyConditions(s).ok,false);assert.equal(sendTradeEmbassy(s).ok,false);
 for(let i=0;i<24;i++)tick(s);
 assert.equal(s.silk.contact.lijian.level,'unknown','after two years still only goods in transit');
 let months=24;while(s.silk.contact.lijian.level==='unknown'&&months<200){tick(s);months++}
 assert.ok(months>=48,'rumours need years to come back: '+months);
 assert.notEqual(s.silk.contact.lijian.level,'embassy');
});

test('20. enemy AI respects fog of war',()=>{
 const s=game('han');
 // a huge hidden Han army two regions away is invisible to Zhizhi
 const hidden=army(s,'han','zhangye','field',50000);s.wars.push(['han','zhizhi']);observe(s);
 assert.equal(knownStrength(s,'zhizhi','zhangye'),null);
 // Zhizhi's estimate of a region it cannot see does not change when we add troops there
 const target=s.regions.find(r=>r.id==='shuofang');const known=knownStrength(s,'zhizhi','shuofang');
 army(s,'han','shuofang','field',60000);const after=knownStrength(s,'zhizhi','shuofang');
 assert.deepEqual(after,known,'intelligence updates only on observation');
 // decisions use the intel picture: an AI that saw only a weak garrison attacks
 const z=s.armies.find(a=>a.owner==='zhizhi');z.region='monan';s.regions.find(r=>r.id==='monan').owner='zhizhi';
 s.intel.zhizhi.yunzhong={month:monthIndex(s),owner:'han',armies:[{owner:'han',men:1000}]};
 let ordered=null;aiMilitary(s,'zhizhi',{issueMove:(a,to)=>{if(a.id===z.id)ordered=to}});
 assert.equal(ordered!==null,true,'acts on (possibly stale) intelligence rather than the true map');
});
