import land from '../mediterranean-land.js';
import ocean from '../mediterranean-ocean.js';
import rivers from '../rivers.js';
import historical from '../historical-territories.js';

// Natural Earth land and ocean share a coastline. The ocean mask is deliberately
// above the elevation layer so relief never turns the sea into apparent land.
export const physicalStyle={
 version:8,
 sources:{
  land:{type:'geojson',data:land,attribution:'Physical geography: Natural Earth, public domain'},
  ocean:{type:'geojson',data:ocean},
  elevation:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:15,attribution:'Elevation © Mapzen / AWS Terrain Tiles and data contributors'},
  historical:{type:'geojson',data:historical},
  rivers:{type:'geojson',data:rivers}
 },
 layers:[
  {id:'sea',type:'background',paint:{'background-color':'#174656'}},
  {id:'land-base',type:'fill',source:'land',paint:{'fill-color':'#c8b991','fill-opacity':1}},
  {id:'relief',type:'hillshade',source:'elevation',paint:{'hillshade-exaggeration':.42,'hillshade-shadow-color':'#6c6653','hillshade-highlight-color':'#f6e9c8','hillshade-accent-color':'#9c8b6d'}},
  {id:'sea-mask',type:'fill',source:'ocean',paint:{'fill-color':'#174656','fill-opacity':1}},
  {id:'land-wash',type:'fill',source:'land',paint:{'fill-color':'#d1c29d','fill-opacity':.12}},
  {id:'coastal-halo',type:'line',source:'land',paint:{'line-color':'#e1d2aa','line-width':['interpolate',['linear'],['zoom'],4,4,8,7],'line-blur':3,'line-opacity':.42}},
  {id:'coastline',type:'line',source:'land',paint:{'line-color':'#efe1bb','line-width':['interpolate',['linear'],['zoom'],4,1.15,8,2.4],'line-opacity':.94}},
  {id:'waterways',type:'line',source:'rivers',paint:{'line-color':'#5f8d92','line-opacity':.9,'line-width':['interpolate',['linear'],['zoom'],4,.7,8,1.6]}},
  {id:'control',type:'fill',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'fill-color':['match',['get','id'],'gaul','#ad4d3d','narbo','#ad4d3d','italy','#b0a480','greece','#778994','sicilia','#778994','hispania','#778994','asia','#778994','syria','#778994','africa','#778994','#aa9c75'],'fill-opacity':.30}},
  {id:'province-outline',type:'line',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'line-color':'#f1deb0','line-opacity':.72,'line-width':1.25}},
  {id:'sea-final',type:'fill',source:'ocean',paint:{'fill-color':'#174656','fill-opacity':1}},
  {id:'coastline-finish',type:'line',source:'land',paint:{'line-color':'#efe1bb','line-width':['interpolate',['linear'],['zoom'],4,1.1,8,2.2],'line-opacity':.94}}
 ]
};
