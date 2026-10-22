import path from 'node:path';
import fs from 'node:fs';
export function installFastStatic(app,root){
  app.get('/sw.js',(_req,res)=>{
    res.setHeader('Cache-Control','no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed','/');
    res.sendFile(path.join(root,'dist','sw.js'));
  });
  app.get('/assets/*',(req,res,next)=>{
    const folder=path.resolve(root,'dist/assets');
    let decoded;try{decoded=decodeURIComponent(req.path.slice('/assets/'.length))}catch{return next()}
    const original=path.resolve(folder,decoded);
    if(!original.startsWith(folder+path.sep)||!original.match(/\.(js|css)$/))return next();
    const encoding=req.acceptsEncodings('br','gzip','identity');
    const suffix=encoding==='br'?'.br':encoding==='gzip'?'.gz':null;
    if(!suffix||!fs.existsSync(original+suffix))return next();
    res.type(path.extname(original));res.setHeader('Content-Encoding',encoding);res.vary('Accept-Encoding');
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    res.sendFile(original+suffix);
  });
}
