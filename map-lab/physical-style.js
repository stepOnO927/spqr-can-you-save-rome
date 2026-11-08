import land from '../mediterranean-land.js';
import ocean from '../mediterranean-ocean.js';
import bathymetry from '../mediterranean-bathymetry.js?v=2';
import rivers from '../rivers.js';
import historical from '../historical-territories.js';

// Natural Earth land and ocean share a coastline. The ocean mask is deliberately
// above the elevation layer so relief never turns the sea into apparent land.
export const physicalStyle={
 version:8,
 sources:{
  land:{type:'geojson',data:land,attribution:'Physical geography: Natural Earth, public domain'},
  ocean:{type:'geojson',data:ocean},
  bathymetry:{type:'geojson',data:bathymetry},
  elevation:{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:4,maxzoom:5,bounds:[-20,18,60,58],attribution:'Elevation © Mapzen / AWS Terrain Tiles and data contributors'},
  'elevation-detail':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:6,maxzoom:6,bounds:[-20,18,60,58],attribution:'Elevation © Mapzen / AWS Terrain Tiles and data contributors'},
  'elevation-fine':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:7,maxzoom:7,bounds:[5,35,22,48],attribution:'Elevation © Mapzen / AWS Terrain Tiles and data contributors'},
  'elevation-ultra':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:8,maxzoom:8,bounds:[5,35,22,48],attribution:'Elevation © Mapzen / AWS Terrain Tiles and data contributors'},
  'elevation-higher':{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:9,maxzoom:15,attribution:'Elevation © Mapzen / AWS Terrain Tiles and data contributors'},
  historical:{type:'geojson',data:historical},
  rivers:{type:'geojson',data:rivers}
 },
 layers:[
  {id:'sea',type:'background',paint:{'background-color':'#356f79'}},
  {id:'land-base',type:'fill',source:'land',paint:{'fill-color':'#c5c4a7','fill-opacity':1}},
  {id:'land-elevation',type:'color-relief',source:'elevation',paint:{'color-relief-opacity':.38,'color-relief-color':['interpolate',['linear'],['elevation'],-100,'#d5d1b2',0,'#d5d1b2',200,'#c8c9aa',650,'#abb899',1200,'#9eab93',2200,'#9da393',3500,'#d0cbb8']}},
  {id:'relief',type:'hillshade',source:'elevation',paint:{'hillshade-exaggeration':.22,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-detail',type:'color-relief',source:'elevation-detail',minzoom:6,paint:{'color-relief-opacity':.22,'color-relief-color':['interpolate',['linear'],['elevation'],-100,'#d5d1b2',0,'#d5d1b2',200,'#c8c9aa',650,'#abb899',1200,'#9eab93',2200,'#9da393',3500,'#d0cbb8']}},
  {id:'relief-detail',type:'hillshade',source:'elevation-detail',minzoom:6,paint:{'hillshade-exaggeration':.14,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-fine',type:'color-relief',source:'elevation-fine',minzoom:7,paint:{'color-relief-opacity':.15,'color-relief-color':['interpolate',['linear'],['elevation'],-100,'#d5d1b2',0,'#d5d1b2',200,'#c8c9aa',650,'#abb899',1200,'#9eab93',2200,'#9da393',3500,'#d0cbb8']}},
  {id:'relief-fine',type:'hillshade',source:'elevation-fine',minzoom:7,paint:{'hillshade-exaggeration':.1,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-ultra',type:'color-relief',source:'elevation-ultra',minzoom:8,paint:{'color-relief-opacity':.1,'color-relief-color':['interpolate',['linear'],['elevation'],-100,'#d5d1b2',0,'#d5d1b2',200,'#c8c9aa',650,'#abb899',1200,'#9eab93',2200,'#9da393',3500,'#d0cbb8']}},
  {id:'relief-ultra',type:'hillshade',source:'elevation-ultra',minzoom:8,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-higher',type:'color-relief',source:'elevation-higher',minzoom:9,paint:{'color-relief-opacity':.08,'color-relief-color':['interpolate',['linear'],['elevation'],-100,'#d5d1b2',0,'#d5d1b2',200,'#c8c9aa',650,'#abb899',1200,'#9eab93',2200,'#9da393',3500,'#d0cbb8']}},
  {id:'relief-higher',type:'hillshade',source:'elevation-higher',minzoom:9,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'sea-mask',type:'fill',source:'ocean',paint:{'fill-color':'#356f79','fill-opacity':1}},
  {id:'land-wash',type:'fill',source:'land',paint:{'fill-color':'#d6d2b2','fill-opacity':.08}},
  {id:'coastal-halo',type:'line',source:'land',paint:{'line-color':'#e1d2aa','line-width':['interpolate',['linear'],['zoom'],4,3,8,5],'line-blur':2,'line-opacity':.27}},
  {id:'coastline',type:'line',source:'land',paint:{'line-color':'#efe1bb','line-width':['interpolate',['linear'],['zoom'],4,.9,8,1.7],'line-opacity':.87}},
  {id:'waterways',type:'line',source:'rivers',paint:{'line-color':'#5f8d92','line-opacity':.9,'line-width':['interpolate',['linear'],['zoom'],4,.7,8,1.6]}},
  {id:'control',type:'fill',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'fill-color':['match',['get','id'],'gaul','#ad4d3d','narbo','#ad4d3d','italy','#b0a480','greece','#778994','sicilia','#778994','hispania','#778994','asia','#778994','syria','#778994','africa','#778994','#aa9c75'],'fill-opacity':.30}},
  {id:'province-outline',type:'line',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'line-color':'#f1deb0','line-opacity':.72,'line-width':1.25}},
  {id:'sea-final',type:'fill',source:'ocean',paint:{'fill-color':'#356f79','fill-opacity':1}},
  {id:'depth-200',type:'fill',source:'bathymetry',filter:['==',['get','depth'],200],paint:{'fill-color':'#285d6d','fill-opacity':.46}},
  {id:'depth-1000',type:'fill',source:'bathymetry',filter:['==',['get','depth'],1000],paint:{'fill-color':'#225565','fill-opacity':.42}},
  {id:'depth-2000',type:'fill',source:'bathymetry',filter:['==',['get','depth'],2000],paint:{'fill-color':'#1b475a','fill-opacity':.3}},
  {id:'depth-3000',type:'fill',source:'bathymetry',filter:['==',['get','depth'],3000],paint:{'fill-color':'#123d52','fill-opacity':.22}},
  {id:'isobath-200',type:'line',source:'bathymetry',filter:['==',['get','depth'],200],paint:{'line-color':'#a5c5bd','line-width':['interpolate',['linear'],['zoom'],4,1,8,1.5],'line-blur':1.2,'line-opacity':.12}},
  {id:'isobath-1000',type:'line',source:'bathymetry',filter:['==',['get','depth'],1000],paint:{'line-color':'#a5b8ad','line-width':.65,'line-opacity':.12}},
  {id:'isobath-2000',type:'line',source:'bathymetry',filter:['==',['get','depth'],2000],paint:{'line-color':'#a5b8ad','line-width':.65,'line-opacity':.09}},
  {id:'coastline-finish',type:'line',source:'land',paint:{'line-color':'#efe1bb','line-width':['interpolate',['linear'],['zoom'],4,1,8,1.8],'line-opacity':.9}}
 ]
};
