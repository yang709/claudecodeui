from pathlib import Path
import hashlib, os, shutil
ROOT = Path(__file__).resolve().parent.parent

def digest(data):
    return hashlib.sha256(data).hexdigest()

def node_path(value=None):
    candidates = [value, os.environ.get('NODE_BINARY'), str(Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'), shutil.which('node')]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(Path(candidate).resolve())
    raise SystemExit('Node.js not found. Pass --node /absolute/path/to/node.')

def live_root():
    value = os.environ.get('CLOUDCLI_PACKAGE')
    return Path(value).expanduser() if value else Path.home()/'Library/Application Support/CloudCLI-Phone/app/node_modules/@cloudcli-ai/cloudcli'
