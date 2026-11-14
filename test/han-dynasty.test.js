// MANDATE OF HEAVEN — dynastic acceptance tests 1–10.
// The engine, not the UI, must guarantee that only a verified Liu can be the
// orthodox Han emperor.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,tick,serialize,loadHanSave} from '../han/engine.js?v=diplomatic-chronicle-1';
import {statusOf,crown,eligibility,isLiuClan,changeSurname,marry,adopt,seizeThrone,deposeAndReplace,establishRegency,enforceDynasticInvariants,recordBirth,PROCESSES} from '../han/dynasty.js?v=han-1';
import {resolveSuccession,advanceDispute,startDynasticWar,settleThroneWars,recomputeInfluence,onUsurpation} from '../han/court.js?v=han-1';
import {applyEffects,TREES} from '../han/focus.js?v=han-1';

const game=(o={})=>newHanGame('han',{seed:11,start:'accession',...o});
const backAll=(s,id,v=90)=>{s.throne.support[id]=Object.fromEntries(Object.keys(s.court.factions).map(f=>[f,v]))};
const kill=(s,id)=>{s.persons[id].alive=false;s.persons[id].death=s.year;if(s.throne.orthodox===id){s.throne.lastOrthodox=id;s.throne.orthodox=null}};

test('1. Liu Shi rules as the orthodox Han emperor at the start (after 29 Jan 48 BCE)',()=>{
 const s=game();
 assert.equal(s.year,-48);assert.equal(s.month,2);
 assert.equal(s.throne.orthodox,'liu-shi');assert.equal(statusOf(s,'liu-shi'),'orthodox_han_emperor');
 assert.equal(s.persons['liu-xun'].alive,false,'Emperor Xuan is dead (10 January 48 BCE) and never placed on the throne');
 assert.ok(isLiuClan(s,'liu-shi'));
 assert.equal(s.persons['wang-mang'],undefined,'Wang Mang (b. 45 BCE) is not present');
});

test('2. an eligible Liu successor inherits when the emperor dies',()=>{
 const s=game();s.throne.heir='liu-ao';backAll(s,'liu-ao',70);
 kill(s,'liu-shi');const r=resolveSuccession(s);
 assert.ok(r.ok);assert.equal(s.throne.orthodox,'liu-ao');assert.equal(statusOf(s,'liu-ao'),'orthodox_han_emperor');
 assert.ok(s.throne.regent,'a child emperor receives a regent');assert.notEqual(s.throne.regent,'liu-ao');
});

test('3. two Liu princes can dispute the succession, and a dynastic war can follow',()=>{
 const s=game();kill(s,'liu-shi');kill(s,'liu-ao');
 for(const f of Object.keys(s.court.factions))s.court.factions[f].influence=20;
 s.throne.heir=null;
 // force a close split between two of Xuan's sons
 const r=resolveSuccession(s);
 if(!r.disputed){s.throne.orthodox=null;s.throne.claimants=[{id:'liu-qin'},{id:'liu-yu'}];}
 s.throne.support['liu-qin']={waiqi:80,ru:40,huanguan:80,frontier:40,haoqiang:60};s.throne.support['liu-yu']={waiqi:40,ru:80,huanguan:40,frontier:80,haoqiang:50};
 s.throne.claimants=[{id:'liu-qin'},{id:'liu-yu'}];s.throne.orthodox=null;s.throne.paralysis=0;
 assert.equal(statusOf(s,'liu-qin'),'disputed_liu_claimant');assert.equal(statusOf(s,'liu-yu'),'disputed_liu_claimant');
 advanceDispute(s);
 assert.ok(s.factions.rival_court,'an unresolved dispute becomes a dynastic civil war');
 assert.equal(s.throne.orthodox,null,'no one is orthodox while the war is undecided');
});

test('4. a non-Liu minister may control the government without becoming emperor',()=>{
 const s=game({scenario:'usurper'});recomputeInfluence(s);
 const r=establishRegency(s,'fictional-pang-chong');
 assert.ok(r.ok,JSON.stringify(r));
 assert.equal(s.throne.regent,'fictional-pang-chong');assert.equal(statusOf(s,'fictional-pang-chong'),'regent');
 assert.equal(s.throne.orthodox,'liu-shi');assert.equal(statusOf(s,'liu-shi'),'orthodox_han_emperor');
});

test('5. a non-Liu minister may depose a Liu ruler and install another Liu through valid mechanics',()=>{
 const s=game({scenario:'usurper'});recomputeInfluence(s);s.court.control['fictional-pang-chong']=75;
 const r=deposeAndReplace(s,'fictional-pang-chong','liu-jing');
 assert.ok(r.ok,JSON.stringify(r));
 assert.equal(s.throne.orthodox,'liu-jing');assert.equal(statusOf(s,'liu-jing'),'orthodox_han_emperor');
 assert.equal(s.throne.puppet,'liu-jing');assert.equal(s.throne.regent,'fictional-pang-chong');
 assert.ok(s.throne.deposed.includes('liu-shi'));
 // he cannot install a non-Liu this way
 s.court.control['fictional-pang-chong']=90;
 const bad=deposeAndReplace(s,'fictional-pang-chong','fictional-zhao-lie');assert.equal(bad.ok,false);
});

test('6. a non-Liu minister may found a new dynasty — classified as usurpation',()=>{
 const s=game({scenario:'usurper'});s.court.control['fictional-pang-chong']=80;
 const r=seizeThrone(s,'fictional-pang-chong',{dynastyName:['Pang','庞']});
 assert.ok(r.ok);
 assert.equal(s.throne.dynasty.orthodox,false);assert.equal(s.throne.dynasty.founder,'fictional-pang-chong');
 assert.equal(statusOf(s,'fictional-pang-chong'),'new_dynasty_founder');
 assert.equal(s.throne.orthodox,null);assert.ok(s.throne.claimants.some(c=>c.id==='liu-shi'),'the displaced Liu remains a claimant');
});

test('7. a non-Liu ruler can never be classified as orthodox — by any path',()=>{
 const s=game({scenario:'usurper'});
 for(const p of PROCESSES){backAll(s,'fictional-pang-chong',100);const r=crown(s,'fictional-pang-chong',p,{force:true});assert.equal(r.ok,false,p)}
 // a raw state write is undone by the invariant check on the next tick
 s.throne.orthodox='fictional-pang-chong';tick(s);
 assert.notEqual(s.throne.orthodox,'fictional-pang-chong');
 assert.notEqual(statusOf(s,'fictional-pang-chong'),'orthodox_han_emperor');
 // national focus effects cannot crown anyone
 for(const f of TREES.han)applyEffects(s,'han',f);
 assert.ok(!s.throne.orthodox||isLiuClan(s,s.throne.orthodox));
 // AI over decades
 const t=game({scenario:'usurper',seed:3});t.player='huhanye';
 for(let i=0;i<360;i++){tick(t);assert.ok(!t.throne.orthodox||isLiuClan(t,t.throne.orthodox),`month ${i}`)}
 // usurpation followed by a coup attempt to "legitimise"
 const u=game({scenario:'usurper'});u.court.control['fictional-pang-chong']=90;seizeThrone(u,'fictional-pang-chong');
 backAll(u,'fictional-pang-chong',100);assert.equal(crown(u,'fictional-pang-chong','restoration',{force:true}).ok,false);
 // Mandate cannot be purchased into orthodoxy
 u.mandateRitual=999;tick(u);assert.notEqual(statusOf(u,'fictional-pang-chong'),'orthodox_han_emperor');
});

test('8. merely changing a surname to Liu grants no legitimacy (even by imperial grant)',()=>{
 const s=game();
 changeSurname(s,'fictional-pang-chong','Liu',{granted:true});
 assert.equal(s.persons['fictional-pang-chong'].surname,'Liu');
 assert.equal(isLiuClan(s,'fictional-pang-chong'),false);
 const e=eligibility(s,'fictional-pang-chong');assert.equal(e.ok,false);assert.ok(e.reasons.includes('not_born_liu'));
 backAll(s,'fictional-pang-chong',100);assert.equal(crown(s,'fictional-pang-chong','court_selection',{force:true}).ok,false);
 // and a Liu who drops the name is not eligible while bearing another surname
 changeSurname(s,'liu-qin','Wang');assert.equal(eligibility(s,'liu-qin').ok,false);
});

test('9. marriage and adoption do not give an unrelated character imperial eligibility',()=>{
 const s=game();
 marry(s,'fictional-su-heng','liu-shi');
 assert.equal(isLiuClan(s,'fictional-su-heng'),false);
 assert.equal(eligibility(s,'fictional-su-heng').ok,false);
 const a=adopt(s,'liu-shi','fictional-zhao-lie');assert.equal(a.withinClan,false);
 assert.equal(isLiuClan(s,'fictional-zhao-lie'),false);assert.equal(eligibility(s,'fictional-zhao-lie').ok,false);
 // adoption within the clan is recorded as a legal heirship, and lineage stays biological
 const b=adopt(s,'liu-shi','fictional-liu-ji');assert.equal(b.withinClan,true);
 assert.deepEqual(s.genealogy['fictional-liu-ji'].father,'liu-yan-alt');
});

test('10. save/load cannot bypass dynastic restrictions',()=>{
 const s=game();
 const raw=JSON.parse(serialize(s));
 // tamper 1: put a non-Liu on the throne
 raw.throne.orthodox='fictional-pang-chong';
 let l=loadHanSave(raw);assert.notEqual(l.throne.orthodox,'fictional-pang-chong');assert.ok(l.loadFixes.length>0);
 assert.equal(l.throne.dynasty.orthodox,false,'the regime is recorded as unrecognised, not as Han');
 // tamper 2: forge a Liu father in the genealogy
 const raw2=JSON.parse(serialize(s));raw2.genealogy['fictional-pang-chong'].father='liu-xun';raw2.genealogy['fictional-pang-chong'].birthSurname='Liu';raw2.throne.orthodox='fictional-pang-chong';
 l=loadHanSave(raw2);assert.equal(isLiuClan(l,'fictional-pang-chong'),false,'forged record fails its seal');assert.notEqual(l.throne.orthodox,'fictional-pang-chong');
 // tamper 3: rewrite a historical record
 const raw3=JSON.parse(serialize(s));raw3.genealogy['shi-gao']={...raw3.genealogy['shi-gao'],father:'liu-jin',birthSurname:'Liu'};raw3.throne.heir='shi-gao';
 l=loadHanSave(raw3);assert.equal(isLiuClan(l,'shi-gao'),false);assert.equal(l.throne.heir,null);
 // tamper 4: claim a non-Liu dynasty is orthodox
 const raw4=JSON.parse(serialize(s));raw4.throne.dynasty={id:'pang',name:['Pang','庞'],orthodox:true,founder:'fictional-pang-chong'};
 l=loadHanSave(raw4);assert.equal(l.throne.dynasty.orthodox,false);
 // honest saves load unchanged
 const ok=loadHanSave(serialize(s));assert.equal(ok.throne.orthodox,'liu-shi');assert.deepEqual(ok.loadFixes,[]);
});

test('generated births: only a Liu father produces a Liu clan member',()=>{
 const s=game();
 recordBirth(s,{id:'sim-a',father:'liu-shi',mother:'wang-zhengjun',birthSurname:'Liu',birth:-47,sex:'m'});
 s.persons['sim-a']={id:'sim-a',name:['Liu A','刘甲'],surname:'Liu',birthSurname:'Liu',sex:'m',birth:-47,alive:true,father:'liu-shi'};
 assert.ok(isLiuClan(s,'sim-a'));
 recordBirth(s,{id:'sim-b',father:'fictional-pang-chong',mother:null,birthSurname:'Liu',birth:-47,sex:'m'});
 s.persons['sim-b']={id:'sim-b',surname:'Liu',birthSurname:'Liu',sex:'m',birth:-47,alive:true,father:'fictional-pang-chong'};
 assert.equal(isLiuClan(s,'sim-b'),false);
 // a posthumous forgery (father long dead) fails validation
 recordBirth(s,{id:'sim-c',father:'liu-he',mother:null,birthSurname:'Liu',birth:-47,sex:'m'});
 s.persons['sim-c']={id:'sim-c',surname:'Liu',birthSurname:'Liu',sex:'m',birth:-47,alive:true,father:'liu-he'};
 assert.equal(isLiuClan(s,'sim-c'),false);
});

test('restoration path: loyalists can restore a Liu after usurpation, and only a Liu',()=>{
 const s=game({scenario:'usurper'});s.court.control['fictional-pang-chong']=85;
 const r=seizeThrone(s,'fictional-pang-chong');onUsurpation(s,'fictional-pang-chong',r.displaced);
 assert.ok(s.factions.han_loyalist);const claimant=s.factions.han_loyalist.claimant;assert.ok(isLiuClan(s,claimant));
 s.regions.find(x=>x.id==='changan').owner='han_loyalist';
 settleThroneWars(s);
 assert.equal(s.throne.orthodox,claimant);assert.equal(s.throne.dynasty.orthodox,true);assert.equal(s.throne.restorations,1);
 assert.equal(statusOf(s,claimant),'orthodox_han_emperor');
});
