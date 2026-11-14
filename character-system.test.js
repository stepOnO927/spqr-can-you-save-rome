import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,queueMission,diplomacy,sendInquiry,moveArmy} from './engine.js?v=coalition-courier-1';
import {assignSuccession,knownLeaders,ageRange} from './characters.js?v=succession-ui-recovery-1';
import {addReport,commandFactor,advanceCharacters,advanceOperations,contestLeadership,observeArmies,reportedArmies,missionDuration,previewMission} from './character-system.js?v=portraits-hundred-days-1';

test('foreign intelligence is independent from actual leadership and other observers',()=>{
 const s=newGame(),opening=knownLeaders(s,'caesar','egypt');
 s.world.characters.cleopatra.alive=false;assignSuccession(s,'egypt');
 assert.deepEqual(s.world.leadership.egypt,['ptolemy']);assert.deepEqual(opening,['cleopatra','ptolemy']);
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});
 assert.deepEqual(knownLeaders(s,'caesar','egypt'),['ptolemy']);assert.deepEqual(knownLeaders(s,'senate','egypt'),['cleopatra','ptolemy']);
});
test('only independently sourced matching reports improve confidence and conflicts remain visible',()=>{
 const s=newGame();addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'unverified');
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'envoy',confidence:'unverified'});
 assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'credible');
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'travelers',confidence:'rumor'});
 assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'confirmed');assert.equal(s.knowledge.caesar.egypt.reports[0].verified,true);
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'travelers',confidence:'rumor'});
 assert.ok(s.knowledge.caesar.egypt.reports.every(r=>r.confidence==='disputed'));
});
test('joint ruler order is immaterial and all current claims reflect an unresolved conflict',()=>{
 const s=newGame();
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:['cleopatra','ptolemy'],source:'spy',confidence:'unverified'});
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy','cleopatra'],source:'envoy',confidence:'unverified'});
 assert.ok(s.knowledge.caesar.egypt.reports.every(r=>r.confidence==='credible'));
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],exhaustive:true,source:'travelers',confidence:'rumor'});
 assert.ok(s.knowledge.caesar.egypt.reports.every(r=>r.confidence==='disputed'&&!r.verified));
 addReport(s,'caesar','egypt',{kind:'leaders',leaders:['cleopatra','ptolemy'],source:'meeting',confidence:'unverified'});
 assert.ok(s.knowledge.caesar.egypt.reports.every(r=>r.confidence==='disputed'&&!r.verified));
});
test('fresh reports may recover after a conflict expires without treating forwarded evidence as independent',()=>{
 const s=newGame();
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'envoy',confidence:'unverified'});
 s.year+=3;
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'exchange',originSource:'spy',confidence:'unverified'});
 assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'unverified');assert.equal(s.knowledge.caesar.egypt.reports[0].verified,false);
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'envoy',confidence:'unverified'});
 assert.ok(s.knowledge.caesar.egypt.reports.slice(0,3).every(r=>r.confidence==='credible'&&!r.verified));
 assert.ok(s.knowledge.caesar.egypt.reports.slice(3).every(r=>r.confidence==='disputed'));
});
test('spies cost resources and resolve by month with isolated records',()=>{
 const s=newGame(),cash=s.factions.caesar.treasury;assert.equal(queueMission(s,'caesar','egypt','spy','health').ok,true);assert.equal(s.factions.caesar.treasury,cash-12);
 assert.equal(queueMission(s,'caesar','egypt','spy','health').reason,'pending');for(let i=0;i<3;i++)tick(s);
 assert.equal(s.operations[0].status,'pending');const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));tick(loaded);
 assert.notEqual(loaded.operations[0].status,'pending');assert.equal(loaded.knowledge.senate.egypt.reports.length,0);
});
test('mission preview gives actionable requirements without spending or revealing foreign secrets',()=>{
 const s=newGame(),before=JSON.stringify(s),plan=previewMission(s,'caesar','egypt','spy','health');
 assert.deepEqual(plan,{ok:true,cost:12,duration:4,partner:undefined});assert.equal(JSON.stringify(s),before);
 s.world.characters.cleopatra.health='dying';assert.deepEqual(previewMission(s,'caesar','egypt','spy','health'),plan);
 assert.equal(previewMission(s,'caesar','egypt','exchange','health').reason,'alliance');
 s.factions.caesar.treasury=0;assert.equal(previewMission(s,'caesar','egypt','spy','health').reason,'treasury');
 assert.equal(queueMission(s,'caesar','egypt','spy','health').reason,'treasury');assert.equal(s.operations.length,0);
});
test('health missions investigate the chosen reported person, not a hidden successor',()=>{
 const s=newGame('caesar');s.world.leadership.egypt=['ptolemy'];s.world.characters.cleopatra.health='ill';s.world.characters.ptolemy.health='seriously_ill';
 assert.equal(queueMission(s,'caesar','egypt','spy','health',null,'pacorus').reason,'identity');
 assert.equal(queueMission(s,'caesar','egypt','spy','health',null,'cleopatra').ok,true);
 s.knowledge.caesar.egypt.reportedLeaders=['ptolemy'];
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));loaded.world.intelSeed=1000;
 for(let i=0;i<4;i++)advanceOperations(loaded);
 assert.equal(loaded.operations[0].status,'complete');assert.equal(loaded.operations[0].subjectCharacter,'cleopatra');
 const report=loaded.knowledge.caesar.egypt.reports[0];assert.equal(report.character,'cleopatra');assert.equal(report.value,'ill');
 assert.equal(loaded.knowledge.senate.egypt.reports.length,0);
 const unknown=newGame();unknown.knowledge.caesar.egypt.reportedLeaders=[];unknown.world.leadership.egypt=['ptolemy'];
 assert.equal(queueMission(unknown,'caesar','egypt','travelers','health').ok,true);unknown.world.intelSeed=1000;
 advanceOperations(unknown);advanceOperations(unknown);
 assert.equal(unknown.knowledge.caesar.egypt.reports[0].character,null);assert.equal(unknown.knowledge.caesar.egypt.reports[0].value,'unknown');
});
test('a reported claimant may be investigated without revealing an unreported one',()=>{
 const s=newGame('caesar');s.knowledge.caesar.egypt.reportedLeaders=['cleopatra'];s.world.claimants.egypt=['ptolemy'];
 assert.equal(previewMission(s,'caesar','egypt','spy','health',null,'ptolemy').reason,'identity');
 addReport(s,'caesar','egypt',{kind:'claimants',leaders:['ptolemy'],source:'spy',confidence:'rumor'});
 assert.equal(queueMission(s,'caesar','egypt','spy','health',null,'ptolemy').ok,true);
 assert.equal(s.operations[0].subjectCharacter,'ptolemy');assert.equal(s.knowledge.senate.egypt.reports.length,0);
 s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.egypt.reports[0].character,'ptolemy');
});
test('political stability investigations produce uncertain reports instead of revealing the true score',()=>{
 const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
 const s=newGame('caesar');s.factions.egypt.stability=20;s.wars.push(['caesar','egypt']);
 assert.equal(queueMission(s,'caesar','egypt','spy','stability').ok,true);s.world.intelSeed=seedFor(.4,.44);
 for(let i=0;i<4;i++)advanceOperations(s);const first=s.knowledge.caesar.egypt.reports[0];
 assert.equal(first.kind,'stability');assert.equal(first.value,'stable');assert.equal(first.verified,false);assert.equal(s.factions.egypt.stability,20);assert.equal(s.knowledge.senate.egypt.reports.length,0);
 const mission=queueMission(s,'caesar','egypt','envoy','stability');assert.equal(mission.ok,true);s.world.intelSeed=seedFor(.7,.8);
 for(let i=0;i<mission.duration;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.egypt.reports[0].value,'fragile');assert.ok(s.knowledge.caesar.egypt.reports.every(r=>r.confidence==='disputed'));
});
test('health has gameplay impact and deceased commanders are succeeded without revealing foreign changes',()=>{
 const s=newGame(),a=s.armies.find(x=>x.id==='xiii');s.world.characters.caesar.health='seriously_ill';assert.ok(commandFactor(s,a)<1);
 let died=false;for(let seed=1;seed<500&&!died;seed++){const trial=newGame();trial.world.characters.orodes.health='dying';trial.world.intelSeed=(seed*900001)>>>0;trial.month=1;advanceCharacters(trial);if(!trial.world.characters.orodes.alive){died=true;assert.deepEqual(trial.world.leadership.parthia,['pacorus']);assert.deepEqual(knownLeaders(trial,'caesar','parthia'),['orodes'])}}assert.equal(died,true);
 assert.deepEqual(ageRange('caesar',-49),[50,53]);assert.deepEqual(ageRange('antony',-49),[32,37]);assert.deepEqual(ageRange('ptolemy',-49),[11,13]);assert.equal(ageRange('lepidus',-49),null);
});
test('old version 3 saves are migrated without resetting their campaign data',()=>{
 const s=newGame();s.month=7;s.factions.caesar.treasury=42;delete s.world;delete s.knowledge;delete s.operations;
 const loaded=upgradeSave(s);assert.equal(loaded.month,7);assert.equal(loaded.factions.caesar.treasury,42);assert.ok(loaded.world.characters.caesar);
});


test('a contested joint rule leaves foreign reports stale and hostile courts may conceal the dispute',()=>{
 let found=false;for(let seed=1;seed<100&&!found;seed++){const s=newGame();assert.equal(contestLeadership(s,'egypt','cleopatra'),true);assert.deepEqual(s.world.leadership.egypt,['ptolemy']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.equal(diplomacy(s,'caesar','egypt','war'),true);s.seed=(seed*7000013)>>>0;assert.equal(sendInquiry(s,'caesar','egypt').ok,true);s.inquiries[0].remaining=1;tick(s);if(s.inquiries[0].status==='answered'){found=true;assert.match(s.inquiries[0].claim[0],/Cleopatra/);assert.deepEqual(s.world.leadership.egypt,['ptolemy']);assert.equal(s.inquiries[0].confidence,'unverified')}}assert.equal(found,true);
});
test('a contested court can circulate an outdated leadership claim without changing the true government',()=>{
 const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
 const s=newGame();contestLeadership(s,'egypt','cleopatra');
 assert.equal(queueMission(s,'caesar','egypt','envoy','leaders').ok,true);s.world.intelSeed=seedFor(.40,.44);
 for(let i=0;i<s.operations[0].duration;i++)advanceOperations(s);
 assert.equal(s.operations[0].status,'complete');assert.deepEqual(s.world.leadership.egypt,['ptolemy']);
 assert.deepEqual(s.knowledge.caesar.egypt.reports[0].leaders,['cleopatra','ptolemy']);
 assert.equal(s.knowledge.caesar.egypt.reports[0].verified,false);assert.equal(s.knowledge.senate.egypt.reports.length,0);
 assert.equal(queueMission(s,'caesar','egypt','spy','leaders').ok,true);s.world.intelSeed=seedFor(.7,.8);
 for(let i=0;i<4;i++)advanceOperations(s);
 assert.deepEqual(s.knowledge.caesar.egypt.reports[0].leaders,['ptolemy']);
 assert.ok(s.knowledge.caesar.egypt.reports.every(r=>r.confidence==='disputed'&&!r.verified));
 const peaceful=newGame();peaceful.world.leadership.egypt=['ptolemy'];
 assert.equal(queueMission(peaceful,'caesar','egypt','envoy','leaders').ok,true);peaceful.world.intelSeed=seedFor(.40,.44);
 for(let i=0;i<peaceful.operations[0].duration;i++)advanceOperations(peaceful);
 assert.deepEqual(peaceful.knowledge.caesar.egypt.reports[0].leaders,['ptolemy']);
});
test('envoy journeys reflect distance and court cooperation depends on relations at arrival',()=>{
 const s=newGame('caesar');assert.ok(missionDuration(s,'caesar','egypt','envoy')>missionDuration(s,'senate','egypt','envoy'));
 const dispatched=queueMission(s,'caesar','egypt','envoy','leaders');assert.equal(dispatched.duration,missionDuration(s,'caesar','egypt','envoy'));
 let loaded=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.operations[0].remaining,dispatched.duration);
 for(let i=1;i<dispatched.duration;i++)advanceOperations(loaded);assert.equal(loaded.operations[0].status,'pending');
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=.39&&q<.40});
 const warm=JSON.parse(JSON.stringify(loaded)),cold=JSON.parse(JSON.stringify(loaded));warm.relations['caesar:egypt']=80;cold.relations['caesar:egypt']=-80;warm.world.intelSeed=seed;cold.world.intelSeed=seed;
 advanceOperations(warm);advanceOperations(cold);assert.equal(warm.operations[0].status,'complete');assert.equal(cold.operations[0].status,'declined');assert.equal(cold.knowledge.caesar.egypt.reports.length,0);
});
test('an envoy audience yields limited dated observations only to its sender',()=>{
 const s=newGame('senate');s.world.characters.cleopatra.health='ill';
 const plan=queueMission(s,'senate','egypt','audience','leaders');assert.equal(plan.ok,true);s.world.intelSeed=1000;
 for(let i=0;i<plan.duration;i++)advanceOperations(s);
 assert.equal(s.operations[0].status,'complete');const reports=s.knowledge.senate.egypt.reports;
 assert.equal(reports.find(r=>r.kind==='health').value,'unknown');
 assert.deepEqual(reports.find(r=>r.kind==='age').value,[10,30]);
 assert.ok(reports.every(r=>!r.verified&&r.source==='audience'));assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 const hidden=newGame('senate');hidden.world.characters.cleopatra.health='dying';hidden.world.characters.ptolemy.health='seriously_ill';
 const second=queueMission(hidden,'senate','egypt','audience','leaders');hidden.world.intelSeed=1000;for(let i=0;i<second.duration;i++)advanceOperations(hidden);
 assert.ok(hidden.knowledge.senate.egypt.reports.every(r=>r.kind==='leaders'));
});
test('an envoy cannot personally observe a ruler outside the receiving court',()=>{
 const s=newGame('senate');s.world.characters.cleopatra.location='parthia';s.world.characters.ptolemy.location='parthia';
 const plan=queueMission(s,'senate','egypt','audience','leaders');s.world.intelSeed=1000;
 for(let i=0;i<plan.duration;i++)advanceOperations(s);
 assert.equal(s.operations[0].status,'complete');assert.equal(s.operations[0].meeting,'envoy');
 assert.ok(s.knowledge.senate.egypt.reports.some(r=>r.kind==='leaders'));
 assert.ok(s.knowledge.senate.egypt.reports.every(r=>r.kind!=='age'&&r.kind!=='health'));
 assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('age estimates from different dates are not treated as contradictory current claims',()=>{
 const s=newGame();addReport(s,'caesar','egypt',{kind:'age',character:'cleopatra',value:[19,21],source:'audience',confidence:'unverified'});
 s.year++;addReport(s,'caesar','egypt',{kind:'age',character:'cleopatra',value:[20,22],source:'audience',confidence:'unverified'});
 assert.ok(s.knowledge.caesar.egypt.reports.every(r=>r.confidence==='unverified'&&!r.verified));
});


test('different inquiry questions persist and do not overwrite leadership knowledge',()=>{
 const s=newGame();assert.equal(sendInquiry(s,'caesar','egypt','successor').ok,true);assert.equal(s.inquiries[0].subject,'successor');s.inquiries[0].remaining=1;
 for(let i=0;i<20;i++){const probe=JSON.parse(JSON.stringify(s));probe.seed=(i*7000013)>>>0;tick(probe);if(probe.inquiries[0].status==='answered'){assert.match(probe.inquiries[0].claim[0],/successor/i);assert.equal(probe.knowledge.caesar.egypt.reports[0].kind,'succession');assert.equal(probe.knowledge.caesar.egypt.reports[0].value,'unknown');assert.deepEqual(knownLeaders(probe,'caesar','egypt'),['cleopatra','ptolemy']);return}}assert.fail('No answered inquiry in test seeds');
});

test('surviving joint ruler remains in office when a co-ruler dies',()=>{
 const s=newGame();s.world.characters.cleopatra.alive=false;assert.deepEqual(assignSuccession(s,'egypt'),['ptolemy']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);
});


test('foreign movement orders do not publish exact routes in the player chronicle',()=>{
 const s=newGame();assert.equal(moveArmy(s,'pompey','italiaN').ok,true);assert.equal(s.log.length,0);
});


test('contradictory and expired intelligence cannot produce false confidence',()=>{
 const s=newGame();addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'envoy',confidence:'unverified'});addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'travelers',confidence:'rumor'});assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'disputed');
 const q=newGame();addReport(q,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});q.year+=3;addReport(q,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'envoy',confidence:'unverified'});assert.equal(q.knowledge.caesar.egypt.reports[0].confidence,'unverified');
});


test('low domestic stability reduces simulated loyalty without exposing it to other factions',()=>{
 const s=newGame();s.factions.caesar.stability=20;const before=s.world.characters.antony.loyalty;s.month=1;advanceCharacters(s);assert.equal(s.world.characters.antony.loyalty,before-4);assert.equal(s.knowledge.senate.caesar.reports.length,0);
});


test('rechecking a visible former position clears the marker without proving the army was destroyed',()=>{
 const s=newGame(),pompey=s.armies.find(a=>a.id==='pompey');pompey.region='italiaN';observeArmies(s);
 pompey.region='africa';observeArmies(s);assert.equal(reportedArmies(s,'caesar').find(a=>a.id==='pompey'),undefined);assert.equal(s.knowledge.caesar.senate.sightingHistory[0].region,'italiaN');
 pompey.region='italiaN';s.month=2;observeArmies(s);assert.equal(reportedArmies(s,'caesar').find(a=>a.id==='pompey').region,'italiaN');
 s.armies=s.armies.filter(a=>a.id!=='pompey');assert.ok(reportedArmies(s,'caesar').some(a=>a.id==='pompey'));s.month=3;observeArmies(s);
 assert.equal(reportedArmies(s,'caesar').find(a=>a.id==='pompey'),undefined);assert.equal(s.knowledge.caesar.senate.sightingHistory[0].month,2);assert.equal(s.knowledge.caesar.senate.sightingHistory[0].checkedMonth,3);
});

test('new campaigns seed each faction only with its own frontier observations',()=>{
 const s=newGame('caesar'),caesar=reportedArmies(s,'caesar'),egypt=reportedArmies(s,'egypt');
 assert.ok(caesar.some(a=>a.id==='italy'));
 assert.ok(!caesar.some(a=>a.id==='egyptguard'));
 assert.ok(!egypt.some(a=>a.id==='xiii'));
 assert.notDeepEqual(caesar.map(a=>a.id).sort(),egypt.map(a=>a.id).sort());
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(reportedArmies(loaded,'caesar'),caesar);
});

test('allied exchanges forward only the ally’s knowledge and preserve its original provenance',()=>{
 const s=newGame();s.alliances.push(['caesar','numidia']);s.world.characters.cleopatra.health='seriously_ill';
 addReport(s,'numidia','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'spy',confidence:'unverified'});
 addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'spy',confidence:'unverified'});
 assert.equal(queueMission(s,'caesar','egypt','exchange','health').ok,true);s.world.intelSeed=1000;
 for(let i=0;i<3;i++)advanceOperations(s);
 const r=s.knowledge.caesar.egypt.reports[0];assert.equal(r.value,'healthy');assert.equal(r.source,'exchange');assert.equal(r.originSource,'spy');assert.equal(r.fromFaction,'numidia');assert.equal(r.confidence,'unverified');assert.equal(r.verified,false);
});
test('allied exchange cannot invent knowledge or refresh an old observation',()=>{
 const s=newGame();s.alliances.push(['caesar','numidia']);addReport(s,'numidia','egypt',{kind:'leaders',leaders:['ptolemy'],source:'envoy',confidence:'unverified'});s.year+=3;s.world.intelSeed=1000;
 assert.equal(queueMission(s,'caesar','egypt','exchange','leaders').ok,true);for(let i=0;i<3;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.egypt.reports[0].observationYear,-49);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);
 assert.equal(queueMission(s,'caesar','egypt','exchange','strength').ok,true);s.world.intelSeed=1000;for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'failed');assert.equal(s.knowledge.caesar.egypt.reports.some(r=>r.kind==='strength'),false);
});
test('an ally can forward existing intelligence even when the target secretly loses all territory',()=>{
 const baseline=newGame('senate');baseline.alliances.push(['senate','parthia']);addReport(baseline,'parthia','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified',observationYear:-50,observationMonth:4});
 const hidden=upgradeSave(JSON.parse(JSON.stringify(baseline)));for(const r of hidden.regions)if(r.owner==='egypt')r.owner='numidia';
 for(const s of [baseline,hidden]){s.world.intelSeed=1000;assert.equal(queueMission(s,'senate','egypt','exchange','health','parthia','cleopatra').ok,true);for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'complete')}
 assert.deepEqual(hidden.knowledge.senate.egypt.reports[0],baseline.knowledge.senate.egypt.reports[0]);
 assert.equal(hidden.knowledge.senate.egypt.reports[0].observationYear,-50);assert.equal(hidden.knowledge.senate.egypt.reports[0].originSource,'spy');
 const stale=newGame('senate');stale.alliances.push(['senate','parthia']);stale.knowledge.senate.egypt_claimant={reportedLeaders:['ptolemy'],reports:[],sightings:{}};stale.knowledge.parthia.egypt_claimant={reportedLeaders:[],reports:[],sightings:{}};addReport(stale,'parthia','egypt_claimant',{kind:'leaders',leaders:['ptolemy'],source:'spy'});assert.equal(stale.factions.egypt_claimant,undefined);assert.equal(queueMission(stale,'senate','egypt_claimant','exchange','leaders','parthia').ok,true);stale.world.intelSeed=1000;for(let i=0;i<3;i++)advanceOperations(stale);assert.equal(stale.operations[0].status,'complete');assert.deepEqual(stale.knowledge.senate.egypt_claimant.reports[0].leaders,['ptolemy']);
});
test('allied exchanges seal the ally’s record in transit and reveal it only on delivery',()=>{
 let s=newGame('senate');s.alliances.push(['senate','parthia']);addReport(s,'parthia','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy'});
 assert.equal(queueMission(s,'senate','egypt','exchange','health','parthia','cleopatra').ok,true);s.world.intelSeed=1000;
 s.month=2;advanceOperations(s);assert.equal(s.operations[0].remaining,2);assert.equal(s.operations[0].exchangeSealed,undefined);assert.equal(s.knowledge.senate.egypt.reports.length,0);
 s.month=3;advanceOperations(s);assert.equal(s.operations[0].remaining,1);assert.equal(s.knowledge.senate.egypt.reports.length,0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));addReport(s,'parthia','egypt',{kind:'health',character:'cleopatra',value:'healthy',source:'travelers'});s.alliances=[];
 s.month=4;advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(s.operations[0].exchangeSealed,undefined);const received=s.knowledge.senate.egypt.reports[0];assert.equal(received.value,'ill');assert.equal(received.originSource,'spy');assert.equal(received.observationMonth,1);assert.equal(received.month,4);
});
test('a later allied report cannot travel back in time to answer an earlier request',()=>{
 const s=newGame('senate');s.alliances.push(['senate','parthia']);assert.equal(queueMission(s,'senate','egypt','exchange','health','parthia','cleopatra').ok,true);s.world.intelSeed=1000;advanceOperations(s);advanceOperations(s);
 addReport(s,'parthia','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy'});advanceOperations(s);assert.equal(s.operations[0].status,'failed');assert.equal(s.knowledge.senate.egypt.reports.length,0);assert.match(s.log[0].zh,/未收到报告；原因不明/);
});
test('official court responses and an envoy do not independently corroborate one another',()=>{
 const s=newGame();for(const source of ['official','envoy','audience'])addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'healthy',source,confidence:'unverified'});assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'unverified');assert.equal(s.knowledge.caesar.egypt.reports[0].verified,false);
});
test('peace decisions use the responder’s knowledge rather than hidden enemy troop totals',()=>{
 const s=newGame('egypt');diplomacy(s,'egypt','senate','war');s.armies.find(a=>a.owner==='egypt').men=100000;
 assert.equal(diplomacy(s,'egypt','senate','peace'),false);
 addReport(s,'senate','egypt',{kind:'strength',value:100000,source:'spy',confidence:'unverified'});
 assert.equal(diplomacy(s,'egypt','senate','peace'),true);
});
test('the chosen ally must be valid and can cease cooperating before an exchange completes',()=>{
 const s=newGame();s.alliances.push(['caesar','numidia'],['caesar','armenia']);
 assert.equal(queueMission(s,'caesar','egypt','exchange','health','parthia').reason,'alliance');
 addReport(s,'armenia','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 assert.equal(queueMission(s,'caesar','egypt','exchange','health','armenia').ok,true);s.alliances=s.alliances.filter(x=>!x.includes('armenia'));s.world.intelSeed=1000;
 for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'failed');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('an unknown observation neither contradicts a claim nor independently verifies another unknown',()=>{
 const s=newGame();addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'spy',confidence:'unverified'});
 for(const source of ['meeting','envoy','travelers'])addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'unknown',source,confidence:'unverified'});
 const reports=s.knowledge.caesar.egypt.reports;assert.equal(reports.find(r=>r.value==='ill').confidence,'unverified');assert.ok(reports.filter(r=>r.value==='unknown').every(r=>!r.verified&&r.confidence==='unverified'));
});
test('a recently forwarded but older leadership report cannot overwrite a newer observation',()=>{
 const s=newGame();s.month=6;addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source:'spy',confidence:'unverified'});
 s.month=7;addReport(s,'caesar','egypt',{kind:'leaders',leaders:['cleopatra'],source:'exchange',originSource:'court',observationYear:-49,observationMonth:2,confidence:'unverified'});
 assert.deepEqual(knownLeaders(s,'caesar','egypt'),['ptolemy']);assert.equal(s.knowledge.caesar.egypt.reports[0].confidence,'unverified');
});
test('diplomatic AI bases its estimate on observation time, not when an older report was forwarded',()=>{
 const s=newGame('egypt');diplomacy(s,'egypt','senate','war');s.month=6;
 addReport(s,'senate','egypt',{kind:'strength',value:100000,source:'spy',confidence:'unverified'});s.month=7;
 addReport(s,'senate','egypt',{kind:'strength',value:1000,source:'exchange',originSource:'court',observationYear:-49,observationMonth:2,confidence:'unverified'});
 assert.equal(diplomacy(s,'egypt','senate','peace'),true);
});
