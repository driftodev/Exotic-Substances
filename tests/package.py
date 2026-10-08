"""Package only the current release, never historical mod directories."""
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

root=Path(__file__).resolve().parents[1]
upstream=Path(sys.argv[1] if len(sys.argv)>1 else 'upstream-083').resolve()
output=Path(sys.argv[2] if len(sys.argv)>2 else root.parent/'Exotic-Substances-v0.4.0.zip').resolve()
subprocess.run(['node',str(root/'tests/build.cjs'),str(upstream)],check=True)
result=subprocess.run(['node',str(root/'tests/run-all.cjs'),str(upstream)],capture_output=True,text=True)
if result.returncode:
    print(result.stdout+result.stderr)
    raise SystemExit(result.returncode)

files=[root/p for p in ['README.md','CHANGELOG.md','TESTING.md','LICENSE','LICENSE-upstream.txt']]
for folder in ['source','assets','tests','mods/ExoticSubstances']:
    files.extend(p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files.append(root/'preview/release-models.png')
for p in files:
    assert 'RandomLootSystem.js' not in str(p.relative_to(root)),p
assert [p.relative_to(root).as_posix() for p in files if '/mods/' in str(p) and p.suffix=='.js']==['mods/ExoticSubstances/js/plugins/Economy/MoneyFormatter.js']
commit=subprocess.check_output(['git','-C',str(upstream),'rev-parse','HEAD'],text=True).strip()
manifest=dict(mod='Exotic Substances',version='0.4.0',target='Hypernet Explorer 0.8.3a',upstreamCommit=commit,
              testResult='12 automated suites passed; full-game smoke test pending',
              files={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)})
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(files):z.write(p,p.relative_to(root).as_posix())
    z.writestr('BUILD.json',json.dumps(manifest,indent=2)+'\n')
    z.writestr('test-results.txt',result.stdout+result.stderr)
with zipfile.ZipFile(output) as z:
    assert z.testzip() is None
    assert z.namelist().count('mods/ExoticSubstances/mod.json')==1
    assert all(not n.startswith(('mods/HexMarket/','mods/NarcoticsExpansion/')) for n in z.namelist())
print(f'{output}\n{output.stat().st_size:,} bytes; {len(files)} source/asset/document files; all twelve suites passed.')
