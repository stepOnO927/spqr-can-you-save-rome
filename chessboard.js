import {FACTIONS,ROUTES} from './data.js?v=phase-x-1';
import {CHARACTER_CATALOG} from './characters.js?v=dynasty-id-3';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=multipolar-2';
import {reportedMovements} from './movements.js?v=save-identity-1';

const opening=['caesar','senate','egypt','numidia','mauretania','armenia','parthia','galatia','bosporus'];
const pair=(a,b)=>[a,b].sort().join(':');
const age=(s,r)=>(s.year-(r.observationYear??r.year))*12+s.month-(r.observationMonth??r.month);
const atWar=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
const name=id=>FACTIONS[id]?.short||[id,id];
const personName=id=>CHARACTER_CATALOG[id]?.name||[id,id];
const activeMovement=m=>!['settled','collapsed','defeated','victorious'].includes(m.stage);
const labels={
 war:['At war','交战'],shared_threat:['Possible shared threat','可能的共同威胁'],relation:['Official relations','官方关系'],alliance:['Alliance','同盟'],agreement:['Agreement','条约'],coalition:['Coalition member','联盟成员'],opposes:['Declared concern','公开防范'],leadership:['Reported leadership','报告中的领导'],ownLeadership:['Leadership','本方领导'],office:['Own personnel','本方人员'],family:['Family tie','家族关系'],familyAccord:['Family agreement','家族协定'],patronage:['Recorded family support','已记录的家族支持'],personal:['Recorded personal relationship','已记录的私人关系'],institution:['Local institution','当地机构'],movement:['Political movement','政治运动'],suspicion:['Reported suspicion','报告中的嫌疑']
};
const kinds={non_aggression:['Non-aggression','互不侵犯'],military_access:['Military access','军事通行'],trade:['Trade','贸易'],intelligence:['Intelligence sharing','情报共享'],defensive:['Defensive agreement','防御协议'],offensive:['Offensive agreement','进攻协议'],military_support:['Wartime aid','战时援助'],political:['Political cooperation','政治合作'],guarantee:['Independence guarantee','独立保障'],full:['Alliance','同盟']};
const stages={dissatisfaction:['Dissatisfaction','不满'],organized:['Opposition','反对派'],network:['Leadership network','领导网络'],negotiation:['Confrontation','政治对峙'],crisis:['Political crisis','政治危机'],armed:['Armed conflict','武装冲突']};

// Only own facts, public commitments and the observer's dated records enter
// this projection. In particular, it never reads another actor's plan, plot,
// true personal allegiance, foreign resources or unobserved military roster.
export function buildChessboard(s,viewer=s.player){
 const nodes=[],links=[],risks=[],advice=[],objectives=[],byId=new Map(),f=s.factions[viewer],ownRegions=s.regions.filter(r=>r.owner===viewer),ownArmies=s.armies.filter(a=>a.owner===viewer&&a.men>0),now=s.year*12+s.month;
 const add=(id,type,label,certainty,detail=[])=>{if(!byId.has(id)){const node={id,type,label,certainty,detail};byId.set(id,node);nodes.push(node)}return byId.get(id)};
 const link=(from,to,kind,certainty,detail,observed=null)=>{if(from!==to&&byId.has(from)&&byId.has(to))links.push({from,to,kind,label:labels[kind],certainty,detail,observed})};
 const ownId='f:'+viewer;add(ownId,'faction',name(viewer),'confirmed',[[`Your command: treasury ${f.treasury}, food ${f.food}, stability ${f.stability}.`,`本方国库 ${f.treasury}、粮食 ${f.food}、稳定度 ${f.stability}。`]]);
 const docs=reportedDiplomacy(s,viewer).filter(d=>d.status==='active'&&!d.parties.includes(viewer));
 const factionIds=new Set(opening);for(const d of docs)for(const id of [...d.parties,d.target].filter(Boolean))factionIds.add(id);
 for(const w of s.wars.filter(x=>x.includes(viewer)))for(const id of w)factionIds.add(id);
 for(const k of Object.values(s.controlKnowledge?.[viewer]||{}))if(k.owner&&FACTIONS[k.owner])factionIds.add(k.owner);
 for(const id of [...factionIds].filter(id=>id!==viewer&&FACTIONS[id]).slice(0,14)){
  const relation=s.relations[pair(viewer,id)]??0,enemy=atWar(s,viewer,id),id2='f:'+id;
  add(id2,'faction',name(id),'reported',[[`Official relationship with your command: ${relation}. Other information may be old or absent.`,`与本方的官方关系：${relation}。其他情报可能过时或缺失。`]]);
  const sightings=Object.values(s.knowledge?.[viewer]?.[id]?.sightings||{}).filter(x=>age(s,x)>=0&&age(s,x)<=24&&x.region).sort((a,b)=>age(s,a)-age(s,b)).slice(0,3);
  for(const sighting of sightings){const location=s.regions.find(r=>r.id===sighting.region)?.name||[sighting.region,sighting.region],year=sighting.year<0?Math.abs(sighting.year):sighting.year+1;byId.get(id2).detail.push([`A force was reported near ${location[0]} in ${sighting.month}/${year} ${sighting.year<0?'BCE':'CE'}; current location and strength are unknown.`,`曾于${sighting.year<0?'公元前':'公元'}${year}年${sighting.month}月在${location[1]}附近发现一支军队；当前位置及兵力未知。`])}
  if(enemy)link(ownId,id2,'war','confirmed',['Your command is at war with this faction.','本方与该势力交战。']);
  else if(relation!==0)link(ownId,id2,'relation','confirmed',[`Official relationship: ${relation}.`,`官方关系：${relation}。`]);
 }
 // Direct commitments are known immediately to their parties. Other public
 // documents come only from the observer's saved, possibly stale reports.
 for(const a of s.alliances.filter(x=>x.includes(viewer))){const other=a.find(x=>x!==viewer);link(ownId,'f:'+other,'alliance','confirmed',['Existing full alliance.','现有全面同盟。'])}
 for(const t of s.agreements||[])if(t.status==='active'&&t.parties.includes(viewer)&&now<t.expiresAt&&!atWar(s,t.parties[0],t.parties[1])){const other=t.parties.find(x=>x!==viewer),label=kinds[t.type]||[t.type,t.type];link(ownId,'f:'+other,'agreement','confirmed',t.secret?[`Known secret agreement: ${label[0]}.`,`本方知悉的秘密协议：${label[1]}。`]:[`Agreement: ${label[0]}.`,`条约：${label[1]}。`])}
 const coalitions=[...(s.coalitions||[]).filter(c=>c.status==='active'&&c.parties.includes(viewer)).map(c=>({id:c.id,kind:'coalition',parties:c.parties,leader:c.leader,target:c.target,own:true,cohesion:c.cohesion})),...docs.filter(d=>d.kind==='coalition')].slice(0,4);
 for(const c of coalitions){const cid='c:'+c.id;add(cid,'coalition',['Defensive coalition','防御联盟'],c.own?'confirmed':'reported',c.own?[[`Your coalition reports cohesion ${c.cohesion}. Members retain independent interests.`,`本方联盟的凝聚力为 ${c.cohesion}；各成员仍有独立利益。`]]:[['A public coalition report; membership and purpose may be outdated.','公开联盟报告；成员与目标可能过时。']]);for(const id of c.parties)link(cid,'f:'+id,'coalition',c.own?'confirmed':'reported',['Membership','成员'],c.own?null:{year:c.year,month:c.month});link(cid,'f:'+c.target,'opposes',c.own?'confirmed':'reported',['Declared defensive concern; not proof of imminent war.','公开防范对象；不代表即将开战。'],c.own?null:{year:c.year,month:c.month})}
 for(const d of docs.filter(x=>x.kind!=='coalition').slice(0,12)){const a='f:'+d.parties[0],b='f:'+d.parties[1],label=d.kind==='war'?['war','战争']:(kinds[d.type]||[d.type,d.type]);link(a,b,d.kind==='war'?'war':d.kind==='alliance'?'alliance':'agreement','reported',[`Public report: ${label[0]}; it may be outdated.`,`公开报告：${label[1]}；可能过时。`],{year:d.year,month:d.month})}
 // Shared enemies suggest a possible incentive to cooperate, not a known
 // coalition or a disclosure of an actual private diplomatic proposal.
 const knownWars=[...docs.filter(d=>d.kind==='war'),...s.wars.filter(w=>w.includes(viewer)).map(parties=>({parties}))],suggested=new Set();
 for(let i=0;i<knownWars.length;i++)for(let j=i+1;j<knownWars.length;j++){
  const common=knownWars[i].parties.find(id=>knownWars[j].parties.includes(id)),a=knownWars[i].parties.find(id=>id!==common),b=knownWars[j].parties.find(id=>id!==common);if(!common||!a||!b||a===b)continue;
  const key=[a,b].sort().join('|');if(suggested.has(key)||suggested.size>=4)continue;suggested.add(key);
  link('f:'+a,'f:'+b,'shared_threat','estimate',[`Both have been reported at war with ${name(common)[0]}; cooperation is possible, but no coalition or contact is established.`,`双方均有与${name(common)[1]}交战的报告；可能有合作动机，但这不证明存在联盟或接触。`]);
 }
 const ownLeaders=s.world.leadership[viewer]||[],priority=new Set([...ownLeaders,...ownArmies.map(a=>a.characterId).filter(Boolean)]),ownPeople=Object.values(s.world.characters).filter(c=>c.faction===viewer&&c.alive&&!c.missing).sort((a,b)=>(priority.has(b.id)?1:0)-(priority.has(a.id)?1:0)||(b.influence||0)-(a.influence||0)||a.id.localeCompare(b.id)).slice(0,8);
 for(const c of ownPeople){add('p:'+c.id,'person',personName(c.id),'confirmed',[[ownLeaders.includes(c.id)?'A current member of your leadership.':'A member of your command.',ownLeaders.includes(c.id)?'本方现任领导成员。':'本方人员。']]);link(ownId,'p:'+c.id,ownLeaders.includes(c.id)?'ownLeadership':'office','confirmed',['Known role in your command.','本方已知职务。'])}
 for(const accord of (s.world.dynasties?.familyAccords||[]).filter(a=>a.host===viewer&&a.status==='active')){
  link(ownId,'f:'+accord.target,'familyAccord','confirmed',accord.kind==='pledge'?['A negotiated family guarantee, not a military alliance.','经协商的家族保证，并非军事同盟。']:['Diplomatic wardship, not a transfer of office or legal custody.','外交监护，不转移职务或法定监护权。'],{year:accord.resolvedYear??accord.year,month:accord.resolvedMonth??accord.month});
 }
 for(const loan of (s.world.dynasties?.familyLoans||[]).filter(x=>x.faction===viewer&&x.remaining>0).slice(-4)){
  const head=s.world.dynasties.families?.[loan.familyId]?.leader,person=s.world.characters[head];if(!person||person.faction!==viewer)continue;
  add('p:'+head,'person',personName(head),'confirmed',[['Known representative of a family that lent to your treasury.','向本方国库借款家族的已知代表。']]);
  link('p:'+head,ownId,'patronage','confirmed',['A family loan supports the treasury and remains repayable.','家族借款支持国库，仍需偿还。'],{year:loan.year,month:loan.month});
 }
 for(const target of opening.filter(id=>id!==viewer)){
  const k=s.knowledge?.[viewer]?.[target];for(const id of (k?.reportedLeaders||[]).slice(0,2)){const pid='p:'+id;if(!byId.has(pid))add(pid,'person',personName(id),'reported',[['A reported leader; the report may no longer be current.','报告中的领导人；信息可能已过时。']]);link('f:'+target,pid,'leadership','reported',['Leadership reported by a source; not proof of present authority.','来源报告的领导关系；不证明当前仍在任。'])}
 }
 // Only player-known meetings or relationships entirely within the player's
 // own command are used; hidden foreign-to-foreign ties are never enumerated.
 const knownPeople=nodes.filter(n=>n.type==='person');const ownIds=new Set(ownPeople.map(c=>c.id));
 for(let i=0;i<knownPeople.length;i++)for(let j=i+1;j<knownPeople.length;j++){
  const a=knownPeople[i].id.slice(2),b=knownPeople[j].id.slice(2);if(!ownIds.has(a)&&!ownIds.has(b))continue;
  const rel=s.world.personalRelations?.[pair(a,b)];if(rel&&(rel.meetings>0||ownIds.has(a)&&ownIds.has(b))&&rel.trust){const good=rel.trust>0;link('p:'+a,'p:'+b,'personal','reported',good?['Recorded contact suggests cooperation; intentions may change.','已有接触显示可能合作；意图可能改变。']:['Recorded contact suggests tension; intentions may change.','已有接触显示可能存在紧张；意图可能改变。'])}
  if(ownIds.has(a)&&ownIds.has(b)){const ca=s.world.characters[a],cb=s.world.characters[b];if(ca.spouse===b||cb.spouse===a||ca.parents?.includes(b)||cb.parents?.includes(a)||ca.adoptiveParents?.includes(b)||cb.adoptiveParents?.includes(a))link('p:'+a,'p:'+b,'family','confirmed',['Recorded family relationship.','已记录的家族关系。'])}
 }
 for(const [target,k] of Object.entries(s.knowledge?.[viewer]||{}))for(const r of (k.reports||[]).filter(x=>x.kind==='conspiracy'&&x.character&&age(s,x)>=0&&age(s,x)<=24).slice(0,2)){
  const pid='p:'+r.character;if(!byId.has(pid))add(pid,'person',personName(r.character),'rumor',[['Named by an unverified report, not proof of wrongdoing.','未经核实的报告提及此人，并不证明其有不当行为。']]);
  link(pid,'f:'+target,'suspicion','rumor',['A source alleges a political plot; the claim may be wrong.','来源声称存在政治阴谋；这一说法可能有误。'],{year:r.observationYear??r.year,month:r.observationMonth??r.month});
 }
 for(const o of (s.world.religiousInstitutions||[]).filter(o=>ownRegions.some(r=>r.id===o.region)).slice(0,4)){
  const id='i:'+o.id,place=s.regions.find(r=>r.id===o.region);add(id,'institution',o.name,'confirmed',[[`Local supporters: about ${Math.round(o.followers/1000)*1000}. The institution acts independently.`,`当地支持者约 ${Math.round(o.followers/1000)*1000} 人；机构独立行动。`],place?.name||['Unknown location','地点未知']]);link(ownId,id,'institution','confirmed',['Institution in a controlled theater.','位于本方控制战区的机构。']);
  if(o.leader){const pid='p:'+o.leader;add(pid,'person',personName(o.leader),'confirmed',[['Known leader of a local institution.','本地机构的已知负责人。']]);link(pid,id,'institution','confirmed',['Known institutional affiliation.','已知的机构隶属关系。'])}
 }
 const foreignMovements=reportedMovements(s,viewer).filter(x=>x.parent!==viewer&&activeMovement(x));
 const ownMovements=(s.world.movements||[]).filter(x=>x.parent===viewer&&activeMovement(x)).map(m=>({id:m.id,parent:m.parent,region:m.region,stage:m.stage,leader:m.leader,supportApprox:Math.round(m.supporters/1000)*1000,own:true}));
 for(const m of [...ownMovements,...foreignMovements].slice(0,6)){
  const mid='m:'+m.id,place=s.regions.find(r=>r.id===m.region),stage=stages[m.stage]||['Political movement','政治运动'];add(mid,'movement',place?.name||[m.region,m.region],m.own?'confirmed':'reported',[[`${stage[0]} · about ${m.supportApprox} supporters.`,`${stage[1]} · 约 ${m.supportApprox} 名支持者。`],m.own?['Local public movement.','本方当地公开运动。']:['Frontier report; it may be outdated.','边境报告；可能过时。']]);link('f:'+m.parent,mid,'movement',m.own?'confirmed':'reported',['Reported political opposition, not proof of future violence.','报告中的政治反对力量，不代表未来一定诉诸暴力。'],m.own?null:{year:m.year,month:m.month});if(m.leader){const pid='p:'+m.leader;add(pid,'person',personName(m.leader),m.own?'confirmed':'reported',[['A movement representative; reports may be dated.','运动的代表人物；报告可能过时。']]);link(pid,mid,'leadership',m.own?'confirmed':'reported',['Movement leadership','运动领导'],m.own?null:{year:m.year,month:m.month})}
 }
 if(f.food<20)risks.push({level:'watch',text:['Food is low. Further losses or interrupted supply could weaken armies.','粮食偏低；进一步损失或补给中断可能削弱军队。'],evidence:['Own treasury and food records','本方财政与粮食记录']});
 for(const r of ownRegions.filter(r=>r.loyalty<35||r.population?.satisfaction<35).slice(0,3))risks.push({level:'watch',text:[`${r.name[0]} shows local discontent; reform may reduce pressure.`,`${r.name[1]}出现地方不满；改革可能缓解压力。`],evidence:['Own theater records','本方战区记录']});
 const loaded=ownArmies.find(a=>{const r=s.regions.find(x=>x.id===a.region);return r&&a.men>r.supply*1000});if(loaded)risks.push({level:'watch',text:['An army exceeds its theater’s listed supply limit. This is a warning, not a prediction.','一支军队超过战区列示的补给上限。这是警示而非预测。'],evidence:['Own army and theater records','本方军队与战区记录']});
 const ownReports=s.knowledge?.[viewer]?.[viewer]?.reports||[];if(ownReports.some(r=>r.kind==='conspiracy'&&r.character&&age(s,r)>=0&&age(s,r)<=24))risks.push({level:'rumor',text:['An unverified internal report alleges a plot. The accusation may be wrong.','一份未经核实的内部报告声称存在阴谋；指控可能有误。'],evidence:['Dated intelligence report','有日期的情报报告']});
 if(docs.some(d=>d.kind==='coalition'&&d.target===viewer))risks.push({level:'reported',text:['A reported coalition names your command as a concern. Its current cohesion and intentions are unknown.','有报告称某联盟将本方列为防范对象；其当前凝聚力和意图未知。'],evidence:['Public coalition report; may be stale','公开联盟报告，可能过时']});
 const ownPlaces=new Set(ownRegions.map(r=>r.id)),frontier=new Set();for(const [a,b] of ROUTES){const other=ownPlaces.has(a)?b:ownPlaces.has(b)?a:null,reported=other&&s.controlKnowledge?.[viewer]?.[other]?.owner;if(reported&&reported!==viewer&&(atWar(s,viewer,reported)||(s.relations[pair(viewer,reported)]??0)<=-20))frontier.add(reported)}
 if(frontier.size>=2)risks.push({level:'estimate',text:['Several reported frontier powers are hostile or at war with your command. They could seek cooperation, but this is not evidence of a coalition.','多个边境报告中的势力与本方敌对或交战；它们可能寻求合作，但这并非联盟已经形成的证据。'],evidence:['Own relations and dated frontier reports; control may be stale','本方关系与有日期的边境报告；控制情况可能过时']});
 const militaryAgreement=(s.agreements||[]).some(t=>t.status==='active'&&(['defensive','offensive'].includes(t.type)||t.type==='guarantee'&&(t.terms?.recipient||t.parties[1])===viewer)&&t.parties.includes(viewer)&&now<t.expiresAt&&!atWar(s,t.parties[0],t.parties[1]));
 if(!s.alliances.some(a=>a.includes(viewer))&&!coalitions.some(c=>c.own)&&!militaryAgreement)risks.push({level:'estimate',text:['Few formal military commitments are known to support your command. Isolation is possible, not inevitable.','已知支持本方的正式军事承诺较少；可能面临孤立，但并非必然。'],evidence:['Own diplomatic commitments','本方外交承诺']});
 objectives.push({text:['Maintain a food reserve of 40','维持40粮食储备'],met:f.food>=40},{text:['Restore stability to 60','将稳定度恢复至60'],met:f.stability>=60},{text:['Seek an end to current wars','寻求结束当前战争'],met:!s.wars.some(w=>w.includes(viewer))});
 const largest=[...ownArmies].sort((a,b)=>b.men-a.men)[0],general=largest&&s.world.characters[largest.characterId],allMen=ownArmies.reduce((n,a)=>n+a.men,0);
 if(largest){const ambitious=(general?.ambition??50)>=75&&largest.men>allMen*.4;advice.push({role:['Commander','军事指挥官'],name:general?personName(general.id):largest.commander,text:ambitious?['A stronger independent command could secure the frontier. Give my forces room to act.','更强的独立指挥权或可保卫边境；请给予我的军队行动空间。']:f.food<20?['I would secure food before extending our line.','我建议先保障粮食，再扩大防线。']:['I would keep a reserve and inspect the frontier reports before committing.','我建议保留预备队，并在投入兵力前核查边境报告。']})}
 const statesman=ownPeople.find(c=>!ownLeaders.includes(c.id)&&c.id!==general?.id);if(statesman){const misplacedConfidence=(statesman.education??50)<20&&(statesman.loyalty??50)>=65;advice.push({role:['Statesman','政治顾问'],name:personName(statesman.id),text:misplacedConfidence&&f.stability<45?['A public proclamation should be enough to restore confidence; concessions can wait.','公开宣告应足以恢复信心；让步可以暂缓。']:f.stability<45?['The institutions are strained; concessions could calm opposition, though they carry costs.','制度正承受压力；让步可能平息反对，但也有代价。']:['We should protect legitimacy while weighing the costs of further commitments.','我们应维护合法性，同时衡量进一步承诺的代价。']})}
 const diplomat=ownPeople.find(c=>!ownLeaders.includes(c.id)&&c.id!==general?.id&&c.id!==statesman?.id);if(diplomat)advice.push({role:['Diplomat','外交顾问'],name:personName(diplomat.id),text:s.wars.some(w=>w.includes(viewer))?['A settlement may preserve resources, though the other court can refuse or delay.','议和可能保存资源，但对方宫廷可能拒绝或拖延。']:['We could strengthen relations before making binding commitments.','在作出有约束力的承诺前，我们可以先改善关系。']});
 advice.push({role:['Intelligence official','情报官'],name:['Intelligence office','情报部门'],text:ownReports.some(r=>r.kind==='conspiracy'&&r.character&&age(s,r)>=0&&age(s,r)<=24)?['The allegation is a lead, not a verdict. Seek an independent source.','这项指控只是线索，不是定论；应寻找独立来源。']:['The absence of a report does not establish the absence of danger.','没有报告并不能证明没有危险。']});
 const governor=Object.entries(s.world.localGovernors||{}).find(([place,post])=>post.faction===viewer&&ownRegions.some(r=>r.id===place)&&s.world.characters[post.person]?.alive);if(governor){const [place,post]=governor,r=s.regions.find(x=>x.id===place);advice.push({role:['Provincial governor','行省总督'],name:personName(post.person),text:r.population?.satisfaction<45?['Local complaints deserve a hearing before they become harder to resolve.','地方诉求值得先行听取，以免日后更难解决。']:['Local order depends on reliable supplies and predictable administration.','地方秩序有赖于稳定补给和可预期的行政。']})}
 const religious=(s.world.religiousInstitutions||[]).find(o=>ownRegions.some(r=>r.id===o.region)&&s.world.characters[o.leader]?.alive);if(religious)advice.push({role:['Religious representative','宗教代表'],name:personName(religious.leader),text:['Our community asks to be heard. A settlement may preserve both order and local traditions.','我们的共同体希望获得倾听；协商可能同时维护秩序与地方传统。']});
 const feather=[];if(s.difficulty==='beginner'){
  if(ownReports.some(r=>r.kind==='conspiracy'&&r.character&&age(s,r)<=24))feather.push(['A single unverified accusation can be wrong. Consider gathering another source before acting.','单一未经核实的指控可能有误；行动前可以考虑寻找另一来源。']);
  if(largest&&largest.men>allMen*.6)feather.push(['One commander controls much of your field strength. Consider institutional oversight as well as military needs.','一位指挥官掌握了本方大部分野战兵力；除军事需要外，也可考虑制度监督。']);
  if(!feather.length)feather.push(['Old reports may no longer describe the world. Check their dates before committing.','旧报告可能不再反映现状；作出承诺前请核对日期。']);
 }
 return {nodes,links,risks,advice,objectives,feather};
}
