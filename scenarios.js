import {newGame,estimatedStrength} from './engine.js?v=faces-empire-4';
import {createFictionalPerson} from './dynasties.js?v=faces-empire-2';
import {formCoalition} from './coalitions.js?v=multipolar-2';
import {observeDiplomacy} from './diplomatic-knowledge.js?v=multipolar-2';

// A fictional political crisis in the 49 BCE campaign. Conditions make
// collective opposition plausible, but do not preselect a war or outcome.
export function newRevolutionScenario(player='caesar'){
 const s=newGame(player),regionId=player==='senate'?'sicilia':'gaul',r=s.regions.find(x=>x.id===regionId),f=s.factions[player];
 s.scenario='revolution';f.stability=25;f.legitimacy=30;f.tax='high';r.loyalty=12;r.population.satisfaction=18;r.population.householdWealth=Math.max(12,r.population.householdWealth);
 s.log.unshift({year:s.year,month:s.month,en:`A fictional political crisis has developed in ${r.name[0]}; taxation, exclusion and weak legitimacy have strained the province.`,zh:`${r.name[1]}出现虚构的政治危机；税负、排斥和薄弱的合法性加剧了地方紧张。`});
 return s;
}

// These are playable alternate setups, not claims about historical people.
// Existing armies, diplomatic rules and institutions determine what follows.
export function newAmbitiousGeneralScenario(player='caesar'){
 const s=newGame(player),army=s.armies.find(a=>a.id===(player==='senate'?'italy':'viii'));
 const id=createFictionalPerson(s,{name:['Lucius Valerius Varus','卢基乌斯·瓦勒里乌斯·瓦鲁斯'],faction:player,birthYear:-86,location:army.region,wealth:30,role:['Fictional Roman general','虚构罗马将领']});
 const general=s.world.characters[id];Object.assign(general,{ambition:95,loyalty:72,influence:65,education:90});
 army.characterId=id;army.commander=['Lucius Valerius Varus','卢基乌斯·瓦勒里乌斯·瓦鲁斯'];army.skill=5;
 for(const ally of Object.values(s.world.characters).filter(c=>c.faction===player&&c.id!==id&&!c.institutionalOnly).slice(0,4))s.world.personalRelations[[id,ally.id].sort().join(':')]={trust:25,meetings:2};
 s.scenario='ambitious_general';s.scenarioGeneral=id;
 s.log.unshift({year:s.year,month:s.month,en:'Fictional scenario: a capable, well-connected general commands an existing army. His decisions remain uncertain.',zh:'虚构剧本：一位能力出众、人脉广泛的将领指挥现有军队；他的选择仍不确定。'});return s;
}

export function newCoalitionScenario(player='caesar'){
 const s=newGame(player),parties=['armenia','galatia','bosporus'],target='senate';
 for(let i=0;i<parties.length;i++){s.relations[[parties[i],target].sort().join(':')]=-45;for(const other of parties.slice(i+1))s.relations[[parties[i],other].sort().join(':')]=50}
 const result=formCoalition(s,parties[0],parties.slice(1),target,estimatedStrength);
 if(!result.ok)throw new Error(`Coalition scenario unavailable: ${result.reason}`);
 s.scenario='three_state_coalition';observeDiplomacy(s);
 s.log.unshift({year:s.year,month:s.month,en:'Fictional scenario: three eastern states have negotiated a defensive coalition; their interests may diverge.',zh:'虚构剧本：三个东方国家经协商建立防御联盟；各方利益可能分歧。'});return s;
}

export function newCivicScenario(player='caesar'){
 const s=newGame(player),region=s.regions.find(r=>r.id===(player==='senate'?'roma':'gaul'));
 let institution=s.world.religiousInstitutions.find(o=>o.region===region.id);
 if(!institution){
  const council=[['Gaius Sennius','盖乌斯·森尼乌斯'],['Mara','玛拉']].map(name=>{const id=createFictionalPerson(s,{name,faction:player,birthYear:-85,location:region.id,role:['Fictional civic representative','虚构公民代表']});s.world.characters[id].institutionalOnly=true;return id});
  institution={id:'scenario_civic',name:['Provincial civic association','行省公民协会'],description:['A fictional charitable association in the late Republic.','共和国晚期的虚构慈善协会。'],kind:'local_association',region:region.id,followers:Math.floor(region.population.total*.08),wealth:12,leader:council[0],council,influence:25,legitimacy:60,relations:{[player]:-15},recognizedBy:[],privilegedBy:[],factions:{traditional:50,civic:50},dispute:0,corruption:15,history:[]};s.world.religiousInstitutions.push(institution);
 }
 region.loyalty=28;region.population.satisfaction=30;s.factions[player].stability=40;institution.relations[player]=-25;
 s.scenario='civic_movement';s.scenarioInstitution=institution.id;
 s.log.unshift({year:s.year,month:s.month,en:'Fictional scenario: a local civic institution faces public grievances and an uncertain relationship with the government.',zh:'虚构剧本：地方公民机构面对民众诉求，与政府的关系尚不确定。'});return s;
}

export function newScenario(kind,player='caesar'){
 const factory={historical:newGame,revolution:newRevolutionScenario,ambitious_general:newAmbitiousGeneralScenario,three_state_coalition:newCoalitionScenario,civic_movement:newCivicScenario}[kind];
 if(!factory)throw new Error('Unknown scenario');return factory(player);
}
