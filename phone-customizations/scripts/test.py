#!/usr/bin/env python3
import subprocess
from common import ROOT,node_path
files=[str(path) for path in sorted((ROOT/'tests').glob('*.test.mjs'))]
subprocess.run([node_path(),'--test',*files],check=True)
subprocess.run(['python3','-m','unittest','discover','-s',str(ROOT/'tests'),'-p','test_*.py'],check=True)
