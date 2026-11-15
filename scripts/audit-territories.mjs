import {REGIONS, ROUTES} from '../data.js';
import historical from '../historical-territories.js';
import {REGIONS as HAN_REGIONS, ROUTES as HAN_ROUTES} from '../han/data.js';
import {REGION_GEO} from '../han/geography.js';
import {LOCAL_ENTITY_TEMPLATES} from '../local-polities.js';
import {LOCAL_GENERATION_SITES,NOMADIC_RANGES,WILDERNESS_SITES} from '../local-generation.js';

const mainIds = new Set(REGIONS.map(region => region.id));
const mapped = new Set(historical.features.flatMap(feature => feature.properties.regions || []));
const hanIds = new Set(HAN_REGIONS.map(region => region.id));
const neighbors = new Map(REGIONS.map(region => [region.id, new Set()]));
for (const [a, b] of ROUTES) {
  neighbors.get(a)?.add(b);
  neighbors.get(b)?.add(a);
}

const audit = {
  main: {
    playableTerritories: REGIONS.length,
    routes: ROUTES.length,
    historicalPolygons: historical.features.length,
    unassociatedHistoricalPolygons: historical.features.filter(feature => !(feature.properties.regions || []).length).map(feature => feature.properties.id),
    playableWithoutHistoricalPolygon: REGIONS.filter(region => !mapped.has(region.id)).map(region => region.id),
    invalidPolygonReferences: [...mapped].filter(id => !mainIds.has(id)),
    invalidRoutes: ROUTES.filter(([a, b]) => !mainIds.has(a) || !mainIds.has(b)),
    isolatedTerritories: [...neighbors].filter(([, links]) => !links.size).map(([id]) => id),
    localEntities: LOCAL_ENTITY_TEMPLATES.length,
    invalidLocalEntities: LOCAL_ENTITY_TEMPLATES.filter(entity => !mainIds.has(entity.theater) || !Array.isArray(entity.coordinates) || entity.coordinates.length !== 2 || entity.coordinates.some(value => !Number.isFinite(value)) || (entity.historical && !entity.source) || (!entity.historical && entity.spatialAccuracy !== 'fictional_approximate_point')).map(entity => entity.id),
    generatedSites: LOCAL_GENERATION_SITES.length,
    invalidGeneratedSites: LOCAL_GENERATION_SITES.filter(site => !mainIds.has(site.theater) || !['city_state','microstate','tribe','strongman'].includes(site.type) || !Array.isArray(site.coordinates) || site.coordinates.length !== 2 || site.coordinates.some(value => !Number.isFinite(value)) || !Number.isFinite(site.scale) || site.scale <= 0).map(site => site.theater),
    duplicateGeneratedTheaters: LOCAL_GENERATION_SITES.filter((site,index) => LOCAL_GENERATION_SITES.findIndex(item => item.theater === site.theater) !== index).map(site => site.theater),
    nomadicRanges: NOMADIC_RANGES.length,
    invalidNomadicRanges: NOMADIC_RANGES.filter(range => !range.id || range.camps?.length !== 2 || range.camps.some(camp => !mainIds.has(camp.theater) || !Array.isArray(camp.coordinates) || camp.coordinates.length !== 2 || camp.coordinates.some(value => !Number.isFinite(value))) || !ROUTES.some(([a,b,kind]) => kind !== 'sea' && (a === range.camps[0].theater && b === range.camps[1].theater || b === range.camps[0].theater && a === range.camps[1].theater))).map(range => range.id),
    wildernessSites: WILDERNESS_SITES.length,
    invalidWildernessSites: WILDERNESS_SITES.filter(site => !mainIds.has(site.theater) || !Array.isArray(site.coordinates) || site.coordinates.length !== 2 || site.coordinates.some(value => !Number.isFinite(value)) || !['forest_interior','highland_valley','remote_hills','dry_frontier','desert_margin','mountain_barrier'].includes(site.kind) || !['difficult','seasonal','impassable'].includes(site.passability) || !['limited','camp_only','none'].includes(site.settlement) || !['sparse','seasonal','unknown'].includes(site.occupancy) || site.passability === 'impassable' && site.settlement !== 'none').map(site => site.theater)
  },
  han: {
    playableTerritories: HAN_REGIONS.length,
    routes: HAN_ROUTES.length,
    invalidRoutes: HAN_ROUTES.filter(({a, b}) => !hanIds.has(a) || !hanIds.has(b)),
    customGeometryAnchors: Object.keys(REGION_GEO).length,
    fallbackToRegionCoordinates: HAN_REGIONS.filter(region => !REGION_GEO[region.id]).map(region => region.id)
  }
};

console.log(JSON.stringify(audit, null, 2));
if (audit.main.invalidPolygonReferences.length || audit.main.invalidRoutes.length || audit.main.isolatedTerritories.length || audit.main.invalidLocalEntities.length || audit.main.invalidGeneratedSites.length || audit.main.duplicateGeneratedTheaters.length || audit.main.invalidNomadicRanges.length || audit.main.invalidWildernessSites.length || audit.han.invalidRoutes.length) process.exitCode = 1;
