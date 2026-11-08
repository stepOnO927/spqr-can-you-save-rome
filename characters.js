import {INITIAL_ARMIES} from './data.js?v=phase-x-1';
export const CHARACTER_CATALOG = {
 caesar:{name:['Gaius Julius Caesar','盖乌斯·尤利乌斯·凯撒'],birth:[-102,-100],faction:'caesar',role:['Roman political and military leader','罗马政治与军事领袖'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Julius-Caesar-Roman-ruler'},
 pompey:{name:['Gnaeus Pompeius Magnus','格奈乌斯·庞培'],birth:[-106,-106],faction:'senate',role:['Roman commander allied with the Senate','元老院方面的罗马统帅'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Pompey-the-Great'},
 antony:{name:['Marcus Antonius','马尔库斯·安东尼'],birth:[-86,-82],faction:'caesar',role:['Roman officer and politician','罗马军官与政治人物'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Mark-Antony'},
 cicero:{name:['Marcus Tullius Cicero','马尔库斯·图利乌斯·西塞罗'],birth:[-106,-106],faction:'senate',role:['Roman statesman and orator','罗马政治家与演说家'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Cicero'},
 cato:{name:['Marcus Porcius Cato','小加图'],birth:[-95,-95],faction:'senate',role:['Roman senator','罗马元老'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Cato-the-Younger'},
 labienus:{name:['Titus Labienus','提图斯·拉比埃努斯'],birth:null,faction:'senate',role:['Roman commander','罗马指挥官'],culture:['Roman','罗马'],source:'https://www.enciklopedija.hr/clanak/labijen-tit-vojskovodja'},
 lepidus:{name:['Marcus Aemilius Lepidus','马尔库斯·埃米利乌斯·雷必达'],birth:null,faction:'caesar',role:['Roman politician','罗马政治人物'],culture:['Roman','罗马'],source:'https://brockhaus.de/ecs/enzy/article/lepidus-20'},
 scipio:{name:['Quintus Caecilius Metellus Scipio','梅特卢斯·西庇阿'],birth:null,faction:'senate',role:['Roman senator and commander','罗马元老与指挥官'],culture:['Roman','罗马'],source:'https://academic.oup.com/edited-volume/61673/chapter-abstract/548509305'},
 cleopatra:{name:['Cleopatra VII','克娄巴特拉七世'],birth:[-70,-69],faction:'egypt',role:['Ptolemaic co-ruler','托勒密王朝共同统治者'],culture:['Ptolemaic Egyptian','托勒密埃及'],source:'https://www.metmuseum.org/toah/hd/ptol/hd_ptol.htm'},
 ptolemy:{name:['Ptolemy XIII','托勒密十三世'],birth:[-62,-61],faction:'egypt',role:['Ptolemaic co-ruler','托勒密王朝共同统治者'],culture:['Ptolemaic Egyptian','托勒密埃及'],source:'https://www.metmuseum.org/toah/hd/gkru/hd_gkru.htm'},
 arsinoe:{name:['Arsinoë IV','阿尔西诺伊四世'],birth:[-69,-60],faction:'egypt',role:['Ptolemaic princess','托勒密王朝公主'],culture:['Ptolemaic Egyptian','托勒密埃及'],source:'https://www.trismegistos.org/calendar/bennett/ptolemies/arsinoe_iv.htm'},
 orodes:{name:['Orodes II','奥罗德二世'],birth:null,faction:'parthia',role:['Arsacid king','安息阿尔沙克王朝国王'],culture:['Parthian','帕提亚'],source:'https://www.iranicaonline.org/articles/orodes-ii/'},
 pacorus:{name:['Pacorus I','帕科鲁斯一世'],birth:null,faction:'parthia',role:['Arsacid prince','安息王子'],culture:['Parthian','帕提亚'],source:'https://www.iranicaonline.org/articles/armenia-ii/'},
 artavasdes:{name:['Artavasdes II','阿尔塔瓦兹德二世'],birth:null,faction:'armenia',role:['King of Armenia','亚美尼亚国王'],culture:['Armenian','亚美尼亚'],source:'https://www.iranicaonline.org/articles/armenia-ii/'},
 juba:{name:['Juba I','朱巴一世'],birth:null,faction:'numidia',role:['King of Numidia','努米底亚国王'],culture:['Numidian','努米底亚'],source:'https://www.britannica.com/biography/Juba-I'},
 bocchus:{name:['Bocchus II','博库斯二世'],birth:null,faction:'mauretania',role:['Mauretanian king','毛里塔尼亚国王'],culture:['Mauretanian','毛里塔尼亚'],source:'https://www.britannica.com/place/Mauretania-ancient-region-Africa'},
 bogud:{name:['Bogud','博古德'],birth:null,faction:'mauretania',role:['Mauretanian king','毛里塔尼亚国王'],culture:['Mauretanian','毛里塔尼亚'],source:'https://www.britannica.com/place/Mauretania-ancient-region-Africa'},
 deiotarus:{name:['Deiotarus','代奥塔鲁斯'],birth:null,faction:'galatia',role:['Galatian ruler','加拉太统治者'],culture:['Galatian','加拉太'],source:'https://www.britannica.com/biography/Deiotarus'},
 pharnaces:{name:['Pharnaces II','法尔纳刻斯二世'],birth:null,faction:'bosporus',role:['Bosporan ruler','博斯普鲁斯王国统治者'],culture:['Pontic','本都'],source:'https://academic.oup.com/edited-volume/61673/chapter-abstract/549705304?login=false'}
};
export const OPENING_LEADERS={caesar:['caesar'],senate:['pompey'],egypt:['cleopatra','ptolemy'],parthia:['orodes'],armenia:['artavasdes'],numidia:['juba'],mauretania:['bocchus','bogud'],galatia:['deiotarus'],bosporus:['pharnaces'],rebels:[]};
const SUCCESSORS={caesar:['antony','lepidus'],senate:['cato','scipio','labienus','cicero'],egypt:['cleopatra','ptolemy','arsinoe'],parthia:['pacorus'],armenia:[],numidia:[],mauretania:['bocchus','bogud'],galatia:[],bosporus:[],rebels:[]};
const clone=x=>JSON.parse(JSON.stringify(x));
export function initializeWorld(s){
 if(!s.world){s.world={characters:Object.fromEntries(Object.entries(CHARACTER_CATALOG).filter(([,c])=>!c.fictional).map(([id,c])=>[id,{id,faction:c.faction,health:'healthy',location:null,alive:true,loyalty:75,influence:50}])),leadership:clone(OPENING_LEADERS),intelSeed:874913};}
 // Add the new historical figure once to old saves, without resetting existing people.
 if(!s.world.arsinoeInitialized){if(!s.world.characters.arsinoe&&s.factions?.egypt)s.world.characters.arsinoe={id:'arsinoe',faction:'egypt',health:'healthy',location:s.regions.some(r=>r.id==='egypt'&&r.owner==='egypt')?'egypt':null,alive:true,loyalty:75,influence:50};s.world.arsinoeInitialized=true}
 for(const c of Object.values(s.world.characters)){if(c.loyalty===undefined)c.loyalty=75;if(c.influence===undefined)c.influence=50;if(c.wounds===undefined)c.wounds=c.health==='wounded'?1:0;if(c.illnessEpisodes===undefined)c.illnessEpisodes=0}
 // Theater-level scenario positions, not claims about historical whereabouts.
 if(!s.world.personLocationsInitialized){const homes={antony:'cisalpine',lepidus:'cisalpine',cicero:'roma',cato:'roma',labienus:'roma',scipio:'roma',cleopatra:'egypt',ptolemy:'egypt',arsinoe:'egypt',orodes:'parthia',pacorus:'parthia',artavasdes:'armenia',juba:'numidia',bocchus:'mauretania',bogud:'mauretania',deiotarus:'galatia',pharnaces:'bosporus'};for(const [id,place] of Object.entries(homes)){const c=s.world.characters[id];if(c&&c.location==null)c.location=place}s.world.personLocationsInitialized=true}
 if(!s.world.personalRelations)s.world.personalRelations={};
 if(!s.meetings)s.meetings=[];
 if(!s.world.claimants)s.world.claimants={};
 if(!s.world.disputes)s.world.disputes={};
 if(!s.world.disputeHistory)s.world.disputeHistory=[];
 if(!s.world.recognitions)s.world.recognitions={};
 if(!s.world.defections)s.world.defections=[];
 if(!s.knowledge){s.knowledge=Object.fromEntries(Object.keys(s.factions).map(actor=>[actor,Object.fromEntries(Object.keys(s.factions).map(target=>[target,{reportedLeaders:clone(OPENING_LEADERS[target]||[]),reports:[]}]))]));}
 for(const [observer,targets] of Object.entries(s.knowledge))for(const [target,k] of Object.entries(targets)){if(!k.sightings)k.sightings=Object.fromEntries(INITIAL_ARMIES.filter(a=>a.owner===target&&target!==observer).map(a=>[a.id,{id:a.id,name:[...a.name],owner:a.owner,region:a.region,year:-49,month:1}]))}
 if(!s.operations)s.operations=[];
 if(!s.world.captives)s.world.captives=[];
 if(!s.world.nextCaptive)s.world.nextCaptive=1;
 if(!s.releaseRequests)s.releaseRequests=[];
 if(!s.world.captiveMigration){for(const op of s.operations.filter(x=>x.type==='spy'&&x.status==='captured'&&!x.captiveId)){const id='captive'+s.world.nextCaptive++;op.captiveId=id;s.world.captives.push({id,owner:op.actor,holder:op.target,state:'held',year:op.sentYear??s.year,month:op.sentMonth??s.month})}s.world.captiveMigration=true}
 return s;
}
// Birthdays are not specified in the catalog: either side of the birthday may apply.
export function ageRange(id,year){const b=CHARACTER_CATALOG[id]?.birth;if(!b)return null;return [year-b[1]-1,year-b[0]]}
export const successionModel=(faction,s)=>['caesar','senate'].includes(faction)?(s?.world?.romanRegimes?.[faction]||'republican_command'):faction==='egypt'?'ptolemaic_court':faction==='parthia'?'arsacid_nobility':faction==='mauretania'?'separate_kingdoms':'regional_dynasty';
export function successorFor(s,faction){const fictional=['egypt','parthia','armenia','numidia','mauretania','galatia','bosporus'].includes(faction)||['roman_principate','later_empire'].includes(successionModel(faction,s))?Object.values(s.world.characters).filter(c=>CHARACTER_CATALOG[c.id]?.fictional&&c.faction===faction&&!c.institutionalOnly&&c.birthYear!=null&&s.year-c.birthYear>=18).map(c=>c.id):[];return [...new Set([...(SUCCESSORS[faction]||[]),...fictional])].filter(id=>s.world.characters[id]?.alive&&!s.world.characters[id].missing&&!s.world.characters[id].asylumHost&&s.world.characters[id].faction===faction&&!(s.world.leadership[faction]||[]).includes(id)).sort((a,b)=>(s.world.characters[b].influence??50)-(s.world.characters[a].influence??50));}
export function assignSuccession(s,faction){
 const previous=s.world.leadership[faction]||[],current=previous.filter(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction);
 const model=successionModel(faction,s),imperial=['roman_principate','later_empire'].includes(model);
 const contested=(['egypt','parthia'].includes(faction)||imperial)&&s.world.disputes?.[faction]&&(s.world.claimants?.[faction]||[]).some(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction);
 if(!current.length&&contested&&!s.world.disputes[faction].vacancySince){s.world.disputes[faction].months=0;s.world.disputes[faction].vacancySince={year:s.year,month:s.month}}
 if(!current.length&&!contested){
  const candidates=successorFor(s,faction),royal=!['republican_command','separate_kingdoms'].includes(model);
  const children=royal?previous.flatMap(id=>s.world.characters[id]?.children||[]).filter(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction&&!s.world.characters[id].missing&&!s.world.characters[id].asylumHost):[];
  const preferred=model==='later_empire'&&s.world.coEmperors?.[faction]||s.world.successionPlans?.[faction],eligible=[...new Set([...children,...candidates])];
  const military=id=>s.armies.filter(a=>a.owner===faction&&a.characterId===id).reduce((n,a)=>n+Math.min(35,Math.floor((a.men||0)/500)),0);
  const ranked=imperial?[...eligible].sort((a,b)=>((s.world.characters[b].influence||0)+military(b)+(children.includes(b)?12:0))-((s.world.characters[a].influence||0)+military(a)+(children.includes(a)?12:0))):eligible;
  const next=eligible.includes(preferred)?preferred:model==='arsacid_nobility'?candidates[0]||children[0]:imperial?ranked[0]:children[0]||candidates[0];if(next)current.push(next);
  if(imperial&&next){const rival=ranked.find(id=>id!==next&&s.world.characters[id].influence>=35&&((s.world.characters[id].influence||0)+military(id)>=(s.world.characters[next].influence||0)+military(next)-25||s.factions[faction]?.stability<45));if(rival){s.world.claimants[faction]||=[];if(!s.world.claimants[faction].includes(rival))s.world.claimants[faction].push(rival);s.world.disputes[faction]||={months:0,support:{}};s.world.disputes[faction].support||={};s.world.disputes[faction].support[rival]??=Math.min(30,military(rival))}}
  if(model==='arsacid_nobility'&&next){const bypassed=children.filter(id=>id!==next);if(bypassed.length){s.world.claimants[faction]||=[];for(const id of bypassed)if(!s.world.claimants[faction].includes(id))s.world.claimants[faction].push(id);s.world.disputes[faction]||={months:0,support:{}};s.world.disputes[faction].support||={};for(const id of bypassed)s.world.disputes[faction].support[id]??=10}}
 }
 s.world.leadership[faction]=current;if(s.world.claimants[faction])s.world.claimants[faction]=s.world.claimants[faction].filter(id=>!current.includes(id)&&s.world.characters[id]?.alive);return current;
}
export function knownLeaders(s,viewer,target){initializeWorld(s);return s.knowledge[viewer]?.[target]?.reportedLeaders||[]}
// Derive a public-facing description only from the reported names, never the hidden government state.
export function leadershipTitle(faction,reported){if(!reported?.length)return ['Authority unconfirmed','领导身份未确认'];if(faction==='caesar'||faction==='senate')return ['Roman faction leadership','罗马派系领袖'];if(faction==='egypt_claimant'||faction==='parthia_claimant')return ['Reported claimant leadership','报告的竞争者领袖'];if(faction==='egypt'&&reported.length>1)return ['Joint rulers','共同统治者'];if(faction==='mauretania')return ['Rulers of separate kingdoms','各王国统治者'];return ['Ruler','统治者']}

// Historical encyclopedia text; later campaign events and health are simulated.
export const HISTORICAL_BIO={
 caesar:['Roman general and politician whose crossing of the Rubicon preceded civil war in 49 BCE.','罗马将领与政治家；他越过卢比孔河后，公元前49年的内战随之爆发。'],
 pompey:['Roman general and political leader who aligned with the Senate against Caesar.','罗马将领和政治领袖，在内战中与元老院方面站在一起。'],
 antony:['Roman officer and politician who supported Caesar during the civil war.','罗马军官与政治人物，在内战中支持凯撒。'],
 cicero:['Roman statesman, lawyer and orator active in the final decades of the Republic.','罗马共和国晚期的政治家、律师和演说家。'],
 cato:['Roman senator and political opponent of Caesar in the late Republic.','罗马共和国晚期元老、凯撒的政治对手。'],
 labienus:['Roman commander who had served under Caesar before joining his opponents.','罗马指挥官，曾在凯撒麾下服役，后来加入其对手。'],
 lepidus:['Roman politician who supported Caesar and was praetor in 49 BCE.','罗马政治人物，支持凯撒，公元前49年任裁判官。'],
 scipio:['Roman senator, consul in 52 BCE, and a leading supporter of Pompey.','罗马元老，公元前52年任执政官，是庞培的重要支持者。'],
 cleopatra:['Ptolemaic queen who initially shared the throne with her brother Ptolemy XIII.','托勒密王朝女王，最初与弟弟托勒密十三世共同统治。'],
 ptolemy:['Ptolemaic king and co-ruler with Cleopatra VII in the opening period of the civil war.','托勒密王朝国王，在内战初期与克娄巴特拉七世共同统治。'],
 arsinoe:['Ptolemaic princess and sister of Cleopatra VII and Ptolemy XIII; later involved in the Alexandrian conflict.','托勒密王朝公主，克娄巴特拉七世和托勒密十三世的姐妹；后来卷入亚历山大城的冲突。'],
 orodes:['Arsacid king of Parthia during the period following the Roman defeat at Carrhae.','安息阿尔沙克王朝国王，在罗马于卡莱战败后的时期统治。'],
 pacorus:['Arsacid prince and son of Orodes II, associated with Parthian military affairs.','阿尔沙克王朝王子、奥罗德二世之子，参与安息军事事务。'],
 artavasdes:['King of Armenia whose position between Rome and Parthia required careful diplomacy.','亚美尼亚国王，身处罗马与安息之间，需要谨慎处理外交。'],
 juba:['King of Numidia and a participant on the Pompeian side of the civil war.','努米底亚国王，在内战中参与庞培方面的行动。'],
 bocchus:['One of the contemporary Mauretanian rulers; the region was not a single unified court.','当时的毛里塔尼亚统治者之一；该地区并非由单一宫廷统一统治。'],
 bogud:['A Mauretanian ruler contemporary with Bocchus II.','与博库斯二世同时代的毛里塔尼亚统治者。'],
 deiotarus:['A Galatian ruler and Roman ally involved in the politics of the eastern Mediterranean.','加拉太统治者和罗马盟友，参与东地中海地区的政治。'],
 pharnaces:['King of the Bosporan kingdom during the Roman civil war.','罗马内战时期博斯普鲁斯王国的国王。']
};
