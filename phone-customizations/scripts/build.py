#!/usr/bin/env python3
import argparse,json,re,shutil,subprocess
from pathlib import Path
from common import ROOT,digest,node_path

def apply_patch(old,patch):
    if digest(old.encode()) != patch['before_sha256']:
        raise ValueError('Upstream checksum mismatch: '+patch['upstream_path'])
    result=old
    for edit in reversed(patch['edits']):
        start=edit['start'];end=start+len(edit['old'])
        if result[start:end] != edit['old']:
            raise ValueError('Patch anchor mismatch: '+patch['upstream_path'])
        result=result[:start]+edit['new']+result[end:]
    if digest(result.encode()) != patch['after_sha256']:
        raise ValueError('Patched checksum mismatch: '+patch['upstream_path'])
    return result

def extensions():
    client=ROOT/'src/client'
    content=(client/'browser-dictation.mjs').read_text().replace('export function','function',1)+(client/'browser-hook.js').read_text()
    content+='\n\n'+(client/'usage-summary.mjs').read_text().replace('export function','function',1)+(client/'sidebar-component.js').read_text()
    content=content.replace('bc().voiceEnabled','usePreferences().voiceEnabled').replace('configured=Az()','configured=useConfiguredVoice()').replace('backend=pWeBackend(onText,onError)','backend=useBackendVoice(onText,onError)').replace("await gt('/api/codex-usage'","await get('/api/codex-usage'")
    return 'export function createCloudcliExtensions({f,s,get,usePreferences,useConfiguredVoice,useBackendVoice}) {\n'+content+'\nreturn {pWe,CloudcliSidebarUsage};\n}\n'

def build(base,output,node):
    metadata=json.loads((ROOT/'config/upstream.json').read_text())
    package=json.loads((base/'package.json').read_text())
    if package['name']!=metadata['package'] or package['version']!=metadata['version']:
        raise ValueError('Requires pristine '+metadata['package']+'@'+metadata['version'])
    if output.resolve()==ROOT or ROOT not in output.resolve().parents:
        raise ValueError('Build output must be a subdirectory of the repository')
    output.mkdir(parents=True,exist_ok=True)
    def put(name,content):
        dest=output/name;dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(content if isinstance(content,bytes) else content.encode())
    current={}
    for name in metadata['patches']:
        patch=json.loads((ROOT/'patches'/f'{name}.json').read_text())
        text=apply_patch((base/patch['upstream_path']).read_text(),patch)
        if name=='frontend-core':
            core='index-'+digest(text.encode())[:12]+'-fast.js';target='dist/assets/'+core
        else:target=patch['upstream_path']
        put(target,text);current[name]=target
    put('dist/index.html',(ROOT/'config/index.html.in').read_text().replace('{{CORE_ASSET}}',core))
    put('dist/manifest.json',(ROOT/'config/manifest.json').read_bytes())
    put('dist/sw.js',(ROOT/'src/client/sw.js').read_bytes())
    put('public/cloudcli-extensions.js',extensions())
    for item in (ROOT/'src/server').glob('*.mjs'):put('dist-server/server/'+item.name,item.read_bytes())
    for item in (ROOT/'src/server/codex').glob('*.mjs'):
        put('dist-server/server/modules/providers/list/codex/'+item.name,item.read_text().replace('#!{{NODE}}','#!'+node))
    for item in (ROOT/'assets/icons').glob('*.png'):put('dist/icons/'+item.name,item.read_bytes())
    html=(output/'dist/index.html').read_text()
    assets=['dist/'+path.lstrip('/') for path in re.findall(r'(?:src|href)="(/assets/[^"]+\.(?:js|css))"',html)]
    for file in sorted(output.rglob('*')):
        if file.suffix in ['.js','.mjs']:subprocess.run([node,'--check',str(file)],check=True)
    subprocess.run([node,str(ROOT/'scripts/compress.mjs'),str(base),str(output),*sorted(set(assets))],check=True)
    entries={str(file.relative_to(output)):digest(file.read_bytes()) for file in sorted(output.rglob('*')) if file.is_file()}
    (output.parent/'manifest.json').write_text(json.dumps({'upstream':metadata['package']+'@'+metadata['version'],'files':entries},indent=2)+'\n')
    print('Built',len(entries),'overlay files. Manifest:',output.parent/'manifest.json')
    return entries

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Reproduce CloudCLI customizations from the pinned pristine npm package; no network or credentials are used.')
    parser.add_argument('--base-package',type=Path,default=ROOT/'work/cloudcli/inspect/package')
    parser.add_argument('--output',type=Path,default=ROOT/'build/overlay')
    parser.add_argument('--node')
    args=parser.parse_args();build(args.base_package.resolve(),args.output.resolve(),node_path(args.node))
