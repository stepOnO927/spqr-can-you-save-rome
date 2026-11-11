import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=varus-portrait-1';
import {FOCUS_TREES,BRANCHES} from '../imperium-focus-data.js?v=imperium-1';
import {validateFocusTrees,focusStatus,startFocus,cancelFocus,focusState,canStartFocus,treeFor,focusModifiers,scoreFocus,focusReportsFor,legitimateFocusView,unlockedComponents} from '../national-focus.js?v=safe-save-1';
import {COMPONENTS} from '../legion-designer.js?v=safe-save-1';
import {REGIONS} from '../data.js?v=phase-x-1';

const roundTrip=s=>upgradeSave(JSON.parse(JSON.stringify(s)));
const run=(s,id,actor=s.player)=>{const f=treeFor(actor).find(x=>x.id===id);{const r=startFocus(s,actor,id);assert.equal(r.ok,true,`${id} should start: ${r.reason}`)};for(let i=0;i<f.months;i++)tick(s);assert.ok(focusState(s,actor).completed.includes(id),`${id} should complete`)};

test('focus data: no duplicate IDs, missing references, cycles, unreachable branches, invalid components or missing localization',()=>{
 assert.deepEqual(validateFocusTrees(FOCUS_TREES,{components:COMPONENTS,regions:REGIONS.map(r=>r.id)}),[]);
 for(const id of ['caesar','senate','egypt','parthia','armenia','numidia','mauretania','galatia','bosporus'])assert.ok(FOCUS_TREES[id]?.length>=9,`${id} has a tree`);
 // Every major faction has unique content and the required branches.
 const ids=Object.values(FOCUS_TREES).flat().map(f=>f.id);assert.equal(new Set(ids).size,ids.length);
 for(const id of ['caesar','senate','egypt','parthia','armenia'])for(const b of BRANCHES)assert.ok(FOCUS_TREES[id].some(f=>f.branch===b),`${id} lacks ${b}`);
 // Minor kingdoms share a core but differ in their special branches.
 const special=id=>FOCUS_TREES[id].filter(f=>!/_royal_court|_royal_levy|_border_forts|_roman_patron|_royal_treasury|_local_cults/.test(f.id)).map(f=>f.id.slice(4)).sort().join();
 assert.equal(new Set(['numidia','mauretania','galatia','bosporus'].map(special)).size,4);
 // Validation catches broken data.
 const broken={x:[{...FOCUS_TREES.caesar[1],id:'x1',prereq:['x2'],any:[],exclusive:[]},{...FOCUS_TREES.caesar[1],id:'x2',prereq:['x1'],any:[],exclusive:[]}]};
 assert.ok(validateFocusTrees(broken).some(e=>e.includes('circular')));
 assert.ok(validateFocusTrees({y:[{...FOCUS_TREES.caesar[0],id:'y1',name:['',''],prereq:[],any:[],exclusive:[]}]}).some(e=>e.includes('localization')));
});

test('Caesarian focus: select, progress over months, save/load, complete with real effects, exclusion',()=>{
 // At peace, so that a passive human Caesar is not conquered during the long chain.
 const s=newGame('caesar');s.wars=[];assert.equal(focusStatus(s,'caesar','cae_fate_republic'),'available');assert.equal(focusStatus(s,'caesar','cae_veteran_legions'),'locked');
 const before=s.factions.caesar.treasury;assert.ok(startFocus(s,'caesar','cae_fate_republic').ok);assert.equal(s.factions.caesar.treasury,before-5);
 assert.equal(canStartFocus(s,'caesar','cae_appeal_senate'),'locked');
 tick(s);const saved=roundTrip(s);assert.equal(focusState(saved,'caesar').active.progress,1);tick(saved);
 assert.ok(focusState(saved,'caesar').completed.includes('cae_fate_republic'));
 // Veteran legions: army morale rises and a locked component is unlocked.
 const morale=saved.armies.find(a=>a.id==='xiii').morale;saved.factions.caesar.treasury=200;run(saved,'cae_veteran_legions');
 assert.ok(saved.armies.find(a=>a.id==='xiii').morale>morale);assert.ok(unlockedComponents(saved,'caesar').includes('veteran_cohort'));
 run(saved,'cae_italian_command');run(saved,'cae_military_authority');assert.ok(focusModifiers(saved,'caesar').battle>0);
 // Seek a Negotiated Settlement is now mutually exclusive, even after its prerequisite.
 run(saved,'cae_appeal_senate');assert.equal(focusStatus(saved,'caesar','cae_negotiated_settlement'),'exclusive');
 const reloaded=roundTrip(saved);assert.deepEqual(focusState(reloaded,'caesar').completed,focusState(saved,'caesar').completed);assert.deepEqual(focusModifiers(reloaded,'caesar'),focusModifiers(saved,'caesar'));
});

test('a reconciliation focus opens negotiation but never forces the Senate to accept',()=>{
 const outcomes=new Set();
 for(let seed=1;seed<=12;seed++){const s=newGame('caesar');s.seed=seed*7717;s.factions.caesar.treasury=100;run(s,'cae_fate_republic');const relation=s.relations['caesar:senate']??0;run(s,'cae_appeal_senate');
  assert.ok((s.relations['caesar:senate']??0)>relation-1);const letter=(s.inquiries||[]).find(x=>x.actor==='caesar'&&x.target==='senate'&&x.subject==='peace');assert.ok(letter,'a peace letter was sent');
  for(let i=0;i<5;i++)tick(s);outcomes.add(s.wars.some(w=>w.includes('caesar')&&w.includes('senate'))?'war':'peace')}
 assert.ok(outcomes.has('war'),'the Senate is free to refuse');
});

test('tax reform raises potential revenue but costs elite loyalty; progress is kept when a focus is set aside',()=>{
 const s=newGame('caesar');s.factions.caesar.treasury=200;run(s,'cae_fate_republic');
 const elites=Object.values(s.world.characters).filter(c=>c.faction==='caesar'&&c.id!=='caesar').map(c=>c.loyalty);
 assert.ok(startFocus(s,'caesar','cae_provincial_governance').ok);tick(s);tick(s);assert.ok(cancelFocus(s,'caesar').ok);assert.equal(focusState(s,'caesar').partial.cae_provincial_governance,2);
 assert.ok(startFocus(s,'caesar','cae_provincial_governance').ok);assert.equal(focusState(s,'caesar').active.progress,2);tick(s);tick(s);
 assert.ok(focusModifiers(s,'caesar').tax>0);const after=Object.values(s.world.characters).filter(c=>c.faction==='caesar'&&c.id!=='caesar').map(c=>c.loyalty);assert.ok(after.reduce((a,b)=>a+b,0)<elites.reduce((a,b)=>a+b,0));
});

test('a focus is suspended when its conditions fail and invalidated with consequences when its leader dies',()=>{
 const s=newGame('caesar');s.factions.caesar.treasury=200;run(s,'cae_fate_republic');run(s,'cae_gallic_spoils');
 s.regions.find(r=>r.id==='sicilia').owner='caesar';assert.ok(startFocus(s,'caesar','cae_grain_for_rome').ok);tick(s);
 s.regions.find(r=>r.id==='sicilia').owner='senate';tick(s);assert.equal(focusStatus(s,'caesar','cae_grain_for_rome'),'suspended');const kept=focusState(s,'caesar').active.progress;tick(s);assert.equal(focusState(s,'caesar').active.progress,kept);
 const senate=newGame('senate');senate.factions.senate.treasury=200;run(senate,'sen_cause_republic','senate');assert.ok(startFocus(senate,'senate','sen_pompeian_command').ok);
 const treasury=senate.factions.senate.treasury,stability=senate.factions.senate.stability;senate.world.characters.pompey.alive=false;tick(senate);
 const st=focusState(senate,'senate');assert.equal(st.active,null);assert.ok(st.history.some(h=>h.event==='invalidated'&&h.reason==='leader_lost'&&h.refund===6));
 assert.ok(senate.log.some(x=>x.zh.includes('国家方针失效')));assert.ok(senate.factions.senate.stability<=stability);assert.ok(senate.factions.senate.treasury>=treasury+6-30);
});

test('Senate and Egypt trees progress, save and apply their own effects',()=>{
 const s=newGame('senate');s.factions.senate.treasury=300;run(s,'sen_cause_republic');run(s,'sen_pompeian_command');
 assert.ok(s.world.characters.pompey.influence>50);assert.ok(s.world.characters.cato.loyalty<75);assert.equal(focusStatus(s,'senate','sen_defend_constitution'),'exclusive');
 const saved=roundTrip(s);assert.deepEqual(focusState(saved,'senate').completed,['sen_cause_republic','sen_pompeian_command']);
 const e=newGame('egypt');e.factions.egypt.treasury=200;run(e,'egy_house_ptolemy');const food=e.factions.egypt.food;run(e,'egy_nile_administration');assert.equal(focusModifiers(e,'egypt').food,2);
 run(e,'egy_roman_influence');run(e,'egy_back_caesar');assert.equal(focusStatus(e,'egypt','egy_back_pompey'),'exclusive');assert.equal(focusStatus(e,'egypt','egy_independent_course'),'exclusive');
 assert.ok(roundTrip(e).world.nationalFocus.egypt.completed.includes('egy_back_caesar'));
});

test('AI courts choose and complete focuses from their own situation and may change course',()=>{
 const s=newGame('caesar');s.difficulty='expert';for(let i=0;i<18;i++)tick(s);
 for(const id of ['senate','egypt','parthia','armenia'])assert.ok(focusState(s,id).completed.length>=2,`${id} progressed`);
 assert.equal(focusState(s,'caesar').completed.length,0,'the human player’s tree is never advanced by the AI');
 // Scores ignore hidden foreign state.
 const other=JSON.parse(JSON.stringify(s));for(const a of other.armies.filter(x=>x.owner==='parthia'))a.men=999999;other.factions.parthia.treasury=-999;other.world.nationalFocus.parthia.active=null;
 for(const f of treeFor('armenia'))assert.equal(scoreFocus(other,'armenia',f),scoreFocus(s,'armenia',f));
 // Different circumstances produce different choices.
 const poor=newGame('caesar'),rich=newGame('caesar');poor.difficulty=rich.difficulty='hard';poor.factions.armenia.treasury=20;poor.factions.armenia.stability=40;rich.factions.armenia.treasury=200;
 for(let i=0;i<10;i++){tick(poor);tick(rich)}assert.notDeepEqual(focusState(poor,'armenia').completed,focusState(rich,'armenia').completed);
});

test('foreign courts learn of completed focuses only through contact; the focus view never reveals AI plans',()=>{
 const s=newGame('caesar');s.difficulty='expert';for(let i=0;i<24;i++)tick(s);
 const reports=focusReportsFor(s,'caesar');for(const r of reports)assert.ok(['senate','galatia','egypt','numidia','mauretania','armenia','parthia','bosporus'].includes(r.actor));
 const view=legitimateFocusView(s,'caesar','parthia');assert.equal(view.active,null);
 for(const id of view.completed)assert.ok(reports.some(r=>r.actor==='parthia'&&r.focus===id));
});
