// MANDATE OF HEAVEN — political acceptance tests 21–30.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,tick,serialize,loadHanSave} from '../han/engine.js?v=coalition-courier-1';
import {appoint,adminCapacity,recomputeInfluence,advanceAmbitions,ambitionOptions,issueEdict,startAudit,knownAttributes,answerDebate,respondToDisaster,emperorAuthority,onUsurpation} from '../han/court.js?v=han-1';
import {seizeThrone,statusOf,isLiuClan} from '../han/dynasty.js?v=han-1';
import {startFocus,focusState,advanceFocus,aiChooseFocus,TREES} from '../han/focus.js?v=han-1';
import {protectorateAction} from '../han/frontier.js?v=han-1';
import {PERSON,LATER_HISTORY} from '../han/people.js?v=han-1';

const game=(o={})=>newHanGame('han',{seed:21,start:'accession',...o});

test('21. court factions compete for influence through offices and favor',()=>{
 const s=game();const before=s.court.factions.huanguan.influence;
 appoint(s,'chengxiang','shi-xian');
 assert.equal(s.court.offices.chengxiang,'yu-dingguo','eunuchs are barred from the chancellorship');
 appoint(s,'dasinong','shi-xian');for(let i=0;i<4;i++)recomputeInfluence(s);
 assert.ok(s.court.factions.huanguan.influence>before);
 const ru=s.court.factions.ru.influence;appoint(s,'qianjiangjun','hong-gong');for(let i=0;i<4;i++)recomputeInfluence(s);
 assert.ok(s.court.factions.ru.influence<ru,'losing Xiao Wangzhi’s office costs the classicists');
});

test('22. imperial appointments change actual administration',()=>{
 const s=game();const before=adminCapacity(s);
 s.persons['gen-test']={id:'gen-test',name:['Test','测试'],surname:'Zhang',birthSurname:'Zhang',sex:'m',birth:-90,alive:true,faction:'han',role:'official',courtFaction:'ru',competence:20,corruption:70,loyalty:50,ambition:20};
 appoint(s,'chengxiang','gen-test');assert.ok(adminCapacity(s)<before,'an incompetent, corrupt chancellor weakens administration');
 // the Protector-General drives protectorate diplomacy
 const o='yutian';const t=game();t.protectorate.oasis[o].han=50;protectorateAction(t,o,'envoy');const without=t.protectorate.oasis[o].han;
 const u=game();u.protectorate.oasis[o].han=50;appoint(u,'duhu','gan-yanshou');protectorateAction(u,o,'envoy');assert.ok(u.protectorate.oasis[o].han>without);
 // the clan office requires a Liu
 assert.equal(appoint(s,'zongzheng','fictional-pang-chong').reason,'requires_liu_clan');
});

test('23. an ambitious official may pursue power without rebelling',()=>{
 const s=game({scenario:'usurper'});recomputeInfluence(s);
 const opts=ambitionOptions(s,'fictional-pang-chong');
 assert.notEqual(opts[0].kind,'usurp','controlling the Liu emperor is preferred to proclaiming himself');
 for(let i=0;i<24;i++)tick(s);
 assert.ok(s.throne.regent==='fictional-pang-chong'||s.throne.puppet,'he seeks control');
 assert.ok(!s.throne.dynasty||s.throne.dynasty.orthodox,'no rebellion in the first two years');
 // opposing the emperor is not treason: historical officials keep their posts after disagreement
 assert.ok(s.persons['xiao-wangzhi'].faction==='han');
});

test('24. a Liu restoration is possible after usurpation',()=>{
 const s=game({scenario:'usurper'});s.court.control['fictional-pang-chong']=90;
 const r=seizeThrone(s,'fictional-pang-chong');onUsurpation(s,'fictional-pang-chong',r.displaced);
 s.player='han_loyalist';
 const claimant=s.factions.han_loyalist.claimant;
 // loyalists take Chang'an
 const lo=s.armies.find(a=>a.owner==='han_loyalist');s.armies=s.armies.filter(a=>!(a.region==='changan'&&a.owner==='han'));
 s.regions.find(x=>x.id==='changan').owner='han_loyalist';tick(s);
 assert.equal(s.throne.orthodox,claimant);assert.equal(s.throne.restorations,1);assert.equal(s.throne.dynasty.orthodox,true);
});

test('25. a non-Liu usurper remains distinct from orthodox succession for his whole reign',()=>{
 const s=game({scenario:'usurper'});s.court.control['fictional-pang-chong']=90;seizeThrone(s,'fictional-pang-chong');s.player='huhanye';
 for(let i=0;i<36;i++){tick(s);if(s.persons['fictional-pang-chong'].alive&&s.throne.occupant==='fictional-pang-chong'){assert.equal(statusOf(s,'fictional-pang-chong'),'new_dynasty_founder');assert.equal(s.throne.dynasty.orthodox,false)}}
 assert.ok(!s.throne.orthodox||isLiuClan(s,s.throne.orthodox));
});

test('26. national focuses have real effects',()=>{
 const s=game();
 assert.ok(startFocus(s,'han','han_c1').ok);const st=focusState(s,'han');
 for(let i=0;i<6;i++)advanceFocus(s);
 assert.ok(st.done.includes('han_c1'));assert.ok(s.court.edicts.some(e=>e.type==='irrigation'),'the focus issues an edict that must still be implemented');
 const t=game();const before=t.regions.filter(r=>r.hexi).map(r=>r.fort);startFocus(t,'han','han_d1');for(let i=0;i<4;i++)advanceFocus(t);
 assert.ok(t.regions.filter(r=>r.hexi).every((r,i)=>r.fort>before[i]));
 // completion opens a negotiation, it does not decide it
 const u=game();startFocus(u,'han','han_e1');for(let i=0;i<3;i++)advanceFocus(u);assert.ok(u.proposals.some(p=>p.to==='huhanye'));
});

test('27. AI courts independently select relevant focuses',()=>{
 const s=game();s.player='han';
 for(let i=0;i<3;i++)advanceFocus(s);
 for(const f of ['huhanye','zhizhi','wusun','qiuci','kangju'])assert.ok(focusState(s,f).current||focusState(s,f).done.length,f);
 const h=newHanGame('zhizhi',{seed:4});aiChooseFocus(h,'han');assert.ok(focusState(h,'han').current,'the AI Han court uses the same mechanics');
});

test('28. public unrest can lead to reform or rebellion',()=>{
 const s=game();const r=s.regions.find(x=>x.id==='dongping');r.loyalty=20;r.disaster={type:'flood',months:6};s.factions.han.grain=-10;
 for(let i=0;i<3;i++)tick(s);
 const d=s.court.debates.find(x=>x.kind==='unrest'&&x.region==='dongping');assert.ok(d,'memorials demand an answer');
 answerDebate(s,d.id,'reform');assert.ok(r.loyalty>20);
 const t=game();const q=t.regions.find(x=>x.id==='dongping');q.loyalty=10;t.factions.han.grain=-50;
 for(let i=0;i<10;i++){q.disaster={type:'flood',months:6};q.loyalty=10;t.factions.han.grain=-50;t.mandateRitual=-100;t.court.debates=[];tick(t)}
 assert.equal(q.owner,'rebels','unanswered unrest under a failing mandate becomes rebellion');
});

test('29. character relationships persist across time and saves',()=>{
 const s=game();for(let i=0;i<12;i++)tick(s);
 const l=loadHanSave(serialize(s));
 assert.deepEqual(l.persons['wang-zhengjun'].spouse,s.persons['wang-zhengjun'].spouse);
 assert.equal(l.genealogy['liu-ao'].father,'liu-shi');
 assert.deepEqual(l.court.enmity,s.court.enmity);
});

test('30. historical facts remain separate from alternate-history outcomes',()=>{
 for(const p of Object.values(PERSON))assert.ok(['historical','alternate','fictional'].includes(p.record));
 assert.equal(PERSON['fictional-liu-shang'].record,'alternate');assert.equal(PERSON['fictional-pang-chong'].record,'fictional');
 assert.equal(PERSON['wang-mang'],undefined);assert.ok(LATER_HISTORY.some(x=>x.id==='wang-mang'&&/not a Han emperor/.test(x.name[0])));
 const s=game();for(let i=0;i<60;i++)tick(s);
 for(const p of Object.values(s.persons).filter(p=>p.id.startsWith('sim-')||p.id.startsWith('gen-')))assert.ok(['simulated','fictional'].includes(p.record));
 assert.ok(!Object.keys(s.persons).includes('liu-xin'),'future historical births are not simulated');
});
