const url='https://raw.githubusercontent.com/AWMC/geodata/master/Cultural-Data/roads/roads.geojson';
const res=await fetch(url);if(!res.ok)throw Error('Road data HTTP '+res.status);
const data=await res.json();const features=data.features||[],types={},periods={},names=[];
for(const f of features){const p=f.properties||{};for(const k of Object.keys(p))types[k]=(types[k]||0)+1;const period=p.timeperiod??p.period??null;if(period)periods[String(period)]=(periods[String(period)]||0)+1;if(/flamin|appia|aemilia|aurelia|cassia/i.test(JSON.stringify(p))&&names.length<12)names.push(p)}
console.log(JSON.stringify({count:features.length,first:features.slice(0,5).map(f=>f.properties),fields:types,periods,namedSamples:names},null,2));
