from pathlib import Path
import sys,unittest,json,tempfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build import apply_patch
from common import digest
from deploy import safe_target,atomic_write

class BuildSafety(unittest.TestCase):
    def test_verified_patch_and_mismatch(self):
        patch={'upstream_path':'example.js','before_sha256':digest(b'abc'),'after_sha256':digest(b'axc'),'edits':[{'start':1,'old':'b','new':'x'}]}
        self.assertEqual(apply_patch('abc',patch),'axc')
        with self.assertRaises(ValueError):apply_patch('changed',patch)
    def test_paths_cannot_escape_package_or_touch_state(self):
        root=Path('/tmp/example-package')
        for name in ['state/auth.db','../token','/etc/passwd','dist/../../token']:
            with self.assertRaises(ValueError):safe_target(root,name)
        self.assertEqual(safe_target(root,'dist/index.html'),root/'dist/index.html')
    def test_atomic_update_preserves_permissions(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)/'test.js';target.write_text('before');target.chmod(0o640)
            atomic_write(target,b'after')
            self.assertEqual(target.read_text(),'after');self.assertEqual(target.stat().st_mode&0o777,0o640)
