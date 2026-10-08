const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const fixture=fs.readFileSync(__dirname+'/market.test.cjs','utf8').split('vm.runInThisContext')[0];
const sandbox={require,console,process:{argv:[null,null,path.resolve(process.env.HE_UPSTREAM||'upstream-083', 'data/Items.json')]},__dirname};sandbox.global=sandbox;vm.createContext(sandbox);vm.runInContext(fixture,sandbox);
sandbox.THREE=require(path.resolve(process.env.HE_UPSTREAM||'upstream-083', 'js/libs/three.min.js'));
const utils=fs.readFileSync(path.resolve(process.env.HE_UPSTREAM||'upstream-083', 'js/plugins/ItemSystem/ItemSystemUtils.js'),'utf8');
const start=utils.indexOf('    framePreview(model, opts) {'),end=utils.indexOf('\n    },',start)+7;
vm.runInContext('ItemModelSystem.framePreview=({'+utils.slice(start,end)+'}).framePreview;',sandbox);
sandbox.ItemModelSystem.PREVIEW_POSE={pitch:.36,yaw:.62};
sandbox.ItemModelSystem.PREVIEW_ELONGATION=1.5;sandbox.ItemModelSystem.PREVIEW_MARGIN=.84;
// Exercise the actual native card builder: extraHTML is the model column.
const nativeUI=fs.readFileSync(path.resolve(process.env.HE_UPSTREAM||'upstream-083', 'js/plugins/ItemSystem/ItemSystemInventoryUI.js'),'utf8');
const buildCode=nativeUI.match(/      function build\(item, opts\) \{[\s\S]*?\n      \}/)[0];
sandbox.ItemInspect.build=new Function('window','rarityOf','typeLabelOf','detailsHTML','T',buildCode+';return build;')(sandbox,()=>({key:'common',name:'Common'}),()=> 'Remedy',()=>'<p>Native description and lore</p>',x=>x);
sandbox.ItemInspect.detailsHTML=()=>'<p>Native details</p>';
vm.runInContext(fs.readFileSync(__dirname+'/../source/ExoticSubstances.js','utf8'),sandbox);vm.runInContext('new Scene_Boot().create()',sandbox);
const family=sandbox.ItemModelSystem.family,items=sandbox.$dataItems,out=[];
for(const id of Object.keys(sandbox.ExoticSubstances.goods).map(Number)){
 const fn=family.unique['i'+id];assert(fn);const obj=family.models[fn]();assert(obj.children.length>=1&&obj.children.length<=16);
 const materials=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/materials.json'),'utf8'))[id];
 assert.equal(obj.children.length,materials.length);
 for(const part of materials){const mesh=obj.getObjectByName(part.name);assert(mesh,part.name);assert.equal('#'+mesh.material.color.getHexString(),part.color);assert.equal(mesh.material.opacity,part.opacity);if(part.opacity<1){assert(mesh.material.transparent);assert(!mesh.material.depthWrite);}}
 obj.updateMatrixWorld(true);let triangles=[];
 obj.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry,pos=geo.attributes.position,ix=geo.index;assert(pos.count>0);assert(Number.isFinite(o.material.color.r));
  for(let k=0;k<(ix?ix.count:pos.count);k+=3){const points=[];for(let q=0;q<3;q++){const i=ix?ix.getX(k+q):k+q,v=new sandbox.THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);assert([v.x,v.y,v.z].every(Number.isFinite));points.push([v.x,v.y,v.z]);}triangles.push({points,color:o.material.color.getHex()});}
 });
 const svg=decodeURIComponent(sandbox.HypernetOS.getIconHTML(id).match(/src="data:image\/svg\+xml,([^"]+)"/)[1]);
 const rects=[...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="2" height="2" fill="([^"]+)"\/>/g)].map(m=>({x:Number(m[1])/2,y:Number(m[2])/2,color:m[3]}));
 assert(rects.length>15&&rects.length<=256);assert(rects.every(r=>r.x<16&&r.y<16));out.push({id,name:items[id].name,rects,triangles});
}
fs.writeFileSync('/tmp/pharmadrop-meshes.json',JSON.stringify(out));
console.log('PASS: all nine native 16x16 icon grids and real Three.js model factories; finite geometry, limited primitive counts.');

for(const id of Object.keys(sandbox.ExoticSubstances.goods).map(Number)){
 const opts={extraHTML:'<canvas id="model"></canvas>',actionsHTML:'<button>Use</button>'};
 const html=sandbox.ItemInspect.build(items[id],opts);
 assert(html.includes('<div class="inspect-topline-preview"><canvas id="model"></canvas></div>'));
 assert(html.includes('<div class="inspect-lore"><section class="exotic-drug-details">'));
 assert.equal((html.match(/exotic-drug-details/g)||[]).length,1);
 assert(html.includes('Native description and lore'));assert(html.includes('<button>Use</button>'));
 assert.equal(opts.extraHTML,'<canvas id="model"></canvas>');
 const noPreview=sandbox.ItemInspect.build(items[id],{});assert(!noPreview.includes('inspect-topline-preview'));
 assert(!sandbox.ItemInspect.build({id:22,name:'Red Cocaine'},opts).includes('exotic-drug-details'));
}
console.log('PASS: native inspection builder keeps models separate from flowing effects/lore for all nine drugs, with and without a preview.');
for(const id of Object.keys(sandbox.ExoticSubstances.goods).map(Number)){
 const model=family.models[family.unique['i'+id]]();
 assert.equal(model.clone(true).userData.exoticSubstancesItem,id);
 const framed=sandbox.ItemModelSystem.framePreview(model,{aspect:1.2,distance:2.7});
 assert(framed&&Number.isFinite(framed.scale));assert.equal(model.rotation.z,0);
 const face=new sandbox.THREE.Vector3(0,[9012,9015].includes(id)?1:0,[9012,9015].includes(id)?0:1).applyEuler(model.rotation);
 assert(face.z>([9012,9015].includes(id)?.9:id===9001?.7:.9),'Face must point toward camera: '+id);
 assert.equal(sandbox.ItemModelSystem.PREVIEW_ELONGATION,1.5);
}
const vanilla=new sandbox.THREE.Mesh(new sandbox.THREE.BoxGeometry(1,1,1));sandbox.ItemModelSystem.framePreview(vanilla,{});
assert.equal(vanilla.rotation.x,.36);assert.equal(vanilla.rotation.y,.62);
console.log('PASS: native preview fitting presents drug faces toward camera, preserves cloned metadata and leaves vanilla poses unchanged.');
