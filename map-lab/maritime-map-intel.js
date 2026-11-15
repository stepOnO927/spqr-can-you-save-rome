import {isPortBlockaded} from '../naval.js';

// Build map information from the player's own forces, ports and dated reports.
// Enemy fleets and pirate groups in the simulation are deliberately not read.
export function maritimeMapIntel(state,owner){
 const naval=state.naval;
 if(!naval)return {routes:[],ports:[],blockades:[],convoys:[],hazards:[]};
 const regions=new Map(state.regions.map(region=>[region.id,region]));
 const month=state.year*12+state.month;
 const routes=(naval.routes||[]).filter(route=>regions.get(route.from)?.owner===owner||regions.get(route.to)?.owner===owner).map(route=>({
  id:route.id,from:route.from,to:route.to,
  status:[route.last?.buyer,route.last?.seller].includes(owner)&&month-(route.last.year*12+route.last.month)>=0&&month-(route.last.year*12+route.last.month)<=3?route.last.reason:'unknown'
 }));
 const ports=state.regions.filter(region=>region.owner===owner&&region.port).map(region=>({
  id:region.id,facilities:(region.buildings||[]).filter(id=>['shipyard','dockyard','naval-depot','coastal-fort','warehouse','naval-training'].includes(id)),
  blockaded:isPortBlockaded(state,region.id)
 }));
 const blockades=(naval.fleets||[]).filter(fleet=>fleet.owner===owner&&fleet.order?.kind==='blockade'&&fleet.order.targetPort).map(fleet=>({
  fleetId:fleet.id,port:fleet.order.targetPort,active:isPortBlockaded(state,fleet.order.targetPort)
 }));
 const convoys=(naval.fleets||[]).filter(fleet=>fleet.owner===owner&&fleet.order?.kind==='supply'&&fleet.order.targetPort).map(fleet=>({
  fleetId:fleet.id,zone:fleet.zone,port:fleet.order.targetPort,cargo:fleet.order.cargo||0
 }));
 const sightings=(naval.reports||[]).filter(report=>report.owner===owner&&['pirate-raid','pirate-clash'].includes(report.kind)&&report.zone&&month-(report.year*12+report.month)>=0&&month-(report.year*12+report.month)<=3).map(report=>({
  zone:report.zone,kind:'piracy',year:report.year,month:report.month
 }));
 const commerce=(naval.routes||[]).filter(route=>[route.last?.buyer,route.last?.seller].includes(owner)&&['piracy','raid'].includes(route.last.reason)&&route.last.zone&&month-(route.last.year*12+route.last.month)>=0&&month-(route.last.year*12+route.last.month)<=3).map(route=>({
  zone:route.last.zone,kind:route.last.reason,year:route.last.year,month:route.last.month
 }));
 const hazards=[...sightings,...commerce].filter((report,index,list)=>list.findIndex(other=>other.zone===report.zone&&other.kind===report.kind)===index);
 return {routes,ports,blockades,convoys,hazards};
}
