import {ARTIFACTS} from './museum.js?v=14';

export const MUSEUM_HALLS=[
 {id:'figures',name:['Hall of Great Figures','伟人展厅'],categories:['figures']},
 {id:'military',name:['Military Hall','军事展厅'],categories:['banners','equipment']},
 {id:'ritual',name:['Religion & Ritual Gallery','宗教与祭仪展厅'],categories:['religion']},
 {id:'daily',name:['Roman Daily Life Gallery','罗马日常生活展厅'],categories:['documents','curiosities']},
 {id:'conquest',name:['Conquest Trophies Gallery','征服战利品展厅'],categories:['trophies','coins']},
 {id:'foreign',name:['Foreign Kingdoms Gallery','异邦王国展厅'],categories:['foreign']},
 {id:'special',name:['Special Event Relics','特殊事件遗物'],categories:['racing']}
];

export function museumHallFor(artifact){return MUSEUM_HALLS.find(hall=>hall.categories.includes(artifact.category))?.id||'daily'}

export function museumCollection(profile){
 const owned=new Set(profile.collectibles||[]);
 return ARTIFACTS.filter(artifact=>owned.has(artifact.id));
}

export function museumPrestige(profile){
 const collection=museumCollection(profile);
 return {artifacts:collection.length,halls:new Set(collection.map(museumHallFor)).size,prestige:collection.length+new Set(collection.map(museumHallFor)).size*2};
}

export function curateArtifact(profile,id){
 if(!profile.buildings?.includes('museum')||!profile.collectibles?.includes(id)||!ARTIFACTS.some(artifact=>artifact.id===id))return {ok:false};
 const featured=Array.isArray(profile.featuredArtifacts)?profile.featuredArtifacts:[];
 profile.featuredArtifacts=[id,...featured.filter(item=>item!==id&&profile.collectibles.includes(item)&&ARTIFACTS.some(artifact=>artifact.id===item))].slice(0,3);
 return {ok:true,featured:[...profile.featuredArtifacts]};
}

export function removeFeaturedArtifact(profile,id){
 if(!profile.buildings?.includes('museum')||!profile.featuredArtifacts?.includes(id))return {ok:false};
 profile.featuredArtifacts=profile.featuredArtifacts.filter(item=>item!==id);
 return {ok:true,featured:[...profile.featuredArtifacts]};
}
