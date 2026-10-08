"""Bake the hand-edited PNG/GLB inputs into the synchronous game factories.

Run once with --import-upload PATH to copy approved inputs, then without it to
rebuild from the source assets. Geometry is only transformed to game units.
"""
import argparse
import json
import re
import shutil
from pathlib import Path
import numpy as np
import trimesh
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    9001: ('Meld.png', 'Meld(1).glb'),
    9002: ('image(20261007-050332).png', 'Syntheogen.glb'),
    9003: ('Frack2.png', 'Frack.glb'),
    9010: ('Riftflower.png', 'Riftflower(1).glb'),
    9011: ('nectar(1).png', 'Nectar.glb'),
    9012: ('VesperWafers16px.png', 'Vesper Wafer.glb'),
    9013: ('Hush.png', 'Hush.gltf'),
    9014: ('Lethe(1).png', 'Lethe.glb'),
    9015: ('Splice2(1).png', 'Splice(1).glb'),
}
COLORS = {
    'Pressed resin':'613c27', 'Resin grain':'805032',
    'Vial body':'3821f4', 'Vial neck':'b6bbcd', 'Vial cap':'273131',
    'Fractal crystal':'cceff5', 'Glass chamber':'cfe1d0',
    'Rear cap':'cda052', 'Purple collar':'765295',
    'Inhaler elbow':'ece3d5', 'Nasal tip':'ece3d5', 'Nasal Cap':'ece3d5',
    'Riftflower bud':'7e9147', 'Purple flower crystal':'9567ac',
    'Frosted glass reservoir':'e5c67b', 'Golden concentrate':'d99b20',
    'Teal side cap':'17515a', 'Side nozzle':'e7b444', 'Amber drop':'e7b444',
    'Concentrate bottle':'9b82c5', 'Bottle cap':'50345e',
    'Bottle label':'ece3d5', 'Transparent kit case':'c7d6d5',
    'Case lid':'abb0b4', 'Jelly cube':'8b245b', 'Sugar pearl':'ece3d5',
    'Drop bottle':'17515a', 'Dropper shoulder':'2e7b80',
    'Dropper stem':'cfe1d0', 'Ear nozzle':'cfe1d0',
    'Transfer backing':'ece3d5', 'Glyph line -1':'2e7b80',
    'Glyph line 1':'bf619a', 'Central seal':'bf619a', 'Peeled corner':'d3c6a8',
}

def material(item, name):
    if item == 9012:
        color = ('ece3d5' if name.endswith('base') else '675080' if name.endswith('face')
                 else 'f4d894' if 'contact' in name else 'd2a337')
    elif item == 9014 and name == 'Bottle label':
        color = '8bb7b6'
    else:
        candidates = [k for k in COLORS if name.startswith(k)]
        if not candidates:
            raise ValueError(f'Unmapped material: {item} {name}')
        color = COLORS[max(candidates, key=len)]
    glass = name in ('Glass chamber', 'Frosted glass reservoir', 'Transparent kit case')
    return dict(color='#'+color, opacity=.24 if glass else 1,
                roughness=.25 if glass else .3 if item == 9003 else .78,
                metalness=.1 if item == 9003 else 0)

parser = argparse.ArgumentParser()
parser.add_argument('--import-upload', type=Path)
args = parser.parse_args()
assets = ROOT / 'assets'
assets.mkdir(exist_ok=True)
palette, colors, pixels, models = {}, {}, {}, {}
for item, (png, model) in FILES.items():
    sprite_path = assets / f'{item}.png'
    model_path = assets / (str(item)+Path(model).suffix)
    if args.import_upload:
        shutil.copy2(args.import_upload/png, sprite_path)
        shutil.copy2(args.import_upload/model, model_path)
    im = Image.open(sprite_path).convert('RGBA')
    assert im.size == (16, 16), (item, im.size)
    rows = []
    for y in range(16):
        row = ''
        for x in range(16):
            r,g,b,a = im.getpixel((x,y))
            if not a:
                row += '.'
                continue
            color = f'#{r:02x}{g:02x}{b:02x}' if a == 255 else f'rgba({r},{g},{b},{a/255:.8f})'
            if color not in colors:
                key = chr(0x100+len(colors))
                colors[color] = key
                palette[key] = color
            row += colors[color]
        rows.append(row)
    pixels[item] = rows
    scene = trimesh.load(model_path, force='scene', process=False)
    parts = []
    for name in scene.graph.nodes_geometry:
        transform, geo_name = scene.graph[name]
        mesh = scene.geometry[geo_name]
        verts = trimesh.transform_points(mesh.vertices, transform)/1000
        parts.append(dict(name=name, positions=np.round(verts, 9).reshape(-1).tolist(),
                          indices=mesh.faces.reshape(-1).tolist(), **material(item,name)))
    models[item] = parts

path = ROOT / 'source' / 'ExoticSubstances.js'
source = path.read_text()
for var, data in [('PALETTE',palette),('PIXELS',pixels)]:
    line = 'const '+var+'='+json.dumps(data,separators=(',',':'),ensure_ascii=True)+';'
    source, count = re.subn(r'^const '+var+r'=.*;$',lambda _:line,source,flags=re.M)
    assert count == 1, var
data_line = 'const MODEL_DATA='+json.dumps(models,separators=(',',':'))+';\n'
if 'const MODEL_DATA=' in source:
    source = re.sub(r'^const MODEL_DATA=.*;\n',lambda _:data_line,source,flags=re.M)
else:
    source = source.replace('function newDrugModel(id){',data_line+'function newDrugModel(id){')
path.write_text(source)
(assets/'materials.json').write_text(json.dumps({k:[{key:p[key] for key in ['name','color','opacity','roughness','metalness']} for p in v] for k,v in models.items()},indent=2)+'\n')
print(f'Baked {len(pixels)} exact 16x16 sprites and {len(models)} hand-edited models.')
