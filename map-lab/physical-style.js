import land from '../mediterranean-land.js';
import ocean from '../mediterranean-ocean.js?v=2';
import bathymetry from '../mediterranean-bathymetry.js?v=2';
import rivers from '../mediterranean-rivers.js';
import lakes from '../mediterranean-lakes.js';
import historical from '../historical-territories.js';

// An approximate alluvial plain between the two mapped Nile branches. The
// matched sea mask clips its northern edge to the GSHHG shoreline.
const rosetta=rivers.features.find(feature=>feature.properties.name==='Rosetta Branch').geometry.coordinates;
const damietta=rivers.features.find(feature=>feature.properties.name==='Damietta Branch').geometry.coordinates;
const nileDelta={type:'Feature',properties:{name:'Nile Delta (approximate)'},geometry:{type:'Polygon',coordinates:[[...rosetta,...damietta.slice().reverse(),rosetta[0]]]}};

// At local scale, separate lowland, upland and exposed rock more clearly.
// These are modern elevation bands, not reconstructed ancient land cover.
const localElevationPalette=['interpolate',['linear'],['elevation'],-100,'#e5d9b8',0,'#dfd5b1',100,'#c6cba1',300,'#a7b88d',700,'#829c7d',1200,'#6c8676',1800,'#8b9384',2600,'#b9b8a5',3500,'#e4dfcc'];
const regionalElevationPalette=['interpolate',['linear'],['elevation'],-100,'#ded6b8',0,'#d8d2b0',100,'#c3c9a1',300,'#a3b68d',700,'#849f80',1200,'#6d8979',1800,'#838e83',2600,'#b0b2a4',3500,'#ded9c7'];
const terrainAttribution='Elevation: Mapzen Terrain Tiles; Copernicus EU-DEM, NOAA ETOPO1 and USGS SRTM/GMTED2010 contributors';

// GSHHG land and ocean derive from the same L1 shoreline. The ocean mask is deliberately
// above the elevation layer so relief never turns the sea into apparent land.
export const physicalStyle={
 version:8,
 sources:{
  land:{type:'geojson',data:land,attribution:'Shorelines: GSHHG 2.3.7, Wessel and Smith, LGPL'},
  ocean:{type:'geojson',data:ocean},
  bathymetry:{type:'geojson',data:bathymetry},
  elevation:{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:4,maxzoom:5,bounds:[-20,18,60,58],attribution:terrainAttribution},
  'elevation-detail':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:6,maxzoom:6,bounds:[-20,18,60,58],attribution:terrainAttribution},
  'elevation-fine':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:7,maxzoom:7,bounds:[-20,18,60,58],attribution:terrainAttribution},
  'elevation-aegean-ultra':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:8,maxzoom:8,bounds:[21.9,34,31,43],attribution:terrainAttribution},
  'elevation-aegean-higher':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:9,maxzoom:9,bounds:[21.9,34,31,43],attribution:terrainAttribution},
  'elevation-iberia-ultra':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:8,maxzoom:8,bounds:[-11,35,5,45],attribution:terrainAttribution},
  'elevation-iberia-higher':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:9,maxzoom:9,bounds:[-11,35,5,45],attribution:terrainAttribution},
  'elevation-gaul-ultra':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:8,maxzoom:8,bounds:[-1,45,6,51],attribution:terrainAttribution},
  'elevation-gaul-higher':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:9,maxzoom:9,bounds:[-1,45,6,51],attribution:terrainAttribution},
  'elevation-ultra':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:8,maxzoom:8,bounds:[5,35,22,48],attribution:terrainAttribution},
  'elevation-higher':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:9,maxzoom:9,bounds:[5,35,22,48],attribution:terrainAttribution},
  'elevation-egypt-ultra':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:8,maxzoom:8,bounds:[24,28,36,34],attribution:terrainAttribution},
  'elevation-egypt-higher':{type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:9,maxzoom:9,bounds:[24,28,36,34],attribution:terrainAttribution},
  historical:{type:'geojson',data:historical},
  rivers:{type:'geojson',data:rivers,attribution:'Hydrography: Natural Earth 1:10m, public domain'},
  'nile-delta':{type:'geojson',data:nileDelta,attribution:'Approximate Nile Delta between Natural Earth river branches'},
  lakes:{type:'geojson',data:lakes},
  landcover:{type:'raster',tiles:['./landcover/{z}/{x}/{y}.png'],tileSize:256,minzoom:4,maxzoom:6,bounds:[-30,10,65,65],attribution:'Natural Earth II idealized land cover, public domain'}
 },
 layers:[
  {id:'sea',type:'background',paint:{'background-color':'#356f79'}},
  {id:'land-base',type:'fill',source:'land',paint:{'fill-color':'#d4d0ae','fill-opacity':1}},
  {id:'land-elevation',type:'color-relief',source:'elevation',paint:{'color-relief-opacity':['interpolate',['linear'],['zoom'],5.5,.64,6.5,0],'color-relief-color':regionalElevationPalette}},
  {id:'relief',type:'hillshade',source:'elevation',paint:{'hillshade-exaggeration':.22,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-detail',type:'color-relief',source:'elevation-detail',minzoom:6,paint:{'color-relief-opacity':['interpolate',['linear'],['zoom'],6,.78,7.5,0],'color-relief-color':regionalElevationPalette}},
  {id:'relief-detail',type:'hillshade',source:'elevation-detail',minzoom:6,paint:{'hillshade-exaggeration':.14,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-fine',type:'color-relief',source:'elevation-fine',minzoom:7,paint:{'color-relief-opacity':.82,'color-relief-color':regionalElevationPalette}},
  {id:'relief-fine',type:'hillshade',source:'elevation-fine',minzoom:7,paint:{'hillshade-exaggeration':.1,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-aegean-ultra',type:'color-relief',source:'elevation-aegean-ultra',minzoom:8,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-aegean-ultra',type:'hillshade',source:'elevation-aegean-ultra',minzoom:8,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-aegean-higher',type:'color-relief',source:'elevation-aegean-higher',minzoom:9,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-aegean-higher',type:'hillshade',source:'elevation-aegean-higher',minzoom:9,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-iberia-ultra',type:'color-relief',source:'elevation-iberia-ultra',minzoom:8,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-iberia-ultra',type:'hillshade',source:'elevation-iberia-ultra',minzoom:8,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-iberia-higher',type:'color-relief',source:'elevation-iberia-higher',minzoom:9,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-iberia-higher',type:'hillshade',source:'elevation-iberia-higher',minzoom:9,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-gaul-ultra',type:'color-relief',source:'elevation-gaul-ultra',minzoom:8,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-gaul-ultra',type:'hillshade',source:'elevation-gaul-ultra',minzoom:8,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-gaul-higher',type:'color-relief',source:'elevation-gaul-higher',minzoom:9,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-gaul-higher',type:'hillshade',source:'elevation-gaul-higher',minzoom:9,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-ultra',type:'color-relief',source:'elevation-ultra',minzoom:8,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-ultra',type:'hillshade',source:'elevation-ultra',minzoom:8,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-higher',type:'color-relief',source:'elevation-higher',minzoom:9,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-higher',type:'hillshade',source:'elevation-higher',minzoom:9,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-egypt-ultra',type:'color-relief',source:'elevation-egypt-ultra',minzoom:8,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-egypt-ultra',type:'hillshade',source:'elevation-egypt-ultra',minzoom:8,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-egypt-higher',type:'color-relief',source:'elevation-egypt-higher',minzoom:9,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:'relief-egypt-higher',type:'hillshade',source:'elevation-egypt-higher',minzoom:9,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'idealized-landcover',type:'raster',source:'landcover',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],4,.86,6,.74,7.2,0],'raster-fade-duration':0}},
  {id:'nile-delta-alluvium',type:'fill',source:'nile-delta',paint:{'fill-color':'#98a77e','fill-opacity':['interpolate',['linear'],['zoom'],4,.16,7,.31,9,.24]}},
  {id:'sea-mask',type:'fill',source:'ocean',paint:{'fill-color':'#356f79','fill-opacity':1}},
  {id:'land-wash',type:'fill',source:'land',paint:{'fill-color':'#d6d2b2','fill-opacity':.08}},
  {id:'coastline',type:'line',source:'land',paint:{'line-color':'#efe1bb','line-width':['interpolate',['linear'],['zoom'],4,.9,8,1.7],'line-opacity':.87}},
  {id:'natural-lakes',type:'fill',source:'lakes',paint:{'fill-color':'#5b9093','fill-opacity':.88}},
  {id:'lake-shores',type:'line',source:'lakes',paint:{'line-color':'#c6d2ba','line-opacity':.65,'line-width':.65}},
  {id:'waterways-major',type:'line',source:'rivers',filter:['<=',['get','rank'],6],paint:{'line-color':'#5c9293','line-opacity':.88,'line-width':['interpolate',['linear'],['zoom'],4,.65,7,1.15,9,2]}},
  {id:'waterways-minor',type:'line',source:'rivers',minzoom:7,filter:['>',['get','rank'],6],paint:{'line-color':'#67999a','line-opacity':.72,'line-width':['interpolate',['linear'],['zoom'],7,.55,9,1.05]}},
  // These broad historical polygons orient the overview, but their straight
  // source edges should not masquerade as surveyed provincial borders locally.
  {id:'control',type:'fill',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'fill-color':['match',['get','id'],'gaul','#ad4d3d','narbo','#ad4d3d','italy','#b0a480','greece','#778994','sicilia','#778994','hispania','#778994','asia','#778994','syria','#778994','africa','#778994','#aa9c75'],'fill-opacity':['interpolate',['linear'],['zoom'],6,.30,7,.18,8.5,0]}},
  {id:'province-outline',type:'line',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'line-color':'#f1deb0','line-opacity':['interpolate',['linear'],['zoom'],6,.72,7,.4,8.5,0],'line-width':1.25}},
  {id:'sea-final',type:'fill',source:'ocean',paint:{'fill-color':'#356f79','fill-opacity':1}},
  // Natural Earth bathymetry is an overview dataset. Its angular boundaries
  // should disappear before close zoom, where they read as false sea cliffs.
  {id:'depth-200',type:'fill',source:'bathymetry',filter:['==',['get','depth'],200],paint:{'fill-color':'#285d6d','fill-opacity':['interpolate',['linear'],['zoom'],5,.46,7,.32,8.5,0]}},
  {id:'depth-1000',type:'fill',source:'bathymetry',filter:['==',['get','depth'],1000],paint:{'fill-color':'#225565','fill-opacity':['interpolate',['linear'],['zoom'],5,.42,7,.25,8.5,0]}},
  {id:'depth-2000',type:'fill',source:'bathymetry',filter:['==',['get','depth'],2000],paint:{'fill-color':'#1b475a','fill-opacity':['interpolate',['linear'],['zoom'],5,.3,7,.14,8.5,0]}},
  {id:'depth-3000',type:'fill',source:'bathymetry',filter:['==',['get','depth'],3000],paint:{'fill-color':'#123d52','fill-opacity':['interpolate',['linear'],['zoom'],5,.22,7,.1,8.5,0]}},
  {id:'isobath-200',type:'line',source:'bathymetry',filter:['==',['get','depth'],200],paint:{'line-color':'#a5c5bd','line-width':['interpolate',['linear'],['zoom'],4,1,8,1.5],'line-blur':1.2,'line-opacity':['interpolate',['linear'],['zoom'],5,.12,7,.08,8.5,0]}},
  {id:'isobath-1000',type:'line',source:'bathymetry',filter:['==',['get','depth'],1000],paint:{'line-color':'#a5b8ad','line-width':.65,'line-opacity':['interpolate',['linear'],['zoom'],5,.12,7,.08,8.5,0]}},
  {id:'isobath-2000',type:'line',source:'bathymetry',filter:['==',['get','depth'],2000],paint:{'line-color':'#a5b8ad','line-width':.65,'line-opacity':['interpolate',['linear'],['zoom'],5,.09,7,.05,8.5,0]}},
  // Draw the coastal glow above the final ocean fill; otherwise the sea mask
  // erases its seaward half. It follows shoreline geometry, not a depth claim.
  {id:'coastal-halo',type:'line',source:'land',paint:{'line-color':'#92beb8','line-width':['interpolate',['linear'],['zoom'],4,2,8,9,9,14],'line-blur':['interpolate',['linear'],['zoom'],4,1,9,6],'line-opacity':['interpolate',['linear'],['zoom'],4,.04,7,.13,9,.22]}},
  {id:'coastline-finish',type:'line',source:'land',paint:{'line-color':'#efe1bb','line-width':['interpolate',['linear'],['zoom'],4,1,8,1.8],'line-opacity':.9}}
 ]
};

// These separate source bounds avoid requesting empty sea or land tiles across
// the large gaps between the remaining eastern and North African theaters.
const regionalDetail=[
 ['pontic',[30,38,38,47]],
 ['armenia',[39,36,46,42]],
 ['syria',[34,32,40,38]],
 ['parthia',[42,30,51,38]],
 ['leptis',[12,31,16,34]]
];
const localLayers=[];
for(const [region,bounds] of regionalDetail)for(const [level,zoom] of [['ultra',8],['higher',9]]){
 const source=`elevation-${region}-${level}`;
 physicalStyle.sources[source]={type:'raster-dem',tiles:['./terrain/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,minzoom:zoom,maxzoom:zoom,bounds,attribution:terrainAttribution};
 localLayers.push(
  {id:`land-${source}`,type:'color-relief',source,minzoom:zoom,paint:{'color-relief-opacity':.94,'color-relief-color':localElevationPalette}},
  {id:`relief-${region}-${level}`,type:'hillshade',source,minzoom:zoom,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}}
 );
}
physicalStyle.layers.splice(physicalStyle.layers.findIndex(layer=>layer.id==='land-elevation-ultra'),0,...localLayers);
