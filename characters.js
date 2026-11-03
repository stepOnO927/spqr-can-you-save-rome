export const CHARACTER_CATALOG = {
 caesar:{name:['Gaius Julius Caesar','盖乌斯·尤利乌斯·凯撒'],birth:[-100,-100],faction:'caesar',role:['Roman political and military leader','罗马政治与军事领袖'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Julius-Caesar-Roman-ruler'},
 pompey:{name:['Gnaeus Pompeius Magnus','格奈乌斯·庞培'],birth:[-106,-106],faction:'senate',role:['Roman commander allied with the Senate','元老院方面的罗马统帅'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Pompey-the-Great'},
 antony:{name:['Marcus Antonius','马尔库斯·安东尼'],birth:[-83,-83],faction:'caesar',role:['Roman officer and politician','罗马军官与政治人物'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Mark-Antony'},
 cicero:{name:['Marcus Tullius Cicero','马尔库斯·图利乌斯·西塞罗'],birth:[-106,-106],faction:'senate',role:['Roman statesman and orator','罗马政治家与演说家'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Cicero'},
 cato:{name:['Marcus Porcius Cato','小加图'],birth:[-95,-95],faction:'senate',role:['Roman senator','罗马元老'],culture:['Roman','罗马'],source:'https://www.britannica.com/biography/Cato-the-Younger'},
 labienus:{name:['Titus Labienus','提图斯·拉比埃努斯'],birth:null,faction:'senate',role:['Roman commander','罗马指挥官'],culture:['Roman','罗马'],source:'https://www.enciklopedija.hr/clanak/labijen-tit-vojskovodja'},
 lepidus:{name:['Marcus Aemilius Lepidus','马尔库斯·埃米利乌斯·雷必达'],birth:null,faction:'caesar',role:['Roman politician','罗马政治人物'],culture:['Roman','罗马'],source:'https://brockhaus.de/ecs/enzy/article/lepidus-20'},
 scipio:{name:['Quintus Caecilius Metellus Scipio','梅特卢斯·西庇阿'],birth:null,faction:'senate',role:['Roman senator and commander','罗马元老与指挥官'],culture:['Roman','罗马'],source:'https://academic.oup.com/edited-volume/61673/chapter-abstract/548509305'},
 cleopatra:{name:['Cleopatra VII','克娄巴特拉七世'],birth:[-70,-69],faction:'egypt',role:['Ptolemaic co-ruler','托勒密王朝共同统治者'],culture:['Ptolemaic Egyptian','托勒密埃及'],source:'https://www.metmuseum.org/toah/hd/ptol/hd_ptol.htm'},
 ptolemy:{name:['Ptolemy XIII','托勒密十三世'],birth:null,faction:'egypt',role:['Ptolemaic co-ruler','托勒密王朝共同统治者'],culture:['Ptolemaic Egyptian','托勒密埃及'],source:'https://www.metmuseum.org/toah/hd/gkru/hd_gkru.htm'},
 orodes:{name:['Orodes II','奥罗德二世'],birth:null,faction:'parthia',role:['Arsacid king','安息阿尔沙克王朝国王'],culture:['Parthian','帕提亚'],source:'https://www.iranicaonline.org/articles/orodes-ii/'},
 pacorus:{name:['Pacorus I','帕科鲁斯一世'],birth:null,faction:'parthia',role:['Arsacid prince','安息王子'],culture:['Parthian','帕提亚'],source:'https://www.iranicaonline.org/articles/armenia-ii/'},
 artavasdes:{name:['Artavasdes II','阿尔塔瓦兹德二世'],birth:null,faction:'armenia',role:['King of Armenia','亚美尼亚国王'],culture:['Armenian','亚美尼亚'],source:'https://www.iranicaonline.org/articles/armenia-ii/'},
 juba:{name:['Juba I','朱巴一世'],birth:null,faction:'numidia',role:['King of Numidia','努米底亚国王'],culture:['Numidian','努米底亚'],source:'https://www.britannica.com/biography/Juba-I'},
 bocchus:{name:['Bocchus II','博库斯二世'],birth:null,faction:'mauretania',role:['Mauretanian king','毛里塔尼亚国王'],culture:['Mauretanian','毛里塔尼亚'],source:'https://www.britannica.com/place/Mauretania-ancient-region-Africa'},
 bogud:{name:['Bogud','博古德'],birth:null,faction:'mauretania',role:['Mauretanian king','毛里塔尼亚国王'],culture:['Mauretanian','毛里塔尼亚'],source:'https://www.britannica.com/place/Mauretania-ancient-region-Africa'},
 deiotarus:{name:['Deiotarus','代奥塔鲁斯'],birth:null,faction:null,role:['Galatian ruler','加拉太统治者'],culture:['Galatian','加拉太'],source:'https://www.britannica.com/biography/Deiotarus'},
 pharnaces:{name:['Pharnaces II','法尔纳刻斯二世'],birth:null,faction:null,role:['Bosporan ruler','博斯普鲁斯王国统治者'],culture:['Pontic','本都'],source:'https://academic.oup.com/edited-volume/61673/chapter-abstract/549705304?login=false'}
};
export const OPENING_LEADERS={caesar:['caesar'],senate:['pompey'],egypt:['cleopatra','ptolemy'],parthia:['orodes'],armenia:['artavasdes'],numidia:['juba'],mauretania:['bocchus','bogud'],rebels:[]};
const SUCCESSORS={caesar:['antony','lepidus'],senate:['cato','scipio','labienus','cicero'],egypt:['cleopatra','ptolemy'],parthia:['pacorus'],armenia:[],numidia:[],mauretania:['bocchus','bogud'],rebels:[]};
const clone=x=>JSON.parse(JSON.stringify(x));
export function initializeWorld(s){
 if(!s.world){s.world={characters:Object.fromEntries(Object.entries(CHARACTER_CATALOG).map(([id,c])=>[id,{id,faction:c.faction,health:'healthy',location:null,alive:true}])),leadership:clone(OPENING_LEADERS),intelSeed:874913};}
 if(!s.world.claimants)s.world.claimants={};
 if(!s.knowledge){s.knowledge=Object.fromEntries(Object.keys(s.factions).map(actor=>[actor,Object.fromEntries(Object.keys(s.factions).map(target=>[target,{reportedLeaders:clone(OPENING_LEADERS[target]||[]),reports:[]}]))]));}
 if(!s.operations)s.operations=[];
 return s;
}
export function ageRange(id,year){const b=CHARACTER_CATALOG[id]?.birth;if(!b)return null;return [year-b[1],year-b[0]]}
export function successorFor(s,faction){return (SUCCESSORS[faction]||[]).filter(id=>s.world.characters[id]?.alive&&!s.world.leadership[faction].includes(id));}
export function assignSuccession(s,faction){const current=s.world.leadership[faction].filter(id=>s.world.characters[id]?.alive);if(!current.length){const next=successorFor(s,faction)[0];if(next)current.push(next)}s.world.leadership[faction]=current;if(s.world.claimants[faction])s.world.claimants[faction]=s.world.claimants[faction].filter(id=>!current.includes(id)&&s.world.characters[id]?.alive);return current}
export function knownLeaders(s,viewer,target){initializeWorld(s);return s.knowledge[viewer]?.[target]?.reportedLeaders||[]}
