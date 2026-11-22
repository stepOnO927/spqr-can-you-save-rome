import land from '../mediterranean-land.js?v=5';
import ocean from '../mediterranean-ocean.js?v=5';
import bathymetry from '../mediterranean-bathymetry.js?v=2';
import rivers from '../mediterranean-rivers.js';
import poRiverDetail from '../po-river-detail.js';
import centralItalyRivers from '../central-italy-rivers.js?v=1';
import lakes from '../mediterranean-lakes.js';
import gardaLakeDetail from '../garda-lake-detail.js';
import poHistoricCoast from '../po-historic-coast.js';
import ravennaLandforms from './ravenna-paleolandforms.js?v=1';
import historical from '../historical-territories.js';
import egyptContours from './egypt-contours.js?v=1';
import italyContours from './italy-contours.js?v=1';

// An approximate alluvial plain between the two mapped Nile branches. The
// matched sea mask clips its northern edge to the GSHHG shoreline.
const rosetta=rivers.features.find(feature=>feature.properties.name==='Rosetta Branch').geometry.coordinates;
const damietta=rivers.features.find(feature=>feature.properties.name==='Damietta Branch').geometry.coordinates;
const nileDelta={type:'Feature',properties:{name:'Nile Delta (approximate)'},geometry:{type:'Polygon',coordinates:[[...rosetta,...damietta.slice().reverse(),rosetta[0]]]}};

// At local scale, separate lowland, upland and exposed rock more clearly.
// These are modern elevation bands, not reconstructed ancient land cover.
const localElevationPalette=['interpolate',['linear'],['elevation'],-100,'#e5d9b8',0,'#dfd5b1',100,'#c6cba1',300,'#a7b88d',700,'#829c7d',1200,'#6c8676',1800,'#8b9384',2600,'#b9b8a5',3500,'#e4dfcc'];
// Around the Nile Delta the local DEM changes mostly within 0–50 m. Use
// narrower earth-tone intervals there so real low relief remains legible.
const egyptElevationPalette=['interpolate',['linear'],['elevation'],-100,'#e8ddb9',0,'#e3d9b6',10,'#dfd0aa',25,'#d7c399',50,'#cbb288',100,'#bea178',300,'#aa8d6c',700,'#887866',1200,'#69796f',1800,'#8b9384',2600,'#b9b8a5',3500,'#e4dfcc'];
const regionalElevationPalette=['interpolate',['linear'],['elevation'],-100,'#ded6b8',0,'#d8d2b0',100,'#c3c9a1',300,'#a3b68d',700,'#849f80',1200,'#6d8979',1800,'#838e83',2600,'#b0b2a4',3500,'#ded9c7'];
const terrainAttribution='Elevation: Mapzen Terrain Tiles; Copernicus EU-DEM, NOAA ETOPO1 and USGS SRTM/GMTED2010 contributors';
const euHydroAttribution="Modern Po, Tiber, Arno and Garda: European Union's Copernicus Land Monitoring Service information, EU-Hydro v1.3, DOI 10.2909/393359a7-7ebd-4a52-80ac-1a18d5f3db9c; adapted crops";

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
  'po-river-detail':{type:'geojson',data:poRiverDetail,attribution:euHydroAttribution},
  'central-italy-rivers':{type:'geojson',data:centralItalyRivers,attribution:euHydroAttribution},
  'po-historic-coast':{type:'geojson',data:poHistoricCoast,attribution:'Approximate undated historical shoreline: Ancient World Mapping Center and OpenStreetMap contributors, ODbL 1.0; adapted Po crop'},
  'ravenna-paleolandforms':{type:'geojson',data:ravennaLandforms,attribution:'Michele Abballe, PalaeoDEMs of the hinterland of Ravenna, Roman-period (~100 CE) palaeoLandforms; CC0, DOI 10.5281/zenodo.14534157'},
  'nile-delta':{type:'geojson',data:nileDelta,attribution:'Approximate Nile Delta between Natural Earth river branches'},
  'nile-delta-wash':{type:'image',url:'./nile-delta-wash.png',coordinates:[[29.8,31.7],[32,31.7],[32,30],[29.8,30]]},
  lakes:{type:'geojson',data:lakes},
  'garda-lake-detail':{type:'geojson',data:gardaLakeDetail,attribution:euHydroAttribution},
  'egypt-contours':{type:'geojson',data:egyptContours,attribution:terrainAttribution},
  'italy-contours':{type:'geojson',data:italyContours,attribution:terrainAttribution},
  landcover:{type:'raster',tiles:['./landcover/{z}/{x}/{y}.png'],tileSize:256,minzoom:4,maxzoom:6,bounds:[-30,10,65,65],attribution:'Natural Earth II idealized land cover, public domain'}
 },
 layers:[
  {id:'sea',type:'background',paint:{'background-color':'#2b626d'}},
  {id:'land-base',type:'fill',source:'land',paint:{'fill-color':'#d4d0ae','fill-opacity':1}},
  {id:'land-elevation',type:'color-relief',source:'elevation',maxzoom:6.5,paint:{'color-relief-opacity':['interpolate',['linear'],['zoom'],5.5,.64,6.5,0],'color-relief-color':regionalElevationPalette}},
  {id:'relief',type:'hillshade',source:'elevation',paint:{'hillshade-exaggeration':.22,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-detail',type:'color-relief',source:'elevation-detail',minzoom:6,maxzoom:7.5,paint:{'color-relief-opacity':['interpolate',['linear'],['zoom'],6,.78,7.5,0],'color-relief-color':regionalElevationPalette}},
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
  // The central Mediterranean detail source covers Italian close views. Keep
  // its color texture light; other ranges need stronger altitude contrast.
  {id:'land-elevation-ultra',type:'color-relief',source:'elevation-ultra',minzoom:8,paint:{'color-relief-opacity':.24,'color-relief-color':localElevationPalette}},
  {id:'relief-ultra',type:'hillshade',source:'elevation-ultra',minzoom:8,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-higher',type:'color-relief',source:'elevation-higher',minzoom:9,paint:{'color-relief-opacity':.24,'color-relief-color':localElevationPalette}},
  {id:'relief-higher',type:'hillshade',source:'elevation-higher',minzoom:9,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-egypt-ultra',type:'color-relief',source:'elevation-egypt-ultra',minzoom:8,paint:{'color-relief-opacity':.94,'color-relief-color':egyptElevationPalette}},
  {id:'relief-egypt-ultra',type:'hillshade',source:'elevation-egypt-ultra',minzoom:8,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'land-elevation-egypt-higher',type:'color-relief',source:'elevation-egypt-higher',minzoom:9,paint:{'color-relief-opacity':.94,'color-relief-color':egyptElevationPalette}},
  {id:'relief-egypt-higher',type:'hillshade',source:'elevation-egypt-higher',minzoom:9,paint:{'hillshade-exaggeration':.08,'hillshade-shadow-color':'#a39e86','hillshade-highlight-color':'#f2eddc','hillshade-accent-color':'#c4baa0'}},
  {id:'idealized-landcover',type:'raster',source:'landcover',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],4,.86,6,.74,7.2,0],'raster-fade-duration':0}},
  {id:'nile-delta-alluvium',type:'fill',source:'nile-delta',paint:{'fill-color':'#829a72','fill-opacity':['interpolate',['linear'],['zoom'],4,.16,7,.26,8.2,.25,8.7,.08,9,0]}},
  {id:'nile-delta-close-wash',type:'raster',source:'nile-delta-wash',minzoom:8.2,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],8.2,0,8.7,.45,9,.65],'raster-fade-duration':0}},
  {id:'egypt-contours-minor',type:'line',source:'egypt-contours',minzoom:8.25,filter:['<',['get','height'],50],paint:{'line-color':'#8a7255','line-width':['interpolate',['linear'],['zoom'],8.25,.5,9.2,.8],'line-opacity':.16}},
  {id:'egypt-contours-major',type:'line',source:'egypt-contours',minzoom:8.25,filter:['>=',['get','height'],50],paint:{'line-color':'#785f49','line-width':['interpolate',['linear'],['zoom'],8.25,.7,9.2,1.05],'line-opacity':.2}},
  // Modern DEM elevation creates the contour shapes; the sparse source
  // polygons can look angular at this scale, so keep their lines secondary.
  {id:'italy-contours-minor',type:'line',source:'italy-contours',minzoom:8.3,filter:['<',['get','height'],1000],paint:{'line-color':'#6d694c','line-width':['interpolate',['linear'],['zoom'],8.3,.35,9.2,.65],'line-opacity':['interpolate',['linear'],['zoom'],8.3,0,9.2,.11]}},
  {id:'italy-contours-major',type:'line',source:'italy-contours',minzoom:8.3,filter:['>=',['get','height'],1000],paint:{'line-color':'#565e4a','line-width':['interpolate',['linear'],['zoom'],8.3,.45,9.2,.85],'line-opacity':['interpolate',['linear'],['zoom'],8.3,0,9.2,.14]}},
  {id:'land-wash',type:'fill',source:'land',paint:{'fill-color':'#d6d2b2','fill-opacity':.08}},
  // A local archaeological reconstruction of ridges, not a shore mask.
  {id:'ravenna-ridge-fill',type:'fill',source:'ravenna-paleolandforms',minzoom:8.2,layout:{visibility:'none'},paint:{'fill-color':['match',['get','kind'],'beach-ridge','#b38d65','#758975'],'fill-opacity':['interpolate',['linear'],['zoom'],8.2,.08,9,.23]}},
  {id:'ravenna-ridge-edge',type:'line',source:'ravenna-paleolandforms',minzoom:8.2,layout:{visibility:'none','line-join':'round','line-cap':'round'},paint:{'line-color':['match',['get','kind'],'beach-ridge','#8c6d4c','#60775e'],'line-width':['interpolate',['linear'],['zoom'],8.2,.45,9,.9],'line-opacity':['interpolate',['linear'],['zoom'],8.2,.13,9,.35]}},
  {id:'natural-lakes',type:'fill',source:'lakes',filter:['!=',['get','name'],'Lago di Garda'],paint:{'fill-color':'#5b9093','fill-opacity':.88}},
  {id:'garda-overview',type:'fill',source:'lakes',maxzoom:8,filter:['==',['get','name'],'Lago di Garda'],paint:{'fill-color':'#5b9093','fill-opacity':.88}},
  {id:'garda-close',type:'fill',source:'garda-lake-detail',minzoom:8,paint:{'fill-color':'#5b9093','fill-opacity':.88}},
  {id:'lake-shores',type:'line',source:'lakes',filter:['!=',['get','name'],'Lago di Garda'],paint:{'line-color':'#c6d2ba','line-opacity':.65,'line-width':.65}},
  {id:'garda-overview-shore',type:'line',source:'lakes',maxzoom:8,filter:['==',['get','name'],'Lago di Garda'],paint:{'line-color':'#c6d2ba','line-opacity':.65,'line-width':.65}},
  {id:'garda-close-shore',type:'line',source:'garda-lake-detail',minzoom:8,paint:{'line-color':'#c6d2ba','line-opacity':.65,'line-width':.65}},
  {id:'waterways-major',type:'line',source:'rivers',filter:['all',['<=',['get','rank'],6],['!=',['get','name'],'Po']],paint:{'line-color':'#5c9293','line-opacity':.88,'line-width':['interpolate',['linear'],['zoom'],4,.65,7,1.15,9,2]}},
  {id:'waterways-po-overview',type:'line',source:'rivers',maxzoom:8.1,filter:['==',['get','name'],'Po'],paint:{'line-color':'#5c9293','line-opacity':.88,'line-width':['interpolate',['linear'],['zoom'],4,.65,7,1.15,8.1,1.4]}},
  {id:'waterways-po-close',type:'line',source:'po-river-detail',minzoom:8.1,paint:{'line-color':'#5c9293','line-opacity':.78,'line-width':['interpolate',['linear'],['zoom'],8.1,1,8.6,1.2,9.2,1.55]}},
  {id:'waterways-minor',type:'line',source:'rivers',minzoom:7,filter:['all',['>',['get','rank'],6],['!=',['get','name'],'Tevere']],paint:{'line-color':'#67999a','line-opacity':.72,'line-width':['interpolate',['linear'],['zoom'],7,.55,9,1.05]}},
  {id:'waterways-tiber-overview',type:'line',source:'rivers',minzoom:7,maxzoom:8.1,filter:['==',['get','name'],'Tevere'],paint:{'line-color':'#67999a','line-opacity':.72,'line-width':['interpolate',['linear'],['zoom'],7,.55,8.1,.95]}},
  {id:'waterways-central-italy',type:'line',source:'central-italy-rivers',minzoom:8.1,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#5c9293','line-opacity':.78,'line-width':['interpolate',['linear'],['zoom'],8.1,.85,9.2,1.45]}},
  // These broad historical polygons orient the overview, but their straight
  // source edges should not masquerade as surveyed provincial borders locally.
  {id:'control',type:'fill',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'fill-color':['match',['get','id'],'gaul','#ad4d3d','narbo','#ad4d3d','italy','#b0a480','greece','#778994','sicilia','#778994','hispania','#778994','asia','#778994','syria','#778994','africa','#778994','#aa9c75'],'fill-opacity':['interpolate',['linear'],['zoom'],6,.30,7,.18,8.5,0]}},
  {id:'province-outline',type:'line',source:'historical',filter:['!=',['get','id'],'roman-extent'],paint:{'line-color':'#f1deb0','line-opacity':['interpolate',['linear'],['zoom'],6,.72,7,.4,8.5,0],'line-width':1.25}},
  {id:'sea-final',type:'fill',source:'ocean',paint:{'fill-color':'#2b626d','fill-opacity':1}},
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
  {id:'coastal-halo',type:'line',source:'land',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#a6c9c0','line-width':['interpolate',['linear'],['zoom'],4,2,8,5,9,7],'line-blur':['interpolate',['linear'],['zoom'],4,1,9,2],'line-opacity':['interpolate',['linear'],['zoom'],4,.04,7,.12,9,.11]}},
  {id:'coastline-finish',type:'line',source:'land',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#f0e4c4','line-width':['interpolate',['linear'],['zoom'],4,1,8,2,9,2.3],'line-opacity':['interpolate',['linear'],['zoom'],4,.9,8,.82,9,.87]}},
  // This visual band follows an undated reference line, not an ancient land mask.
  {id:'po-historic-band',type:'line',source:'po-historic-coast',filter:['==',['get','kind'],'historical-shore'],minzoom:8.2,layout:{visibility:'none','line-join':'round','line-cap':'round'},paint:{'line-color':'#a5b599','line-width':['interpolate',['linear'],['zoom'],8.2,9,9,22],'line-blur':['interpolate',['linear'],['zoom'],8.2,3,9,6],'line-opacity':.26}},
  {id:'po-historic-shore',type:'line',source:'po-historic-coast',filter:['==',['get','kind'],'historical-shore'],minzoom:8.2,layout:{visibility:'none'},paint:{'line-color':'#84694d','line-width':['interpolate',['linear'],['zoom'],8.2,1,9,1.6],'line-opacity':.78,'line-dasharray':[3,2]}}
 ]
};

// A small coast image is cheaper to draw at campaign scale; the exact GSHHG
// polygons return before local inspection. Tiles stay at 2048 px per side so
// the overview does not depend on one unusually large browser texture.
const overviewCutoff=5.85;
const coastMerc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
const coastLat=value=>(2*Math.atan(Math.exp(value))-Math.PI/2)*180/Math.PI;
const coastTop=coastMerc(58),coastBottom=coastMerc(18);
for(const layer of physicalStyle.layers){
 if(layer.source==='land'||layer.source==='ocean')layer.minzoom=Math.max(layer.minzoom||0,overviewCutoff);
}
function insertOverviewLayer(before,id,source){
 const index=physicalStyle.layers.findIndex(layer=>layer.id===before);
 // Retain the image beneath incoming vectors for a short overlap; otherwise
 // a fast zoom can expose an empty land/ocean tile while GeoJSON prepares.
 physicalStyle.layers.splice(index,0,{id,type:'raster',source,maxzoom:6.5,paint:{'raster-opacity':1,'raster-fade-duration':0}});
}
for(let row=0;row<2;row++)for(let col=0;col<4;col++){
 const west=-20+col*20,east=west+20,north=coastLat(coastTop+(coastBottom-coastTop)*row/2),south=coastLat(coastTop+(coastBottom-coastTop)*(row+1)/2);
 const coordinates=[[west,north],[east,north],[east,south],[west,south]];
 for(const kind of ['land','sea'])physicalStyle.sources[`overview-${kind}-${row}-${col}`]={type:'image',url:`./overview-coast/${kind}-${row}-${col}.png?v=4`,coordinates};
 insertOverviewLayer('land-base',`overview-land-raster-${row}-${col}`,`overview-land-${row}-${col}`);
 insertOverviewLayer('sea-final',`overview-sea-final-${row}-${col}`,`overview-sea-${row}-${col}`);
}

// These separate source bounds avoid requesting empty sea or land tiles across
// the large gaps between the remaining eastern and North African theaters.
const regionalDetail=[
 ['pontic',[30,38,38,47]],
 ['armenia',[39,36,46,42]],
 ['syria',[34,32,40,38]],
 ['parthia',[42,30,51,38]],
 ['leptis',[12,31,16,34]],
 ['cyrene',[20,31.5,23.5,34.2]]
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
// At zoom 9 the native higher-detail DEM completely replaces zoom-8 relief.
// Keeping both active makes MapLibre fetch and shade redundant tiles during a jump.
for(const layer of physicalStyle.layers)if((layer.id.startsWith('land-elevation-')||layer.id.startsWith('relief-'))&&layer.id.endsWith('-ultra'))layer.maxzoom=9;
