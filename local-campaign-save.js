export function validPlayableCampaign(data){
 if(!data||!Array.isArray(data.regions)||!data.regions.length||!Array.isArray(data.armies)||!data.factions?.[data.player])return false;
 if(['caesar','senate'].includes(data.player))return true;
 return data.localCampaign?.id===data.player&&data.scenario==='local_city'&&data.regions.some(region=>region.localEntities?.some(entity=>entity.id===data.player&&entity.type==='city_state'&&entity.procedural));
}
