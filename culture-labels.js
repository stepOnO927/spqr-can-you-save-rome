const CULTURES={
 'roman-local':['Roman and Italic local cultures','意大利与罗马地方文化'],
 'north-african':['North African local cultures','北非地方文化'],
 hellenic:['Hellenistic local cultures','希腊化地方文化'],
 egypt:['Egyptian local cultures','埃及地方文化'],
 parthia:['Parthian local cultures','帕提亚地方文化'],
 armenia:['Armenian local cultures','亚美尼亚地方文化'],
 bosporus:['Bosporan local cultures','博斯普鲁斯地方文化'],
 galatia:['Galatian local cultures','加拉太地方文化']
};

export function cultureLabel(id,lang){return CULTURES[id]?.[lang==='zh'?1:0]||id||'—'}
