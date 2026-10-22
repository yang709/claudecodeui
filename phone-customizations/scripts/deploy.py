#!/usr/bin/env python3
import argparse,json,os,shutil,subprocess,tempfile,time,urllib.request,datetime
from pathlib import Path
from common import ROOT,digest,live_root

ALLOWED=('dist/','public/','dist-server/')
def safe_target(root,name):
    if not name.startswith(ALLOWED) or Path(name).is_absolute() or '..' in Path(name).parts:
        raise ValueError('Unsafe deployment path: '+name)
    target=root/name
    if root.resolve() not in target.resolve().parents:
        raise ValueError('Deployment escapes package root: '+name)
    return target

def atomic_write(target,data):
    target.parent.mkdir(parents=True,exist_ok=True)
    mode=target.stat().st_mode&0o777 if target.exists() else 0o644
    fd,temp=tempfile.mkstemp(prefix='.cloudcli-git-',dir=target.parent)
    try:
        with os.fdopen(fd,'wb') as file:file.write(data);file.flush();os.fsync(file.fileno())
        os.chmod(temp,mode);os.replace(temp,target)
        if target.name=='reviewed-launcher.mjs':target.chmod(0o755)
    finally:
        if Path(temp).exists():Path(temp).unlink()

def restart():
    subprocess.run(['launchctl','kickstart','-k',f'gui/{os.getuid()}/ai.cloudcli.phone.server'],check=True)
    deadline=time.monotonic()+15
    while time.monotonic()<deadline:
        try:
            with urllib.request.urlopen('http://127.0.0.1:3001/health',timeout=1) as response:
                if response.status==200:return
        except Exception:time.sleep(.25)
    raise RuntimeError('CloudCLI did not become healthy after restart')

def deploy(root,overlay,apply=False,restart_server=False):
    root=root.resolve();overlay=overlay.resolve()
    package=json.loads((root/'package.json').read_text());upstream=json.loads((ROOT/'config/upstream.json').read_text())
    if package['name']!=upstream['package'] or package['version']!=upstream['version']:
        raise ValueError('Installed CloudCLI version differs from the pinned upstream')
    manifest=json.loads((overlay.parent/'manifest.json').read_text())['files'];changes=[]
    for name,expected in manifest.items():
        source=safe_target(overlay,name);target=safe_target(root,name)
        if digest(source.read_bytes())!=expected:raise ValueError('Build file checksum mismatch: '+name)
        if not target.exists() or digest(target.read_bytes())!=expected:changes.append(name)
    for name in changes:print('DIFF',name)
    if not apply:
        print('Read-only check:',len(changes),'different files; no changes applied.');return len(changes)
    if not changes:print('Already matches the Git-managed build.');return 0
    backend=any(name.startswith('dist-server/') for name in changes)
    if backend and not restart_server:raise ValueError('Backend changes require --restart; nothing applied')
    backup=root.parents[3]/'git-backups'/datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    existed={}
    for name in changes:
        target=safe_target(root,name);existed[name]=target.exists()
        if target.exists():dest=backup/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,dest)
    backup.mkdir(parents=True,exist_ok=True);(backup/'manifest.json').write_text(json.dumps({'files':existed},indent=2))
    written=[]
    try:
        # Backend and assets first; switch app shell only after the server is healthy.
        for name in changes:
            if name in ['dist/index.html','dist/sw.js']:continue
            atomic_write(safe_target(root,name),(overlay/name).read_bytes());written.append(name)
        if backend:restart()
        for name in ['dist/sw.js','dist/index.html']:
            if name in changes:atomic_write(safe_target(root,name),(overlay/name).read_bytes());written.append(name)
    except Exception:
        for name in reversed(written):
            target=safe_target(root,name)
            if existed[name]:atomic_write(target,(backup/name).read_bytes())
            elif target.exists():target.unlink()
        if backend:
            try:restart()
            except Exception:print('Rollback files restored, but service restart needs attention.')
        raise
    print('Applied',len(changes),'files. Backup:',backup);return 0

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Checks by default; writes only with --apply. Never reads or deploys credentials/state.')
    parser.add_argument('--root',type=Path,default=live_root());parser.add_argument('--overlay',type=Path,default=ROOT/'build/overlay')
    parser.add_argument('--apply',action='store_true');parser.add_argument('--restart',action='store_true');parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.check and args.apply:parser.error('--check and --apply are mutually exclusive')
    count=deploy(args.root,args.overlay,args.apply,args.restart)
    if args.check and count:raise SystemExit(1)
