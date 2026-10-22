import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {brotliCompressSync,gzipSync,constants} from 'node:zlib';
const [base,overlay,...paths]=process.argv.slice(2);
for(const name of paths){
 let data;try{data=await readFile(path.join(overlay,name))}catch{data=await readFile(path.join(base,name))}
 await mkdir(path.dirname(path.join(overlay,name)),{recursive:true});
 await writeFile(path.join(overlay,name+'.br'),brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}));
 await writeFile(path.join(overlay,name+'.gz'),gzipSync(data,{level:9}));
}
