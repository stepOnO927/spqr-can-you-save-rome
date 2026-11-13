// Diagnostic only: generate disposable atlas styles for the software-renderer
// benchmark. These never replace the playable map.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const source=await readFile(resolve(root,'map-lab/physical-style.js'),'utf8');
if(!source.includes('export const physicalStyle='))throw new Error('Atlas style declaration changed');
const prefix=source.replace('export const physicalStyle=','const physicalStyle=');
const variants={
 flat:"!['color-relief','hillshade','raster'].includes(layer.type)",
 'no-landcover':"layer.id!=='idealized-landcover'",
 'no-color-relief':"layer.type!=='color-relief'",
 'flat-no-ocean':"!['color-relief','hillshade','raster'].includes(layer.type)&&layer.source!=='ocean'",
 'flat-no-land':"!['color-relief','hillshade','raster'].includes(layer.type)&&layer.source!=='land'"
};
await mkdir(resolve(root,'outputs'),{recursive:true});
for(const [name,condition] of Object.entries(variants)){
 const file=resolve(root,`outputs/map-style-${name}.js`);
 await writeFile(file,`${prefix}\nphysicalStyle.layers=physicalStyle.layers.filter(layer=>${condition});\nexport {physicalStyle};\n`);
 console.log(file);
}
