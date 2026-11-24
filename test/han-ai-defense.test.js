import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,moveArmy,tick,loadHanSave,serialize} from '../han/engine.js';
import {aiMilitary} from '../han/frontier.js';
import {monthIndex} from '../han/util.js';

test('military planning uses the last observed owner rather than hidden live control',()=>{
 const s=newHanGame('han',{seed:12}),army=s.armies.find(a=>a.owner==='zhizhi'&&a.men>=30000);
 s.wars.push(['han','zhizhi']);army.region='monan';
 s.intel.zhizhi.shuofang={month:monthIndex(s),owner:'han',armies:[{owner:'han',men:1000}]};
 s.regions.find(r=>r.id==='shuofang').owner='kangju';
 let target=null;aiMilitary(s,'zhizhi',{issueMove:(a,to)=>{if(a.id===army.id)target=to}});
 assert.equal(target,'shuofang','the decision follows dated intelligence; execution still checks the live map');
 assert.equal(moveArmy(s,army.id,target,{owner:'zhizhi'}).ok,false,'the actual march must respect the live owner and access rules');
});

test('Han reserves reinforce a known threatened fort only when local supply permits',()=>{
 const s=newHanGame('kangju',{seed:13}),reserve=s.armies.find(a=>a.owner==='han'&&a.region==='beidi');
 s.wars.push(['han','zhizhi']);s.regions.find(r=>r.id==='shuofang').supply=8;
 s.intel.han.monan={month:monthIndex(s),owner:'zhizhi',armies:[{owner:'zhizhi',men:20000}]};
 aiMilitary(s,'han',{issueMove:(a,to)=>moveArmy(s,a.id,to,{owner:a.owner})});
 assert.equal(reserve.move?.to,'shuofang');
 const poor=newHanGame('kangju',{seed:13}),other=poor.armies.find(a=>a.owner==='han'&&a.region==='beidi');
 poor.wars.push(['han','zhizhi']);poor.intel.han.monan={month:monthIndex(poor),owner:'zhizhi',armies:[{owner:'zhizhi',men:20000}]};
 aiMilitary(poor,'han',{issueMove:(a,to)=>moveArmy(poor,a.id,to,{owner:a.owner})});
 assert.equal(other.move,null,'low supply prevents a damaging concentration');
});

test('a rejected relief march does not count as a committed reinforcement',()=>{
 const s=newHanGame('kangju',{seed:13}),reserve=s.armies.find(a=>a.owner==='han'&&a.region==='beidi');
 s.wars.push(['han','zhizhi']);
 s.regions.find(r=>r.id==='shuofang').supply=8;
 s.armies=s.armies.filter(a=>a.owner!=='han'||a.region!=='shuofang');
 s.armies.push({...reserve,id:'second-reserve'});
 s.intel.han.monan={month:monthIndex(s),owner:'zhizhi',armies:[{owner:'zhizhi',men:Math.round(reserve.men*1.1)}]};
 const attempts=[];
 aiMilitary(s,'han',{issueMove:(a,to)=>{if(a.region==='beidi'&&to==='shuofang')attempts.push(a.id);return {ok:false}}});
 assert.deepEqual(attempts,[reserve.id,'second-reserve']);
});

test('a documented major threat triggers paid Han reserve recruitment without leaking it to rivals',()=>{
 const s=newHanGame('kangju',{seed:14});s.month=3;s.wars.push(['han','zhizhi']);
 s.intel.han.monan={month:monthIndex(s),owner:'zhizhi',armies:[{owner:'zhizhi',men:50000}]};
 const before={armies:s.armies.length,treasury:s.factions.han.treasury,grain:s.factions.han.grain,manpower:s.factions.han.manpower,log:s.log.length};
 aiMilitary(s,'han',{issueMove:(a,to)=>moveArmy(s,a.id,to,{owner:a.owner})});
 assert.equal(s.armies.length,before.armies+1);
 const raised=s.armies.at(-1);assert.equal(raised.owner,'han');assert.equal(s.regions.find(r=>r.id===raised.region).owner,'han');assert.ok(s.regions.find(r=>r.id===raised.region).supply>=6);assert.ok(raised.forming>0);
 assert.ok(s.persons[raised.commander]?.alive&&s.persons[raised.commander]?.name?.[0]);
 assert.ok(s.factions.han.treasury<before.treasury&&s.factions.han.grain<before.grain&&s.factions.han.manpower<before.manpower);
 assert.equal(s.log.length,before.log,'a distant rival gets no omniscient recruitment report');
 assert.equal(loadHanSave(serialize(s)).aiHanDefense.lastRecruitMonth,monthIndex(s));
 const hidden=newHanGame('kangju',{seed:14});hidden.month=3;hidden.wars.push(['han','zhizhi']);hidden.intel.han={};
 const count=hidden.armies.length;aiMilitary(hidden,'han',{issueMove:(a,to)=>moveArmy(hidden,a.id,to,{owner:a.owner})});
 assert.equal(hidden.armies.length,count,'a hidden enemy cannot trigger the reserve plan');
});

test('the monthly simulation mobilizes Han reserves against an observed northern invasion',()=>{
 const s=newHanGame('kangju',{seed:16}),invader=s.armies.find(a=>a.owner==='zhizhi'&&a.men>=30000),original=new Set(s.armies.map(a=>a.id));
 s.month=2;s.wars.push(['han','zhizhi']);invader.region='monan';invader.men=50000;
 tick(s);
 const raised=s.armies.filter(a=>a.owner==='han'&&!original.has(a.id));
 assert.equal(raised.length,1,JSON.stringify({month:s.month,known:s.intel.han.monan,defense:s.aiHanDefense,treasury:s.factions.han.treasury,grain:s.factions.han.grain}));assert.ok(raised[0].forming>0);
 assert.equal(s.aiHanDefense.lastRecruitMonth,monthIndex(s));
 const restored=loadHanSave(serialize(s));tick(restored);
 assert.equal(restored.armies.filter(a=>a.owner==='han'&&!original.has(a.id)).length,1,'the saved cooldown prevents an immediate duplicate order');
});

test('a thirty-six-month invasion keeps Han defense funded and physically simulated',()=>{
 const s=newHanGame('kangju',{seed:16}),invader=s.armies.find(a=>a.owner==='zhizhi'&&a.men>=30000);
 s.wars.push(['han','zhizhi']);invader.region='monan';invader.men=50000;
 for(let month=0;month<36;month++)tick(s);
 assert.deepEqual([s.year,s.month],[-46,1]);
 assert.ok(s.aiHanDefense?.lastRecruitMonth!=null,'the threat triggered a real reserve order');
 assert.ok(s.regions.some(r=>r.id==='changan'&&r.owner==='han'));
 assert.ok(s.regions.some(r=>r.id==='henan'&&r.owner==='han'));
 assert.ok(s.armies.some(a=>a.owner==='han'&&a.men>0));
 assert.ok(Number.isFinite(s.factions.han.treasury)&&s.factions.han.treasury>0&&s.factions.han.treasury<5000);
 assert.ok(Number.isFinite(s.factions.han.grain)&&s.factions.han.grain>0);
});
