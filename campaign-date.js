// Save years are continuous: -1 is 1 BCE and 0 is 1 CE. There is no year zero
// in the displayed historical calendar; keeping the stored value continuous
// preserves elapsed-month calculations and existing saves.
export function campaignYear(year,lang='en'){
 if(!Number.isInteger(year))return lang==='zh'?'未知年份':'Unknown year';
 const number=year<0?-year:year+1;
 return lang==='zh'?`${year<0?'公元前':'公元'}${number}年`:`${number} ${year<0?'BCE':'CE'}`;
}
export function campaignDate(month,year,lang='en'){
 if(!Number.isInteger(month)||month<1||month>12)return campaignYear(year,lang);
 return lang==='zh'?`${campaignYear(year,lang)}${month}月`:`${month}/${campaignYear(year,lang)}`;
}
