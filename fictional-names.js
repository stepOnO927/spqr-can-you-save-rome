import {CHARACTER_CATALOG} from './characters.js?v=safe-save-1';

// Original game people and naming pools, not transcriptions of documented
// individuals. The pools reflect each implemented court's naming tradition.
export const FACTION_NAME_CULTURE=Object.freeze({caesar:'roman',senate:'roman',caesar_claimant:'roman',senate_claimant:'roman',egypt:'greek_egyptian',egypt_claimant:'greek_egyptian',numidia:'numidian',mauretania:'mauretanian',armenia:'armenian',parthia:'parthian',parthia_claimant:'parthian',galatia:'galatian',bosporus:'bosporan',han:'han',shanshan:'shanshan'});
export const NAME_POOLS=Object.freeze({
 roman:{culture:['Roman','罗马'],given:[['Gaius','盖乌斯'],['Lucius','卢基乌斯'],['Marcus','马库斯'],['Publius','普布利乌斯'],['Aulus','奥卢斯']],family:[['Furius','弗里乌斯'],['Valerius','瓦勒里乌斯'],['Aemilius','埃米利乌斯'],['Cassius','卡西乌斯'],['Fabius','法比乌斯']],epithet:[['Naso','纳索'],['Crispus','克里斯普斯'],['Luscus','卢斯库斯'],['Varro','瓦罗']]},
 han:{culture:['Han Chinese','汉'],family:[['Zhao','赵'],['Xu','徐'],['Cai','蔡'],['Wang','王'],['Li','李'],['Zhang','张']],given:[['He','和'],['Jian','俭'],['Ming','明'],['Huan','桓'],['Cheng','成'],['Yan','延']]},
 greek_egyptian:{culture:['Ptolemaic Egyptian court (Greek-speaking)','托勒密埃及宫廷（希腊语）'],given:[['Kleon','克勒翁'],['Theon','提翁'],['Nikandros','尼坎德罗斯'],['Philotas','菲洛塔斯'],['Damon','达蒙']],female:[['Kleio','克勒伊奥'],['Thaleia','塔莉娅'],['Dione','狄俄涅']],place:['Alexandria','亚历山大里亚']},
 numidian:{culture:['Numidian (game reconstruction)','努米底亚（游戏复原）'],given:[['Mastan','马斯坦'],['Iftas','伊夫塔斯'],['Mazir','马齐尔'],['Adun','阿敦']],place:['Cirta','瑟尔塔']},
 mauretanian:{culture:['Mauretanian (game reconstruction)','毛里塔尼亚（游戏复原）'],given:[['Bostar','博斯塔尔'],['Maza','马扎'],['Izel','伊泽尔'],['Tamar','塔马尔']],place:['Iol','伊奥尔']},
 armenian:{culture:['Armenian (game reconstruction)','亚美尼亚（游戏复原）'],given:[['Arsham','阿尔沙姆'],['Vardan','瓦尔丹'],['Artanes','阿尔塔涅斯'],['Tigran','提格兰']],place:['Artaxata','阿尔塔克萨塔']},
 parthian:{culture:['Parthian (game reconstruction)','帕提亚（游戏复原）'],given:[['Artaban','阿尔塔班'],['Vardanes','瓦尔达内斯'],['Mithradates','米特里达梯'],['Phraates','弗拉特斯']],place:['Seleucia','塞琉西亚']},
 galatian:{culture:['Galatian (game reconstruction)','加拉太（游戏复原）'],given:[['Dorylaos','多里劳斯'],['Brogilos','布罗吉洛斯'],['Tavros','塔夫罗斯'],['Kastor','卡斯托尔']],place:['Galatia','加拉太']},
 bosporan:{culture:['Bosporan Greek (game reconstruction)','博斯普鲁斯希腊语（游戏复原）'],given:[['Philostratos','菲洛斯特拉托斯'],['Hekataios','赫卡泰奥斯'],['Menandros','米南德罗斯'],['Dionysios','狄奥尼西奥斯']],place:['Panticapaeum','潘提卡派翁']},
 shanshan:{culture:['Shanshan oasis (game reconstruction)','鄯善绿洲（游戏复原）'],given:[['Tura','图拉'],['Dama','达玛'],['Suli','苏利'],['Mina','米纳']],place:['Shanshan','鄯善']},
 regional:{culture:['Regional (game reconstruction)','地方文化（游戏复原）'],given:[['Taren','塔伦'],['Sena','塞娜'],['Marek','马雷克'],['Dara','达拉']],place:['the frontier','边地']}
});

export const STARTING_COMMANDERS=Object.freeze([
 {army:'viii',faction:'caesar',name:['Publius Furius Naso','普布利乌斯·弗里乌斯·纳索'],birthYear:-85},
 {army:'italy',faction:'senate',name:['Aulus Furius Luscus','奥卢斯·弗里乌斯·卢斯库斯'],birthYear:-83},
 {army:'spain',faction:'senate',name:['Marcus Valerius Crispus','马库斯·瓦勒里乌斯·克里斯普斯'],birthYear:-79},
 {army:'egyptguard',faction:'egypt',name:['Kleon of Alexandria','亚历山大里亚的克勒翁'],birthYear:-81},
 {army:'numidiaarmy',faction:'numidia',name:['Mastan of Cirta','瑟尔塔的马斯坦'],birthYear:-86},
 {army:'mauretaniaarmy',faction:'mauretania',name:['Bostar of Iol','伊奥尔的博斯塔尔'],birthYear:-84},
 {army:'armeniaarmy',faction:'armenia',name:['Vardan of Artaxata','阿尔塔克萨塔的瓦尔丹'],birthYear:-82},
 {army:'parthiaarmy',faction:'parthia',name:['Artaban of Seleucia','塞琉西亚的阿尔塔班'],birthYear:-83},
 {army:'galatiaarmy',faction:'galatia',name:['Dorylaos of Galatia','加拉太的多里劳斯'],birthYear:-80},
 {army:'bosporusarmy',faction:'bosporus',name:['Philostratos of Panticapaeum','潘提卡派翁的菲洛斯特拉托斯'],birthYear:-78}
]);

export function generateFictionalName(s,{originFaction,location=null}={}){
 const parent=s.world?.movements?.find(m=>m.force===originFaction)?.parent;
 const style=FACTION_NAME_CULTURE[originFaction]||FACTION_NAME_CULTURE[parent]||'regional',pool=NAME_POOLS[style],used=new Set(Object.keys(s.world?.characters||{}).filter(id=>s.world.characters[id]?.alive).map(id=>(s.world?.dynasties?.catalog?.[id]||CHARACTER_CATALOG[id])?.name?.[0]).filter(Boolean));
 const serial=s.world?.dynasties?.nextPerson||1,candidates=[];
 if(style==='roman')for(const given of pool.given)for(const family of pool.family)for(const epithet of pool.epithet)candidates.push([`${given[0]} ${family[0]} ${epithet[0]}`,`${given[1]}·${family[1]}·${epithet[1]}`]);
 else if(style==='han')for(const family of pool.family)for(const given of pool.given)candidates.push([`${family[0]} ${given[0]}`,`${family[1]}${given[1]}`]);
 else for(const given of pool.given)candidates.push([`${given[0]} of ${pool.place[0]}`,`${pool.place[1]}的${given[1]}`]);
 const start=serial%candidates.length;
 for(let step=0;step<candidates.length;step++){const name=candidates[(start+step)%candidates.length];if(!used.has(name[0]))return {name,culture:pool.culture,homeland:location}}
 // A locative remains intelligible when a small pool is exhausted. The saved
 // numeric suffix identifies a game person; it is not an ancient title.
 const name=candidates[start];return {name:[`${name[0]} (${serial})`,`${name[1]}（${serial}）`],culture:pool.culture,homeland:location};
}

// Children inherit a saved family relationship; their displayed name does not
// establish ancestry. Han given names can share a recorded father's surname,
// while other simulated courts use their own cultural naming pool.
export function generateFictionalChildName(s,{faction,fatherId,sex='unknown',location=null}={}){
 const style=FACTION_NAME_CULTURE[faction]||'regional',pool=NAME_POOLS[style];
 if(style==='roman')return generateFictionalName(s,{originFaction:faction,location});
 const serial=s.world?.dynasties?.nextPerson||1,used=new Set(Object.keys(s.world?.characters||{}).map(id=>(s.world?.dynasties?.catalog?.[id]||CHARACTER_CATALOG[id])?.name?.[0]).filter(Boolean));
 const given=sex==='female'&&pool.female||pool.given;
 const father=(s.world?.dynasties?.catalog?.[fatherId]||CHARACTER_CATALOG[fatherId])?.name;
 const family=style==='han'&&father?.[0]?.split(' ')[0]&&father?.[1]?.[0]?[father[0].split(' ')[0],father[1][0]]:pool.family?.[serial%pool.family.length];
 const names=given.map(pair=>style==='han'?[`${family[0]} ${pair[0]}`,`${family[1]}${pair[1]}`]:[`${pair[0]} of ${pool.place[0]}`,`${pool.place[1]}的${pair[1]}`]);
 for(let i=0;i<names.length;i++){const name=names[(serial+i)%names.length];if(!used.has(name[0]))return {name,culture:pool.culture,homeland:location}}
 const name=names[serial%names.length];return {name:[`${name[0]} (${serial})`,`${name[1]}（${serial}）`],culture:pool.culture,homeland:location};
}
