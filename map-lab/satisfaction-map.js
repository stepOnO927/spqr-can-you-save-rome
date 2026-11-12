// A source outline can represent several game theaters. Only the player's
// theaters contribute; no foreign satisfaction is read into the map color.
export function satisfactionForOutline(regions,player){
 const own=regions.filter(region=>region.owner===player);
 if(!own.length)return {kind:'foreign',value:null,color:'#65756d'};
 const values=own.map(region=>region.population?.satisfaction);
 if(values.some(value=>!Number.isFinite(value)||value<0||value>100))return {kind:'unknown',value:null,color:'#848381'};
 const value=values.reduce((sum,n)=>sum+n,0)/values.length;
 return {kind:'known',value,color:value>=65?'#83a487':value>=35?'#c2aa6b':'#b36250'};
}
