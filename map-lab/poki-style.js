// Offline Poki atlas: Natural Earth-derived local coastline data, with honest
// approximate historical overlays. This replaces remote imagery and DEM tiles.
import land from '../rome60.js';
export function offlineMapStyle(historical,rivers){
 return {version:8,sources:{
  land:{type:'geojson',data:land},
  historical:{type:'geojson',data:historical},
  rivers:{type:'geojson',data:rivers}
 },layers:[
  {id:'sea',type:'background',paint:{'background-color':'#243d45'}},
  {id:'landcover',type:'fill',source:'land',paint:{'fill-color':'#88917c','fill-opacity':1}},
  {id:'relief',type:'line',source:'land',paint:{'line-color':'#c8c39c','line-opacity':.65,'line-width':1}},
  {id:'waterways',type:'line',source:'rivers',paint:{'line-color':'#95bbbc','line-opacity':.8,'line-width':1.1}},
  {id:'control',type:'fill',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'fill-color':['match',['get','id'],'gaul','#ad4d3d','narbo','#ad4d3d','italy','#b0a480','greece','#778994','sicilia','#778994','hispania','#778994','asia','#778994','syria','#778994','africa','#778994','#aa9c75'],'fill-opacity':.3}},
  {id:'province-outline',type:'line',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'line-color':'#f1deb0','line-opacity':.72,'line-width':1.25}}
 ]};
}
