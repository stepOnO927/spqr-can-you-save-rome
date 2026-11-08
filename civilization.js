import {REGIONS,ROUTES,FACTIONS} from './data.js?v=phase-x-1';
import {CHARACTER_CATALOG} from './characters.js?v=phase-xiii-1';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const dispatch=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};
function blendReligion(destination,source,count){if(!count)return;const old=destination.population,shares={};for(const id of new Set([...Object.keys(destination.religions),...Object.keys(source.religions)]))shares[id]=Math.round(((destination.religions[id]||0)*old+(source.religions[id]||0)*count)/(old+count));const first=Object.keys(shares).sort((a,b)=>shares[b]-shares[a])[0];shares[first]+=100-Object.values(shares).reduce((a,b)=>a+b,0);destination.religions=shares}
const roman=new Set(['caesar','senate']);
const northAfrican=new Set(['africa','numidia','mauretania']);
const greek=new Set(['epirus','achaia','anatolia','sicilia','bosporus','galatia']);
const iranian=new Set(['parthia','media','armenia']);
const mining=new Set(['gaul','hispaniaN','hispaniaS','illyricum','anatolia','armenia','media','numidia']);
const quarrying=new Set(['gaul','narbo','hispaniaN','italiaN','roma','italiaS','epirus','achaia','anatolia','egypt','numidia','armenia']);
const coastal=new Set(['narbo','hispaniaN','hispaniaS','italiaN','roma','italiaS','sicilia','africa','illyricum','epirus','achaia','anatolia','syria','egypt','numidia','mauretania','bosporus']);
const source={architecture:'https://www.metmuseum.org/-/media/files/learn/for-educators/publications-for-educators/roman.pdf',roman:'https://www.metmuseum.org/toah/ht/04/eust.html',egypt:'https://www.metmuseum.org/toah/hd/ptol/hd_ptol.htm',nearEast:'https://www.metmuseum.org/essays/colossal-temples-of-the-roman-near-east'};
const B=(name,zh,category,cost,months,maintenance,tech,requirement,effect,description,descriptionZh,reference=source.architecture)=>({name:[name,zh],category,cost,months,maintenance,tech,requirement,effect,description:[description,descriptionZh],source:reference});
// Artwork is a game reconstruction, not a claim that any named building survives.
export const BUILDINGS={
 barracks:B('Barracks','兵营','military',20,3,1,0,null,{recruit:8,security:2},'Organized quarters improve recruiting and order.','集中营房改善征兵和治安。'),
 training:B('Training grounds','训练场','military',24,4,1,1,null,{training:1,morale:1},'Drill grounds improve training and morale.','操练场提高训练与士气。'),
 fortifications:B('Fortifications','防御工事','military',32,5,2,0,null,{fort:1,security:3},'Walls and earthworks strengthen defense.','城墙与土垒强化防御。'),
 depot:B('Supply depot','补给站','military',24,3,1,0,null,{supply:3,foodReserve:1},'A local depot supports armies and food reserves.','地方补给站支援军队与储粮。'),
 workshop:B('Military workshop','军械工坊','military',30,5,2,2,null,{training:1,recruit:4},'Workshops equip and train field forces.','工坊装备并训练野战军。'),
 mine:B('Mine','矿场','economic',28,5,2,1,'mineral',{tax:3},'Ore extraction increases taxable production.','矿石开采增加可征税产出。'),
 port:B('Port facilities','港口设施','economic',30,5,2,1,'coast',{tax:2,foodReserve:1},'Harbor works support trade and provisioning.','港口建设促进贸易与补给。'),
 quarry:B('Quarry','采石场','economic',22,4,1,0,'stone',{tax:2,construction:1},'Stone extraction supports building and trade.','采石促进建设与贸易。'),
 market:B('Market','市场','economic',22,3,1,0,null,{tax:2,opportunity:3},'Trade raises income and local opportunity.','贸易提高收入和地方就业。'),
 granary:B('Granary','粮仓','economic',26,4,1,0,null,{food:2,foodReserve:2,satisfaction:3},'Storage buffers shortages and supplies armies.','储粮缓冲歉收并补给军队。'),
 warehouse:B('Warehouse','仓库','economic',18,3,1,0,'coast',{tax:1,foodReserve:1},'Coastal storage supports trade and provisions.','沿海仓储支援贸易与粮秣。'),
 agriculture:B('Agricultural works','农田水利','economic',28,5,1,1,null,{food:3,satisfaction:2},'Irrigation and field works raise harvests.','灌溉与整地提高收成。'),
 road:B('Road','道路','civilian',20,4,1,0,null,{tax:1,opportunity:2,construction:1},'Roads improve movement and commerce.','道路改善行军与贸易。',source.roman),
 bridge:B('Bridge','桥梁','civilian',24,4,1,1,'river',{tax:1,construction:1},'Bridges link markets across rivers.','桥梁连接河流两岸市场。'),
 aqueduct:B('Aqueduct','引水渠','civilian',38,7,2,2,'urban',{satisfaction:6,food:1},'Fresh water improves public health and supply.','清洁水源改善卫生与供给。'),
 sewer:B('Sewer system','排水系统','civilian',30,5,2,1,'urban',{satisfaction:4,security:1},'Drainage improves urban conditions.','排水改善城市生活条件。'),
 library:B('Library','图书馆','civilian',32,6,2,2,'urban',{research:2,prestige:2,satisfaction:1},'Collections support study and cultural exchange.','藏书促进研究与文化交流。'),
 baths:B('Public baths','公共浴场','civilian',28,5,2,1,'urban',{satisfaction:5,prestige:1},'Baths support social and civic life.','浴场促进公共生活。'),
 administration:B('Administrative offices','行政官署','civilian',25,4,1,0,null,{tax:1,security:2,satisfaction:2},'Local offices improve administration.','地方官署改善治理。'),
 temple:B('Temple','神庙','religious',30,5,2,0,null,{religion:4,prestige:1},'A major sanctuary supports local worship.','大型圣所支持地方崇拜。',source.nearEast),
 shrine:B('Shrine','圣所','religious',14,2,1,0,null,{religion:2,satisfaction:1},'A small sanctuary serves nearby communities.','小型圣所服务周边社群。',source.nearEast),
 religiousCenter:B('Religious center','宗教中心','religious',40,7,3,2,'urban',{religion:6,prestige:2},'A civic religious center strengthens institutions.','城市宗教中心加强地方组织。',source.nearEast),
 lateBasilica:B('Late antique basilica','晚期古代礼拜堂','religious',45,8,3,3,'late',{religion:6,prestige:3},'Available only in a later Christian era.','仅在后期基督教时代可建。',source.architecture)
};
export const RELIGIONS={roman:['Roman civic cults','罗马公民祭祀'],greek:['Greek traditions','希腊宗教传统'],egyptian:['Egyptian traditions','埃及宗教传统'],jewish:['Jewish communities','犹太社群'],gallic:['Gallic local traditions','高卢地方传统'],iranian:['Iranian traditions','伊朗宗教传统'],northAfrican:['North African local traditions','北非地方传统'],anatolian:['Anatolian local traditions','安纳托利亚地方传统'],christian:['Later Christian communities','后期基督教社群']};
export const POLICIES={toleration:{name:['Religious toleration','宗教宽容'],cost:0},patronage:{name:['Traditional patronage','传统祭祀资助'],cost:8},selected:{name:['Support selected cults','资助指定祭祀'],cost:6},accommodation:{name:['Religious accommodation','宗教调和'],cost:5},restrictions:{name:['Religious restrictions','宗教限制'],cost:4},reform:{name:['Institutional reform','宗教制度改革'],cost:12}};
export const FIGURE_ROLES={caesar:['military','statesman'],pompey:['military','statesman'],cicero:['statesman','scholar'],cato:['statesman'],labienus:['military'],varro:['scholar','statesman'],vitruvius:['engineer','scholar'],cleopatra:['statesman','scholar'],ptolemy:['statesman'],orodes:['statesman'],artavasdes:['statesman'],juba:['statesman'],deiotarus:['statesman']};
export const ROLE_NAMES={military:['Military leader','军事统帅'],statesman:['Statesman','政治家'],engineer:['Engineer','工程师'],scholar:['Scholar or inventor','学者与发明者'],religious:['Religious authority','宗教权威']};
const localDemography=id=>id==='egypt'||id==='egyptUpper'?{egyptian:70,greek:25,jewish:5}:id==='syria'?{greek:35,jewish:20,anatolian:45}:iranian.has(id)?{iranian:75,anatolian:25}:id==='gaul'||id==='narbo'?{gallic:70,roman:30}:greek.has(id)?{greek:65,anatolian:25,roman:10}:northAfrican.has(id)?{northAfrican:75,roman:25}:id.startsWith('hispania')?{roman:45,gallic:55}:{roman:75,greek:25};
const resources=id=>({mineral:mining.has(id),stone:quarrying.has(id),coast:coastal.has(id),river:new Set(['gaul','cisalpine','italiaN','roma','egypt','egyptUpper','parthia','media','anatolia']).has(id),urban:new Set(['roma','egypt','achaia','anatolia','syria','parthia','sicilia']).has(id)});
export function initializeCivilization(s){
 for(const r of s.regions){r.population??=Math.round((REGIONS.find(x=>x.id===r.id)?.tax||r.tax||3)*22000+35000);r.satisfaction??=clamp(55+Math.round((r.loyalty-60)/3),0,100);r.religions??=localDemography(r.id);r.resources??=resources(r.id);r.buildings??=[];r.buildQueue??=null;r.warDamage??=0;r.foodReserve??=0}
 for(const f of Object.values(s.factions)){f.culturalPrestige??=12;f.religionPolicy??='toleration';f.selectedCult??=null;f.research??=0}
 for(const c of Object.values(s.world?.characters||{})){if(!c.id.startsWith('fictional:'))continue;const name=s.world.dynasties?.catalog?.[c.id]?.name?.[0]||'';c.famousRoles??=name.includes('Varenus')?['military']:name.includes('Livia')?['scholar','religious']:name.includes('Cassianus')?['engineer']:name.includes('Valeria')?['religious','statesman']:[];c.fame??=0}
 s.figureOffers??=[];s.civilizationHistory??=[];
 return s;
}
export const buildingEffect=(r,key)=>r.buildings.reduce((n,id)=>n+(BUILDINGS[id]?.effect[key]||0),0);
export function canBuild(s,owner,regionId,id){const r=s.regions.find(x=>x.id===regionId),f=s.factions[owner],b=BUILDINGS[id];if(!r||!f||r.owner!==owner||!b)return {ok:false,reason:'ownership'};if(r.buildings.includes(id)||r.buildQueue?.id===id)return {ok:false,reason:'duplicate'};if(r.buildQueue||r.construction)return {ok:false,reason:'queue'};if(f.treasury<b.cost)return {ok:false,reason:'treasury'};if(f.research<b.tech)return {ok:false,reason:'research'};if(b.requirement==='late'&&(s.year<300||(r.religions?.christian||0)<5))return {ok:false,reason:'chronology'};if(b.requirement&&!['late'].includes(b.requirement)&&!r.resources[b.requirement])return {ok:false,reason:'geography'};return {ok:true};}
export function build(s,owner,regionId,id){initializeCivilization(s);const check=canBuild(s,owner,regionId,id);if(!check.ok)return check;const r=s.regions.find(x=>x.id===regionId),b=BUILDINGS[id];s.factions[owner].treasury-=b.cost;const engineer=Object.values(s.world?.characters||{}).some(c=>c.faction===owner&&c.alive&&c.civilizationRole==='engineer'&&c.location===regionId);r.buildQueue={id,owner,remaining:Math.max(1,b.months-(engineer?2:0)-buildingEffect(r,'construction'))};if(owner===s.player)dispatch(s,`Construction of ${b.name[0]} began in ${r.name[0]}.`,`${r.name[1]}开始建设${b.name[1]}。`);return {ok:true,remaining:r.buildQueue.remaining};}
export function setReligionPolicy(s,owner,policy,selectedCult=null){initializeCivilization(s);const f=s.factions[owner],p=POLICIES[policy];if(!f||!p||f.treasury<p.cost||policy==='selected'&&(!RELIGIONS[selectedCult]||!s.regions.some(r=>r.owner===owner&&(r.religions[selectedCult]||0)>0)))return {ok:false,reason:'resources'};if(f.religionPolicy===policy&&f.selectedCult===(policy==='selected'?selectedCult:null))return {ok:false,reason:'unchanged'};f.treasury-=p.cost;f.religionPolicy=policy;f.selectedCult=policy==='selected'?selectedCult:null;if(policy==='restrictions')f.legitimacy=clamp(f.legitimacy-2,0,100);if(policy==='accommodation')f.legitimacy=clamp(f.legitimacy+1,0,100);if(owner===s.player)dispatch(s,`Religious policy changed to ${p.name[0]}.`,`宗教政策改为${p.name[1]}。`);return {ok:true};}
function religiousApproval(s,r){const f=s.factions[r.owner],shares=Object.entries(r.religions).sort((a,b)=>b[1]-a[1]),largest=shares[0]?.[1]||0,minority=100-largest,authority=Object.values(s.world?.characters||{}).some(c=>c.alive&&c.faction===r.owner&&c.civilizationRole==='religious'&&c.location===r.id)?2:0;let approval;switch(f?.religionPolicy){case 'patronage':approval=Math.round(largest/20-minority/25);break;case 'selected':approval=Math.round(((r.religions[f.selectedCult]||0)-45)/12);break;case 'accommodation':approval=Math.round(minority/20+1);break;case 'restrictions':approval=Math.round(largest/25-minority/10);break;case 'reform':approval=Math.round(minority/20-1);break;default:approval=Math.round(minority/25)}return approval+authority}
export function civilizationYield(s,r){initializeCivilization(s);const f=s.factions[r.owner],foodStress=f?.food<0?-8:f?.food<20?-3:0,taxStress={low:3,normal:0,high:-5}[f?.tax]||0,security=buildingEffect(r,'security')+Math.min(3,s.armies.filter(a=>a.owner===r.owner&&a.region===r.id).length*2),infrastructure=buildingEffect(r,'satisfaction')+buildingEffect(r,'opportunity'),religion=religiousApproval(s,r)+buildingEffect(r,'religion')/2,government=Math.round((r.loyalty-50)/20),target=clamp(55+foodStress+taxStress+security+infrastructure+religion+government-r.warDamage,5,95),productivity=clamp(.55+r.satisfaction/130, .55,1.3),maintenance=r.buildings.reduce((n,id)=>n+(BUILDINGS[id]?.maintenance||0),0);return {target,productivity,maintenance,tax:(r.tax+buildingEffect(r,'tax'))*productivity,food:r.food+buildingEffect(r,'food'),recruit:buildingEffect(r,'recruit'),supply:buildingEffect(r,'supply'),research:buildingEffect(r,'research'),prestige:buildingEffect(r,'prestige')};}
export function advanceCivilization(s){
 initializeCivilization(s);
 for(const r of s.regions){
  if(s.year>=100&&s.month===1&&s.year%10===0&&['roma','achaia','anatolia','syria','egypt'].includes(r.id)&&(r.religions.christian||0)<20){const previous=Object.keys(r.religions).sort((a,b)=>r.religions[b]-r.religions[a])[0];r.religions[previous]--;r.religions.christian=(r.religions.christian||0)+1}
  if(r.buildQueue&&r.buildQueue.owner!==r.owner)r.buildQueue=null;
  if(r.buildQueue&&--r.buildQueue.remaining<=0){
   const id=r.buildQueue.id,owner=r.owner;
   r.buildings.push(id);r.buildQueue=null;
   r.fort+=BUILDINGS[id].effect.fort||0;
   r.supply+=BUILDINGS[id].effect.supply||0;
   s.civilizationHistory.unshift({year:s.year,month:s.month,kind:'building',region:r.id,id,owner});
   if(owner===s.player)dispatch(s,`${BUILDINGS[id].name[0]} completed in ${r.name[0]}.`,`${r.name[1]}的${BUILDINGS[id].name[1]}建成。`);
  }
  r.warDamage=clamp(r.warDamage-1,0,30);
  const y=civilizationYield(s,r),before=r.satisfaction;
  r.satisfaction=clamp(r.satisfaction+clamp(y.target-r.satisfaction,-3,3),0,100);
  r.loyalty=clamp(r.loyalty+Math.sign(r.satisfaction-50)*(Math.abs(r.satisfaction-50)>12?1:0),0,100);
  if(r.satisfaction<35){
   const next=ROUTES.filter(e=>e[0]===r.id||e[1]===r.id)
    .map(e=>s.regions.find(x=>x.id===(e[0]===r.id?e[1]:e[0])))
    .filter(x=>x&&x.owner===r.owner&&x.satisfaction>r.satisfaction+12)
    .sort((a,b)=>b.satisfaction-a.satisfaction)[0];
   if(next){
    const count=Math.min(Math.floor(r.population*.002),Math.floor(next.population*.01));
    blendReligion(next,r,count);r.population-=count;next.population+=count;
    if(count&&r.owner===s.player){
     s.civilizationHistory.unshift({year:s.year,month:s.month,kind:'migration',from:r.id,to:next.id,count});
     if(count>200)dispatch(s,`${count} people moved from ${r.name[0]} to ${next.name[0]}.`,`${count}人从${r.name[1]}迁往${next.name[1]}。`);
    }
   }
  }else if(r.satisfaction>35&&r.population<500000)r.population+=Math.round(r.population*(r.satisfaction-35)/37500);
  if(before!==r.satisfaction&&r.owner===s.player&&[35,50,70].some(n=>Math.min(before,r.satisfaction)<n&&Math.max(before,r.satisfaction)>=n))s.civilizationHistory.unshift({year:s.year,month:s.month,kind:'satisfaction',region:r.id,value:r.satisfaction});
 }
 for(const offer of [...s.figureOffers]){
  if(--offer.remaining>0)continue;
  const person=s.world.characters[offer.id],target=s.regions.find(r=>r.id===offer.region);
  if(person?.alive&&target?.owner===offer.owner){
   person.faction=offer.owner;person.location=offer.region;person.civilizationRole=offer.role;
   person.loyalty=clamp((person.loyalty||65)+10,0,100);
   s.civilizationHistory.unshift({year:s.year,month:s.month,kind:'figure',id:offer.id,owner:offer.owner});
   if(offer.owner===s.player)dispatch(s,`${CHARACTER_CATALOG[offer.id]?.name[0]||offer.id} accepted an appointment.`,`${CHARACTER_CATALOG[offer.id]?.name[1]||offer.id}接受任命。`);
  }
  s.figureOffers.splice(s.figureOffers.indexOf(offer),1);
 }
 s.civilizationHistory=s.civilizationHistory.slice(0,80);
 return s;
}
function travelMonths(from,to){if(!from||from===to)return 1;let frontier=[from],seen=new Set(frontier),months=1;while(frontier.length&&months<9){const next=[];for(const id of frontier)for(const e of ROUTES){const other=e[0]===id?e[1]:e[1]===id?e[0]:null;if(other===to)return months+1;if(other&&!seen.has(other)){seen.add(other);next.push(other)}}frontier=next;months++}return 8}
export function recruitFigure(s,owner,id,role,regionId){initializeCivilization(s);const catalog=CHARACTER_CATALOG[id],c=s.world?.characters?.[id]||(['varro','vitruvius'].includes(id)?{id,faction:catalog.faction,alive:true,loyalty:id==='varro'?65:50,location:id==='varro'?'roma':'cisalpine'}:null),r=s.regions.find(x=>x.id===regionId),f=s.factions[owner],roles=FIGURE_ROLES[id]||c?.famousRoles||[],foreign=c?.faction&&c.faction!==owner,home=c?.faction;if(!c||!c.alive||!r||r.owner!==owner||!roles.includes(role)||!f||c.birthYear!=null&&s.year-c.birthYear<18||id==='varro'&&!s.world.characters.varro&&s.year>-27)return {ok:false,reason:'unavailable'};if(c.civilizationRole||c.travel||s.figureOffers.some(x=>x.id===id)||s.armies.some(a=>a.characterId===id)||Object.values(s.world.offices||{}).some(offices=>Object.values(offices).includes(id))||Object.values(s.world.localGovernors||{}).some(offices=>Object.values(offices).includes(id)))return {ok:false,reason:'employed'};if(foreign&&(s.world.leadership?.[home]||[]).includes(id))return {ok:false,reason:'sovereign'};if(foreign&&(s.wars||[]).some(w=>w.includes(owner)&&w.includes(home)))return {ok:false,reason:'war'};const relation=foreign?s.relations?.[[owner,home].sort().join(':')]||0:30,loyalty=c.loyalty??65;const culturalTie=foreign&&roman.has(owner)&&roman.has(home)&&catalog?.culture?.[0]==='Roman'?10:0,ambition=c.ambition??50;if(foreign&&(relation+culturalTie<15||loyalty>82&&ambition<70))return {ok:false,reason:'refused'};const cost=foreign?24:14,prestige=foreign?18:8;if(f.treasury<cost||f.culturalPrestige<prestige)return {ok:false,reason:'resources'};f.treasury-=cost;f.culturalPrestige-=prestige;if(!s.world.characters[id])s.world.characters[id]={...c,health:'healthy',influence:35,parents:[],adoptiveParents:[],children:[]};const remaining=travelMonths(c.location,regionId)+(foreign?1:0);s.figureOffers.push({id,owner,role,region:regionId,remaining});return {ok:true,remaining};}
export function patronizeCulture(s,owner,regionId){initializeCivilization(s);const r=s.regions.find(x=>x.id===regionId),f=s.factions[owner];if(!r||r.owner!==owner||f.treasury<10)return {ok:false};f.treasury-=10;f.culturalPrestige+=4;r.satisfaction=clamp(r.satisfaction+2,0,100);return {ok:true};}
export function culturalProject(s,owner,regionId,kind,targetOwner=null){initializeCivilization(s);const r=s.regions.find(x=>x.id===regionId),f=s.factions[owner],cost={education:8,festival:6,diplomacy:10}[kind];if(!r||r.owner!==owner||!cost||f.culturalPrestige<cost||kind==='diplomacy'&&(!s.factions[targetOwner]||targetOwner===owner))return {ok:false};f.culturalPrestige-=cost;if(kind==='education'){f.research=Math.min(20,f.research+1);r.satisfaction=clamp(r.satisfaction+1,0,100)}if(kind==='festival'){r.satisfaction=clamp(r.satisfaction+4,0,100);f.legitimacy=clamp(f.legitimacy+1,0,100)}if(kind==='diplomacy'){const key=[owner,targetOwner].sort().join(':');s.relations[key]=clamp((s.relations[key]||0)+5,-100,100)}return {ok:true};}
export function aiCivilization(s,owner){
 initializeCivilization(s);
 const f=s.factions[owner],owned=s.regions.filter(r=>r.owner===owner);
 if(!f||!owned.length||owner==='rebels')return;
 if(s.month%6===0){const diverse=owned.some(r=>Math.max(...Object.values(r.religions))<65);if(f.religionPolicy!==(diverse?'accommodation':'toleration')&&f.treasury>40)setReligionPolicy(s,owner,diverse?'accommodation':'toleration')}
 const worst=owned.filter(r=>!r.buildQueue).sort((a,b)=>a.satisfaction-b.satisfaction)[0];
 const margin=owned.reduce((n,r)=>n+civilizationYield(s,r).tax-civilizationYield(s,r).maintenance,0)-s.armies.filter(a=>a.owner===owner).reduce((n,a)=>n+a.men,0)/1100;
 if(worst&&f.treasury>55&&margin>3){const choices=worst.satisfaction<50?['granary','administration','market']:worst.resources.mineral?['mine','quarry','market']:['market','road'];const choice=choices.find(id=>margin>BUILDINGS[id].maintenance+2&&canBuild(s,owner,worst.id,id).ok);if(choice)build(s,owner,worst.id,choice)}
 const specialist=Object.values(s.world?.characters||{}).find(c=>c.faction===owner&&c.alive&&!c.civilizationRole&&(FIGURE_ROLES[c.id]||c.famousRoles||[]).some(x=>['engineer','scholar','statesman'].includes(x))&&!(s.world.leadership?.[owner]||[]).includes(c.id));
 if(specialist&&f.culturalPrestige>=8&&f.treasury>40)recruitFigure(s,owner,specialist.id,(FIGURE_ROLES[specialist.id]||specialist.famousRoles||[]).find(x=>['engineer','scholar','statesman'].includes(x)),owned[0].id);
}
