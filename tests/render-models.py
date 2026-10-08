"""Orthographic visual QA of the baked geometry, using a depth buffer."""
import json
import re
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
models=json.loads(re.search(r'^const MODEL_DATA=(.*);$',(root/'source/ExoticSubstances.js').read_text(),re.M)[1])
names=['Meld Resin','Syntheogen','Fractilized Cocaine','Riftflower','Nectar','Vesper Wafers','Hush (drink kit)','Lethe','Splice']
size=300
sheet=Image.new('RGB',(960,1080),'#111820')
draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
for k,(id,parts) in enumerate(models.items()):
    pitch=1.48 if int(id) in [9012,9015] else .55 if int(id)==9001 else .04
    yaw=.06 if int(id) in [9012,9015] else .12
    cx,sx,cy,sy=np.cos(pitch),np.sin(pitch),np.cos(yaw),np.sin(yaw)
    matrix=np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])@np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])
    geometry=[np.array(p['positions']).reshape(-1,3)@matrix.T for p in parts]
    allv=np.concatenate(geometry)
    center=(allv.max(0)+allv.min(0))/2
    scale=(size-60)/max(np.ptp(allv[:,0]),np.ptp(allv[:,1]))
    rgb=np.zeros((size,size,3))+np.array([32,43,54])
    depth=np.full((size,size),-np.inf)
    fragments=[]
    for p,v in zip(parts,geometry):
        v=(v-center)*scale
        base=np.array([int(p['color'][i:i+2],16) for i in [1,3,5]])
        for indices in np.array(p['indices']).reshape(-1,3):
            points=v[indices];normal=np.cross(points[1]-points[0],points[2]-points[0])
            norm=np.linalg.norm(normal)
            if norm<1e-8:continue
            normal/=norm
            if normal[2]<0:normal=-normal
            light=np.array([-.4,.7,1.]);light/=np.linalg.norm(light)
            color=np.minimum(255,base*(.48+.52*max(0,normal@light)))
            points[:,0]+=size/2;points[:,1]=size/2-points[:,1]
            fragments.append((p['opacity'],points,color))
    # Opaque surfaces write depth; transparent shells blend over visible content.
    fragments.sort(key=lambda t:(t[0]<1,float(t[1][:,2].mean())))
    for opacity,t,color in fragments:
        lo=np.maximum(0,np.floor(t[:,:2].min(0)).astype(int));hi=np.minimum(size-1,np.ceil(t[:,:2].max(0)).astype(int))
        if np.any(hi<lo):continue
        xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5)
        a,b,c=t;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-8:continue
        w1=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
        w2=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den
        w3=1-w1-w2;z=w1*a[2]+w2*b[2]+w3*c[2]
        sl=np.s_[lo[1]:hi[1]+1,lo[0]:hi[0]+1]
        mask=(w1>=0)&(w2>=0)&(w3>=0)&(z>=depth[sl])
        rgb[sl][mask]=rgb[sl][mask]*(1-opacity)+color*opacity
        if opacity==1:depth[sl][mask]=z[mask]
    x=(k%3)*320+10;y=(k//3)*350+10
    sheet.paste(Image.fromarray(rgb.astype('uint8')),(x,y))
    draw.text((x+150,y+312),names[k],font=font,anchor='mt',fill='#e6edf3')
out=root/'preview'/'release-models.png';out.parent.mkdir(exist_ok=True);sheet.save(out)
print(out)
