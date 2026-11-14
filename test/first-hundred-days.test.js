import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave,setTax} from '../engine.js';
import {treeFor as romanFocuses,canStartFocus,startFocus as startRomanFocus} from '../national-focus.js';
import {initializeExperience,recordExperience,setDirection,setGuide,tutorialStep,recommendations,objectives} from '../experience.js';
import {advanceMail,receivedMail,replyToLetter} from '../epistulae.js';
import {newHanGame,tick as hanTick,loadHanSave,serialize} from '../han/engine.js';
import {init as initHan,act as hanAction,lesson as hanLesson,recommendations as hanRecommendations,objectives as hanObjectives} from '../han/experience.js';
import {startFocus,treeFor,focusStatus} from '../han/focus.js';
import {isLiuClan} from '../han/dynasty.js';

test('Caesar and Senate tutorial follows real actions, correspondence and save state',()=>{
 for(const side of ['caesar','senate']){
  const s=newGame(side);initializeExperience(s,{guided:true,openingLetter:true});
  assert.equal(tutorialStep(s).key,'army');
  const opening=s.mail.messages.find(m=>m.id===s.experience.openingLetter);
  assert.ok(opening?.senderId&&s.world.characters[opening.senderId]?.alive);
  const unit=s.armies.find(a=>a.owner===side&&a.men>0);
  recordExperience(s,'army',unit.id);assert.equal(tutorialStep(s).key,'supply');
  recordExperience(s,'supply',unit.id);assert.equal(tutorialStep(s).key,'threat');
  recordExperience(s,'threat',s.regions.find(r=>r.owner!==side).id);
  if(side==='senate'){assert.equal(tutorialStep(s).key,'leadership');recordExperience(s,'leadership')}
  setDirection(s,'political');assert.equal(tutorialStep(s).key,'course');
  recordExperience(s,'tax','low');assert.equal(tutorialStep(s).key,'advance');
  tick(s);assert.ok(receivedMail(s).some(m=>m.id===opening.id));recordExperience(s,'advance');recordExperience(s,'chronicle');
  assert.equal(tutorialStep(s).key,'mail');
  for(let i=0;i<8&&!receivedMail(s).some(m=>m.id===opening.id);i++)tick(s);
  assert.ok(receivedMail(s).some(m=>m.id===opening.id));
  assert.equal(opening.courierRisk,0);assert.equal(opening.arrival,s.experience.started+1);
  recordExperience(s,'mail',opening.id);assert.equal(tutorialStep(s).key,'reply');
  assert.equal(replyToLetter(s,opening.id,'acknowledge',{}).ok,true);recordExperience(s,'reply','acknowledge');
  assert.equal(tutorialStep(s),null);
  setGuide(s,'pause');assert.equal(s.experience.guide.paused,true);
  const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(saved.experience.direction,'political');assert.equal(saved.experience.guide.paused,true);
  assert.equal(objectives(saved).long[0],'Build a durable political settlement');
  assert.ok(recommendations(saved).every(x=>!JSON.stringify(x).includes('enemyStrength')));
 }
});

test('state-backed provincial request has a real sender and exact visible costs',()=>{
 const s=newGame('caesar');const officer=Object.values(s.world.characters).find(p=>p.alive&&p.faction==='caesar'&&s.regions.some(r=>r.id===p.location&&r.owner==='caesar'));
 assert.ok(officer);const place=s.regions.find(r=>r.id===officer.location);place.loyalty=42;
 advanceMail(s);const request=s.mail.messages.find(m=>m.context?.kind==='provincial_relief');assert.ok(request);assert.ok(s.world.characters[request.senderId]?.alive);assert.equal(s.world.characters[request.senderId]?.location,place.id);
 for(let i=0;i<8&&!receivedMail(s).some(m=>m.id===request.id);i++)tick(s);
 const before={treasury:s.factions.caesar.treasury,loyalty:place.loyalty};assert.equal(replyToLetter(s,request.id,'limited_relief',{}).ok,true);
 assert.equal(s.factions.caesar.treasury,before.treasury-5);assert.equal(place.loyalty,before.loyalty+3);
 assert.ok(s.log.some(e=>e.en.includes(' → ')));
});

test('Han and a minor polity sustain distinct guidance through long campaigns',()=>{
 for(const side of ['han','shanshan']){
  const s=newHanGame(side,{seed:49});initHan(s,{guided:true});
  assert.equal(hanLesson(s).key,side==='han'?'court':'realm');
  assert.ok(hanRecommendations(s).length>=2);
  assert.ok(hanObjectives(s).long[0]);assert.ok(hanObjectives(s).shortProgress[0]);assert.equal(typeof hanObjectives(s).longDone,'boolean');
  for(const rec of hanRecommendations(s))if(rec.target.kind==='diplomacy')assert.ok(s.factions[rec.target.id]);
  if(side==='han'){hanAction(s,'court');hanAction(s,'official');hanAction(s,'finance');hanAction(s,'frontier');hanAction(s,'dynasty');hanAction(s,'proposal');hanAction(s,'appoint');assert.equal(hanLesson(s).key,'focus')}
  const available=treeFor(side).find(x=>focusStatus(s,side,x.id)==='available'&&(x.cost.treasury||0)<=s.factions[side].treasury);
  if(available){assert.equal(startFocus(s,side,available.id).ok,true);hanAction(s,'focus',available.id)}
  for(let i=0;i<60;i++)hanTick(s);
  hanObjectives(s);
  const restored=loadHanSave(serialize(s));assert.equal(restored.experience.start,s.experience.start);
  assert.ok(restored.experience.milestones.some(m=>m.id==='three'));
  if(side==='han'&&restored.throne.orthodox)assert.equal(isLiuClan(restored,restored.throne.orthodox),true);
  if(side==='han'&&restored.focus.han.done.length){restored.experience.direction='administration';assert.equal(hanObjectives(restored).shortDone,true)}
 }
});


test('guidance recommends only startable national focuses and supports peaceful months',()=>{
 const s=newGame('senate');initializeExperience(s,{guided:false});setDirection(s,'development');s.wars=[];
 s.factions.senate.treasury=0;assert.equal(recommendations(s).some(r=>r.id==='focus'),false);
 s.factions.senate.treasury=200;s.factions.senate.stability=80;s.factions.senate.legitimacy=80;
 const project=romanFocuses('senate').find(f=>!canStartFocus(s,'senate',f.id));assert.ok(project);assert.equal(startRomanFocus(s,'senate',project.id).ok,true);
 setTax(s,'senate','low');recordExperience(s,'tax','low');
 for(let i=0;i<60;i++){const advice=recommendations(s);assert.ok(advice.length>=2);assert.ok(advice.every(r=>['mail','army','region','direction','government','chronicle','focus','time'].includes(r.target.kind)));tick(s);if(i===23)assert.ok(objectives(s).months>=24)}
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.ok(saved.experience);assert.ok(objectives(saved).months>=60);assert.ok(saved.experience.milestones.some(m=>m.id==='three_years'));
});
