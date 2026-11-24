// These are campaign weights, not census estimates or claims that ancient
// communities followed mutually exclusive modern religious categories.
export const TRADITIONS={
 roman:{name:['Roman civic rites','罗马公民祭仪'],color:'#b7825b'},
 greek:{name:['Greek civic traditions','希腊城邦传统'],color:'#738eae'},
 egyptian:{name:['Egyptian temple traditions','埃及神庙传统'],color:'#b6a068'},
 jewish:{name:['Jewish communities','犹太社群'],color:'#849a79'},
 gallic:{name:['Gallic local traditions','高卢地方传统'],color:'#7d9a72'},
 iranian:{name:['Iranian traditions','伊朗传统'],color:'#a284a1'},
 armenian:{name:['Armenian local traditions','亚美尼亚地方传统'],color:'#a37d72'},
 north_african:{name:['North African local traditions','北非地方传统'],color:'#bd9369'},
 han:{name:['Han ancestral and state rites','汉朝祖先与国家祭仪'],color:'#b97a63'},
 oasis:{name:['Oasis local traditions','绿洲地方传统'],color:'#9d936b'},
 local:{name:['Other local traditions','其他地方传统'],color:'#8a9185'}
};

// Broadly inspired by late Republican and Hellenistic cultural settings.
// Exact percentages are invented game parameters; they are never presented as
// archaeological measurements. Buddhism and Christianity have no starting share.
const STARTING={
 gaul:{gallic:85,roman:15},narbo:{gallic:55,roman:35,greek:10},cisalpine:{roman:70,gallic:25,greek:5},
 hispaniaN:{local:55,roman:35,greek:10},hispaniaS:{local:60,roman:35,greek:5},
 italiaN:{roman:85,greek:15},roma:{roman:80,greek:20},italiaS:{roman:75,greek:25},
 sicilia:{greek:60,roman:35,local:5},africa:{north_african:55,roman:40,greek:5},
 illyricum:{local:65,roman:25,greek:10},epirus:{greek:70,local:25,roman:5},
 achaia:{greek:85,roman:15},anatolia:{greek:65,local:30,iranian:5},
 syria:{greek:45,local:40,jewish:15},egypt:{egyptian:45,greek:40,jewish:15},
 egyptUpper:{egyptian:85,greek:10,jewish:5},numidia:{north_african:85,roman:15},
 mauretania:{north_african:90,roman:10},armenia:{armenian:70,iranian:20,greek:10},
 parthia:{iranian:70,greek:20,jewish:10},media:{iranian:85,greek:15},
 galatia:{gallic:55,greek:40,local:5},bosporus:{greek:75,local:20,iranian:5},
 hanGuanzhong:{han:95,local:5},hanHenan:{han:95,local:5},hanShu:{han:80,local:20},
 hanHexi:{han:60,oasis:40},shanshanOasis:{oasis:90,han:10}
};

export function startingTraditions(regionId){return {...(STARTING[regionId]||{local:100})}}
export function traditionDiversity(population){const shares=Object.values(population?.traditions||{}).filter(Number.isFinite);return shares.length?Math.max(0,1-Math.max(...shares)/100):0}
export function dominantTradition(regions){
 const weighted={};
 for(const region of regions)for(const [id,share] of Object.entries(region.population?.traditions||{}))weighted[id]=(weighted[id]||0)+Math.max(0,region.population.total||0)*share/100;
 return Object.entries(weighted).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||null;
}
export function transferTraditions(from,to,count){
 const origin=from.population,destination=to.population,before=destination.total,shares=origin.traditions||{},received=destination.traditions||{};
 if(count<=0||before<0)return;
 const combined={};for(const id of new Set([...Object.keys(shares),...Object.keys(received)]))combined[id]=((received[id]||0)*before+(shares[id]||0)*count)/(before+count);
 destination.traditions=combined;
}
