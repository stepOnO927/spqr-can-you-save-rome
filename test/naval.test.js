import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,tick,moveArmy,cancelMarch,previewMarch,upgradeSave,aiTurn,startConstruction,resolveBattle as resolveLandBattle} from '../engine.js';
import {SEA_ZONES,seaRoute,portZone,isPortBlockaded,queueShip,cancelShipConstruction,orderFleet,reserveFleet,mobilizeFleet,setFleetTactic,ransomFleetCommander,appointFleet,dismissFleetCommander,appointNavalJob,dismissNavalJob,navalJobEffect,advanceNaval,resolveBattle,reportedHostileFleets,reportedNonHostileFleets,accessibleFleet,supportPirates,toggleTradeRoute,fleetSpeed,fleetCargoCapacity,fleetUpkeep,fleetUpkeepDue,wagonSupplyPlan,dispatchWagonSupply,harborTradeCapacity,settleMerchantDispute} from '../naval.js';
import {tradeCard,renderNavalPanel} from '../map-lab/naval-ui.js';
import {developmentPanel,constructionPanel} from '../development-ui.js';
import {advanceDevelopment} from '../development.js';
import {armySupply,supplyNetwork} from '../grand-operations.js';
import {nationalBudget} from '../national-budget.js';
import {budgetHtml} from '../budget-ui.js';
import {advanceMissingCommanders} from '../character-system.js';

function tradeArrival(s,id,maxMonths=8){
 const route=s.naval.routes.find(r=>r.id===id);
 for(let i=0;i<maxMonths;i++){
  if(i){s.month++;if(s.month>12){s.month=1;s.year++}}
  advanceNaval(s);
  if(route.last?.reason==='delivered'&&route.last.year===s.year&&route.last.month===s.month)return route.last;
 }
 assert.fail(`No delivered voyage for ${id} within ${maxMonths} months`);
}

test('navigation trouble delays a real merchant delivery without losing cargo or double charging',()=>{
 let s=newGrandGame('senate');s.seed=1;s.year=-48;s.wars=[];s.naval.pirates=[];
 s.factions.senate.treasury=500;s.factions.senate.food=0;
 for(const route of s.naval.routes)if(route.id!=='egypt-italy')route.pausedBy=[s.regions.find(r=>r.id===route.from)?.owner].filter(Boolean);
 for(let month=1;month<=5;month++){s.month=month;advanceNaval(s)}
 const route=state=>state.naval.routes.find(r=>r.id==='egypt-italy');
 const sailing=s.naval.voyages.find(v=>v.routeId==='egypt-italy'&&v.phase==='outbound');
 assert.deepEqual(sailing.path,['tyrrhenian'],'the actual grain ship is one sea leg from port');
 const beforeCargo=sailing.cargo,beforeFood=s.factions.senate.food;
 const onTime=upgradeSave(JSON.parse(JSON.stringify(s)));
 onTime.naval.voyages.find(v=>v.id===sailing.id).navigationDelayed=true;
 s.month=6;onTime.month=6;advanceNaval(s);advanceNaval(onTime);
 const delayed=s.naval.voyages.find(v=>v.id===sailing.id);
 assert.equal(route(s).last.reason,'navigation');assert.equal(route(s).last.amount,0);assert.equal(route(s).last.paid,0);
 assert.equal(delayed.cargo,beforeCargo);assert.equal(delayed.navigationDelayed,true);assert.deepEqual(delayed.path,['tyrrhenian']);
 assert.equal(s.factions.senate.food,beforeFood);
 assert.equal(route(onTime).last.reason,'delivered');assert.equal(route(onTime).last.amount,beforeCargo);
 assert.equal(onTime.factions.senate.food-beforeFood,beforeCargo);
 assert.equal(s.factions.senate.treasury-onTime.factions.senate.treasury,route(onTime).last.paid,'routine monthly costs continue, but the delayed buyer has not paid for cargo');
 assert.equal(onTime.factions.egypt.treasury-s.factions.egypt.treasury,route(onTime).last.paid,'the seller has not received early payment');
 const incident=s.naval.reports.find(r=>r.kind==='navigation-delay'&&r.owner==='senate');
 assert.equal(incident?.month,6);assert.equal(incident?.year,-48);assert.equal(incident?.amount,beforeCargo);
 for(const [lang,title,status] of [['en','MERCHANT NAVIGATION DELAY','Navigation trouble at sea'],['zh','商船航行受阻','海上航行受阻']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.match(content.innerHTML,new RegExp(title));
  renderNavalPanel({state:s,lang,root,section:'trade',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.match(content.innerHTML,new RegExp(status));
 }
 const outsider=upgradeSave(JSON.parse(JSON.stringify(s)));outsider.player='caesar';
 const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
 renderNavalPanel({state:outsider,lang:'en',root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
 assert.doesNotMatch(content.innerHTML,/MERCHANT NAVIGATION DELAY/);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(s.naval.voyages.find(v=>v.id===sailing.id).path,['tyrrhenian']);
 const crisisFood=-nationalBudget(s,'senate').foodNet-2;
 s.factions.senate.food=crisisFood;onTime.factions.senate.food=crisisFood+beforeCargo;
 tick(s);tick(onTime);
 const shortage=s.naval.reports.find(r=>r.kind==='interrupted-grain-shortage'&&r.owner==='senate');
 assert.equal(shortage?.month,7,'June navigation delay can affect the following month, after the real food calculation');
 assert.equal(shortage?.cause,'navigation');assert.equal(shortage?.deficit,2);
 assert.equal(onTime.factions.senate.lastFoodShortage,undefined);
 assert.equal(onTime.factions.senate.stability-s.factions.senate.stability,1);
 for(const [lang,cause] of [['en','Navigation trouble kept the ship from arriving on time'],['zh','航行问题使商船未能按时抵港']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.match(content.innerHTML,new RegExp(cause));
 }
 assert.equal(route(s).last.reason,'delivered');assert.equal(route(s).last.amount,beforeCargo);
 assert.equal(s.naval.reports.filter(r=>r.kind==='navigation-delay'&&r.owner==='senate').length,1);
 assert.equal(s.naval.reports.filter(r=>r.kind==='interrupted-grain-shortage'&&r.owner==='senate').length,1);
});

test('a navigation delay before the final sea zone explains a later real food shortage',()=>{
 let s=newGrandGame('senate');s.wars=[];s.naval.pirates=[];s.factions.senate.treasury=500;s.factions.senate.food=0;
 for(const route of s.naval.routes)if(route.id!=='egypt-italy')route.pausedBy=[s.regions.find(r=>r.id===route.from)?.owner].filter(Boolean);
 s.year=-48;s.month=5;advanceNaval(s);
 const sailing=s.naval.voyages.find(v=>v.routeId==='egypt-italy'&&v.phase==='outbound');
 assert.ok(sailing&&sailing.cargo>0,'a crewed Egyptian grain ship must actually leave port');
 sailing.zone='central';sailing.path=['sicilian','tyrrhenian'];
 s.naval.fleets=[];
 const onTime=upgradeSave(JSON.parse(JSON.stringify(s)));
 onTime.naval.voyages.find(v=>v.id===sailing.id).navigationDelayed=true;
 s.month=6;onTime.month=6;s.seed=1972;onTime.seed=1972;
 advanceNaval(s);advanceNaval(onTime);
 const delayed=s.naval.voyages.find(v=>v.id===sailing.id);
 assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'navigation');
 assert.equal(delayed.zone,'sicilian');assert.deepEqual(delayed.path,['sicilian','tyrrhenian']);
 s.month=7;onTime.month=7;advanceNaval(s);advanceNaval(onTime);
 assert.equal(onTime.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'delivered');
 assert.equal(delayed.zone,'sicilian');assert.deepEqual(delayed.path,['tyrrhenian']);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 const crisisFood=-nationalBudget(s,'senate').foodNet-2;
 s.factions.senate.food=crisisFood;onTime.factions.senate.food=crisisFood+sailing.cargo;
 tick(s);tick(onTime);
 const shortage=s.naval.reports.find(r=>r.kind==='interrupted-grain-shortage'&&r.owner==='senate');
 assert.equal(shortage?.month,8);
 assert.equal(shortage?.cause,'navigation');assert.equal(shortage?.deficit,2);
 assert.equal(onTime.factions.senate.lastFoodShortage,undefined);
 assert.equal(onTime.factions.senate.stability-s.factions.senate.stability,1);
 assert.equal(s.naval.reports.filter(r=>r.kind==='interrupted-grain-shortage'&&r.owner==='senate').length,1);
});

test('a foreign merchant nonpayment creates one saved claim with a real optional settlement',()=>{
 let s=newGrandGame('senate');s.wars=[];s.naval.pirates=[];s.factions.senate.treasury=500;s.factions.senate.food=0;
 for(const route of s.naval.routes)if(route.id!=='egypt-italy')route.pausedBy=[s.regions.find(r=>r.id===route.from)?.owner].filter(Boolean);
 advanceNaval(s);
 const ship=s.naval.voyages.find(v=>v.routeId==='egypt-italy'&&v.phase==='outbound');
 assert.ok(ship?.cargo>0,'the trade contract has dispatched a crewed cargo vessel');
 ship.zone=portZone(ship.to);ship.path=[];
 const key=['senate','egypt'].sort().join(':'),beforeRelations=s.relations[key]??0;
 s.factions.senate.treasury=0;s.month++;
 advanceNaval(s);
 const claim=s.naval.disputes[0];
 assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'payment');
 assert.equal(ship.phase,'return');assert.equal(ship.cargo,claim.cargo);
 assert.equal(claim.buyer,'senate');assert.equal(claim.seller,'egypt');
 assert.equal(claim.status,'open');assert.equal(claim.month,s.month);
 assert.equal(claim.compensation,Math.ceil(ship.cargo*ship.price/4));
 assert.equal(s.relations[key],beforeRelations-3);
 assert.equal(s.naval.reports.filter(r=>r.kind==='merchant-dispute'&&r.disputeId===claim.id).length,1);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(s.naval.disputes[0].status,'open');
 const screen=(player,lang,section)=>{s.player=player;const content={innerHTML:'',insertAdjacentHTML(_position,html){this.innerHTML+=html}},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};renderNavalPanel({state:s,lang,root,section,onAction:()=>{},onZone:()=>{},onPort:()=>{}});return content.innerHTML};
 assert.match(screen('senate','en','trade'),/MERCHANT CLAIMS/);
 assert.match(screen('senate','zh','trade'),/商船交易争议/);
 for(let i=0;i<12;i++)s.naval.disputes.push({...claim,id:`closed-${i}`,status:'settled'});
 assert.match(screen('senate','en','trade'),new RegExp(`data-settle-dispute="${claim.id}"`),'an old open claim remains actionable after many settled records');
 s.naval.disputes.length=1;
 assert.match(screen('egypt','en','reports'),/MERCHANT PAYMENT DISPUTE/);
 assert.doesNotMatch(screen('egypt','en','trade'),/data-settle-dispute/,'the seller cannot spend the buyer treasury');
 assert.doesNotMatch(screen('caesar','en','reports'),/MERCHANT PAYMENT DISPUTE/,'an uninvolved faction receives no claim report');
 s.player='senate';
 assert.equal(settleMerchantDispute(s,'egypt',claim.id).ok,false,'only the buyer may settle');
 assert.equal(settleMerchantDispute(s,'senate',claim.id).reason,'treasury');
 s.factions.senate.treasury=20;
 const beforeSeller=s.factions.egypt.treasury;
 assert.deepEqual(settleMerchantDispute(s,'senate',claim.id),{ok:true,paid:claim.compensation});
 assert.equal(s.factions.senate.treasury,20-claim.compensation);
 assert.equal(s.factions.egypt.treasury,beforeSeller+claim.compensation);
 assert.equal(s.relations[key],beforeRelations);
 assert.equal(s.naval.disputes[0].status,'settled');
 assert.equal(settleMerchantDispute(s,'senate',claim.id).ok,false,'a reload or repeated click cannot pay twice');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(s.naval.disputes[0].status,'settled');
 assert.equal(s.naval.reports.filter(r=>r.kind==='merchant-dispute-settled'&&r.disputeId===claim.id).length,1);
 const old=JSON.parse(JSON.stringify(s));delete old.naval.disputes;delete old.naval.nextDispute;
 assert.deepEqual(upgradeSave(old).naval.disputes,[],'older campaigns gain an empty dispute ledger without losing trade state');
});

test('a solvent AI buyer honors an older claim without spending the player treasury',()=>{
 const s=newGrandGame('egypt');s.wars=[];s.naval.pirates=[];s.factions.senate.treasury=500;s.factions.senate.food=0;
 for(const route of s.naval.routes)if(route.id!=='egypt-italy')route.pausedBy=[s.regions.find(r=>r.id===route.from)?.owner].filter(Boolean);
 advanceNaval(s);
 const ship=s.naval.voyages.find(v=>v.routeId==='egypt-italy'&&v.phase==='outbound');assert.ok(ship);
 ship.zone=portZone(ship.to);ship.path=[];s.factions.senate.treasury=0;s.month++;advanceNaval(s);
 const claim=s.naval.disputes[0];assert.equal(claim.status,'open');
 s.factions.senate.treasury=100;
 const withoutSettlement=upgradeSave(JSON.parse(JSON.stringify(s)));
 withoutSettlement.naval.disputes[0].status='settled';
 s.month++;withoutSettlement.month++;
 advanceNaval(s);advanceNaval(withoutSettlement);
 assert.equal(claim.status,'settled');
 assert.equal(s.factions.egypt.treasury-withoutSettlement.factions.egypt.treasury,claim.compensation,'the player seller receives only the claim above ordinary monthly costs');
 assert.equal(withoutSettlement.factions.senate.treasury-s.factions.senate.treasury,claim.compensation,'the AI buyer pays from its own treasury');
 assert.equal(s.naval.reports.filter(r=>r.kind==='merchant-dispute-settled'&&r.disputeId===claim.id).length,1);
});

test('harbor congestion delays real cargo and payment, survives reload, and improves with a warehouse',()=>{
 let s=newGrandGame('senate');s.wars=[];s.naval.pirates=[];s.factions.senate.treasury=500;
 const port=s.regions.find(r=>r.id==='t016');port.civicSatisfaction=25;
 const chosen=['african-oil','egypt-papyrus','levant-luxury'];
 for(const route of s.naval.routes)if(!chosen.includes(route.id))route.pausedBy=[s.regions.find(r=>r.id===route.from)?.owner].filter(Boolean);
 advanceNaval(s);
 const incoming=chosen.map(id=>s.naval.voyages.find(v=>v.routeId===id));
 assert.ok(incoming.every(Boolean),'three real cargo voyages depart');
 s.naval.voyages=[...incoming.filter(v=>v.routeId!=='egypt-papyrus'),incoming.find(v=>v.routeId==='egypt-papyrus')];
 for(const voyage of s.naval.voyages){voyage.path=[];voyage.zone=portZone(port.id)}
 const withWarehouse=upgradeSave(JSON.parse(JSON.stringify(s)));
 withWarehouse.regions.find(r=>r.id===port.id).buildings.push('warehouse');
 assert.equal(harborTradeCapacity(s,port),2);
 assert.equal(harborTradeCapacity(withWarehouse,withWarehouse.regions.find(r=>r.id===port.id)),3);
 s.month++;withWarehouse.month++;
 advanceNaval(s);advanceNaval(withWarehouse);
 const route=state=>state.naval.routes.find(r=>r.id==='egypt-papyrus');
 assert.equal(route(s).last.reason,'congestion');assert.equal(route(s).last.paid,0);
 assert.equal(route(withWarehouse).last.reason,'delivered');
 assert.ok(route(withWarehouse).last.paid>0);
 assert.equal(s.factions.senate.treasury-withWarehouse.factions.senate.treasury,route(withWarehouse).last.paid);
 assert.equal(withWarehouse.factions.egypt.treasury-s.factions.egypt.treasury,route(withWarehouse).last.paid);
 const waiting=s.naval.voyages.find(v=>v.routeId==='egypt-papyrus'&&v.phase==='outbound');
 assert.equal(waiting.congestedMonths,1);assert.equal(waiting.cargo,2);
 assert.equal(s.naval.reports.filter(r=>r.kind==='harbor-congestion').length,1);
 for(const [lang,title,status] of [['en','HARBOR CONGESTION','Waiting for a free harbor berth'],['zh','港口拥堵','等待空闲港口泊位']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.match(content.innerHTML,new RegExp(title));
  renderNavalPanel({state:s,lang,root,section:'trade',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.match(content.innerHTML,new RegExp(status));
 }
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(s.naval.voyages.find(v=>v.id===waiting.id).congestedMonths,1);
 s.month++;advanceNaval(s);
 assert.equal(route(s).last.reason,'delivered');assert.ok(route(s).last.paid>0);
 assert.equal(s.naval.reports.filter(r=>r.kind==='harbor-congestion').length,1);
});

test('a delayed grain shipment is linked to shortage only when it could cover the actual deficit',()=>{
 let s=newGrandGame('senate');s.wars=[];s.naval.pirates=[];s.factions.senate.treasury=500;s.factions.senate.food=0;
 const port=s.regions.find(r=>r.id==='t016');port.civicSatisfaction=25;
 const chosen=['african-oil','egypt-italy','levant-luxury'];
 for(const route of s.naval.routes)if(!chosen.includes(route.id))route.pausedBy=[s.regions.find(r=>r.id===route.from)?.owner].filter(Boolean);
 advanceNaval(s);
 const grain=s.naval.voyages.find(v=>v.routeId==='egypt-italy');assert.ok(grain&&grain.cargo>0);const cargo=grain.cargo;
 s.naval.voyages=[...s.naval.voyages.filter(v=>v!==grain),grain];
 for(const voyage of s.naval.voyages){voyage.path=[];voyage.zone=portZone(port.id)}
 s.month++;advanceNaval(s);assert.equal(grain.congestedMonths,1);
 s.factions.senate.food=-nationalBudget(s,'senate').foodNet-2;
 const withoutEconomy=upgradeSave(JSON.parse(JSON.stringify(s)));
 advanceNaval(withoutEconomy);
 assert.equal(withoutEconomy.naval.reports.some(r=>r.kind==='interrupted-grain-shortage'),false,'a negative store alone is not evidence of a monthly shortage penalty');
 const noShortage=upgradeSave(JSON.parse(JSON.stringify(s)));
 noShortage.factions.senate.food+=grain.cargo;
 const delivered=noShortage.naval.voyages.find(v=>v.id===grain.id);delivered.phase='return';delivered.cargo=0;
 const tooSmall=upgradeSave(JSON.parse(JSON.stringify(s)));
 tooSmall.factions.senate.food-=grain.cargo+1;
 const armyId=s.armies.find(a=>a.owner==='senate').id;
 tick(s);tick(noShortage);tick(tooSmall);
 const incident=s.naval.reports.find(r=>r.kind==='interrupted-grain-shortage');
 assert.equal(incident?.cause,'congestion');assert.equal(incident?.cargo,cargo);assert.equal(incident?.deficit,2);
 assert.equal(noShortage.naval.reports.some(r=>r.kind==='interrupted-grain-shortage'),false);
 assert.equal(tooSmall.naval.reports.some(r=>r.kind==='interrupted-grain-shortage'),false,'do not blame a shipment too small to avert the shortage');
 assert.equal(noShortage.factions.senate.stability-s.factions.senate.stability,1);
 assert.ok(noShortage.armies.find(a=>a.id===armyId).men>s.armies.find(a=>a.id===armyId).men,'the ordinary food shortage already caused casualties');
 for(const [lang,title,cause] of [['en','INTERRUPTED GRAIN SHIPMENT','Harbor congestion delayed delivery'],['zh','受阻粮运与粮荒','港口拥堵推迟了交付']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.match(content.innerHTML,new RegExp(title));assert.match(content.innerHTML,new RegExp(cause));
 }
 const foreignView=upgradeSave(JSON.parse(JSON.stringify(s)));foreignView.player='egypt';
 const foreignContent={innerHTML:''},foreignRoot={innerHTML:'',querySelector:()=>foreignContent,querySelectorAll:()=>[]};
 renderNavalPanel({state:foreignView,lang:'en',root:foreignRoot,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
 assert.doesNotMatch(foreignContent.innerHTML,/INTERRUPTED GRAIN SHIPMENT/,'the seller cannot inspect the buyer’s food deficit');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(s.naval.reports.filter(r=>r.kind==='interrupted-grain-shortage').length,1);
 assert.equal(s.naval.voyages.find(v=>v.id===grain.id).shortageReported,true);
 tick(s);assert.equal(s.naval.reports.filter(r=>r.kind==='interrupted-grain-shortage').length,1);
});

test('a real naval blockade can delay grain long enough to cause a dated shortage report',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];s.factions.senate.treasury=500;s.factions.senate.food=0;
 for(const route of s.naval.routes)if(route.id!=='egypt-italy')route.pausedBy=[s.regions.find(r=>r.id===route.from)?.owner].filter(Boolean);
 advanceNaval(s);
 const grain=s.naval.voyages.find(v=>v.routeId==='egypt-italy');assert.ok(grain);
 const blockader=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 blockader.zone=portZone('t016');blockader.port=null;blockader.reserve=false;blockader.mobilizing=0;
 assert.equal(orderFleet(s,'caesar',blockader.id,'blockade','t016').ok,true);
 assert.equal(isPortBlockaded(s,'t016'),true);
 grain.path=[];grain.zone=portZone('t016');s.month++;advanceNaval(s);
 assert.equal(grain.blockedMonths,1);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'blockade');
 s.factions.senate.food=-nationalBudget(s,'senate').foodNet-2;
 tick(s);
 const report=s.naval.reports.find(r=>r.kind==='interrupted-grain-shortage');
 assert.equal(report?.cause,'blockade');assert.equal(report?.deficit,2);
 assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.paid,0);
 const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
 renderNavalPanel({state:s,lang:'zh',root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
 assert.match(content.innerHTML,/舰队封锁阻止了交付/);
});

test('two delayed grain voyages can jointly cover one actual shortage without duplicating rewards or reports',()=>{
 let s=newGrandGame('senate');s.wars=[];s.naval.pirates=[];s.factions.senate.treasury=500;s.factions.senate.food=0;
 const first=s.naval.routes.find(r=>r.id==='egypt-italy');first.volume=2;
 s.naval.routes.push({id:'egypt-second-grain',from:'egypt',to:'t016',good:'grain',volume:2,last:null});
 const chosen=['african-oil','levant-luxury','egypt-italy','egypt-second-grain'];
 for(const route of s.naval.routes)if(!chosen.includes(route.id))route.pausedBy=[s.regions.find(r=>r.id===route.from)?.owner].filter(Boolean);
 advanceNaval(s);
 const incoming=chosen.map(id=>s.naval.voyages.find(v=>v.routeId===id));assert.ok(incoming.every(Boolean));
 assert.deepEqual(incoming.filter(v=>v.good==='grain').map(v=>v.cargo),[2,2]);
 s.naval.voyages=[...incoming.filter(v=>v.good!=='grain'),...incoming.filter(v=>v.good==='grain')];
 for(const voyage of s.naval.voyages){voyage.path=[];voyage.zone=portZone('t016')}
 s.month++;advanceNaval(s);
 const waiting=s.naval.voyages.filter(v=>v.good==='grain');assert.equal(waiting.length,2);
 assert.ok(waiting.every(v=>v.congestedMonths===1),'both real voyages must wait for a berth');
 s.factions.senate.food=-nationalBudget(s,'senate').foodNet-3;
 const delivered=upgradeSave(JSON.parse(JSON.stringify(s)));
 delivered.factions.senate.food+=4;
 for(const voyage of delivered.naval.voyages.filter(v=>v.good==='grain')){voyage.phase='return';voyage.cargo=0}
 tick(s);tick(delivered);
 const incidents=s.naval.reports.filter(r=>r.kind==='interrupted-grain-shortage');
 assert.equal(incidents.length,1);assert.equal(incidents[0].deficit,3);
 assert.equal(incidents[0].cargo,4);assert.equal(incidents[0].shipments,2);
 assert.equal(delivered.naval.reports.some(r=>r.kind==='interrupted-grain-shortage'),false);
 assert.equal(delivered.factions.senate.stability-s.factions.senate.stability,1);
 assert.ok(waiting.every(v=>v.shortageReported));
 const underfunded=upgradeSave(JSON.parse(JSON.stringify(s)));
 underfunded.naval.reports=underfunded.naval.reports.filter(r=>r.kind!=='interrupted-grain-shortage');
 for(const voyage of underfunded.naval.voyages.filter(v=>v.good==='grain'))voyage.shortageReported=false;
 underfunded.factions.senate.treasury=2*waiting[0].price;
 advanceNaval(underfunded);
 assert.equal(underfunded.naval.reports.some(r=>r.kind==='interrupted-grain-shortage'),false,'two individually affordable ships cannot both spend the same treasury');
 for(const [lang,title] of [['en','INTERRUPTED GRAIN SHIPMENTS'],['zh','受阻粮运与粮荒']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.match(content.innerHTML,new RegExp(title));
  assert.match(content.innerHTML,new RegExp(lang==='en'?'Together these shipments could have covered':'这些粮船合计原本足以填补'));
 }
 const mixed=upgradeSave(JSON.parse(JSON.stringify(s)));
 mixed.naval.reports.find(r=>r.kind==='interrupted-grain-shortage').cause='mixed';
 for(const [lang,cause] of [['en','Fleet blockade and harbor congestion jointly delayed delivery'],['zh','舰队封锁和港口拥堵共同推迟了交付']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:mixed,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.match(content.innerHTML,new RegExp(cause));
 }
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(s.naval.reports.filter(r=>r.kind==='interrupted-grain-shortage').length,1);
 assert.equal(s.naval.voyages.filter(v=>v.good==='grain'&&v.shortageReported).length,2);
 tick(s);assert.equal(s.naval.reports.filter(r=>r.kind==='interrupted-grain-shortage').length,1);
});

test('fleet pursuit follows only fresh reported positions and survives a save',()=>{
 let s=newGrandGame('senate');
 const own=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 enemy.port='cisalpine';enemy.zone='ligurian';
 assert.equal(orderFleet(s,'senate',own.id,'pursue',enemy.id).reason,'intelligence');
 (s.naval.intel.senate||={})[enemy.id]={owner:'caesar',zone:'ionian',year:s.year,month:s.month,source:'sighting',range:[1,5],confidence:'low'};
 assert.equal(orderFleet(s,'senate',own.id,'pursue',enemy.id).ok,true);
 assert.equal(own.order.kind,'intercept');assert.equal(own.order.reportId,enemy.id);assert.equal(own.order.target,'ionian');
 assert.deepEqual(own.order.path,seaRoute('adriatic','ionian'));
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 const pursuing=s.naval.fleets.find(f=>f.id===own.id),hidden=s.naval.fleets.find(f=>f.id===enemy.id);
 assert.equal(pursuing.order.reportId,enemy.id);assert.equal(hidden.zone,'ligurian');
 s.month=2;s.naval.intel.senate[enemy.id]={...s.naval.intel.senate[enemy.id],zone:'aegean',month:2};
 const messages=[];advanceNaval(s,(_state,en)=>messages.push(en));
 assert.equal(pursuing.order.target,'aegean');assert.equal(pursuing.zone,'ionian');assert.equal(hidden.zone,'ligurian');
 assert.ok(messages.some(message=>message.includes('new dated sighting')));
 s.month=3;advanceNaval(s);assert.equal(pursuing.zone,'aegean');
 s.month=6;advanceNaval(s);assert.equal(pursuing.order,null);
 assert.equal(orderFleet(s,'senate',pursuing.id,'pursue',enemy.id).reason,'intelligence');
 s.month=7;s.naval.intel.senate[enemy.id].month=7;s.wars=[];
 assert.equal(orderFleet(s,'senate',pursuing.id,'pursue',enemy.id).reason,'intelligence');
});

test('battle sinking follows ship roles rather than save-object key order',()=>{
 const run=composition=>{const s=newGrandGame('senate'),attacker=s.naval.fleets.find(f=>f.id==='senate-adriatic'),defender=s.naval.fleets.find(f=>f.id==='caesar-adriatic');s.factions.caesar.treasury=500;attacker.port=null;attacker.ships={trireme:4};attacker.sailors=720;defender.port=null;defender.zone=attacker.zone;defender.ships=composition;defender.sailors=430;defender.hull=50;defender.order={kind:'patrol',target:defender.zone,path:[]};s.seed=83;advanceNaval(s);return s.naval.reports.find(r=>r.kind==='battle')?.losses[defender.id]};
 const first=run({transport:3,light:1,trireme:1}),reordered=run({trireme:1,light:1,transport:3});
 assert.ok(first&&reordered);assert.equal(first.type,'light');assert.equal(reordered.type,'light');assert.equal(first.sunk,1);assert.deepEqual(first,reordered);
});

test('warship screen and attacker tactic determine which hull is exposed',()=>{
 const run=order=>{const s=newGrandGame('senate'),attacker=s.naval.fleets.find(f=>f.id==='senate-adriatic'),defender=s.naval.fleets.find(f=>f.id==='caesar-adriatic');s.factions.caesar.treasury=500;attacker.port=null;attacker.ships={trireme:4};attacker.sailors=720;attacker.tactic='boarding';defender.port=null;defender.zone=attacker.zone;defender.ships={transport:4,trireme:2,light:1};defender.sailors=705;defender.hull=50;defender.order={kind:order?'patrol':'intercept',target:defender.zone,path:[]};s.seed=83;resolveBattle(s,attacker,defender,attacker.zone,()=>{});const report=s.naval.reports.find(r=>r.kind==='battle');return {loss:report?.losses[defender.id],tactic:report?.tactics[defender.id],captured:report?.captured,prize:attacker.ships.transport||0}};
 const screened=run(true),exposed=run(false);assert.equal(screened.tactic,'formation');assert.equal(screened.loss.type,'light');assert.equal(exposed.tactic,'ramming');assert.equal(exposed.loss.type,'transport');assert.equal(exposed.captured,1);assert.equal(exposed.prize,1);assert.equal(exposed.loss.sunk,0);assert.deepEqual(exposed.loss.byType,{});
});

test('a lost mixed fleet records each sunk ship class without exposing enemy classes in the report',()=>{
 let s=newGrandGame('senate');
 const own=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 own.port=null;own.ships={trireme:4};own.sailors=720;
 enemy.port=null;enemy.zone=own.zone;enemy.ships={light:1,trireme:2,transport:1};enemy.sailors=495;enemy.hull=1;
 resolveBattle(s,own,enemy,own.zone,()=>{});
 const report=s.naval.reports.find(r=>r.kind==='battle');
 assert.deepEqual(report.losses[enemy.id].byType,{light:1,trireme:2,transport:1});
 assert.equal(report.losses[enemy.id].sunk,4);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(s.naval.reports.find(r=>r.id===report.id).losses[enemy.id].byType,{light:1,trireme:2,transport:1});
 for(const [lang,known,secret] of [['en','Ships sunk by class','Light warship'],['zh','沉没船型','轻型战船']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.ok(!content.innerHTML.includes(known),'enemy ship classes remain concealed in the player report');
  assert.ok(!content.innerHTML.includes(secret),'enemy type names remain concealed in the player report');
 }
 s=newGrandGame('senate');
 const friendly=s.naval.fleets.find(f=>f.id==='senate-adriatic'),hostile=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 friendly.port=null;friendly.ships={light:1,trireme:1};friendly.sailors=245;friendly.hull=1;
 hostile.port=null;hostile.zone=friendly.zone;hostile.ships={trireme:4};hostile.sailors=720;
 resolveBattle(s,friendly,hostile,friendly.zone,()=>{});
 const ownReport=s.naval.reports.find(r=>r.kind==='battle');
 assert.deepEqual(ownReport.losses[friendly.id].byType,{light:1,trireme:1});
 for(const [lang,heading,light] of [['en','Ships sunk by class','Light warship ×1'],['zh','沉没船型','轻型战船 ×1']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});
  assert.ok(content.innerHTML.includes(heading));assert.ok(content.innerHTML.includes(light));
 }
});

test('warship speed gives bounded maneuver factors recorded in battle reports',()=>{
 const run=(ownShips,enemyShips)=>{const s=newGrandGame('senate'),own=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');s.factions.caesar.treasury=500;own.port=null;own.ships=ownShips;own.sailors=650;own.tactic='ramming';enemy.port=null;enemy.zone=own.zone;enemy.ships=enemyShips;enemy.sailors=650;s.seed=83;advanceNaval(s);return s.naval.reports.find(r=>r.kind==='battle')};
 const fast=run({light:2},{quinquereme:2}),slow=run({quinquereme:2},{light:2});assert.ok(fast&&slow);assert.ok(fast.maneuver['senate-adriatic']>100);assert.ok(slow.maneuver['senate-adriatic']<100);assert.ok(fast.maneuver['senate-adriatic']<=112&&slow.maneuver['senate-adriatic']>=88);
});

test('chosen tactics survive saves and change actual naval losses',()=>{
 const run=tactic=>{const s=newGrandGame('senate'),own=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');own.port=null;enemy.port=null;enemy.zone=own.zone;s.seed=83;if(tactic!=='formation')assert.equal(setFleetTactic(s,'senate',own.id,tactic).ok,true);assert.equal(setFleetTactic(s,'senate',own.id,'formation').ok,false);const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.naval.fleets.find(f=>f.id===own.id).tactic,tactic);advanceNaval(loaded);return loaded.naval.reports.find(r=>r.kind==='battle')};
 const boarding=run('boarding'),missile=run('missile'),ramming=run('ramming');const id='senate-adriatic',enemy='caesar-adriatic';
 assert.equal(boarding.snapshots[id].tactic,'boarding');assert.ok(boarding.losses[id].sailors>missile.losses[id].sailors);assert.ok(ramming.damage[enemy]>missile.damage[enemy]);
});
test('boarding can capture a named commander who stays captive through save reload until ransom returns him',()=>{
 let s=newGrandGame('senate');const own=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');own.port=null;enemy.port=null;enemy.zone=own.zone;enemy.hull=25;enemy.commanderId='antony';s.factions.caesar.treasury=0;s.seed=8;
 assert.equal(setFleetTactic(s,'senate',own.id,'boarding').ok,true);advanceNaval(s);const capture=s.naval.captives.find(c=>c.characterId==='antony');assert.ok(capture);assert.equal(capture.status,'held');assert.equal(s.world.characters.antony.missing.capturedBy,'senate');assert.equal(enemy.commanderId,null);assert.equal(s.naval.reports.find(r=>r.kind==='battle').capturedCommander.characterId,'antony');
 advanceMissingCommanders(s);assert.equal(s.world.characters.antony.missing.capturedBy,'senate');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.wars=[];s.factions.caesar.treasury=50;assert.equal(ransomFleetCommander(s,'caesar','antony').ok,true);assert.equal(ransomFleetCommander(s,'caesar','antony').ok,false);assert.equal(s.naval.captives.find(c=>c.characterId==='antony').status,'returning');advanceNaval(s);assert.ok(s.world.characters.antony.missing);advanceNaval(s);assert.equal(s.naval.captives.find(c=>c.characterId==='antony').status,'released');assert.equal(s.world.characters.antony.missing,undefined);
});
test('a commander is reported missing when his entire fleet sinks without capture',()=>{
 let s=newGrandGame('senate');const own=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 own.port=null;own.ships={trireme:4};own.sailors=720;
 enemy.port=null;enemy.zone=own.zone;enemy.hull=1;enemy.commanderId='antony';s.seed=83;
 resolveBattle(s,own,enemy,own.zone,()=>{});
 assert.equal(Object.values(enemy.ships).reduce((n,count)=>n+count,0),0);
 assert.equal(enemy.commanderId,null);
 assert.equal(s.world.characters.antony.location,null);
 assert.equal(s.world.characters.antony.missing.remaining,3);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(s.naval.fleets.find(f=>f.id===enemy.id).commanderId,null);
 for(let i=0;i<3;i++){s.month++;advanceMissingCommanders(s)}
 assert.equal(s.world.characters.antony.missing,undefined);
 assert.ok(s.world.characters.antony.location);
});
test('a lost friendly commander receives a bilingual campaign notice',()=>{
 const s=newGrandGame('senate'),own=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic'),notices=[];
 own.port=null;own.ships={light:1};own.sailors=65;own.hull=1;own.commanderId='cicero';
 enemy.port=null;enemy.zone=own.zone;enemy.ships={trireme:4};enemy.sailors=720;
 resolveBattle(s,own,enemy,own.zone,(_state,en,zh)=>notices.push({en,zh}));
 assert.equal(own.commanderId,null);
 assert.ok(notices.some(({en,zh})=>en.includes('commander is missing')&&zh.includes('舰长失联')));
});
test('an old save releases a commander stranded on a fleet with no ships',()=>{
 let s=newGrandGame('caesar');const fleet=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 fleet.ships={};fleet.hull=0;fleet.port=null;fleet.commanderId='antony';
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 advanceNaval(s);
 assert.equal(s.naval.fleets.find(f=>f.id===fleet.id).commanderId,null);
 assert.equal(s.world.characters.antony.missing.remaining,3);
});
test('AI reserves an unaffordable docked fleet and recommissions it after a dated hostile sighting',()=>{
 let s=newGrandGame('senate');s.factions.caesar.treasury=90;const id='caesar-adriatic',full=fleetUpkeepDue(s.naval.fleets.find(f=>f.id===id));advanceNaval(s);let f=s.naval.fleets.find(x=>x.id===id);assert.equal(f.reserve,true);assert.equal(f.order,null);assert.ok(fleetUpkeepDue(f)<full);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));f=s.naval.fleets.find(x=>x.id===id);s.factions.caesar.treasury=45;s.naval.intel.caesar={'senate-adriatic':{owner:'senate',zone:f.zone,year:s.year,month:s.month,source:'sighting',range:[1,5],confidence:'low'}};advanceNaval(s);assert.equal(f.reserve,true);assert.ok(!f.mobilizing);
 s.factions.caesar.treasury=120;advanceNaval(s);assert.equal(f.reserve,true);assert.equal(f.mobilizing,2);advanceNaval(s);assert.equal(f.reserve,true);assert.equal(f.mobilizing,1);advanceNaval(s);assert.equal(f.reserve,false);assert.equal(f.mobilizing,0);
});
test('an offshore patrol cannot fight a fleet sheltered in port until it sorties',()=>{
 const s=newGrandGame('senate'),patrol=s.naval.fleets.find(f=>f.id==='senate-adriatic'),sheltered=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 assert.equal(reserveFleet(s,'caesar',sheltered.id).ok,true);
 assert.equal(orderFleet(s,'senate',patrol.id,'patrol','adriatic').ok,true);
 const hull=sheltered.hull;
 advanceNaval(s);
 assert.equal(s.naval.reports.filter(r=>r.kind==='battle').length,0);
 assert.equal(sheltered.hull,hull);
 assert.equal(sheltered.reserve,true);
 sheltered.port=null;sheltered.reserve=false;
 advanceNaval(s);
 assert.ok(s.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(sheltered.id)));
});
test('outnumbered AI preserves its land-war budget before optional patrols, but responds to a reported sea threat',()=>{
 const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='caesar-adriatic'),full=fleetUpkeepDue(fleet);
 assert.equal(s.factions.caesar.treasury,180);
 assert.ok(nationalBudget(s,'caesar').projectedNet< -6);
 advanceNaval(s);
 assert.equal(fleet.reserve,true);
 assert.ok(fleetUpkeepDue(fleet)<full);
 const threatened=newGrandGame('egypt'),warned=threatened.naval.fleets.find(f=>f.id==='caesar-adriatic');
 threatened.naval.intel.caesar={'senate-adriatic':{owner:'senate',zone:warned.zone,year:threatened.year,month:threatened.month,source:'sighting',range:[1,5],confidence:'low'}};
 advanceNaval(threatened);
 assert.ok(!warned.reserve,'a current nearby hostile report keeps the fleet ready while the reserve can sustain it');
});
test('a captured harbor cannot resupply, repair or train its former active fleet',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),port=s.regions.find(r=>r.id===f.port),messages=[];
 port.buildings.push('naval-training');f.supply=30;f.hull=60;f.experience=20;f.sailors-=20;
 for(const other of s.naval.fleets.filter(x=>x!==f))other.zone='western';
 for(const pirate of s.naval.pirates)pirate.ships=0;
 const manpower=s.factions.senate.manpower;port.owner='caesar';
 advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.equal(f.port,null);assert.equal(f.supply,22);assert.equal(f.hull,60);assert.equal(f.experience,20);
 assert.equal(s.factions.senate.manpower,manpower,'lost harbor must not recruit sailors');
 assert.ok(messages.some(m=>m.en.includes('lost its harbor')&&m.zh.includes('失去港口')));
});
test('AI withdraws an unaffordable patrol to port before laying it up',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='caesar');s.naval.fleets.find(x=>x.owner==='senate').zone='tyrrhenian';f.port=null;f.order={kind:'patrol',target:f.zone,path:[]};s.factions.caesar.treasury=20;advanceNaval(s);assert.equal(f.order?.kind,'return');advanceNaval(s);assert.equal(f.port,'cisalpine');assert.equal(f.reserve,true);
});
test('an outnumbered cash-losing AI recalls an optional patrol while it can still fund a levy',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='caesar');
 s.naval.fleets.find(x=>x.owner==='senate').zone='tyrrhenian';
 f.port=null;f.order={kind:'patrol',target:f.zone,path:[]};s.factions.caesar.treasury=65;
 advanceNaval(s);
 assert.ok(s.factions.caesar.treasury>=35,'the previous recall threshold has not yet been reached');
 assert.equal(f.order?.kind,'return');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))),saved=restored.naval.fleets.find(x=>x.id===f.id);
 advanceNaval(restored);assert.equal(saved.port,'cisalpine');assert.equal(saved.reserve,true);
});
test('a cash-poor AI returns an idle offshore fleet to a friendly port for reserve',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='caesar');
 s.naval.fleets.find(x=>x.owner==='senate').zone='tyrrhenian';
 f.port=null;f.zone='ligurian';f.order=null;s.factions.caesar.treasury=20;
 advanceNaval(s);
 assert.equal(f.order?.kind,'return');
 const safePort=f.order.targetPort;
 assert.equal(s.regions.find(r=>r.id===safePort)?.owner,'caesar');
 const loaded=upgradeSave(structuredClone(s)),saved=loaded.naval.fleets.find(x=>x.id===f.id);
 advanceNaval(loaded);
 assert.equal(saved.port,safePort);
 assert.equal(saved.reserve,true);
 assert.ok(fleetUpkeepDue(saved)<fleetUpkeepDue({...saved,reserve:false}));
});
test('critically damaged and unsupplied fleets can retreat but cannot start a new mission',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');
 s.naval.fleets.find(x=>x.owner==='caesar').zone='western';
 f.port=null;f.zone='ionian';f.hull=20;f.supply=5;
 assert.equal(orderFleet(s,'senate',f.id,'intercept','aegean').reason,'condition');
 assert.equal(orderFleet(s,'senate',f.id,'return','italiaS').ok,true);
 advanceNaval(s);advanceNaval(s);
 assert.equal(f.port,'italiaS');assert.equal(f.order,null);
 advanceNaval(s);assert.ok(f.supply>5);
 const ai=newGrandGame('senate'),enemy=ai.naval.fleets.find(x=>x.owner==='caesar');
 ai.naval.fleets.find(x=>x.owner==='senate').zone='western';
 enemy.port=null;enemy.zone='ionian';enemy.hull=20;enemy.supply=5;
 advanceNaval(ai);assert.equal(enemy.order?.kind,'return');
 advanceNaval(ai);advanceNaval(ai);assert.equal(enemy.port,'cisalpine');
});

test('reserve cuts real upkeep but suspends orders and troop transports until mobilization completes',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),full=fleetUpkeepDue(f),before=nationalBudget(s,'senate');
 assert.equal(reserveFleet(s,'senate',f.id).ok,true);assert.equal(reserveFleet(s,'senate',f.id).ok,false);
 assert.equal(fleetUpkeepDue(f),Math.ceil(fleetUpkeep(f)*.15));assert.equal(nationalBudget(s,'senate').navyUpkeep,before.navyUpkeep-full+fleetUpkeepDue(f));
 assert.equal(orderFleet(s,'senate',f.id,'patrol','adriatic').ok,false);assert.equal(accessibleFleet(s,'senate',f.port,2000),undefined);
 const money=s.factions.senate.treasury,food=s.factions.senate.food;assert.equal(mobilizeFleet(s,'senate',f.id).ok,true);assert.equal(s.factions.senate.treasury,money-6);assert.equal(s.factions.senate.food,food-2);assert.equal(orderFleet(s,'senate',f.id,'patrol','adriatic').ok,false);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))),saved=restored.naval.fleets.find(x=>x.id===f.id);assert.equal(saved.reserve,true);assert.equal(saved.mobilizing,2);
 restored.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';advanceNaval(restored);assert.equal(saved.reserve,true);assert.equal(saved.mobilizing,1);assert.equal(orderFleet(restored,'senate',saved.id,'patrol','adriatic').ok,false);
 advanceNaval(restored);assert.equal(saved.reserve,false);assert.equal(saved.mobilizing,0);assert.equal(fleetUpkeepDue(saved),full);assert.equal(orderFleet(restored,'senate',saved.id,'patrol','adriatic').ok,true);
});
test('reserved warships release their existing merchant hulls, and lost harbors end reserve',()=>{
 const s=newGrandGame('senate'),egypt=s.naval.fleets.find(x=>x.owner==='egypt'),senate=s.naval.fleets.find(x=>x.owner==='senate');
 s.factions.senate.food=0;
 const laidUp=reserveFleet(s,'egypt',egypt.id),merchant=s.naval.fleets.find(f=>f.id===laidUp.detached);
 assert.equal(laidUp.ok,true);assert.equal(egypt.ships.merchant,0);assert.equal(egypt.sailors,180);assert.equal(merchant.ships.merchant,3);assert.equal(merchant.sailors,135);assert.equal(merchant.reserve,undefined);
 advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'enroute');assert.equal(egypt.reserve,true);
 assert.equal(s.naval.fleets.filter(f=>f.owner==='egypt').reduce((sum,f)=>sum+(f.ships.merchant||0),0)+s.naval.voyages.filter(v=>v.vesselOwner==='egypt').length,3);
 assert.equal(mobilizeFleet(s,'egypt',egypt.id).ok,true);advanceNaval(s);assert.equal(egypt.reserve,true);advanceNaval(s);assert.equal(egypt.reserve,false);
 assert.equal(reserveFleet(s,'senate',senate.id).ok,true);s.regions.find(r=>r.id===senate.port).owner='caesar';s.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';advanceNaval(s);assert.equal(senate.reserve,false);assert.equal(senate.port,null);assert.ok(senate.hull<100);
});
test('a fleet mobilizing in harbor stays sheltered until it sorties',()=>{
 const s=newGrandGame('senate'),own=s.naval.fleets.find(x=>x.owner==='senate'),enemy=s.naval.fleets.find(x=>x.owner==='caesar');
 s.factions.caesar.treasury=300;
 assert.equal(reserveFleet(s,'senate',own.id).ok,true);assert.equal(mobilizeFleet(s,'senate',own.id).ok,true);enemy.zone=own.zone;enemy.port=null;advanceNaval(s);
 assert.equal(s.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(own.id)),false);assert.equal(own.reserve,true);
 advanceNaval(s);assert.equal(own.reserve,false);
 assert.equal(orderFleet(s,'senate',own.id,'patrol','adriatic').ok,true);advanceNaval(s);
 assert.ok(s.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(own.id)));
});

test('fleets are separate from armies and move only through connected sea zones',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');assert.ok(f);assert.equal(s.armies.some(a=>a.id===f.id),false);assert.equal(SEA_ZONES.length,13);assert.deepEqual(seaRoute('adriatic','aegean'),['ionian','aegean']);assert.equal(seaRoute('adriatic','nonesuch'),null);assert.equal(portZone('italiaS'),'adriatic');assert.equal(orderFleet(s,'senate',f.id,'intercept','aegean').ok,true);advanceNaval(s);assert.equal(f.zone,'ionian');advanceNaval(s);assert.equal(f.zone,'aegean')
});
test('Pontic harbors use the Black Sea through the Marmara passage, including older docked fleets',()=>{
 const s=newGrandGame('senate');
 for(const id of ['t092','bosporus','t097'])assert.equal(portZone(id),'euxine');
 assert.deepEqual(seaRoute('aegean','euxine'),['propontis','euxine']);
 const fleet=s.naval.fleets.find(f=>f.id==='bosporan-strait');
 assert.equal(fleet.zone,'euxine');
 s.naval.version=5;fleet.zone='aegean';
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.naval.version,6);
 assert.equal(restored.naval.fleets.find(f=>f.id===fleet.id).zone,'euxine');
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(restored))).naval.fleets.find(f=>f.id===fleet.id).zone,'euxine');
 const underway=newGrandGame('senate'),returning=underway.naval.fleets.find(f=>f.id==='bosporan-strait');
 underway.regions.find(r=>r.id==='t091').owner='bosporus';
 underway.naval.version=5;returning.reserve=false;returning.zone='aegean';
 returning.order={kind:'return',targetPort:'t091',path:[]};
 const resumed=upgradeSave(JSON.parse(JSON.stringify(underway)));
 assert.deepEqual(resumed.naval.fleets.find(f=>f.id===returning.id).order.path,['propontis','aegean']);
});
test('Alexandria can launch a real troop convoy toward a hostile Aegean port after obtaining transport hulls',()=>{
 const s=newGrandGame('egypt'),army=s.armies.find(a=>a.id==='egyptguard'),fleet=s.naval.fleets.find(f=>f.id==='egypt-grain');
 s.wars.push(['egypt','senate']);
 assert.equal(previewMarch(s,army.id,'t091').sea,false,'without transports the army has only the long land route');
 fleet.ships.transport=2;fleet.sailors+=140;
 const plan=previewMarch(s,army.id,'t091');
 assert.equal(plan.ok,true);assert.equal(plan.path[0].sea,true);
 assert.equal(moveArmy(s,army.id,'t091').ok,true);
 assert.equal(army.move.sea,true);assert.equal(army.move.transportFleetId,fleet.id);
 assert.equal(fleet.order.kind,'transport');
});
test('light-only fleets use ship speed and merchant hulls set cargo capacity',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');f.ships={light:2};f.sailors=130;f.zone='western';f.port=null;assert.equal(fleetSpeed(f),3);assert.equal(fleetCargoCapacity(f),0);assert.equal(orderFleet(s,'senate',f.id,'intercept','tyrrhenian').ok,true);advanceNaval(s);assert.equal(f.zone,'tyrrhenian');f.ships.merchant=2;assert.equal(fleetCargoCapacity(f),8)
});
test('shipbuilding spends treasury, materials, crew and time at a real shipyard',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),before={treasury:s.factions.senate.treasury,timber:s.development.senate.materials.timber,crew:s.factions.senate.manpower};const result=queueShip(s,'senate','italiaS','merchant');assert.equal(result.ok,true);assert.equal(s.factions.senate.treasury,before.treasury-17);assert.equal(s.development.senate.materials.timber,before.timber-2);assert.equal(s.factions.senate.manpower,before.crew-45);assert.equal(queueShip(s,'senate','italiaS','trireme').ok,false);for(let i=0;i<result.months-1;i++)advanceNaval(s);assert.equal(f.ships.merchant||0,0);advanceNaval(s);assert.equal(f.ships.merchant,1)
});
test('shipyard labor pauses a paid hull and resumes after save reload; cancellation returns only reserved crew',()=>{
 const s=newGrandGame('senate'),port=s.regions.find(r=>r.id==='italiaS'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic'),messages=[];
 const before={treasury:s.factions.senate.treasury,timber:s.development.senate.materials.timber,manpower:s.factions.senate.manpower};
 const order=queueShip(s,'senate',port.id,'merchant');assert.equal(order.ok,true);
 port.population=100;
 for(let i=0;i<3;i++)advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.equal(s.naval.queues[0].remaining,order.months);
 assert.equal(s.naval.queues[0].stalledReason,'workers');
 assert.equal(fleet.ships.merchant||0,0);
 assert.equal(messages.filter(m=>m.en.includes('Shipbuilding paused')).length,1);
 assert.ok(messages.some(m=>m.zh.includes('造船暂停')));
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s))),loadedPort=loaded.regions.find(r=>r.id===port.id),loadedQueue=loaded.naval.queues[0],continued=[];
 assert.equal(loadedQueue.stalledReason,'workers');
 loadedPort.population=800;
 advanceNaval(loaded,(_state,en,zh)=>continued.push({en,zh}));
 assert.equal(loadedQueue.remaining,order.months-1);
 assert.equal(loadedQueue.stalledReason,null);
 assert.ok(continued.some(m=>m.en.includes('Shipbuilding resumed')&&m.zh.includes('造船继续')));
 for(let i=1;i<order.months;i++)advanceNaval(loaded);
 assert.equal(loaded.naval.fleets.find(f=>f.id===fleet.id).ships.merchant,1);
 assert.equal(loaded.naval.queues.length,0);
 const second=newGrandGame('senate'),secondPort=second.regions.find(r=>r.id===port.id);
 assert.equal(queueShip(second,'senate',secondPort.id,'merchant').ok,true);
 secondPort.population=100;advanceNaval(second);
 const treasuryAtCancel=second.factions.senate.treasury,timberAtCancel=second.development.senate.materials.timber;
 const canceled=cancelShipConstruction(second,'senate',secondPort.id);
 assert.deepEqual(canceled,{ok:true,crewReturned:45});
 assert.equal(second.naval.queues.length,0);
 assert.equal(second.factions.senate.manpower,before.manpower);
 assert.equal(second.factions.senate.treasury,treasuryAtCancel);
 assert.equal(second.development.senate.materials.timber,timberAtCancel);
 assert.equal(cancelShipConstruction(second,'senate',secondPort.id).ok,false);
 assert.equal(second.factions.senate.manpower,before.manpower);
});
test('losing a shipyard building cancels its unfinished hull without launching it',()=>{
 const s=newGrandGame('senate'),port=s.regions.find(r=>r.id==='italiaS'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');
 assert.equal(queueShip(s,'senate',port.id,'merchant').ok,true);
 port.buildings=port.buildings.filter(id=>id!=='shipyard');
 advanceNaval(s);
 assert.equal(s.naval.queues.length,0);
 assert.equal(fleet.ships.merchant||0,0);
});
test('zero residents block ship orders while a legacy port without population keeps its prior default',()=>{
 const s=newGrandGame('senate'),port=s.regions.find(r=>r.id==='italiaS');
 port.population=0;
 assert.equal(queueShip(s,'senate',port.id,'merchant').reason,'workers');
 delete port.population;
 assert.equal(queueShip(s,'senate',port.id,'merchant').ok,true);
 for(let i=0;i<3;i++)advanceNaval(s);
 assert.equal(s.naval.queues.length,0);
});
test('a newly built ship joins a damaged fleet at full condition after launch',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.id==='senate-adriatic');
 f.hull=40;
 const build=queueShip(s,'senate','italiaS','light');assert.equal(build.ok,true);
 s.development.senate.materials.timber=0;
 for(let month=1;month<build.months;month++){advanceNaval(s);assert.equal(f.hull,40);assert.equal(f.ships.light||0,0)}
 advanceNaval(s);
 assert.equal(f.ships.light,1);
 assert.equal(f.hull,52,'four existing ships at 40% and one new ship at 100% average 52%');
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s))),saved=loaded.naval.fleets.find(x=>x.id===f.id);
 assert.equal(saved.hull,52);
 loaded.development.senate.materials.timber=1;loaded.factions.senate.treasury=100;
 advanceNaval(loaded);
 assert.equal(saved.hull,60,'the joined fleet can still receive ordinary shipyard repairs');
});
test('a captured shipyard cancels unfinished ships before launch',()=>{
 const s=newGrandGame('senate'),messages=[];s.month=2;
 assert.equal(queueShip(s,'senate','italiaS','merchant').ok,true);
 s.naval.queues.find(q=>q.owner==='senate').remaining=1;
 s.regions.find(r=>r.id==='italiaS').owner='caesar';
 advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.equal(s.naval.queues.some(q=>q.owner==='senate'),false);
 assert.equal(s.naval.fleets.filter(f=>f.owner==='senate').reduce((n,f)=>n+(f.ships.merchant||0),0),0);
 assert.ok(messages.some(m=>m.en.includes('Shipbuilding stopped')&&m.zh.includes('造船工程中止')));
});
test('a returning convoy diverts from a captured port and unloads cargo only at a friendly harbor',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),messages=[];s.month=2;
 for(const other of s.naval.fleets.filter(x=>x!==f))other.zone='western';
 for(const pirate of s.naval.pirates)pirate.ships=0;
 assert.equal(orderFleet(s,'senate',f.id,'supply','epirus').ok,true);
 const cargo=f.order.cargo;
 assert.equal(orderFleet(s,'senate',f.id,'return','italiaS').ok,true);
 assert.equal(f.order.cargo,cargo);
 s.regions.find(r=>r.id==='italiaS').owner='caesar';
 advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.notEqual(f.port,'italiaS');assert.equal(s.regions.find(r=>r.id===f.port)?.owner,'senate');
 const returned=s.naval.reports.filter(r=>r.kind==='supply-return'&&r.owner==='senate');
 assert.equal(returned.length,1);assert.equal(returned[0].port,f.port);assert.equal(returned[0].cargo,cargo);
 assert.ok(messages.some(m=>m.en.includes('diverted')&&m.zh.includes('改驶')));
 advanceNaval(s);assert.equal(s.naval.reports.filter(r=>r.kind==='supply-return'&&r.owner==='senate').length,1);
});
test('a convoy keeps its cargo offshore until a friendly port becomes available',()=>{
 let s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');s.month=2;
 for(const other of s.naval.fleets.filter(x=>x!==f))other.zone='western';
 for(const pirate of s.naval.pirates)pirate.ships=0;
 assert.equal(orderFleet(s,'senate',f.id,'supply','epirus').ok,true);
 assert.equal(orderFleet(s,'senate',f.id,'return','italiaS').ok,true);
 const cargo=f.order.cargo;
 for(const r of s.regions.filter(r=>r.owner==='senate'&&r.port))r.owner='caesar';
 advanceNaval(s);
 assert.equal(f.port,null);assert.equal(f.order?.kind,'return');assert.equal(f.order?.targetPort,null);assert.equal(f.order?.cargo,cargo);
 assert.equal(s.naval.reports.some(r=>r.kind==='supply-return'&&r.owner==='senate'),false);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));f=s.naval.fleets.find(x=>x.owner==='senate');
 assert.equal(f.order?.cargo,cargo,'save reload must retain undelivered cargo');
 s.regions.find(r=>r.id==='epirus').owner='senate';
 advanceNaval(s);
 assert.equal(f.port,'epirus');assert.equal(s.naval.reports.filter(r=>r.kind==='supply-return'&&r.owner==='senate').length,1);
});
test('fleet commander appointments cost pay, take travel time, and can be dismissed',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&!p.missing&&p.loyalty>=35&&!s.armies.some(a=>a.characterId===id));assert.ok(person);s.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';const treasury=s.factions.senate.treasury,out=appointFleet(s,'senate',f.id,person[0]);assert.equal(out.ok,true);assert.equal(s.factions.senate.treasury,treasury-5);assert.equal(f.commanderId,null);for(let i=0;i<out.months;i++)advanceNaval(s);assert.equal(f.commanderId,person[0]);const loyalty=person[1].loyalty;assert.equal(dismissFleetCommander(s,'senate',f.id).ok,true);assert.equal(f.commanderId,null);assert.equal(person[1].loyalty,loyalty-2)
});
test('appointing a fleet commander twice does not charge twice or overwrite the traveler',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&!p.missing&&!s.armies.some(a=>a.characterId===id));
 assert.ok(person);assert.equal(appointFleet(s,'senate',f.id,person[0]).ok,true);const treasury=s.factions.senate.treasury;
 assert.equal(appointFleet(s,'senate',f.id,person[0]).ok,false);assert.equal(s.factions.senate.treasury,treasury);
});
test('naval officers travel, draw salary, improve real operations and survive saves',()=>{
 const s=newGrandGame('senate'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&p.loyalty>=35&&!s.armies.some(a=>a.characterId===id));assert.ok(person);const before=s.factions.senate.treasury,appointment=appointNavalJob(s,'senate','supervisor','italiaS',person[0]);assert.equal(appointment.ok,true);assert.equal(s.factions.senate.treasury,before-5);assert.equal(navalJobEffect(s,'senate','supervisor','italiaS'),0);assert.equal(appointFleet(s,'senate','senate-adriatic',person[0]).ok,false);for(let i=0;i<appointment.months;i++)advanceNaval(s);assert.ok(navalJobEffect(s,'senate','supervisor','italiaS')>0);const build=queueShip(s,'senate','italiaS','merchant');assert.equal(build.ok,true);assert.ok(build.months<3);const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(saved.naval.jobs[0].characterId,person[0]);const loyalty=person[1].loyalty;assert.equal(dismissNavalJob(s,'senate','supervisor','italiaS').ok,true);assert.equal(person[1].loyalty,loyalty-2);assert.equal(navalJobEffect(s,'senate','supervisor','italiaS'),0)
});
test('historical naval aptitude and service experience influence officers',()=>{
 const s=newGrandGame('caesar'),mamurra=s.world.characters.mamurra;assert.equal(appointNavalJob(s,'caesar','engineer','cisalpine','mamurra').ok,true);assert.equal(mamurra.navalSkills.engineer,55);const job=s.naval.jobs[0],months=job.remaining;for(let i=0;i<months;i++)advanceNaval(s);job.experience=11;advanceNaval(s);assert.equal(mamurra.navalSkills.engineer,57);assert.ok(navalJobEffect(s,'caesar','engineer','cisalpine')>=3)
});
test('a fleet commander gains naval skill from real combat',()=>{
  const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),enemy=s.naval.fleets.find(x=>x.owner==='caesar'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&p.loyalty>=35&&!s.armies.some(a=>a.characterId===id));enemy.zone='ligurian';const out=appointFleet(s,'senate',f.id,person[0]);assert.equal(out.ok,true);for(let i=0;i<out.months;i++)advanceNaval(s);const skill=person[1].navalSkills.commander;enemy.zone=f.zone;enemy.port=null;enemy.order=null;f.port=null;advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='battle'));assert.equal(person[1].navalSkills.commander,skill+2)
});
test('shipyard repairs and sailor replacement consume treasury, timber and manpower',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');s.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';s.naval.fleets.find(x=>x.owner==='egypt').ships.merchant=0;f.hull=60;f.sailors-=30;const before={treasury:s.factions.senate.treasury,timber:s.development.senate.materials.timber,manpower:s.factions.senate.manpower};advanceNaval(s);assert.ok(f.hull>60);assert.equal(f.sailors,500);assert.equal(s.development.senate.materials.timber,before.timber-1);assert.equal(s.factions.senate.manpower,before.manpower-30);assert.equal(s.factions.senate.treasury,before.treasury-fleetUpkeep(f)-5)
});
test('later-campaign storms damage real fleets and AI can order a blockade without hidden sightings',()=>{
 const s=newGrandGame('senate'),own=s.naval.fleets.find(x=>x.owner==='senate'),enemy=s.naval.fleets.find(x=>x.owner==='caesar');s.year=-48;s.seed=1972;s.factions.caesar.treasury=200;own.port=null;own.zone='tyrrhenian';s.naval.pirates.find(p=>p.zone==='adriatic').pressure=0;advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='storm'&&r.owner==='senate'));assert.ok(own.hull<100);assert.equal(enemy.order?.kind,'blockade')
});
test('sea transport needs an idle fleet and arrives with its vessels',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='italiaS';const target='t075',fleet=s.naval.fleets.find(f=>f.owner==='senate');s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';assert.equal(previewMarch(s,army.id,target).ok,true);assert.equal(moveArmy(s,army.id,target).ok,true);assert.equal(fleet.order.kind,'transport');assert.equal(accessibleFleet(s,'senate','italiaS',army.men),undefined);for(let i=0;i<4&&army.region!==target;i++)tick(s);assert.equal(army.region,target);assert.equal(fleet.port,target)
});
test('cancelling before embarkation releases the transport; a sailed convoy cannot be cancelled from shore',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');
 unit.region='italiaS';s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='senate');
 const cash=s.factions.senate.treasury;
 assert.equal(moveArmy(s,unit.id,'t075').ok,true);
 assert.equal(fleet.order?.departed,false);assert.equal(fleet.port,null);
 const saved=upgradeSave(structuredClone(s)),restoredArmy=saved.armies.find(a=>a.id===unit.id),restoredFleet=saved.naval.fleets.find(f=>f.id===fleet.id);
 assert.equal(cancelMarch(saved,unit.id).ok,true);
 assert.equal(restoredArmy.move,null);assert.equal(restoredArmy.attackIntel,null);
 assert.equal(restoredFleet.order,null);assert.equal(restoredFleet.port,'italiaS');
 assert.equal(saved.factions.senate.treasury,cash-8,'the committed passage fee is not refunded');
 assert.equal(moveArmy(saved,unit.id,'t075').ok,true,'the freed ships can take another valid order');
 advanceNaval(saved);
 assert.equal(restoredFleet.order?.departed,true);
 const underway=upgradeSave(structuredClone(saved));
 assert.deepEqual(cancelMarch(underway,unit.id),{ok:false,reason:'departed'});
 assert.equal(underway.armies.find(a=>a.id===unit.id).move?.transportFleetId,fleet.id);
 assert.equal(underway.naval.fleets.find(f=>f.id===fleet.id).order?.kind,'transport');
});
test('ordinary land march cancellation clears the order',()=>{
 const s=newGrandGame('caesar'),unit=s.armies.find(a=>a.id==='xiii');
 assert.equal(moveArmy(s,unit.id,'italiaN').ok,true);
 assert.equal(cancelMarch(s,unit.id).ok,true);
 assert.equal(unit.move,null);
 assert.deepEqual(cancelMarch(s,unit.id),{ok:false,reason:'order'});
});
test('naval contact produces uncertain dated enemy intelligence and a battle report',()=>{
  const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate');s.naval.fleets.find(f=>f.owner==='caesar').port=null;assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(orderFleet(s,'senate',fleet.id,'intercept','adriatic').ok,true);advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='battle'));const sighting=reportedHostileFleets(s,'senate').find(r=>r.owner==='caesar');assert.ok(sighting);assert.equal(sighting.month,s.month);assert.ok(sighting.range[0]<sighting.range[1])
});
test('naval battle preserves bounded enemy-loss observations across saves',()=>{
  const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate');s.naval.fleets.find(f=>f.owner==='caesar').port=null;assert.equal(orderFleet(s,'senate',fleet.id,'intercept','adriatic').ok,true);advanceNaval(s);
 const battle=s.naval.reports.find(r=>r.kind==='battle'&&r.participants.includes(fleet.id)),enemyId=battle.participants.find(id=>id!==fleet.id),loss=battle.losses[enemyId],observed=battle.observedLosses.senate;
 assert.ok(observed.ships[0]<=loss.sunk&&loss.sunk<=observed.ships[1]);assert.ok(observed.ships[1]>observed.ships[0]);
 assert.ok(observed.sailors[0]<=loss.sailors&&loss.sailors<=observed.sailors[1]);assert.ok(observed.sailors[1]>observed.sailors[0]);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.naval.reports.find(r=>r.id===battle.id).observedLosses.senate,observed);
});
test('unarmed merchants do not create battles or damage an escorted warship',()=>{
 const s=newGrandGame('senate'),senate=s.naval.fleets.find(f=>f.id==='senate-adriatic'),caesar=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 senate.port=caesar.port=null;senate.zone=caesar.zone='adriatic';senate.ships={merchant:1};caesar.ships={merchant:1};senate.sailors=caesar.sailors=45;
 const before={seed:s.seed,experience:senate.experience,reports:s.naval.reports.length};
 resolveBattle(s,senate,caesar,'adriatic',()=>{});
 assert.equal(s.seed,before.seed);assert.equal(s.naval.reports.length,before.reports);assert.equal(senate.experience,before.experience);assert.equal(senate.hull,100);assert.equal(caesar.hull,100);
 s.naval.fleets=[senate,caesar];advanceNaval(s,()=>{});
 assert.equal(s.naval.reports.some(r=>r.kind==='battle'),false,'the monthly encounter loop must not fabricate a merchant battle');
 senate.ships={trireme:1};senate.sailors=180;senate.hull=40;
 resolveBattle(s,senate,caesar,'adriatic',()=>{});
 const report=s.naval.reports.at(-1);
 assert.equal(report.kind,'battle');assert.equal(report.winner,'senate');assert.equal(senate.hull,40);assert.equal(senate.ships.trireme,1);assert.deepEqual(report.losses[senate.id],{sunk:0,type:null,sailors:0});assert.ok(caesar.hull<100);
});
test('an uncrewed warship cannot fight with phantom sailors',()=>{
 const s=newGrandGame('senate'),senate=s.naval.fleets.find(f=>f.id==='senate-adriatic'),caesar=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 senate.port=caesar.port=null;senate.zone=caesar.zone='adriatic';senate.ships={trireme:1};caesar.ships={trireme:1};senate.sailors=180;caesar.sailors=0;
 resolveBattle(s,senate,caesar,'adriatic',()=>{});
 assert.equal(senate.hull,100);assert.equal(s.naval.reports.at(-1).winner,'senate');assert.ok(caesar.hull<100);
 caesar.sailors=1;caesar.hull=100;senate.hull=100;
 resolveBattle(s,senate,caesar,'adriatic',()=>{});
 assert.equal(senate.hull,100,'one sailor must not activate the full fixed-damage term');
});
test('naval reconnaissance can miss, observe approximately or evade a real encounter',()=>{
  const run=seed=>{const s=newGrandGame('senate'),scout=s.naval.fleets.find(f=>f.id==='senate-adriatic'),messages=[];scout.ships={light:3};scout.sailors=240;s.naval.fleets.find(f=>f.id==='caesar-adriatic').port=null;s.seed=seed;
  assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(orderFleet(s,'senate',scout.id,'recon','adriatic').ok,true);advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
  return {s,scout,messages,sighting:reportedHostileFleets(s,'senate').find(r=>r.owner==='caesar'),battle:s.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(scout.id))}};
 const missed=run(1400);assert.equal(missed.sighting,undefined);assert.equal(missed.battle,false);assert.equal(missed.scout.order,null);assert.ok(missed.scout.supply<100);
 assert.ok(missed.messages.some(m=>/enemies may still be present/.test(m.en)&&/敌人仍可能在附近/.test(m.zh)));
 const observed=run(1);assert.ok(observed.sighting);assert.equal(observed.battle,false);assert.equal(observed.sighting.source,'recon');assert.equal(observed.sighting.month,observed.s.month);assert.ok(observed.sighting.range[0]<observed.sighting.range[1]);
 assert.ok(observed.messages.some(m=>/fleet remains at sea/i.test(m.en)&&/舰队仍在海上/.test(m.zh)));
 assert.deepEqual(upgradeSave(JSON.parse(JSON.stringify(observed.s))).naval.intel.senate['caesar-adriatic'],observed.s.naval.intel.senate['caesar-adriatic']);
 const engaged=run(3);assert.equal(engaged.battle,true);
});
test('neutral fleet sightings stay private to intelligence until a current war makes them hostile',()=>{
 const s=newGrandGame('senate');s.naval.intel.senate={'egypt-grain':{owner:'egypt',zone:'alexandrian',year:s.year,month:s.month,source:'recon',range:[2,5],confidence:'medium'}};
 assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(reportedNonHostileFleets(s,'senate')[0].id,'egypt-grain');
 s.wars.push(['senate','egypt']);assert.equal(reportedHostileFleets(s,'senate')[0].id,'egypt-grain');assert.deepEqual(reportedNonHostileFleets(s,'senate'),[]);
 s.month+=5;assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.deepEqual(reportedNonHostileFleets(s,'senate'),[]);
 s.naval.intel.senate['egypt-grain'].month=s.month+1;assert.deepEqual(reportedHostileFleets(s,'senate'),[]);
});
test('reconnaissance of a neutral fleet produces a dated non-hostile report in both languages',()=>{
 const s=newGrandGame('senate'),scout=s.naval.fleets.find(f=>f.id==='senate-adriatic'),egypt=s.naval.fleets.find(f=>f.id==='egypt-grain'),messages=[];
 scout.ships={light:3};scout.sailors=240;s.naval.fleets.find(f=>f.id==='caesar-adriatic').zone='ligurian';egypt.zone='adriatic';egypt.port=null;s.seed=1;
 assert.equal(orderFleet(s,'senate',scout.id,'recon','adriatic').ok,true);advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(reportedNonHostileFleets(s,'senate')[0].id,'egypt-grain');
 assert.ok(messages.some(m=>/non-hostile fleet/.test(m.en)&&/非交战舰队/.test(m.zh)));
});
test('Egyptian grain requires merchant shipping and transfers bounded food and payment',()=>{
 const s=newGrandGame('senate'),route=s.naval.routes.find(r=>r.id==='egypt-italy');s.factions.senate.food=0;s.factions.egypt.food=60;const before=s.factions.senate.treasury;
 advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(route.last.amount,0);assert.equal(s.factions.senate.food,0);assert.equal(s.factions.egypt.food,56);assert.equal(s.naval.voyages.find(v=>v.routeId===route.id).cargo,4);
 s.month++;advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(s.factions.senate.food,0);
 s.month++;advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(s.factions.senate.food,0);
 s.month++;advanceNaval(s);assert.equal(route.last.reason,'delivered');assert.equal(route.last.amount,4);assert.equal(s.factions.senate.food,4);assert.ok(s.factions.senate.treasury<=before);
 const shipless=newGrandGame('senate');shipless.naval.fleets.find(f=>f.owner==='egypt').ships.merchant=0;shipless.factions.senate.food=0;advanceNaval(shipless);assert.equal(shipless.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');
});
test('a staffed market ship carries finite civic goods by sea and the destination consumes them once',()=>{
 let s=newGrandGame('senate');s.naval.pirates=[];
 for(const route of s.naval.routes)if(route.id!=='african-oil')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const route=s.naval.routes.find(r=>r.id==='african-oil'),city=s.regions.find(r=>r.id===route.to),starting=city.civicSatisfaction;
 assert.equal(s.naval.fleets.find(f=>f.id==='market-africa').ships.merchant,1);
 advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(s.naval.voyages.find(v=>v.routeId===route.id).cargo,2);
 s=upgradeSave(structuredClone(s));assert.equal(s.naval.fleets.filter(f=>f.id==='market-africa').length,1);
 for(let i=0;i<4&&s.naval.routes.find(r=>r.id===route.id).last.reason!=='delivered';i++){s.month++;advanceNaval(s)}
 const delivered=s.naval.routes.find(r=>r.id===route.id).last;
 assert.equal(delivered.amount,2);assert.equal(delivered.marketBenefit,2);assert.equal(delivered.paid,0);
 assert.equal(s.regions.find(r=>r.id===city.id).civicSatisfaction,starting+2);
 assert.match(tradeCard(s,s.naval.routes.find(r=>r.id===route.id),false),/Destination civic satisfaction \+2/);
 assert.match(tradeCard(s,s.naval.routes.find(r=>r.id===route.id),true),/目的港满意度 \+2/);
 s.regions.find(r=>r.id===city.id).civicSatisfaction=80;s.month++;advanceNaval(s);
 assert.equal(s.naval.routes.find(r=>r.id===route.id).last.reason,'stocked');
 assert.equal(s.naval.voyages.some(v=>v.routeId===route.id&&v.phase==='outbound'),false);
});
test('foreign market cargo transfers only paid treasury and raises the receiving city',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];
 s.naval.fleets=s.naval.fleets.filter(f=>f.id==='market-mauretania');
 for(const route of s.naval.routes)if(route.id!=='western-horses')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const route=s.naval.routes.find(r=>r.id==='western-horses'),city=s.regions.find(r=>r.id===route.to),before={buyer:s.factions.senate.treasury,seller:s.factions.mauretania.treasury,civic:city.civicSatisfaction};
 for(let i=0;i<8&&route.last?.reason!=='delivered';i++){if(i)s.month++;advanceNaval(s)}
 assert.equal(route.last.reason,'delivered');assert.ok(route.last.amount>0&&route.last.paid>0);
 assert.equal(s.factions.senate.treasury,before.buyer-route.last.paid);
 assert.equal(s.factions.mauretania.treasury,before.seller+route.last.paid);
 assert.equal(city.civicSatisfaction,before.civic+route.last.marketBenefit);
});
test('a wartime command reserves levy cash instead of buying optional foreign market goods',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];
 for(const route of s.naval.routes)if(route.id!=='western-horses')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const route=s.naval.routes.find(r=>r.id==='western-horses');
 s.factions.senate.treasury=25;advanceNaval(s);
 assert.equal(route.last.reason,'war-reserve');assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),false);
 s.month++;s.factions.senate.treasury=100;advanceNaval(s);
 assert.equal(route.last.reason,'enroute');assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),true);
});
test('a delivery remains in the monthly trade report when the city reaches its demand cap',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];
 for(const route of s.naval.routes)if(route.id!=='african-oil')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const city=s.regions.find(r=>r.id==='t016'),fleet=s.naval.fleets.find(f=>f.id==='market-africa'),route=s.naval.routes.find(r=>r.id==='african-oil');
 city.civicSatisfaction=78;fleet.ships.merchant=3;fleet.sailors=135;
 for(let i=0;i<3;i++){if(i)s.month++;advanceNaval(s)}
 assert.equal(city.civicSatisfaction,80);assert.equal(route.last.reason,'delivered');assert.equal(route.last.marketBenefit,2);
});
test('older saves receive missing market vessels once without duplicating existing hulls',()=>{
 let s=newGrandGame('senate');s.naval.version=2;s.naval.fleets=s.naval.fleets.filter(f=>!f.id.startsWith('market-'));
 s=upgradeSave(structuredClone(s));const ids=s.naval.fleets.filter(f=>f.id.startsWith('market-')).map(f=>f.id);
 assert.equal(s.naval.version,6);assert.deepEqual(ids.sort(),['market-africa','market-mauretania','market-narbo','market-t114']);
 s=upgradeSave(structuredClone(s));assert.deepEqual(s.naval.fleets.filter(f=>f.id.startsWith('market-')).map(f=>f.id).sort(),ids);
});
test('a saved Egyptian reserve separates civilian hulls once and delivers real grain',()=>{
 let s=newGrandGame('senate');s.naval.version=3;s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];
 const warship=s.naval.fleets.find(f=>f.id==='egypt-grain');warship.reserve=true;s.factions.senate.food=0;s.factions.egypt.food=60;
 s=upgradeSave(structuredClone(s));assert.equal(s.naval.version,6);
 const civilian=s.naval.fleets.find(f=>f.owner==='egypt'&&f.id!=='egypt-grain'&&(f.ships.merchant||0)>0);
 assert.ok(civilian);assert.equal(civilian.ships.merchant,3);assert.equal(s.naval.fleets.find(f=>f.id==='egypt-grain').ships.merchant,0);
 s=upgradeSave(structuredClone(s));assert.equal(s.naval.fleets.filter(f=>f.owner==='egypt'&&(f.ships.merchant||0)>0).length,1);
 advanceNaval(s);assert.equal(s.naval.routes[0].last.reason,'enroute');assert.equal(s.naval.voyages[0].fleetId,civilian.id);
 s=upgradeSave(structuredClone(s));const delivered=tradeArrival(s,'egypt-italy');
 assert.equal(delivered.amount,4);assert.equal(s.factions.senate.food,4);assert.equal(s.factions.egypt.food,56);
 assert.equal(s.naval.fleets.filter(f=>f.owner==='egypt').reduce((sum,f)=>sum+(f.ships.merchant||0),0)+s.naval.voyages.filter(v=>v.vesselOwner==='egypt').length,3);
});
test('an uncrewed merchant hull cannot create sailors when trade departs',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.id==='egypt-grain');s.factions.senate.food=0;fleet.sailors=0;
 advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');assert.equal(s.naval.voyages.some(v=>v.routeId==='egypt-italy'),false);
});
test('merchant cargo and its hull survive reload, arrive by sea, and return without duplication',()=>{
 let s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes[0],fleet=s.naval.fleets.find(f=>f.id==='egypt-grain');fleet.ships.merchant=1;
 advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(fleet.ships.merchant,0);assert.equal(s.factions.egypt.food,56);assert.equal(s.factions.senate.food,0);
 assert.match(tradeCard(s,route,false),/Cargo at sea 4/);assert.match(tradeCard(s,route,true),/在途货物 4/);
 s=upgradeSave(structuredClone(s));assert.equal(s.naval.version,6);assert.equal(s.naval.voyages[0].cargo,4);assert.equal(s.naval.voyages[0].zone,'alexandrian');
 const delivered=tradeArrival(s,route.id);assert.equal(delivered.amount,4);assert.equal(delivered.paid,4*delivered.unitPrice);assert.equal(s.factions.senate.food,4);assert.equal(s.factions.egypt.food,56);
 assert.equal(toggleTradeRoute(s,'senate',route.id).paused,true);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.filter(v=>v.routeId===route.id).length,0);assert.equal(s.naval.fleets.reduce((sum,f)=>sum+(f.owner==='egypt'?f.ships.merchant||0:0),0)+s.naval.voyages.filter(v=>v.vesselOwner==='egypt').length,1);
 assert.equal(s.factions.senate.food,4);assert.equal(s.factions.egypt.food,56);
});
test('a raid in a later sea zone takes loaded cargo, not a second draw from the seller',()=>{
 const s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const caesar=s.naval.fleets.find(f=>f.owner==='caesar');caesar.zone='eastern';caesar.port=null;
 advanceNaval(s);const loaded=s.naval.voyages[0];assert.equal(loaded.zone,'alexandrian');assert.equal(s.factions.egypt.food,56);
 assert.equal(orderFleet(s,'caesar',caesar.id,'raid','egypt-italy').ok,true);s.month++;advanceNaval(s);
 const last=s.naval.routes[0].last;assert.equal(last.reason,'raid');assert.ok(last.captured>0);assert.equal(s.factions.egypt.food,56);assert.equal(s.factions.senate.food,0);assert.equal(loaded.cargo+last.captured,4);assert.equal(loaded.phase,'return');
});
test('pirates in a later sea zone seize only cargo aboard the merchant voyage',()=>{
 const s=newGrandGame('senate');s.seed=2175734977;s.factions.senate.food=0;s.factions.egypt.food=60;
 s.naval.pirates=s.naval.pirates.filter(p=>p.id==='cilician-raiders');const pirate=s.naval.pirates[0];pirate.zone='eastern';pirate.pressure=70;
 advanceNaval(s);const voyage=s.naval.voyages.find(v=>v.routeId==='egypt-italy');assert.equal(voyage.zone,'alexandrian');assert.equal(s.factions.egypt.food,56);
 s.month++;advanceNaval(s);const last=s.naval.routes.find(r=>r.id==='egypt-italy').last;
 assert.equal(last.reason,'piracy');assert.equal(last.zone,'eastern');assert.equal(last.captured,4);assert.equal(pirate.cargo.grain,4);
 assert.equal(s.factions.egypt.food,56);assert.equal(s.factions.senate.food,0);assert.equal(voyage.cargo,0);assert.equal(voyage.phase,'return');
});
test('pausing imports after departure returns undelivered cargo without charging the buyer',()=>{
 const s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes[0];advanceNaval(s);assert.equal(s.factions.egypt.food,56);assert.equal(toggleTradeRoute(s,'senate',route.id).paused,true);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 assert.equal(route.last.reason,'closed');assert.equal(route.last.paid,0);assert.equal(s.factions.senate.food,0);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 assert.equal(s.factions.egypt.food,60);assert.equal(s.naval.voyages.filter(v=>v.routeId===route.id).length,0);
});
test('a merchant withdraws from a sustained blockade instead of paying upkeep offshore forever',()=>{
 let s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes[0],enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 advanceNaval(s);assert.equal(s.naval.voyages.filter(v=>v.routeId===route.id).length,1);
 enemy.zone=portZone(route.to);enemy.port=null;enemy.reserve=false;enemy.mobilizing=0;enemy.order={kind:'blockade',target:route.to,targetPort:route.to,path:[]};
 for(let i=0;i<10&&s.naval.voyages.find(v=>v.routeId===route.id)?.blockedMonths!==1;i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.find(v=>v.routeId===route.id)?.blockedMonths,1);assert.equal(route.last.reason,'blockade');assert.equal(s.factions.senate.food,0);
 s=upgradeSave(structuredClone(s));s.month++;advanceNaval(s);
 assert.equal(s.naval.voyages.find(v=>v.routeId===route.id)?.phase,'return');assert.equal(s.naval.routes.find(r=>r.id===route.id).last.reason,'blockade');
 for(let i=0;i<10&&s.naval.voyages.some(v=>v.routeId===route.id);i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),false);assert.equal(s.factions.egypt.food,60);assert.equal(s.factions.senate.food,0);
});
test('lifting a short blockade lets the waiting merchant deliver its saved cargo once',()=>{
 const s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes[0],enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');s.naval.fleets.find(f=>f.id==='egypt-grain').ships.merchant=1;advanceNaval(s);
 enemy.zone=portZone(route.to);enemy.port=null;enemy.reserve=false;enemy.mobilizing=0;enemy.order={kind:'blockade',target:route.to,targetPort:route.to,path:[]};
 for(let i=0;i<10&&s.naval.voyages.find(v=>v.routeId===route.id)?.blockedMonths!==1;i++){s.month++;advanceNaval(s)}
 const voyage=s.naval.voyages.find(v=>v.routeId===route.id);assert.equal(voyage?.blockedMonths,1);
 enemy.order=null;s.month++;advanceNaval(s);
 assert.equal(route.last.reason,'delivered');assert.equal(route.last.amount,4);assert.equal(voyage.blockedMonths,0);
 assert.equal(s.factions.senate.food,4);assert.equal(s.factions.egypt.food,56);
});
test('a captured destination recalls merchant cargo even if its harbor is blockaded',()=>{
 const s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes[0];advanceNaval(s);assert.equal(s.naval.voyages.filter(v=>v.routeId===route.id).length,1);
 s.regions.find(r=>r.id===route.to).owner='caesar';
 for(let i=0;i<10&&s.naval.voyages.find(v=>v.routeId===route.id)?.phase!=='return';i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.find(v=>v.routeId===route.id)?.phase,'return');assert.equal(route.last.reason,'closed');assert.equal(s.factions.senate.food,0);
});
test('a merchant return diverts from a captured origin harbor with its cargo intact',()=>{
 const s=newGrandGame('egypt');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes.find(r=>r.id==='egypt-italy');advanceNaval(s);assert.ok(s.naval.voyages.some(v=>v.routeId===route.id));
 route.pausedBy=['senate'];s.regions.find(r=>r.id==='t091').owner='egypt';s.regions.find(r=>r.id==='egypt').owner='caesar';
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 const voyage=s.naval.voyages.find(v=>v.routeId===route.id);assert.equal(voyage.phase,'return');assert.equal(voyage.returnPort,'t091');assert.equal(s.factions.senate.food,0);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),false);assert.equal(s.factions.egypt.food,60);
 assert.ok(s.naval.fleets.some(f=>f.owner==='egypt'&&f.zone==='aegean'&&(f.ships.merchant||0)>0));
});
test('a buyer-owned merchant returns refused goods to the seller before sailing home',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];s.naval.fleets=s.naval.fleets.filter(f=>!f.id.startsWith('market-'));s.factions.senate.food=0;s.factions.egypt.food=60;
 const sellerFleet=s.naval.fleets.find(f=>f.id==='egypt-grain');sellerFleet.ships.merchant=0;
 const buyerFleet={...structuredClone(sellerFleet),id:'senate-trader',owner:'senate',ships:{merchant:1},sailors:45,zone:'alexandrian',port:null,order:null};s.naval.fleets.push(buyerFleet);
 const route=s.naval.routes.find(r=>r.id==='egypt-italy');advanceNaval(s);assert.equal(s.naval.voyages.find(v=>v.routeId===route.id).vesselOwner,'senate');assert.equal(s.factions.egypt.food,56);
 assert.equal(toggleTradeRoute(s,'senate',route.id).paused,true);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 let voyage=s.naval.voyages.find(v=>v.routeId===route.id);assert.equal(voyage.phase,'return');assert.equal(voyage.returnPort,'egypt');
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 voyage=s.naval.voyages.find(v=>v.routeId===route.id);assert.equal(s.factions.egypt.food,60);assert.equal(voyage.cargo,0);assert.notEqual(voyage.returnPort,'egypt');
 for(let i=0;i<6&&s.naval.voyages.some(v=>v.routeId===route.id);i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),false);assert.equal(s.naval.fleets.reduce((sum,f)=>sum+(f.owner==='senate'?f.ships.merchant||0:0),0)+s.naval.voyages.filter(v=>v.vesselOwner==='senate').length,1);
});
test('trade prices respond to scarcity and charge for the quantity delivered',()=>{
 const run=food=>{const s=newGrandGame('senate');s.factions.senate.food=food;s.factions.egypt.food=80;advanceNaval(s);const route=s.naval.routes.find(r=>r.id==='egypt-italy');if(route.last.reason!=='enroute')return route.last;s.month++;return tradeArrival(s,'egypt-italy')};
 const scarce=run(10),ample=run(80);assert.equal(scarce.reason,'delivered');assert.equal(scarce.amount,4);assert.ok(scarce.unitPrice>ample.unitPrice);assert.equal(scarce.paid,scarce.amount*scarce.unitPrice);
 const short=newGrandGame('senate');short.regions.find(r=>r.id==='africa').owner='egypt';const egyptian=short.naval.fleets.find(f=>f.owner==='egypt');egyptian.zone='african';egyptian.port=null;advanceNaval(short);assert.ok(ample.unitPrice>short.naval.routes.find(r=>r.id==='africa-sicily').last.unitPrice);
 const cashPoor=newGrandGame('senate');cashPoor.factions.senate.food=10;cashPoor.factions.senate.treasury=40;
 for(const route of cashPoor.naval.routes)if(route.id!=='egypt-italy')route.pausedBy=[cashPoor.regions.find(r=>r.id===route.from).owner];
 const partial=tradeArrival(cashPoor,'egypt-italy');assert.ok(partial.amount>0&&partial.amount<4);assert.equal(partial.paid,partial.amount*partial.unitPrice);
});
test('grain imports stop charging an already provisioned command and fill only a real shortfall',()=>{
 const stocked=newGrandGame('senate');stocked.factions.senate.food=25;advanceNaval(stocked);
 const route=stocked.naval.routes.find(r=>r.id==='egypt-italy');
 assert.equal(route.last.reason,'stocked');assert.equal(route.last.amount,0);assert.equal(route.last.paid,0);
 const needy=newGrandGame('senate');needy.factions.senate.food=15;const delivery=tradeArrival(needy,'egypt-italy');
 assert.equal(delivery.reason,'delivered');assert.equal(delivery.amount,3);
 assert.equal(needy.factions.senate.food,18);assert.equal(delivery.paid,3*delivery.unitPrice);
});
test('an outnumbered grain buyer preserves a levy fund unless food is critical',()=>{
 const setup=food=>{const s=newGrandGame('egypt');s.regions.find(r=>r.id==='t016').owner='caesar';s.factions.caesar.treasury=25;s.factions.caesar.food=food;
  assert.equal(reserveFleet(s,'caesar','caesar-adriatic').ok,true);advanceNaval(s);return s};
 const stable=setup(15),deferred=stable.naval.routes.find(r=>r.id==='egypt-italy').last;
 assert.equal(deferred.reason,'war-reserve');assert.equal(deferred.amount,0);assert.equal(deferred.paid,0);
 const hungry=setup(4),delivery=tradeArrival(hungry,'egypt-italy');
 assert.equal(delivery.reason,'delivered');assert.ok(delivery.amount>0);assert.ok(delivery.paid>0);
});
test('a ruler may pause and resume a real sea import without paying for paused cargo',()=>{
 const s=newGrandGame('senate'),route=s.naval.routes.find(r=>r.id==='egypt-italy');
 s.factions.senate.food=0;s.factions.egypt.food=60;s.naval.pirates=[];
 assert.equal(toggleTradeRoute(s,'caesar',route.id).ok,false);
 assert.equal(toggleTradeRoute(s,'senate','missing').ok,false);
 assert.match(tradeCard(s,route,false),/PAUSE IMPORTS/);
 assert.match(tradeCard(s,route,true),/暂停进口/);
 assert.equal(toggleTradeRoute(s,'senate',route.id).paused,true);
 assert.match(tradeCard(s,route,false),/RESUME ROUTE/);
 const stability=s.factions.senate.stability;
 advanceNaval(s);
 assert.equal(route.last.reason,'paused');assert.equal(route.last.amount,0);assert.equal(route.last.paid,0);
 assert.equal(s.factions.senate.food,0);assert.equal(s.factions.senate.stability,stability);
 assert.equal(nationalBudget(s,'senate').tradeImportPaid,s.naval.routes.filter(r=>r.id!==route.id&&r.last?.buyer==='senate'&&r.last.seller!=='senate').reduce((sum,r)=>sum+r.last.paid,0));
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(loaded.naval.routes.find(r=>r.id===route.id).pausedBy,['senate']);
 assert.equal(toggleTradeRoute(loaded,'senate',route.id).paused,false);
 const completed=tradeArrival(loaded,route.id);
 assert.equal(completed.reason,'delivered');assert.ok(completed.amount>0&&completed.paid>0);
 assert.ok(nationalBudget(loaded,'senate').tradeImportPaid>=completed.paid);
 assert.match(budgetHtml(loaded,'en'),/Maritime imports paid this month/);
 assert.match(budgetHtml(loaded,'zh'),/本月已付海运进口费/);
 const exporter=newGrandGame('egypt'),exportRoute=exporter.naval.routes.find(r=>r.id===route.id);
 assert.match(tradeCard(exporter,exportRoute,false),/PAUSE EXPORTS/);
 assert.equal(toggleTradeRoute(exporter,'egypt',route.id).paused,true);
 advanceNaval(exporter);assert.equal(exportRoute.last.reason,'paused');
});
test('taking a foreign trade port does not reveal its previous owner’s shipment',()=>{
 const s=newGrandGame('caesar'),route=s.naval.routes.find(r=>r.id==='egypt-italy');
 s.factions.senate.food=0;s.naval.pirates=[];advanceNaval(s);
 assert.equal(route.last.buyer,'senate');assert.equal(route.last.seller,'egypt');
 s.regions.find(r=>r.id==='t016').owner='caesar';
 const en=tradeCard(s,route,false),zh=tradeCard(s,route,true);
 assert.match(en,/Awaiting first voyage under your control/);assert.match(zh,/等待己方首次航行/);
 assert.doesNotMatch(en,/Unit price|Paid|Route security \d/);
 assert.doesNotMatch(zh,/单价|实际付款|航路安全 \d/);
 assert.equal(nationalBudget(s,'caesar').tradeImportPaid,0);
 delete route.last.buyer;delete route.last.seller;
 assert.doesNotMatch(tradeCard(s,route,false),/Unit price|Paid/,'old saves without shipment provenance stay private');
});
test('foreign trade routes keep shipment and security figures private',()=>{
 const s=newGrandGame('senate'),foreign={from:'egypt',to:'mauretania',good:'grain',volume:9,last:{amount:7,security:99,reason:'delivered',unitPrice:4,paid:28}};
 for(const zh of [false,true]){const html=tradeCard(s,foreign,zh);assert.match(html,zh?/外国商路/:/Foreign route/);assert.doesNotMatch(html,/99|28|计划货量|Planned volume/)}
 const own={from:'egypt',to:'t016',good:'grain',volume:'<img src=x>',last:{amount:'<svg onload=alert(1)>',security:99,reason:'delivered'}};
 assert.doesNotMatch(tradeCard(s,own,false),/<img|<svg/);
});
test('a hostile trade raid physically transfers captured cargo to its fleet owner',()=>{
 const s=newGrandGame('senate'),raider=s.naval.fleets.find(f=>f.owner==='caesar');s.factions.senate.food=0;raider.zone='alexandrian';raider.port=null;
 assert.equal(orderFleet(s,'caesar',raider.id,'raid','egypt-italy').ok,true);
 const relationKey='caesar:egypt',before={egypt:s.factions.egypt.food,caesar:s.factions.caesar.food,senate:s.factions.senate.food,relation:s.relations[relationKey]??0};advanceNaval(s);
 const result=s.naval.routes.find(r=>r.id==='egypt-italy').last;
 assert.equal(result.reason,'raid');assert.ok(result.captured>0);assert.equal(result.amount,0);assert.equal(result.paid,0);
 assert.equal(s.factions.egypt.food,before.egypt-result.captured);assert.equal(s.factions.caesar.food,before.caesar+result.captured);assert.equal(s.factions.senate.food,before.senate);
 assert.ok(s.naval.reports.some(r=>r.kind==='trade-raid'&&r.captured===result.captured));
 assert.equal(s.relations[relationKey],before.relation-6);
 assert.ok(s.naval.reports.some(r=>r.kind==='trade-incident'&&r.owner==='egypt'&&r.raider==='caesar'&&r.captured===result.captured));
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).relations[relationKey],before.relation-6);
});
test('a neutral fleet cannot raid commerce, and a saved raid stops when war ends',()=>{
 const s=newGrandGame('senate'),neutral={...s.naval.fleets.find(f=>f.owner==='senate'),id:'neutral-raider',owner:'numidia',zone:'alexandrian',port:null,order:null};
 s.naval.fleets.push(neutral);
 assert.deepEqual(orderFleet(s,'numidia',neutral.id,'raid','egypt-italy'),{ok:false,reason:'war'});
 assert.deepEqual(orderFleet(s,'senate','senate-adriatic','raid','egypt-italy'),{ok:false,reason:'war'});
 const hostile=s.naval.fleets.find(f=>f.owner==='caesar');hostile.zone='alexandrian';hostile.port=null;
 assert.equal(orderFleet(s,'caesar',hostile.id,'raid','egypt-italy').ok,true);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));loaded.wars=[];
 advanceNaval(loaded);
 assert.equal(loaded.naval.fleets.find(f=>f.id===hostile.id).order,null);
 assert.notEqual(loaded.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'raid');
 assert.equal(loaded.naval.reports.some(r=>r.kind==='trade-raid'),false);
});
test('AI can order a real army transport when a hostile coast is reachable by sea',()=>{
 const s=newGrandGame('caesar');for(const r of s.regions)r.owner='egypt';s.regions.find(r=>r.id==='italiaS').owner='senate';s.regions.find(r=>r.id==='t075').owner='caesar';s.armies=s.armies.filter(a=>a.id==='italy');s.armies[0].region='italiaS';
 aiTurn(s,'senate');assert.equal(s.armies[0].move?.sea,true);assert.equal(s.armies[0].move?.to,'t075');assert.equal(s.naval.fleets.find(f=>f.owner==='senate').order?.armyId,'italy');
});
test('same-zone Adriatic transport remains offshore and committed until landing',()=>{
 const setup=()=>{const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');army.region='italiaS';army.men=5200;s.regions.find(r=>r.id==='t075').owner='caesar';enemy.zone=portZone('italiaS');enemy.port=null;return s};
 const exposed=setup();assert.equal(moveArmy(exposed,'italy','t075').ok,true);
 assert.deepEqual(exposed.naval.fleets.find(f=>f.id==='senate-adriatic').order.path,['adriatic']);
 advanceNaval(exposed);
 assert.equal(exposed.naval.fleets.find(f=>f.id==='senate-adriatic').port,null);
 assert.ok(exposed.naval.reports.some(r=>r.kind==='battle'&&r.zone==='adriatic'&&r.participants.includes('senate-adriatic')),'an enemy fleet in the crossing zone can engage the transport');
 const safe=setup(),hostile=safe.naval.fleets.find(f=>f.owner==='caesar');safe.naval.fleets=safe.naval.fleets.filter(f=>f.owner==='senate');assert.equal(moveArmy(safe,'italy','t075').ok,true);
 advanceNaval(safe);const loaded=upgradeSave(JSON.parse(JSON.stringify(safe))),fleet=loaded.naval.fleets.find(f=>f.id==='senate-adriatic');
 assert.equal(fleet.port,null);assert.equal(fleet.order?.kind,'transport');assert.equal(loaded.armies.find(a=>a.id==='italy').move.transportReady,false);
 advanceNaval(loaded);assert.equal(fleet.port,null);assert.equal(fleet.order?.kind,'transport');assert.equal(fleet.order?.arrived,true);assert.equal(loaded.armies.find(a=>a.id==='italy').move.transportReady,true);
 assert.equal(orderFleet(loaded,'senate',fleet.id,'blockade','cisalpine').ok,false,'the player cannot send embarked troops on another mission');
 fleet.supply=50;fleet.hull=60;loaded.regions.find(r=>r.id==='t075').buildings.push('shipyard');
 advanceNaval(loaded);assert.equal(fleet.port,null);assert.equal(fleet.supply,42,'an enemy harbor cannot provision the convoy');assert.equal(fleet.hull,60,'an enemy shipyard cannot repair it');
 assert.equal(fleet.order?.kind,'transport','the convoy remains assigned until the army resolves its landing');
 loaded.naval.fleets.push({...structuredClone(hostile),port:null,zone:fleet.zone});
 advanceNaval(loaded);
 assert.ok(loaded.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(fleet.id)),'a hostile fleet can still catch the waiting transport offshore');
});
test('imported saves reattach convoys that were freed at a hostile harbor',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),convoy=s.naval.fleets.find(f=>f.id==='senate-adriatic');
 unit.region='italiaS';s.regions.find(r=>r.id==='t075').owner='caesar';s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='senate');
 assert.equal(moveArmy(s,unit.id,'t075').ok,true);advanceNaval(s);advanceNaval(s);
 assert.equal(unit.move.transportReady,true);
 convoy.port='t075';convoy.order={kind:'blockade',target:'cisalpine',targetPort:'cisalpine',path:[]};
 const loaded=upgradeSave(structuredClone(s)),ship=loaded.naval.fleets.find(f=>f.id===convoy.id),army=loaded.armies.find(a=>a.id===unit.id);
 assert.equal(ship.port,null);assert.equal(ship.order?.kind,'transport');assert.equal(ship.order?.arrived,true);assert.equal(ship.order?.armyId,army.id);
 assert.equal(orderFleet(loaded,'senate',ship.id,'patrol','adriatic').ok,false);
 for(let i=0;i<8&&army.move;i++)tick(loaded);
 assert.equal(army.region,'t075');assert.equal(army.move,null);assert.equal(ship.order,null);assert.equal(ship.port,'t075','ships dock only after their army occupies the harbor');
 convoy.port=null;convoy.zone='ionian';convoy.order={kind:'patrol',target:'ionian',path:[]};
 const diverted=upgradeSave(structuredClone(s)),divertedArmy=diverted.armies.find(a=>a.id===unit.id),divertedShip=diverted.naval.fleets.find(f=>f.id===convoy.id);
 assert.equal(divertedArmy.move.transportReady,false,'a convoy on another sea must sail back before landing');
 assert.equal(divertedShip.order?.kind,'transport');assert.deepEqual(divertedShip.order.path,['adriatic']);
 advanceNaval(diverted);advanceNaval(diverted);
 assert.equal(divertedArmy.move.transportReady,true);assert.equal(divertedShip.port,null);
});
test('survivors of a failed sea landing return aboard their real convoy',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),defender=s.armies.find(a=>a.id==='xiii'),convoy=s.naval.fleets.find(f=>f.id==='senate-adriatic'),target=s.regions.find(r=>r.id==='t075');
 unit.region='italiaS';defender.region=target.id;defender.men=8000;defender.morale=80;target.owner='caesar';
 s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='senate');
 assert.equal(moveArmy(s,unit.id,target.id).ok,true);advanceNaval(s);advanceNaval(s);
 assert.equal(convoy.order?.arrived,true);assert.equal(convoy.port,null);
 assert.equal(resolveLandBattle(s,unit,defender,target),false);
 assert.equal(unit.region,'italiaS','a failed landing does not teleport the army into enemy land');
 assert.equal(unit.move?.returning,true);assert.equal(convoy.order?.kind,'return');assert.equal(convoy.order?.armyId,unit.id);
 assert.equal(previewMarch(s,unit.id,target.id).ok,false,'troops aboard a return voyage cannot march');
 const loaded=upgradeSave(structuredClone(s)),returning=loaded.armies.find(a=>a.id===unit.id),ship=loaded.naval.fleets.find(f=>f.id===convoy.id);
 assert.equal(returning.move?.returning,true);advanceNaval(loaded);
 assert.equal(returning.move,null);assert.equal(returning.region,'italiaS');assert.equal(ship.port,'italiaS');assert.equal(ship.order,null);
});
test('a defeated convoy aborts the landing even while its transports still have capacity',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),convoy=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 unit.region='italiaS';unit.men=5200;s.regions.find(r=>r.id==='t075').owner='caesar';
 assert.equal(moveArmy(s,unit.id,'t075').ok,true);
 assert.equal(orderFleet(s,'caesar',enemy.id,'intercept','adriatic').ok,true);
 enemy.ships={quinquereme:4,trireme:2};enemy.sailors=1500;enemy.hull=100;enemy.morale=80;enemy.supply=100;s.seed=83;
 advanceNaval(s);
 const battle=s.naval.reports.find(r=>r.kind==='battle'&&r.zone==='adriatic');
 assert.equal(battle?.winner,'caesar');
 assert.equal(convoy.ships.transport,2,'no transport sank in this encounter');
 assert.equal(unit.region,'italiaS');assert.equal(unit.move?.returning,true);assert.equal(unit.move?.transportReady,false);assert.ok(unit.men<5200&&unit.men>4000);
 assert.equal(previewMarch(s,unit.id,'t075').ok,false,'survivors are still aboard and cannot receive another march');
 assert.equal(convoy.order?.kind,'return');assert.equal(convoy.order?.targetPort,'italiaS');
 assert.equal(battle.transportDisruptions[convoy.id].casualties,5200-unit.men);
 assert.equal(battle.transportDisruptions[convoy.id].reason,'defeat');
 const restored=upgradeSave(structuredClone(s));
 assert.deepEqual(restored.naval.reports.find(r=>r.id===battle.id).transportDisruptions,battle.transportDisruptions);
 assert.equal(restored.armies.find(a=>a.id===unit.id).move?.returning,true);
 advanceNaval(restored);assert.equal(restored.naval.fleets.find(f=>f.id===convoy.id).port,'italiaS');assert.equal(restored.armies.find(a=>a.id===unit.id).move,null);
 for(const [lang,label] of [['en','returning by ship'],['zh','正乘船返回']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:restored,lang,root,section:'reports'});
  assert.match(content.innerHTML,new RegExp(label));assert.match(content.innerHTML,lang==='en'?/Army casualties/:/陆军伤亡/);
 }
 restored.player='caesar';const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
 renderNavalPanel({state:restored,lang:'en',root,section:'reports'});
 assert.doesNotMatch(content.innerHTML,/Army casualties/,'the opponent must not receive exact embarked-army losses');
});
test('a disrupted troop convoy diverts after losing its home port and unloads only when docked',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),convoy=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 unit.region='italiaS';unit.men=5200;s.regions.find(r=>r.id==='t075').owner='caesar';
 assert.equal(moveArmy(s,unit.id,'t075').ok,true);
 assert.equal(orderFleet(s,'caesar',enemy.id,'intercept','adriatic').ok,true);
 enemy.ships={quinquereme:4,trireme:2};enemy.sailors=1500;enemy.hull=100;enemy.morale=80;enemy.supply=100;s.seed=83;
 advanceNaval(s);
 assert.equal(unit.move?.returning,true);
 convoy.zone='ionian';convoy.order.path=seaRoute('ionian',portZone('italiaS'));
 s.regions.find(r=>r.id==='italiaS').owner='caesar';
 advanceNaval(s);
 const destination=convoy.order?.targetPort||unit.region;
 assert.notEqual(destination,'italiaS');
 assert.ok(unit.move?.returning||unit.region===destination,'the army remains aboard until docking at the diversion port');
 for(let month=0;month<12&&unit.move;month++)advanceNaval(s);
 assert.equal(unit.move,null);assert.equal(unit.region,destination);
 assert.equal(s.regions.find(r=>r.id===destination).owner,'senate');
});
test('a returning troop convoy waits offshore when no friendly harbor is available',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),convoy=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 unit.region='italiaS';unit.men=5200;s.regions.find(r=>r.id==='t075').owner='caesar';
 assert.equal(moveArmy(s,unit.id,'t075').ok,true);
 assert.equal(orderFleet(s,'caesar',enemy.id,'intercept','adriatic').ok,true);
 enemy.ships={quinquereme:4,trireme:2};enemy.sailors=1500;enemy.hull=100;enemy.morale=80;enemy.supply=100;s.seed=83;
 advanceNaval(s);
 assert.equal(unit.move?.returning,true);
 s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='senate');
 for(const port of s.regions.filter(r=>r.owner==='senate'&&r.port))port.owner='caesar';
 advanceNaval(s);
 assert.equal(unit.move?.returning,true);assert.equal(unit.move?.to,null);
 assert.equal(convoy.port,null);assert.equal(convoy.order?.targetPort,null);
 assert.equal(previewMarch(s,unit.id,'t075').ok,false);
 s.regions.find(r=>r.id==='italiaS').owner='senate';
 advanceNaval(s);
 assert.equal(unit.move,null);assert.equal(unit.region,'italiaS');
});
test('the loss of every troop transport removes its embarked army and records all casualties',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),convoy=s.naval.fleets.find(f=>f.id==='senate-adriatic'),enemy=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 unit.region='italiaS';unit.men=5000;s.regions.find(r=>r.id==='t075').owner='caesar';
 assert.equal(moveArmy(s,unit.id,'t075').ok,true);
 convoy.port=null;convoy.ships={transport:1};convoy.sailors=100;convoy.hull=8;
 enemy.port=null;enemy.zone=convoy.zone;enemy.ships={quinquereme:4};enemy.sailors=1600;enemy.hull=100;s.seed=83;
 resolveBattle(s,convoy,enemy,convoy.zone,()=>{});
 const outcome=s.naval.reports.find(r=>r.kind==='battle').transportDisruptions[convoy.id];
 assert.equal(outcome.reason,'lost');assert.equal(outcome.casualties,5000);
 assert.equal(unit.men,0);assert.equal(unit.move,null);assert.equal(convoy.order,null);
});
test('mutiny keeps surviving troops aboard until the convoy returns through a save reload',()=>{
 const base=newGrandGame('senate'),unit=base.armies.find(a=>a.id==='italy'),convoy=base.naval.fleets.find(f=>f.id==='senate-adriatic');
 base.naval.fleets=base.naval.fleets.filter(f=>f.owner==='senate');unit.region='italiaS';unit.men=5200;base.regions.find(r=>r.id==='t075').owner='caesar';
 assert.equal(moveArmy(base,unit.id,'t075').ok,true);
 convoy.port=null;convoy.zone='ionian';convoy.order.path=[];convoy.morale=15;base.year=-48;
 let s,mutiny;
 for(let seed=1;seed<300&&!mutiny;seed++){
  const candidate=structuredClone(base);candidate.seed=seed;advanceNaval(candidate);
  mutiny=candidate.naval.reports.find(r=>r.kind==='mutiny'&&r.transportDisruptions?.[convoy.id]);
  if(mutiny)s=candidate;
 }
 assert.ok(mutiny,'a deterministic mutiny interrupts the embarked army');
 const embarked=s.armies.find(a=>a.id===unit.id),fleet=s.naval.fleets.find(f=>f.id===convoy.id);
 assert.equal(embarked.move?.returning,true);assert.equal(fleet.port,null);
 assert.equal(previewMarch(s,unit.id,'t075').ok,false);
 const restored=upgradeSave(structuredClone(s)),restoredArmy=restored.armies.find(a=>a.id===unit.id);
 for(let month=0;month<12&&restoredArmy.move;month++)advanceNaval(restored);
 assert.equal(restoredArmy.move,null);assert.equal(restoredArmy.region,'italiaS');
 for(const [lang,label] of [['en','A mutiny disrupted the troop voyage'],['zh','哗变中断运兵行动']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:restored,lang,root,section:'reports'});assert.match(content.innerHTML,new RegExp(label));
 }
});
test('AI stages a transport fleet at an isolated army port and waits for embarkation',()=>{
 const setup=()=>{
  const s=newGrandGame('caesar');for(const r of s.regions)r.owner='egypt';
  for(const id of ['italiaS','epirus'])s.regions.find(r=>r.id===id).owner='senate';
  s.regions.find(r=>r.id==='t075').owner='caesar';
  s.armies=s.armies.filter(a=>a.id==='italy');s.armies[0].region='italiaS';
  s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='senate');
  const fleet=s.naval.fleets[0];fleet.port='epirus';fleet.zone=portZone('epirus');fleet.reserve=false;fleet.order=null;
  s.factions.senate.treasury=200;return s;
 };
 const warned=setup();warned.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:portZone('epirus'),year:warned.year,month:warned.month,range:[8,12],confidence:'high'}};
 advanceNaval(warned);
 assert.notEqual(warned.naval.fleets[0].order?.targetPort,'italiaS','a strong reported hostile fleet blocks staging');
 const unescorted=setup();unescorted.naval.fleets[0].ships={transport:4};unescorted.naval.fleets[0].sailors=280;
 unescorted.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:portZone('epirus'),year:unescorted.year,month:unescorted.month,range:[3,5],confidence:'medium'}};
 advanceNaval(unescorted);
 assert.notEqual(unescorted.naval.fleets[0].order?.targetPort,'italiaS','transport hulls cannot count as escorts against a dated threat');
 const cashPoor=setup();cashPoor.factions.senate.treasury=25;advanceNaval(cashPoor);
 assert.notEqual(cashPoor.naval.fleets[0].order?.targetPort,'italiaS','a fleet without a funded voyage stays available for reserve');
 const afloat=setup();afloat.naval.fleets[0].port=null;advanceNaval(afloat);
 assert.equal(afloat.naval.fleets[0].order?.targetPort,'italiaS','an idle fleet at sea can also meet the army');
 const contestedLanding=setup();contestedLanding.naval.fleets[0].port='italiaS';contestedLanding.naval.fleets[0].zone=portZone('italiaS');
 contestedLanding.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:'adriatic',year:contestedLanding.year,month:contestedLanding.month,source:'recon',range:[4,7],confidence:'medium'}};
 aiTurn(contestedLanding,'senate');
 assert.notEqual(contestedLanding.armies[0].move?.sea,true,'an AI army waits instead of boarding into a reported superior hostile fleet');
 const s=setup();advanceNaval(s);
 assert.equal(s.naval.fleets[0].order?.kind,'return');
 assert.equal(s.naval.fleets[0].order?.targetPort,'italiaS');
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s))),fleet=loaded.naval.fleets[0];
 for(let i=0;i<8&&fleet.port!=='italiaS';i++)advanceNaval(loaded);
 assert.equal(fleet.port,'italiaS');
 assert.equal(fleet.order,null,'the fleet waits for the army instead of taking a new patrol order');
 aiTurn(loaded,'senate');
 assert.equal(loaded.armies[0].move?.sea,true);
 assert.equal(fleet.order?.kind,'transport');
 assert.equal(fleet.order?.armyId,'italy');
 const live=setup();tick(live);
 assert.equal(live.armies.find(a=>a.id==='italy').region,'italiaS','staging does not teleport the army');
 assert.equal(live.naval.fleets[0].port,null);
 tick(live);assert.equal(live.armies.find(a=>a.id==='italy').move?.sea,true);
 tick(live);assert.equal(live.armies.find(a=>a.id==='italy').region,'italiaS');
 tick(live);assert.equal(live.armies.find(a=>a.id==='italy').region,'t075','the ordered fleet carries the army across the sea');
});
test('a solvent AI replaces missing transport capacity for an actual coastal army',()=>{
 const s=newGrandGame('egypt'),army=s.armies.find(a=>a.id==='italy'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');
 army.region='italiaS';s.regions.find(r=>r.id==='t075').owner='caesar';
 fleet.ships.transport=1;fleet.sailors-=70;
 assert.equal(previewMarch(s,army.id,'t075').ok,false,'one transport cannot carry the existing levy');
 advanceNaval(s);
 assert.equal(s.naval.queues.find(q=>q.port==='italiaS')?.type,'transport','shipbuilding responds to the real lift shortage');
 assert.equal(fleet.order,null,'the assigned fleet waits for its additional transport');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))),repaired=restored.naval.fleets.find(f=>f.id===fleet.id);
 for(let month=0;month<3;month++){restored.month++;advanceNaval(restored)}
 assert.equal(repaired.ships.transport,2,'the new hull joins the fleet after paid construction time');
 assert.equal(previewMarch(restored,army.id,'t075').ok,true,'the same army can now order a real crossing');
 assert.equal(moveArmy(restored,army.id,'t075').ok,true);
 assert.equal(repaired.order?.kind,'transport','the added hull serves an actual military order');
 const peaceful=newGrandGame('egypt');peaceful.armies.find(a=>a.id==='italy').region='italiaS';peaceful.naval.fleets.find(f=>f.id==='senate-adriatic').ships.transport=1;
 advanceNaval(peaceful);
 assert.ok(!peaceful.naval.queues.some(q=>q.owner==='senate'&&q.type==='transport'),'the AI does not build invasion transports for a peaceful coast');
 const cashPoor=newGrandGame('egypt'),poorFleet=cashPoor.naval.fleets.find(f=>f.id==='senate-adriatic');
 cashPoor.armies.find(a=>a.id==='italy').region='italiaS';cashPoor.regions.find(r=>r.id==='t075').owner='caesar';
 poorFleet.ships.transport=1;cashPoor.factions.senate.treasury=35;advanceNaval(cashPoor);
 assert.ok(!cashPoor.naval.queues.some(q=>q.owner==='senate'&&q.type==='transport'),'a cash-poor command does not spend its last money on new lift');
});
test('AI takes an available land route instead of stalling at a sea link without transports',()=>{
 const s=newGrandGame('caesar');
 for(const r of s.regions)if(r.id!=='t036'&&r.owner==='caesar')r.owner='senate';
 s.armies=s.armies.filter(a=>a.owner==='senate').slice(0,1);
 const unit=s.armies[0];unit.region='t026';unit.men=3500;unit.move=null;unit.siege=null;
 s.factions.senate.treasury=60;s.factions.senate.food=100;
 assert.equal(s.naval.fleets.find(f=>f.owner==='senate').port,'italiaS');
 aiTurn(s,'senate');
 assert.equal(unit.move?.to,'t022');assert.equal(unit.move?.sea,false);
});
test('a hostile naval blockade cuts port army supply until the blockade ends',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');unit.region='italiaS';enemy.zone=portZone('italiaS');enemy.port=null;
 const normal=armySupply(s,unit);assert.equal(orderFleet(s,'caesar',enemy.id,'blockade','italiaS').ok,true);assert.ok(armySupply(s,unit)<normal);
 assert.equal(orderFleet(s,'caesar',enemy.id,'intercept','aegean').ok,true);assert.equal(armySupply(s,unit),normal);
});
test('transports alone cannot impose a blockade and obsolete blockade orders end',()=>{
 const s=newGrandGame('caesar'),fleet=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='caesar');
 fleet.port=null;fleet.zone=portZone('italiaS');fleet.ships={transport:2};fleet.sailors=140;
 assert.deepEqual(orderFleet(s,'caesar',fleet.id,'blockade','italiaS'),{ok:false,reason:'warships'});
 fleet.order={kind:'blockade',target:'italiaS',targetPort:'italiaS',path:[]};
 assert.equal(isPortBlockaded(s,'italiaS'),false);
 const notices=[];advanceNaval(s,(_,en,zh)=>notices.push({en,zh}));
 assert.equal(fleet.order,null,'an old save or battle-damaged fleet must release a powerless blockade');
 assert.match(notices[0].en,/blockade ended/);assert.match(notices[0].zh,/封锁已结束/);
 fleet.ships.trireme=1;fleet.sailors=230;
 assert.equal(orderFleet(s,'caesar',fleet.id,'blockade','italiaS').ok,true);
 assert.equal(isPortBlockaded(s,'italiaS'),true);
 fleet.sailors=80;
 assert.equal(isPortBlockaded(s,'italiaS'),false,'undercrewed warships cannot blockade');
 advanceNaval(s);
 assert.equal(fleet.order,null);
 const ai=newGrandGame('senate'),transportOnly=ai.naval.fleets.find(f=>f.id==='caesar-adriatic');
 transportOnly.ships={transport:2};transportOnly.sailors=140;transportOnly.port=null;transportOnly.zone=portZone('italiaS');transportOnly.order=null;ai.factions.caesar.treasury=200;
 advanceNaval(ai);
 assert.notEqual(transportOnly.order?.kind,'blockade','the AI must not spend a turn issuing a powerless blockade');
});
test('coastal fortifications resist light blockades but not a supplied warship squadron',()=>{
 const s=newGrandGame('senate'),port=s.regions.find(r=>r.id==='t016'),unit=s.armies.find(a=>a.id==='italy'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
 unit.region=port.id;enemy.zone=portZone(port.id);enemy.port=null;enemy.ships={light:1};enemy.sailors=65;
 const normal=armySupply(s,unit);
 assert.equal(orderFleet(s,'caesar',enemy.id,'blockade',port.id).ok,true);
 assert.equal(isPortBlockaded(s,port.id),true);assert.ok(armySupply(s,unit)<normal);
 s.development.senate.knownMaterial.push('stone-fortification');
 assert.equal(startConstruction(s,'senate',port.id,'coastal-fort').ok,true);
 for(let month=0;month<5;month++)advanceDevelopment(s);
 assert.ok(port.buildings.includes('coastal-fort'));
 assert.equal(isPortBlockaded(s,port.id),false);assert.equal(armySupply(s,unit),normal);
 assert.match(constructionPanel(s,'en',port),/Port blockade resistance/);
 assert.match(constructionPanel(s,'zh',port),/港口抵抗封锁能力/);
 assert.match(developmentPanel(s,'en','material'),/At Brundisium in 49 BCE/);
 assert.match(developmentPanel(s,'zh','material'),/前49年凯撒在布伦迪西乌姆/);
 enemy.ships.trireme=1;enemy.sailors+=180;
 assert.equal(isPortBlockaded(s,port.id),true);assert.ok(armySupply(s,unit)<normal);
 enemy.hull=19;assert.equal(isPortBlockaded(s,port.id),false);
});
test('a blockade raised after merchant departure holds cargo offshore until the port reopens',()=>{
 let s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const egypt=s.naval.fleets.find(f=>f.id==='egypt-grain'),caesar=s.naval.fleets.find(f=>f.owner==='caesar'),route=s.naval.routes[0];egypt.ships.merchant=1;
 advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(s.naval.voyages[0].cargo,4);
 caesar.zone=portZone(route.to);caesar.port=null;caesar.order=null;caesar.reserve=false;assert.equal(orderFleet(s,'caesar',caesar.id,'blockade',route.to).ok,true);
 s=upgradeSave(structuredClone(s));
 for(let i=0;i<8&&s.naval.routes[0].last.reason!=='blockade';i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.routes[0].last.reason,'blockade');assert.equal(s.naval.voyages[0].cargo,4);assert.equal(s.factions.senate.food,0);
 assert.match(tradeCard(s,s.naval.routes[0],false),/Waiting outside blockaded port/);
 assert.match(tradeCard(s,s.naval.routes[0],true),/封锁港外等待/);
 const payment=s.factions.egypt.treasury;
 const blocker=s.naval.fleets.find(f=>f.id===caesar.id);blocker.order=null;
 s.month++;advanceNaval(s);
 assert.equal(s.naval.routes[0].last.reason,'delivered');assert.equal(s.naval.routes[0].last.amount,4);
 assert.equal(s.factions.senate.food,4);assert.ok(s.factions.egypt.treasury>payment);
 assert.equal(s.naval.voyages.filter(v=>v.routeId===route.id&&v.phase==='outbound').length,0);
});
test('a fleet moves finite food from a home port to an isolated land front through save reload',()=>{
 const s=newGrandGame('senate');
 for(const r of s.regions)if(r.owner==='senate'&&!['italiaS','t016','t017'].includes(r.id))r.owner='caesar';
 s.regions.find(r=>r.id==='t016').food=.4;
 s.regions.find(r=>r.id==='italiaS').food=.4;
 s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='senate');
 const unit=s.armies.find(a=>a.id==='italy');unit.region='t017';
 const baseline=armySupply(s,unit),food=s.factions.senate.food;
 assert.equal(supplyNetwork(s,'senate',true).has('t017'),false);
 const order=orderFleet(s,'senate','senate-adriatic','supply','t016');
 assert.equal(order.ok,true);assert.equal(order.cargo,6);assert.equal(s.factions.senate.food,food-6);
 advanceNaval(s);assert.equal(s.naval.provisions.t016,undefined);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s))),army=loaded.armies.find(a=>a.id==='italy');
 advanceNaval(loaded);assert.equal(loaded.naval.provisions.t016,undefined);
 advanceNaval(loaded);assert.equal(loaded.naval.provisions.t016.food,6);
 assert.ok(armySupply(loaded,army)>baseline);
 assert.equal(supplyNetwork(loaded,'senate',true).has('t017'),true);
 assert.ok(loaded.naval.reports.some(r=>r.kind==='supply-delivery'&&r.cargo===6));
 for(let i=0;i<3;i++)advanceNaval(loaded);
 assert.equal(loaded.naval.provisions.t016,undefined);assert.equal(armySupply(loaded,army),baseline);
});
test('a blockade holds loaded supply ships outside port, and returning cargo refunds food once',()=>{
 const s=newGrandGame('senate'),own=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
 s.naval.fleets=s.naval.fleets.filter(f=>f.owner!=='egypt');enemy.zone=portZone('t016');enemy.port=null;
 assert.equal(orderFleet(s,'caesar',enemy.id,'blockade','t016').ok,true);
 const supply=orderFleet(s,'senate',own.id,'supply','t016');assert.equal(supply.ok,true);
 for(let i=0;i<3;i++)advanceNaval(s);
 assert.equal(own.order?.kind,'supply');assert.equal(own.order.blocked,true);assert.equal(s.naval.provisions.t016,undefined);
 assert.ok(s.naval.reports.some(r=>r.kind==='supply-blocked'));
 const before=s.factions.senate.food;
 assert.equal(orderFleet(s,'senate',own.id,'return','italiaS').ok,true);
 for(let i=0;i<5&&own.order;i++)advanceNaval(s);
 assert.equal(own.port,'italiaS');assert.equal(s.factions.senate.food,before+supply.cargo);
 assert.equal(s.naval.reports.filter(r=>r.kind==='supply-return').length,1);
});
test('merchant hulls assigned to army supplies cannot also carry trade cargo',()=>{
 const s=newGrandGame('egypt');s.regions.find(r=>r.id==='anatolia').owner='egypt';s.factions.senate.food=0;
 assert.equal(orderFleet(s,'egypt','egypt-grain','supply','anatolia').ok,true);
 advanceNaval(s);
 assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');
});
test('AI dispatches a paid supply convoy only for its own under-supplied port front',()=>{
 const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic'),army=s.armies.find(a=>a.id==='italy');
 s.factions.senate.treasury=200;s.factions.senate.food=50;
 s.naval.routes=[];
 s.regions.find(r=>r.id==='t016').food=.4;army.region='t016';army.operationalSupply=.4;
 const before=s.factions.senate.food;
 advanceNaval(s);
 assert.equal(fleet.order?.kind,'supply');assert.equal(fleet.order.targetPort,'t016');
 assert.equal(s.factions.senate.food,before-fleet.order.cargo);
 for(let i=0;i<3;i++)advanceNaval(s);
 assert.ok(s.naval.provisions.t016?.food>0);
 const healthy=newGrandGame('egypt'),healthyArmy=healthy.armies.find(a=>a.id==='italy');
 healthy.factions.senate.treasury=200;healthyArmy.region='t016';healthyArmy.operationalSupply=.95;
 healthy.regions.find(r=>r.id==='t016').food=.4;
 advanceNaval(healthy);
 assert.notEqual(healthy.naval.fleets.find(f=>f.id==='senate-adriatic').order?.kind,'supply');
});
test('AI supplies an exposed army before staging its fleet for a distant sea assault',()=>{
 const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');
 fleet.ships.transport=1;fleet.ships.merchant=1;fleet.sailors-=25;
 s.naval.routes=[];s.factions.senate.treasury=200;s.factions.senate.food=50;
 s.regions.find(r=>r.id==='t103').owner='caesar';
 s.armies.find(a=>a.id==='italy').region='t030';
 const hungry=s.armies.find(a=>a.id==='pompey');hungry.region='t016';hungry.operationalSupply=.4;
 s.regions.find(r=>r.id==='t016').food=.4;
 advanceNaval(s);
 assert.ok(!s.naval.queues.some(q=>q.owner==='senate'&&q.type==='transport'),'a distant lift project must not reserve the only ship needed for urgent supply');
 assert.equal(fleet.order?.kind,'supply');
 assert.equal(fleet.order.targetPort,'t016');
});
test('AI can supply an inland front through friendly land routes beyond the harbor neighbor',()=>{
 const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic'),army=s.armies.find(a=>a.id==='italy');
 s.naval.routes=[];s.factions.senate.treasury=200;s.factions.senate.food=50;
 for(const r of s.regions)if(r.owner==='senate'&&r.port&&r.id!=='t016')r.food=1.25;
 s.regions.find(r=>r.id==='t016').food=.4;army.region='t018';army.operationalSupply=.4;
 advanceNaval(s);
 assert.equal(fleet.order?.kind,'supply');assert.equal(fleet.order.targetPort,'t016');
 const cut=newGrandGame('egypt'),cutFleet=cut.naval.fleets.find(f=>f.id==='senate-adriatic'),cutArmy=cut.armies.find(a=>a.id==='italy');
 cut.naval.routes=[];cut.factions.senate.treasury=200;cut.factions.senate.food=50;
 for(const r of cut.regions)if(r.owner==='senate'&&r.port&&r.id!=='t016')r.food=1.25;
 cut.regions.find(r=>r.id==='t016').food=.4;cutArmy.region='t018';cutArmy.operationalSupply=.4;
 for(const id of ['roma','t017'])cut.regions.find(r=>r.id===id).owner='caesar';
 advanceNaval(cut);
 assert.notEqual(cutFleet.order?.kind,'supply','a hostile land corridor cannot carry port provisions to the army');
});
test('inland armies consume finite port provisions, and an occupied corridor breaks delivery',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='t018';army.men=8000;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 s.naval.provisions.t016={owner:'senate',food:10};
 advanceNaval(s);assert.equal(s.naval.provisions.t016.food,7);
 for(const id of ['roma','t017'])s.regions.find(r=>r.id===id).owner='caesar';
 advanceNaval(s);assert.equal(s.naval.provisions.t016.food,6);
});
test('a provisioned port establishes a finite three-link inland supply reach',()=>{
 const s=newGrandGame('senate'),corridor=new Set(['t016','t017','t019','t021','t023']);
 for(const r of s.regions)if(r.owner==='senate')r.owner=corridor.has(r.id)?'senate':'caesar';
 for(const id of corridor)s.regions.find(r=>r.id===id).food=.4;
 s.naval.provisions.t016={owner:'senate',food:8};
 const line=supplyNetwork(s,'senate',true);
 assert.equal(line.has('t021'),true);
 assert.equal(line.has('t023'),false,'one port stock must not provision an unlimited inland chain');
 const army=s.armies.find(a=>a.id==='italy');army.region='t021';
 const supplied=armySupply(s,army);assert.ok(supplied>.68);
 s.regions.find(r=>r.id==='t017').owner='caesar';
 assert.equal(supplyNetwork(s,'senate',true).has('t021'),false);
 assert.ok(armySupply(s,army)<supplied);
});
test('paid wagons carry finite port food beyond three links over a saved friendly route',()=>{
 const s=newGrandGame('senate'),corridor=new Set(['t016','t017','t019','t021','t023']);
 for(const r of s.regions)if(r.owner==='senate')r.owner=corridor.has(r.id)?'senate':'caesar';
 for(const id of corridor)s.regions.find(r=>r.id===id).food=.4;
 const army=s.armies.find(a=>a.id==='italy');army.region='t023';army.men=8000;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 s.naval.provisions.t016={owner:'senate',food:10};s.factions.senate.treasury=100;
 const baseline=armySupply(s,army),plan=wagonSupplyPlan(s,'senate','t016','t023');
 assert.equal(plan.ok,true);assert.equal(plan.months,2);assert.equal(plan.expectedDelivery,6);
 const cash=s.factions.senate.treasury;
 assert.equal(dispatchWagonSupply(s,'senate','t016','t023').ok,true);
 assert.equal(s.factions.senate.treasury,cash-plan.cost);
 assert.equal(s.naval.provisions.t016.food,2);
 assert.equal(dispatchWagonSupply(s,'senate','t016','t023').reason,'pending');
 advanceNaval(s);assert.equal(s.naval.wagons[0].index,2);assert.equal(s.naval.inlandProvisions.t023,undefined);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 advanceNaval(loaded);
 assert.equal(loaded.naval.wagons.length,0);
 assert.equal(loaded.naval.inlandProvisions.t023.food,3,'six units arrive, then the 8,000-man army draws three');
 assert.ok(armySupply(loaded,loaded.armies.find(a=>a.id==='italy'))>baseline);
 assert.ok(loaded.naval.reports.some(r=>r.kind==='wagon-delivery'&&r.lost===2&&r.cargo===6));
 advanceNaval(loaded);assert.equal(loaded.naval.inlandProvisions.t023,undefined);
 assert.equal(armySupply(loaded,loaded.armies.find(a=>a.id==='italy')),baseline);
});
test('occupation cuts an inland wagon route and AI uses stocked ports for distant fronts',()=>{
 const setup=player=>{const s=newGrandGame(player),corridor=new Set(['t016','t017','t019','t021','t023']);for(const r of s.regions)if(r.owner==='senate')r.owner=corridor.has(r.id)?'senate':'caesar';const army=s.armies.find(a=>a.id==='italy');army.region='t023';army.men=8000;army.operationalSupply=.3;for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;s.naval.provisions.t016={owner:'senate',food:10};s.factions.senate.treasury=150;return s};
 const cut=setup('senate');assert.equal(dispatchWagonSupply(cut,'senate','t016','t023').ok,true);
 cut.regions.find(r=>r.id==='t019').owner='caesar';advanceNaval(cut);
 assert.equal(cut.naval.wagons.length,0);assert.equal(cut.naval.inlandProvisions.t023,undefined);
 assert.ok(cut.naval.reports.some(r=>r.kind==='wagon-loss'&&r.reason==='route occupied'));
 const ai=setup('egypt');advanceNaval(ai);
 assert.equal(ai.naval.wagons[0]?.owner,'senate');assert.equal(ai.naval.wagons[0]?.to,'t023');
});
test('AI sends a real sea shipment and then a paid wagon column to a distant front',()=>{
 const s=newGrandGame('egypt'),army=s.armies.find(a=>a.id==='italy'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');
 s.factions.senate.treasury=300;s.factions.senate.food=80;army.region='t023';army.operationalSupply=.3;
 for(const r of s.regions)if(r.owner==='senate'&&r.port)r.food=r.id==='t016'?.3:.9;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 advanceNaval(s);assert.equal(fleet.order?.targetPort,'t016');assert.equal(s.factions.senate.food,74);
 for(let i=0;i<3;i++)advanceNaval(s);
 assert.equal(s.factions.senate.food,74,'one needy army must not trigger overlapping shipments from other ports');
 assert.equal(s.naval.wagons[0]?.from,'t016');assert.equal(s.naval.wagons[0]?.to,'t023');
 assert.ok(s.naval.reports.some(r=>r.kind==='supply-delivery'&&r.port==='t016'));
});
test('overlapping inland and port stores provision an army once, and captured depots vanish',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='t017';army.men=8000;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 s.naval.provisions.t016={owner:'senate',food:10};s.naval.inlandProvisions.t017={owner:'senate',food:7};
 advanceNaval(s);
 assert.equal(s.naval.inlandProvisions.t017.food,4);
 assert.equal(s.naval.provisions.t016.food,9,'the same army cannot draw a second port ration');
 s.regions.find(r=>r.id==='t017').owner='caesar';advanceNaval(s);
 assert.equal(s.naval.inlandProvisions.t017,undefined);
});
test('overlapping port stores charge an army to only one port when that store runs dry',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='t017';army.men=8000;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 s.naval.provisions.t016={owner:'senate',food:1};s.naval.provisions.t019={owner:'senate',food:10};
 advanceNaval(s);
 assert.equal(s.naval.provisions.t016,undefined);
 assert.equal(s.naval.provisions.t019.food,9);
});
test('AI convoy favors a similarly needy safe port using dated reports, not hidden enemy positions',()=>{
 const setup=()=>{const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');s.naval.routes=[];fleet.port='t026';fleet.zone='sicilian';s.factions.senate.treasury=200;s.factions.senate.food=60;
  for(const [id,armyId] of [['t016','italy'],['t078','pompey']]){s.regions.find(r=>r.id===id).food=.3;const unit=s.armies.find(a=>a.id===armyId);unit.region=id;unit.operationalSupply=.35}
  return s};
 const unseen=setup();unseen.naval.fleets.find(f=>f.id==='caesar-adriatic').zone='tyrrhenian';advanceNaval(unseen);
 assert.equal(unseen.naval.fleets.find(f=>f.id==='senate-adriatic').order?.targetPort,'t016');
 const informed=setup();informed.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:'tyrrhenian',year:informed.year,month:informed.month,source:'sighting',range:[2,5],confidence:'medium'}};
 const loaded=upgradeSave(JSON.parse(JSON.stringify(informed)));advanceNaval(loaded);
 assert.equal(loaded.naval.fleets.find(f=>f.id==='senate-adriatic').order?.targetPort,'t078');
 const stale=setup();stale.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:'tyrrhenian',year:stale.year-1,month:stale.month+7,source:'sighting',range:[2,5],confidence:'medium'}};advanceNaval(stale);
 assert.equal(stale.naval.fleets.find(f=>f.id==='senate-adriatic').order?.targetPort,'t016');
});
test('merchant hulls limit simultaneous routes and hostile raids interrupt real cargo',()=>{
 const s=newGrandGame('senate'),egypt=s.naval.fleets.find(f=>f.owner==='egypt'),caesar=s.naval.fleets.find(f=>f.owner==='caesar');egypt.ships.merchant=1;s.factions.caesar.treasury=200;s.factions.senate.food=0;s.factions.egypt.food=60;advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'enroute');assert.equal(s.naval.routes.find(r=>r.id==='egypt-papyrus').last.reason,'merchant');
 caesar.zone='eastern';caesar.port=null;assert.equal(orderFleet(s,'caesar',caesar.id,'raid','egypt-italy').ok,true);const before={food:s.factions.senate.food,raider:s.factions.caesar.treasury};s.month++;advanceNaval(s);const route=s.naval.routes.find(r=>r.id==='egypt-italy');assert.equal(route.last.reason,'raid');assert.equal(route.last.amount,0);assert.equal(s.factions.senate.food,before.food);assert.ok(s.naval.reports.some(r=>r.kind==='trade-raid'));assert.ok(s.factions.caesar.treasury<=before.raider);
});
test('pirate suppression and covert sponsorship alter pressure and resources',()=>{
 const s=newGrandGame('senate'),p=s.naval.pirates.find(x=>x.id==='illyrian-raiders'),before=p.pressure,treasury=s.factions.senate.treasury;assert.equal(supportPirates(s,'senate',p.id).ok,true);assert.equal(s.factions.senate.treasury,treasury-12);assert.equal(p.pressure,before+8);assert.equal(orderFleet(s,'senate','senate-adriatic','patrol','adriatic').ok,true);advanceNaval(s);assert.ok(p.pressure<before+8)
});
test('pirate raids move cargo into persistent inventory and patrols can recover it',()=>{
 const s=newGrandGame('senate');s.seed=100004;s.factions.senate.food=0;s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';
 const pirate=s.naval.pirates.find(p=>p.id==='cilician-raiders');pirate.zone='alexandrian';pirate.pressure=70;
 const egyptianFood=s.factions.egypt.food;advanceNaval(s);const route=s.naval.routes.find(r=>r.id==='egypt-italy');
 assert.equal(route.last.reason,'piracy');assert.equal(route.last.captured,4);assert.equal(pirate.cargo.grain,4);assert.equal(s.factions.egypt.food,egyptianFood-4);
 assert.match(tradeCard(s,route,false),/Cargo seized 4/);assert.match(tradeCard(s,route,true),/被夺货物 4/);
 const restored=upgradeSave(structuredClone(s));assert.equal(restored.naval.pirates.find(p=>p.id===pirate.id).cargo.grain,4);
 const old=structuredClone(s);delete old.naval.pirates[1].cargo;assert.deepEqual(upgradeSave(old).naval.pirates[1].cargo,{});
 s.naval.routes=s.naval.routes.filter(r=>r.id!=='egypt-italy');s.factions.senate.food=10;const fleet=s.naval.fleets.find(f=>f.owner==='senate');fleet.zone='alexandrian';fleet.port=null;
 assert.equal(orderFleet(s,'senate',fleet.id,'patrol','alexandrian').ok,true);advanceNaval(s);
 assert.equal(s.factions.senate.food,11);assert.equal(pirate.cargo.grain,3);
 assert.deepEqual(s.naval.reports.find(r=>r.kind==='pirate-clash').recovered,{good:'grain',amount:1});
});
test('patrols can fight pirate vessels with real sailor losses and finite pirate strength',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate'),pirates=s.naval.pirates.find(p=>p.zone==='adriatic');s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';
 pirates.pressure=30;const crew=fleet.sailors,ships=pirates.ships;
 assert.equal(orderFleet(s,'senate',fleet.id,'patrol','adriatic').ok,true);advanceNaval(s);
 const clash=s.naval.reports.find(r=>r.kind==='pirate-clash'&&r.owner==='senate');assert.ok(clash);
 assert.ok(fleet.sailors<crew);assert.equal(pirates.ships,ships-clash.pirateShipsLost);
 assert.equal(clash.losses[fleet.id].sailors,crew-fleet.sailors);
 assert.ok(pirates.pressure<30);
});
test('weak pirate patrols can be repelled without automatically recovering seized cargo',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate'),pirates=s.naval.pirates.find(p=>p.zone==='adriatic');
 s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';fleet.ships={light:1};fleet.sailors=65;
 pirates.ships=8;pirates.pressure=70;pirates.cargo={grain:3};s.factions.senate.food=10;
 assert.equal(orderFleet(s,'senate',fleet.id,'patrol','adriatic').ok,true);advanceNaval(s);
 const clash=s.naval.reports.find(r=>r.kind==='pirate-clash');
 assert.equal(clash.outcome,'repelled');assert.equal(clash.pirateShipsLost,0);
 assert.equal(pirates.ships,8);assert.equal(pirates.cargo.grain,3);assert.equal(s.factions.senate.food,10);
 assert.equal(clash.recovered,null);assert.ok(clash.losses[fleet.id].sailors>0);
 assert.deepEqual(upgradeSave(structuredClone(s)).naval.reports.find(r=>r.id===clash.id),clash);
 for(const [lang,label] of [['en','Patrol repelled'],['zh','巡逻舰被击退']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports'});
  assert.match(content.innerHTML,new RegExp(label));
  assert.match(content.innerHTML,lang==='en'?/Friendly sailor casualties/:/己方水手伤亡/);
  renderNavalPanel({state:s,lang,root,section:'intelligence'});
  assert.match(content.innerHTML,lang==='en'?/exact ship count is unknown before combat/:/交战前无法得知其确切船数/);
 }
 const old=upgradeSave(structuredClone(s));old.naval.reports[0]={kind:'pirate-clash',owner:'senate',year:s.year,month:s.month,zone:'adriatic'};
 const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
 renderNavalPanel({state:old,lang:'en',root,section:'reports'});
 assert.match(content.innerHTML,/Outcome unrecorded/);
});
test('pirate combat releases a commander when the last patrol ship sinks',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic'),pirates=s.naval.pirates.find(p=>p.zone==='adriatic');
 s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';
 fleet.port=null;fleet.zone='adriatic';fleet.ships={light:1};fleet.sailors=65;fleet.hull=1;fleet.commanderId='cicero';fleet.order={kind:'patrol',target:'adriatic',path:[]};
 pirates.ships=8;pirates.pressure=70;
 advanceNaval(s);
 assert.ok(s.naval.reports.some(r=>r.kind==='pirate-clash'&&r.participants.includes(fleet.id)));
 assert.equal(Object.values(fleet.ships).reduce((n,count)=>n+count,0),0);
 assert.equal(fleet.commanderId,null);
 assert.equal(s.world.characters.cicero.missing.remaining,3);
});
test('two patrol fleets share a real pirate engagement and record their own losses',()=>{
 const s=newGrandGame('senate'),first=s.naval.fleets.find(f=>f.owner==='senate'),second=structuredClone(first),pirates=s.naval.pirates.find(p=>p.zone==='adriatic');
 s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';first.ships={trireme:3};first.sailors=540;
 second.id='senate-second-patrol';second.ships={trireme:3};second.sailors=540;s.naval.fleets.push(second);
 pirates.ships=8;pirates.pressure=70;s.seed=2257;
 for(const f of [first,second])assert.equal(orderFleet(s,'senate',f.id,'patrol','adriatic').ok,true);
 advanceNaval(s);
 const clashes=s.naval.reports.filter(r=>r.kind==='pirate-clash'&&r.zone==='adriatic');
 assert.equal(clashes.length,1);assert.equal(clashes[0].outcome,'victory');
 assert.deepEqual(new Set(clashes[0].participants),new Set([first.id,second.id]));
 for(const f of [first,second])assert.ok(clashes[0].losses[f.id]&&clashes[0].snapshots[f.id]);
 assert.equal(pirates.ships,8-clashes[0].pirateShipsLost);
});
test('patrols from separate states can each confront pirates in shared waters',()=>{
 let s=newGrandGame('egypt'),senate=s.naval.fleets.find(f=>f.id==='senate-adriatic'),egypt=s.naval.fleets.find(f=>f.id==='egypt-grain'),pirates=s.naval.pirates.find(p=>p.zone==='adriatic');
 s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';
 senate.ships={light:1};senate.sailors=65;senate.port=null;senate.zone='adriatic';
 egypt.ships={trireme:2};egypt.sailors=360;egypt.port=null;egypt.zone='adriatic';
 pirates.ships=12;pirates.pressure=70;s.seed=2257;
 for(const f of [senate,egypt])assert.equal(orderFleet(s,f.owner,f.id,'patrol','adriatic').ok,true);
 advanceNaval(s);
 const clashes=s.naval.reports.filter(r=>r.kind==='pirate-clash'&&r.zone==='adriatic');
 assert.deepEqual(new Set(clashes.map(r=>r.owner)),new Set(['senate','egypt']));
 for(const r of clashes){
  assert.deepEqual(r.participants,[r.owner==='senate'?senate.id:egypt.id]);
  assert.ok(r.losses[r.participants[0]].sailors>0,'Each patrol must bear its own actual battle losses');
 }
 s=upgradeSave(structuredClone(s));
 for(const [lang,title] of [['en','Pirate clash'],['zh','海盗交战']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports'});
  assert.match(content.innerHTML,new RegExp(title));
  assert.equal((content.innerHTML.match(/class="naval-card"/g)||[]).filter(Boolean).length,1,'A player sees only their own clash');
 }
});
test('naval AI assigns orders to each available fleet instead of only its first',()=>{
 const s=newGrandGame('caesar'),first=s.naval.fleets.find(f=>f.owner==='senate'),second=structuredClone(first);second.id='senate-east';second.zone='eastern';second.port=null;s.naval.fleets.push(second);
 advanceNaval(s);assert.equal(first.order?.kind,'patrol');assert.equal(second.order?.kind,'patrol');
});
test('AI divides escorts between two raided trade routes and uses current route losses',()=>{
 const s=newGrandGame('caesar'),first=s.naval.fleets.find(f=>f.owner==='senate'),second=structuredClone(first),merchant=structuredClone(first),raider=s.naval.fleets.find(f=>f.owner==='caesar'),otherRaider=structuredClone(raider);
 s.factions.senate.treasury=500;s.factions.senate.food=100;
 s.naval.routes=s.naval.routes.filter(r=>['african-oil','levant-luxury'].includes(r.id));
 for(const pirate of s.naval.pirates)pirate.pressure=0;
 s.naval.pirates[0].zone='tyrrhenian';s.naval.pirates[0].pressure=30;
 first.ships={trireme:2};first.port=null;first.zone='tyrrhenian';
 second.id='senate-east';second.ships={trireme:2};second.port=null;second.zone='ionian';
 merchant.id='senate-merchants';merchant.ships={merchant:2};merchant.port='africa';merchant.zone='african';
 raider.zone='african';raider.port=null;
 otherRaider.id='caesar-east';otherRaider.zone='eastern';otherRaider.port=null;
 const easternMerchant=structuredClone(merchant);easternMerchant.id='eastern-merchants';easternMerchant.port='t114';easternMerchant.zone='eastern';
 s.naval.fleets.push(second,merchant,easternMerchant,otherRaider);
 assert.equal(orderFleet(s,'caesar',raider.id,'raid','african-oil').ok,true);
 assert.equal(orderFleet(s,'caesar',otherRaider.id,'raid','levant-luxury').ok,true);
 advanceNaval(s);
 assert.equal(s.naval.routes.find(r=>r.id==='african-oil').last.reason,'raid');
 assert.equal(s.naval.routes.find(r=>r.id==='levant-luxury').last.reason,'raid');
 assert.ok(s.naval.pirates.some(p=>p.zone==='tyrrhenian'&&p.pressure>18));
 assert.equal(first.order?.kind,'escort');assert.equal(second.order?.kind,'escort');
 assert.deepEqual(new Set([first.order.target,second.order.target]),new Set(['african-oil','levant-luxury']));
 const restored=upgradeSave(structuredClone(s));
 assert.deepEqual(new Set(restored.naval.fleets.filter(f=>f.owner==='senate'&&f.order?.kind==='escort').map(f=>f.order.target)),new Set(['african-oil','levant-luxury']));
 const previousSecurity=new Map(restored.naval.routes.filter(r=>['african-oil','levant-luxury'].includes(r.id)).map(r=>[r.id,r.last.security]));
 restored.month++;advanceNaval(restored);
 for(const id of previousSecurity.keys()){const now=restored.naval.routes.find(r=>r.id===id).last;assert.ok(now.security>previousSecurity.get(id),`${id}: ${previousSecurity.get(id)} → ${now.security} (${now.reason})`)}
});
test('AI releases a quiet trade escort after three dated reviews and preserves its streak on reload',()=>{
 const s=newGrandGame('caesar'),escort=s.naval.fleets.find(f=>f.owner==='senate');
 s.factions.senate.treasury=500;
 s.wars=[];
 for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
 assert.equal(orderFleet(s,'senate',escort.id,'escort','africa-sicily').ok,true);
 advanceNaval(s);
 assert.equal(escort.order?.quietMonths,1);
 advanceNaval(s);
 assert.equal(escort.order?.quietMonths,1,'A second resolution in the same calendar month is not another review');
 const restored=upgradeSave(structuredClone(s)),reviewed=restored.naval.fleets.find(f=>f.id===escort.id);
 restored.month++;
 advanceNaval(restored);
 assert.equal(reviewed.order?.kind,'escort');
 assert.equal(reviewed.order?.quietMonths,2);
 restored.month++;
 advanceNaval(restored);
 assert.notEqual(reviewed.order?.kind,'escort');
});
test('AI can reassign a released escort to a newly raided route',()=>{
 const s=newGrandGame('caesar'),escort=s.naval.fleets.find(f=>f.owner==='senate'),merchant=structuredClone(escort),raider=s.naval.fleets.find(f=>f.owner==='caesar');
 s.factions.senate.treasury=500;s.factions.senate.food=100;
 s.naval.routes=s.naval.routes.filter(r=>['african-oil','levant-luxury'].includes(r.id));
 for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
 escort.zone='african';escort.port=null;
 merchant.id='reassignment-merchants';merchant.ships={merchant:2};merchant.zone='eastern';merchant.port='t114';s.naval.fleets.push(merchant);
 raider.zone='eastern';raider.port=null;
 assert.equal(orderFleet(s,'senate',escort.id,'escort','african-oil').ok,true);
 escort.order.quietMonths=2;escort.order.lastReviewMonth=s.year*12+s.month-1;
 assert.equal(orderFleet(s,'caesar',raider.id,'raid','levant-luxury').ok,true);
 advanceNaval(s);
 assert.equal(s.naval.routes.find(r=>r.id==='levant-luxury').last.reason,'raid');
 assert.equal(escort.order?.kind,'escort');
 assert.equal(escort.order?.target,'levant-luxury');
});
test('AI patrols return before stores run out and release a quiet route for troop staging',()=>{
 const tired=newGrandGame('egypt'),watch=tired.naval.fleets.find(f=>f.id==='senate-adriatic');
 watch.port=null;watch.zone='adriatic';watch.order={kind:'patrol',target:'adriatic',path:[]};watch.supply=42;
 tired.naval.pirates.find(p=>p.zone==='adriatic').ships=0;
 tired.naval.pirates.find(p=>p.zone==='adriatic').pressure=60;
 advanceNaval(tired);
 assert.equal(watch.order?.kind,'return');assert.equal(tired.regions.find(r=>r.id===watch.order.targetPort)?.owner,'senate');

 const staging=newGrandGame('egypt'),fleet=staging.naval.fleets.find(f=>f.id==='senate-adriatic'),army=staging.armies.find(a=>a.id==='italy');
 for(const site of staging.regions)site.owner='egypt';
 staging.regions.find(r=>r.id==='italiaS').owner='senate';staging.regions.find(r=>r.id==='t075').owner='caesar';
 staging.armies=[army];staging.naval.fleets=staging.naval.fleets.filter(f=>f.owner==='senate');army.region='italiaS';fleet.port=null;fleet.zone='adriatic';fleet.order={kind:'patrol',target:'adriatic',path:[]};
 staging.naval.pirates.find(p=>p.zone==='adriatic').pressure=0;
 advanceNaval(staging);
 assert.equal(fleet.order?.kind,'return','the quiet patrol stages at the waiting army instead of remaining offshore');
 assert.equal(fleet.order?.targetPort,'italiaS');
 advanceNaval(staging);assert.equal(fleet.port,'italiaS');
 aiTurn(staging,'senate');assert.equal(army.move?.sea,true);assert.equal(army.move?.to,'t075');
 assert.equal(fleet.order?.kind,'transport');
});
test('AI pursues a dated hostile fleet report through a real sea battle without reading hidden positions',()=>{
 const setup=()=>{
  const s=newGrandGame('caesar'),hunter=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
  s.factions.senate.treasury=500;s.factions.senate.food=100;
  hunter.ships={trireme:4};hunter.sailors=720;
  enemy.port=null;enemy.zone='aegean';
  for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
  return {s,hunter,enemy};
 };
 const unseen=setup();advanceNaval(unseen.s);assert.notEqual(unseen.hunter.order?.kind,'intercept');
 const strong=setup();strong.s.naval.intel.senate={[strong.enemy.id]:{owner:'caesar',zone:'aegean',year:strong.s.year,month:strong.s.month,source:'recon',range:[9,12],confidence:'medium'}};
 advanceNaval(strong.s);assert.notEqual(strong.hunter.order?.kind,'intercept');
 const cargoHeavy=setup();cargoHeavy.hunter.ships={trireme:1,transport:5};cargoHeavy.hunter.sailors=530;
 cargoHeavy.s.naval.intel.senate={[cargoHeavy.enemy.id]:{owner:'caesar',zone:'aegean',year:cargoHeavy.s.year,month:cargoHeavy.s.month,source:'recon',range:[3,5],confidence:'medium'}};
 advanceNaval(cargoHeavy.s);assert.notEqual(cargoHeavy.hunter.order?.kind,'intercept','transport hulls cannot turn one warship into a safe pursuit force');
 const {s,hunter,enemy}=setup();s.naval.intel.senate={[enemy.id]:{owner:'caesar',zone:'aegean',year:s.year,month:s.month,source:'recon',range:[3,5],confidence:'medium'}};
 advanceNaval(s);assert.equal(hunter.order?.kind,'intercept');assert.equal(hunter.order.target,'aegean');assert.equal(hunter.order.reportId,enemy.id);
 const restored=upgradeSave(structuredClone(s)),saved=restored.naval.fleets.find(f=>f.id===hunter.id);
 assert.equal(saved.order.reportId,enemy.id);
 advanceNaval(restored);
 assert.ok(restored.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(hunter.id)&&r.participants.includes(enemy.id)));
});
test('AI does not count troop transports as warships when judging an enemy-port blockade',()=>{
 const s=newGrandGame('caesar'),fleet=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
 s.factions.senate.treasury=500;s.factions.senate.food=100;s.month=4;
 fleet.port=null;fleet.zone='adriatic';fleet.ships={trireme:2,transport:4};fleet.sailors=640;
 for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
 s.naval.intel.senate={[enemy.id]:{owner:'caesar',zone:'adriatic',year:s.year,month:1,source:'recon',range:[3,5],confidence:'medium'}};
 advanceNaval(s);
 assert.notEqual(fleet.order?.kind,'blockade','the three-month-old report still warns against a six-hull fleet with only two warships');
});
test('two AI fleets coordinate against one larger reported fleet and fight together after reload',()=>{
 const s=newGrandGame('caesar'),first=s.naval.fleets.find(f=>f.owner==='senate'),second=structuredClone(first),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
 s.factions.senate.treasury=500;s.factions.senate.food=100;
 for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
 first.id='senate-west';first.zone='ionian';first.port=null;first.ships={trireme:3};first.sailors=540;
 second.id='senate-east';second.zone='ionian';second.port=null;second.ships={trireme:3};second.sailors=540;
 enemy.zone='aegean';enemy.port=null;enemy.ships={trireme:6};enemy.sailors=1080;
 s.naval.fleets.push(second);
 s.naval.intel.senate={[enemy.id]:{owner:'caesar',zone:'aegean',year:s.year,month:s.month,source:'recon',range:[5,6],confidence:'medium'}};
 advanceNaval(s);
 assert.equal(first.order?.kind,'intercept');assert.equal(second.order?.kind,'intercept');
 assert.equal(first.order.reportId,enemy.id);assert.equal(second.order.reportId,enemy.id);
 assert.equal(s.naval.reports.some(r=>r.kind==='battle'),false,'orders do not create combat before arrival');
 const restored=upgradeSave(structuredClone(s));
 restored.month++;
 advanceNaval(restored);
 const battles=restored.naval.reports.filter(r=>r.kind==='battle'&&r.zone==='aegean');
 assert.equal(battles.length,1,'the same enemy is engaged once by the combined force');
 assert.equal(battles[0].coordinated,true);
 assert.deepEqual(new Set(battles[0].participants),new Set([first.id,second.id,enemy.id]));
 for(const id of [first.id,second.id,enemy.id])assert.ok(battles[0].losses[id]&&battles[0].snapshots[id]);
 assert.ok(battles[0].observedLosses.senate.ships[1]>battles[0].observedLosses.senate.ships[0]);
 const reloaded=upgradeSave(structuredClone(restored));
 assert.deepEqual(reloaded.naval.reports.find(r=>r.id===battles[0].id),battles[0]);
});
test('AI will not coordinate an unseen, stale, or outnumbering fleet report',()=>{
 const setup=()=>{
  const s=newGrandGame('caesar'),first=s.naval.fleets.find(f=>f.owner==='senate'),second=structuredClone(first),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
  s.factions.senate.treasury=500;s.factions.senate.food=100;
  for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
  first.id='senate-west';first.zone='ionian';first.port=null;first.ships={trireme:3};first.sailors=540;
  second.id='senate-east';second.zone='ionian';second.port=null;second.ships={trireme:3};second.sailors=540;
  enemy.zone='aegean';enemy.port=null;enemy.ships={trireme:6};enemy.sailors=1080;
  s.naval.fleets.push(second);
  return {s,first,second,enemy};
 };
 const cases=[['unseen',null],['stale',{year:-49,month:1,range:[5,6]}],['too strong',{year:-49,month:1,range:[11,14]}]];
 for(const [label,intel] of cases){
  const {s,first,second,enemy}=setup();s.month=4;
  if(intel)s.naval.intel.senate={[enemy.id]:{owner:'caesar',zone:'aegean',source:'recon',confidence:'medium',...intel}};
  advanceNaval(s);
  assert.notEqual(first.order?.kind,'intercept',label);
  assert.notEqual(second.order?.kind,'intercept',label);
 }
});
test('coordinated battle report names both friendly fleets in English and Chinese',()=>{
 const s=newGrandGame('senate'),first=s.naval.fleets.find(f=>f.owner==='senate'),second=structuredClone(first),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
 first.id='senate-west';first.name=['Western Squadron','西部舰队'];
 second.id='senate-east';second.name=['Eastern Squadron','东部舰队'];s.naval.fleets.push(second);
 s.naval.reports.unshift({id:'combined-report',kind:'battle',coordinated:true,year:s.year,month:s.month,zone:'aegean',participants:[first.id,second.id,enemy.id],winner:'senate',snapshots:Object.fromEntries([first,second,enemy].map(f=>[f.id,{owner:f.owner,name:f.name,ships:{trireme:3},commanderId:null,tactic:'formation'}])),losses:{[first.id]:{sailors:12,sunk:0},[second.id]:{sailors:9,sunk:0},[enemy.id]:{sailors:21,sunk:0}},damage:{[first.id]:2,[second.id]:3},observedLosses:{senate:{ships:[0,1],sailors:[0,50]}},weather:100,tactics:{[first.id]:'formation',[second.id]:'formation'}});
 for(const [lang,heading] of [['en','COORDINATED NAVAL BATTLE'],['zh','协同海战']]){
  const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};
  renderNavalPanel({state:s,lang,root,section:'reports'});
  assert.match(content.innerHTML,new RegExp(heading));
  assert.match(content.innerHTML,new RegExp(lang==='en'?'Western Squadron':'西部舰队'));
  assert.match(content.innerHTML,new RegExp(lang==='en'?'Eastern Squadron':'东部舰队'));
  assert.match(content.innerHTML,/×6/);
 }
});
test('AI changes or ends fleet pursuit when its dated report moves or expires',()=>{
 const s=newGrandGame('caesar'),hunter=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
 s.factions.senate.treasury=500;s.factions.senate.food=100;hunter.ships={trireme:4};hunter.sailors=720;enemy.port=null;enemy.zone='western';
 for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
 s.naval.intel.senate={[enemy.id]:{owner:'caesar',zone:'aegean',year:s.year,month:s.month,source:'recon',range:[3,5],confidence:'medium'}};
 advanceNaval(s);assert.equal(hunter.order?.target,'aegean');
 s.month++;s.naval.intel.senate[enemy.id]={...s.naval.intel.senate[enemy.id],zone:'western',month:s.month};
 advanceNaval(s);assert.equal(hunter.order?.kind,'intercept');assert.equal(hunter.order.target,'western');
 s.month+=3;advanceNaval(s);assert.notEqual(hunter.order?.kind,'intercept');
});
test('naval state survives save migration and 36 campaign months',()=>{
 const s=newGrandGame('senate');for(let i=0;i<36;i++)tick(s);const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.naval.fleets.length,s.naval.fleets.length);assert.equal(restored.naval.routes.length,12);assert.ok(restored.naval.routes.every(r=>Number.isFinite(r.last?.security)));assert.ok(restored.naval.fleets.every(f=>Number.isFinite(f.hull)&&Number.isFinite(f.supply)))
});

test('older naval saves acquire an empty maritime supply inventory',()=>{
 const old=JSON.parse(JSON.stringify(newGrandGame('senate')));old.naval.version=1;delete old.naval.provisions;delete old.naval.inlandProvisions;delete old.naval.wagons;delete old.naval.voyages;delete old.naval.nextVoyage;
 assert.deepEqual(upgradeSave(old).naval.provisions,{});
 assert.deepEqual(upgradeSave(old).naval.inlandProvisions,{});
 assert.deepEqual(upgradeSave(old).naval.wagons,[]);
 assert.equal(upgradeSave(old).naval.version,6);assert.deepEqual(upgradeSave(old).naval.voyages,[]);assert.equal(upgradeSave(old).naval.nextVoyage,1);
});

test('naval report IDs stay unique after the 80-report cap and across save reloads',()=>{
 const old=structuredClone(newGrandGame('senate'));
 delete old.naval.nextReport;
 old.naval.reports=Array.from({length:80},(_,i)=>({id:`legacy-${i}`,kind:'storm',year:-49,month:1,zone:'adriatic'}));
 const s=upgradeSave(old),a=s.naval.fleets.find(f=>f.owner==='senate'),b=s.naval.fleets.find(f=>f.owner==='caesar');
 for(let i=0;i<2;i++){
  a.hull=100;b.hull=100;a.ships={trireme:3};b.ships={trireme:3};a.sailors=500;b.sailors=500;
  resolveBattle(s,a,b,'adriatic',()=>{});
 }
 const first=s.naval.reports.slice(0,2).map(r=>r.id);
 assert.equal(new Set(first).size,2);
 assert.equal(new Set(s.naval.reports.map(r=>r.id)).size,80);
 const loaded=upgradeSave(structuredClone(s));
 assert.deepEqual(loaded.naval.reports.slice(0,2).map(r=>r.id),first);
 a.hull=100;b.hull=100;a.ships={trireme:3};b.ships={trireme:3};a.sailors=500;b.sailors=500;
 resolveBattle(loaded,loaded.naval.fleets.find(f=>f.id===a.id),loaded.naval.fleets.find(f=>f.id===b.id),'adriatic',()=>{});
 assert.equal(new Set(loaded.naval.reports.map(r=>r.id)).size,80);
 const legacy=structuredClone(loaded);delete legacy.naval.nextReport;
 const retainedId=legacy.naval.reports[0].id;
 legacy.naval.reports[1].id=retainedId;
 const repaired=upgradeSave(legacy);
 assert.equal(new Set(repaired.naval.reports.map(r=>r.id)).size,80);
 assert.equal(repaired.naval.reports[0].id,retainedId);
 assert.notEqual(repaired.naval.reports[1].id,retainedId);
});
