import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize,tick,elevateEmpress} from '../han/engine.js';
import {advanceForeignRulers,rulerPortrait,regentPortrait,rulerMilitaryJudgment,rulerGovernanceFactor} from '../han/rulers.js';
import {ownRulerHtml} from '../han/ruler-ui.js';
import {birthRecordValid,recordBirth,eligibility,crown,seizeThrone} from '../han/dynasty.js';
import {courtPortraitSrc} from '../han/court-portrait.js';
import {roll} from '../han/util.js';

test('an original Liu heir gains a persistent portrait when legitimately crowned',()=>{
 let s=newHanGame('han',{seed:412});
 const id='simulated-liu-heir',father='liu-shi';
 s.persons[id]={id,name:['Liu Yi','刘翊'],surname:'Liu',birthSurname:'Liu',sex:'m',birth:-60,father,mother:null,record:'simulated',faction:'han',role:'prince',alive:true,spouse:[]};
 assert.equal(recordBirth(s,{id,father,birthSurname:'Liu',birth:-60,sex:'m'}).ok,true);
 assert.equal(eligibility(s,id).ok,true);
 s.throne.support[id]=Object.fromEntries(Object.keys(s.court.factions).map(f=>[f,80]));
 s=loadHanSave(serialize(s));
 const image=courtPortraitSrc(s.persons[id]);assert.match(image,/^data:image\/svg\+xml,/);
 assert.equal(crown(s,id,'court_selection').ok,true);
 assert.match(ownRulerHtml(s,0),/Liu Yi/);
 assert.match(ownRulerHtml(s,0),/Original campaign character/);
 assert.ok(ownRulerHtml(s,0).includes(image));
 assert.match(ownRulerHtml(s,1),/刘翊/);
 assert.match(ownRulerHtml(s,1),/汉皇帝/);
 s=loadHanSave(serialize(s));
 assert.equal(s.throne.orthodox,id);
 assert.equal(courtPortraitSrc(s.persons[id]),image);
 assert.ok(ownRulerHtml(s,0).includes(image));
 assert.equal(crown(s,'shi-gao','court_selection').ok,false);
});

test('a non-Liu founder is never labeled the Han emperor in the ruler card',()=>{
 let s=newHanGame('han',{seed:413});
 s.court.control['shi-gao']=80;
 assert.equal(seizeThrone(s,'shi-gao').ok,true);
 assert.equal(s.throne.orthodox,null);
 assert.match(ownRulerHtml(s,0),/Founder of Another Dynasty/);
 assert.doesNotMatch(ownRulerHtml(s,0),/Han emperor/);
 assert.match(ownRulerHtml(s,1),/新朝建立者/);
 s=loadHanSave(serialize(s));
 assert.match(ownRulerHtml(s,0),/Founder of Another Dynasty/);
});

test('foreign rulers keep historical identities and unknown opening names distinct',()=>{
 const s=newHanGame('parthia',{seed:112});
 assert.equal(s.rulers.parthia.id,'orodes-ii');
 assert.equal(s.rulers.armenia.id,'artavasdes-ii');
 assert.equal(s.rulers.commagene.id,'antiochus-i-commagene');
 assert.equal(s.rulers.kangju.id,'kangju-king');
 assert.equal(s.persons['kangju-king'].titleOnly,true);
 assert.match(ownRulerHtml(s,0),/King of Kings/);
 assert.match(ownRulerHtml(s,1),/万王之王/);
 assert.match(ownRulerHtml(s,1),/艺术复原/);
});

test('undocumented opening rulers remain unnamed until an actual succession',()=>{
 const s=newHanGame('gumo',{seed:112});
 for(const f of ['gumo','sogd_samarkand','atropatene']){
  const ruler=s.rulers[f],person=s.persons[ruler.personId];
  assert.equal(person.titleOnly,true,f);assert.equal(person.record,'reconstruction',f);
  assert.match(person.name[0],/^Unnamed ruler of /,f);
 }
 assert.equal(s.rulers.parthia.id,'orodes-ii');
 assert.match(ownRulerHtml(s,0),/personal name is unrecorded/);
 assert.match(ownRulerHtml(s,1),/史料未载此时王名/);
 const missingPerson=structuredClone(s);delete missingPerson.persons[missingPerson.rulers.gumo.personId];
 const migrated=loadHanSave(serialize(missingPerson));
 assert.equal(migrated.persons[migrated.rulers.gumo.personId].titleOnly,true);
 assert.match(ownRulerHtml(migrated,0),/personal name is unrecorded/);
 const old=s.rulers.gumo;s.persons[old.personId].alive=false;s.persons[old.personId].death=s.year;
 advanceForeignRulers(s);
 const next=s.rulers.gumo,person=s.persons[next.personId];
 assert.equal(person.record,'fictional');assert.equal(person.titleOnly,undefined);
 assert.equal(next.predecessor,old.id);
 const restored=loadHanSave(serialize(s));
 assert.deepEqual(restored.rulers.gumo,next);
 assert.deepEqual(restored.persons[next.personId].name,person.name);
});

test('new sovereign names stay distinct across neighboring courts and dynamic states',()=>{
 const s=newHanGame('han',{seed:123});const courts=['gumo','jingjue','qiemo','xiaowan','ruoqiang','qiule','wensu'];
 for(const f of courts)s.persons[s.rulers[f].personId].alive=false;
 s.factions['new-oasis-court']={id:'new-oasis-court',stability:55,treasury:20};
 advanceForeignRulers(s);
 const people=courts.map(f=>s.persons[s.rulers[f].personId]);
 assert.equal(new Set(people.map(p=>p.name[0])).size,people.length);
 assert.equal(people.every(p=>p.record==='fictional'),true);
 assert.equal(s.persons[s.rulers['new-oasis-court'].personId].record,'fictional');
});

test('steppe and western successors retain distinct reconstructed cultures and origins',()=>{
 const s=newHanGame('wusun',{seed:730});
 const origins={huhanye:'Xiongnu',wusun:'Wusun',kangju:'Kangju',dayuan:'Bactrian',yuezhi:'Yuezhi',sogd_samarkand:'Sogdian',sakastan:'Saka',shanshan:'Tarim oasis'};
 const former=Object.fromEntries(Object.keys(origins).map(f=>[f,s.rulers[f].personId]));
 for(const id of Object.values(former))s.persons[id].alive=false;
 advanceForeignRulers(s);
 const names=[];
 for(const [f,culturalLabel] of Object.entries(origins)){
  const p=s.persons[s.rulers[f].personId];
  assert.equal(p.record,'fictional',f);
  assert.match(p.culture[0],new RegExp(culturalLabel),f);
  assert.ok(s.regions.some(r=>r.id===p.homeland&&r.owner===f),f);
  assert.equal(p.location,p.homeland,f);
  assert.equal(p.politicalPredecessor,former[f],f);
  assert.ok(p.history.some(e=>e.kind==='succession'&&e.predecessor===former[f]),f);
  assert.match(p.note[0],/Original character/,f);
  names.push(p.name[0]);
 }
 assert.equal(new Set(names).size,names.length);
 const saved=loadHanSave(serialize(s));
 for(const f of Object.keys(origins))assert.deepEqual(saved.persons[s.rulers[f].personId],s.persons[s.rulers[f].personId],f);
});

test('a missing legacy ruler counter cannot overwrite an existing person',()=>{
 const s=newHanGame('gumo',{seed:32}),old=s.rulers.gumo;
 s.persons['sim-ruler-gumo-1']={id:'sim-ruler-gumo-1',name:['Earlier person','先前人物'],alive:false,record:'fictional'};
 s.nextRuler=0;s.persons[old.personId].alive=false;
 advanceForeignRulers(s);
 assert.notEqual(s.rulers.gumo.personId,'sim-ruler-gumo-1');
 assert.deepEqual(s.persons['sim-ruler-gumo-1'].name,['Earlier person','先前人物']);
});

test('Parthia, Armenia, Wusun, Kangju and an oasis kingdom gain persistent successors',()=>{
 for(const f of ['parthia','armenia','wusun','kangju','shanshan']){
  const s=newHanGame(f,{seed:700});const old=s.rulers[f],oldPortrait=rulerPortrait(s,f);
  s.persons[old.personId].alive=false;s.persons[old.personId].death=s.year;
  advanceForeignRulers(s);
  const next=s.rulers[f],person=s.persons[next.personId];
  assert.notEqual(next.id,old.id,f);assert.equal(next.record,'fictional',f);
  assert.equal(next.predecessor,old.id,f);assert.equal(person.politicalPredecessor,old.id,f);
  assert.ok(person.alive&&person.military>=35&&person.competence>=35,f);
  assert.ok(birthRecordValid(s,person.id),f);
  assert.notEqual(rulerPortrait(s,f),oldPortrait,f);
  assert.match(ownRulerHtml(s,0),/Original campaign character/,f);
  assert.match(ownRulerHtml(s,1),/本战役原创人物/,f);
  const restored=loadHanSave(serialize(s));
  assert.deepEqual(restored.rulers[f],next,f);
  assert.equal(rulerPortrait(restored,f),rulerPortrait(s,f),f);
  const id=restored.rulers[f].id;tick(restored);assert.equal(restored.rulers[f].id,id,f);
 }
});

test('a minor foreign heir keeps the throne while a named regent actually governs',()=>{
 let s=newHanGame('armenia',{seed:706}),old=s.rulers.armenia,id='original-armenian-heir';
 s.persons[id]={id,name:['Aram of Artaxata','阿尔塔克萨塔的阿拉姆'],faction:'armenia',role:'prince',record:'fictional',birth:s.year-8,sex:'m',father:old.personId,mother:null,alive:true,competence:99,military:99};
 assert.equal(recordBirth(s,{id,father:old.personId,birth:s.year-8,birthSurname:null,sex:'m'}).ok,true);
 s.persons[old.personId].alive=false;advanceForeignRulers(s);
 assert.equal(s.rulers.armenia.personId,id);
 const regent=s.persons[s.rulers.armenia.regentId];
 assert.ok(regent&&regent.alive&&regent.role==='regent'&&s.year-regent.birth>=35);
 assert.equal(regent.regentFor,id);
 assert.match(regentPortrait(s,'armenia'),/^data:image\/svg\+xml,/);
 assert.match(ownRulerHtml(s,0),/Court regent; exercises civil and military authority/);
 assert.match(ownRulerHtml(s,1),/宫廷摄政/);
 regent.competence=0;regent.military=35;
 assert.equal(rulerGovernanceFactor(s,'armenia'),0.9);
 const cautious=rulerMilitaryJudgment(s,'armenia');
 regent.competence=100;regent.military=90;
 assert.equal(rulerGovernanceFactor(s,'armenia'),1.1);
 assert.ok(rulerMilitaryJudgment(s,'armenia')>cautious);
 for(const region of s.regions)if(region.owner==='armenia')region.tax=100;
 const low=structuredClone(s),high=structuredClone(s);
 low.persons[regent.id].competence=0;
 tick(low);tick(high);
 assert.ok(high.factions.armenia.treasury>low.factions.armenia.treasury,'regent competence must change actual revenue');
 const portrait=regentPortrait(s,'armenia'),regentId=regent.id;
 s=loadHanSave(serialize(s));
 assert.equal(s.rulers.armenia.regentId,regentId);
 assert.equal(regentPortrait(s,'armenia'),portrait);
 s.persons[regentId].alive=false;advanceForeignRulers(s);
 const replacement=s.rulers.armenia.regentId;
 assert.notEqual(replacement,regentId);
 assert.equal(s.rulers.armenia.personId,id);
 assert.equal(s.persons[regentId].regentFor,undefined);
 assert.equal(loadHanSave(serialize(s)).rulers.armenia.regentId,replacement);
 s.year+=10;advanceForeignRulers(s);
 assert.equal(s.rulers.armenia.personId,id);
 assert.equal(s.rulers.armenia.regentId,undefined);
 assert.equal(s.persons[replacement].regentFor,undefined);
 assert.equal(rulerGovernanceFactor(s,'armenia'),0.9+s.persons[id].competence/500);
 assert.doesNotMatch(ownRulerHtml(s,0),/Court regent/);
});

test('another court does not learn a foreign minority regency at once',()=>{
 const s=newHanGame('han',{seed:707}),old=s.rulers.armenia.personId,id='unreported-armenian-heir';
 s.persons[id]={id,name:['Aram','阿拉姆'],faction:'armenia',role:'prince',record:'fictional',birth:s.year-7,sex:'m',father:old,alive:true,competence:60,military:50};
 recordBirth(s,{id,father:old,birth:s.year-7,birthSurname:null,sex:'m'});
 s.persons[old].alive=false;advanceForeignRulers(s);
 assert.ok(s.rulers.armenia.regentId);
 assert.equal(s.log.some(event=>event.faction==='armenia'&&['succession','regency'].includes(event.kind)),false);
});

test('foreign deaths stay out of the Chronicle while a court records its own loss',()=>{
 const id='original-parthian-courtier',person={id,name:['Courtier of Ctesiphon','泰西封廷臣'],faction:'parthia',birth:-140,health:-1000,alive:true};
 const base=newHanGame('han',{seed:1});base.persons[id]={...person};
 const next={...base,month:base.month+1};
 for(let seed=1;seed<10000;seed++)if(roll({...next,seed},'death'+id)<0.29){base.seed=seed;break}
 const own=newHanGame('parthia',{seed:base.seed});own.persons[id]={...person};
 tick(base);tick(own);
 assert.equal(base.persons[id].alive,false);
 assert.equal(own.persons[id].alive,false);
 assert.equal(base.log.some(event=>event.who===id),false);
 assert.equal(own.log.some(event=>event.who===id&&event.kind==='life'),true);
});

test('Emperor Xuan dies on schedule without instantly informing a foreign court',()=>{
 const han=newHanGame('han',{seed:7}),foreign=newHanGame('parthia',{seed:7});
 for(const s of [han,foreign])s.month=12;
 tick(han);tick(foreign);
 for(const s of [han,foreign]){
  assert.equal(s.persons['liu-xun'].alive,false);
  assert.equal(s.scheduled.find(event=>event.kind==='death'&&event.id==='liu-xun').done,true);
  assert.notEqual(s.throne.orthodox,'liu-xun');
 }
 assert.equal(han.log.some(event=>event.who==='liu-xun'&&event.kind==='throne'),true);
 assert.equal(foreign.log.some(event=>event.who==='liu-xun'),false);
 assert.equal(foreign.log.some(event=>event.who==='liu-shi'&&event.kind==='throne'),false);
 assert.equal(han.log.some(event=>event.kind==='throne'&&event.text[0].startsWith('By Emperor Xuan')),true);
 assert.equal(foreign.log.some(event=>event.kind==='throne'&&event.text[0].startsWith('By Emperor Xuan')),false);
 assert.equal(han.log.some(event=>event.kind==='court'&&event.who==='shi-gao'),true);
 assert.equal(foreign.log.some(event=>event.kind==='court'&&event.who==='shi-gao'),false);
 assert.equal(elevateEmpress(han,'wang-zhengjun').ok,true);
 assert.equal(elevateEmpress(foreign,'wang-zhengjun').ok,true);
 assert.equal(han.log.some(event=>event.who==='wang-zhengjun'&&event.kind==='court'),true);
 assert.equal(foreign.log.some(event=>event.who==='wang-zhengjun'&&event.kind==='court'),false);
});

test('succession has a simulation cost and ruler judgment affects AI threshold',()=>{
 const s=newHanGame('han',{seed:42}),f='armenia',old=s.rulers[f],before=s.factions[f].stability;
 s.persons[old.personId].alive=false;advanceForeignRulers(s);
 assert.equal(s.factions[f].stability,before-5);
 const p=s.persons[s.rulers[f].personId];p.military=35;const cautious=rulerMilitaryJudgment(s,f);p.military=90;
 assert.ok(rulerMilitaryJudgment(s,f)>cautious);
 assert.equal(s.log.some(event=>event.kind==='succession'&&event.faction===f),false,'foreign court succession must not appear as instant knowledge');
 const own=newHanGame('armenia',{seed:42}),ownOld=own.rulers.armenia;
 own.persons[ownOld.personId].alive=false;advanceForeignRulers(own);
 assert.equal(own.log.at(-1).kind,'succession');
});

test('the reigning ruler changes actual taxation rather than only the displayed dossier',()=>{
 const base=newHanGame('parthia',{seed:16});for(const r of base.regions)if(r.owner==='parthia')r.tax=100;
 const low=structuredClone(base),high=structuredClone(base),id=base.rulers.parthia.personId;
 low.persons[id].competence=0;high.persons[id].competence=100;
 assert.equal(rulerGovernanceFactor(low,'parthia'),0.9);
 assert.equal(rulerGovernanceFactor(high,'parthia'),1.1);
 tick(low);tick(high);
 assert.ok(high.factions.parthia.treasury>low.factions.parthia.treasury);
 assert.match(ownRulerHtml(high,0),/Tax administration \(simulated\): ×1.10/);
});

test('loading an older save creates missing ruler links without replacing its dated rulers',()=>{
 const s=newHanGame('wusun',{seed:80});const old=s.rulers.parthia;
 delete s.rulers.wusun;delete s.persons['orodes-ii'];
 const restored=loadHanSave(serialize(s));
 assert.equal(restored.rulers.parthia.id,old.id);
 assert.equal(restored.rulers.wusun.id,'xingmi');
 assert.equal(restored.persons['orodes-ii'].name[0],'Orodes II');
});
