const assert=require('assert'),fs=require('fs'),vm=require('vm');
const code=fs.readFileSync(__dirname+'/../source/uninstall-cleanup.js','utf8');
const actor={_states:[4,9001,9022],_stateTurns:{4:1,9001:3},_stateSteps:{9022:9},_exoticSubstanceDrugs:{9001:{active:true}},_keywords:['Riftflower','Native topic'],refresh(){this.refreshed=true;}};
const personal={'9001':3,'22':1},shared={'9011':2,'22':2},extra={'9012':1};
const report=[];
const sandbox={console:{info:(...args)=>report.push(args)},$gameParty:{_items:{'9001':2,'22':5}},$gameActors:{_data:[null,actor]},$gameSystem:{_exoticSubstances:{},_exoticSubstancesLoreDrops:{},_pharmaLastRegion:'Italy',_npcSociety:{Alice:{itemIds:[9003,22,9003]}},_containerData:{containers:{vehicle_1:personal},extradimensional:extra}},ContainerManager:{_privateContainers:{vehicle_1:personal},_extradimensionalContainer:extra,save(){this.saved=true;}},WorldManager:{getFile:()=>({containers:{chest:shared}})}};
sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(code,sandbox);
const result=sandbox.ExoticSubstancesCleanup.prepare();
assert.equal(result.items,8);assert.equal(result.states,2);assert.equal(result.npcItems,2);assert.equal(result.containers,3);
assert.deepEqual(Object.keys(sandbox.$gameParty._items),['22']);assert.deepEqual(Object.keys(shared),['22']);assert.deepEqual(Object.keys(personal),['22']);
assert.deepEqual(Object.keys(extra),[]);assert.deepEqual(Array.from(actor._states),[4]);assert.equal(actor._stateTurns[9001],undefined);assert.equal(actor._stateSteps[9022],undefined);
assert(!actor._exoticSubstanceDrugs&&actor.refreshed);assert.deepEqual(Array.from(actor._keywords),['Native topic']);assert.equal(sandbox.$gameSystem._exoticSubstances,undefined);
assert(sandbox.ContainerManager.saved);assert.equal(sandbox.ExoticSubstancesCleanup.prepare().items,0);
sandbox.$gameSystem._exoticSubstancesCrimeSentence={release:10};
assert.throws(()=>sandbox.ExoticSubstancesCleanup.prepare(),/Finish the current sentence/);
assert(report.length===2);
console.log('PASS: standalone and bundled save cleanup removes mod IDs from party, actors, NPCs, private/shared containers; repeated use is safe and custody blocks it.');

// The title-screen mod manager must cover inactive worlds as well as the
// currently selected world, and cancellation must not write anything.
(async()=>{
 const os=require('os'),path=require('path');
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'exotic-uninstall-'));
 try{
  const worlds=['A','B'];
  const savesDir=name=>path.join(base,'worlds',name,'saves');
  for(const name of worlds)fs.mkdirSync(savesDir(name),{recursive:true});
  const fixture=()=>({system:{_exoticSubstances:{cities:{}},_npcSociety:{}},party:{_items:{9001:3,22:1}},actors:{_data:[null,{_states:[9001,4],_stateTurns:{9001:2},_exoticSubstanceDrugs:{9001:{}}}]}});
  const paths=worlds.map((w,i)=>path.join(savesDir(w),'file'+(i+1)+'.rmmzsave'));
  paths.forEach(p=>fs.writeFileSync(p,JSON.stringify(fixture())));
  const chest=path.join(base,'worlds','B','containers.json');
  fs.writeFileSync(chest,JSON.stringify({containers:{chest:{9011:2,22:1}}}));
  const saved=[],mod={name:'ExoticSubstances',active:true};
  class Scene_ModManager{_toggleSelectedMod(){mod.active=!mod.active;this._refreshDOM();} _refreshDOM(){this.refreshed=true;}}
  const game={window:null,require,console:{info(){},error(){}},Date,Scene_ModManager,ModManager:{mods:[mod],saveModConfig(){saved.push(mod.active);}},StorageManager:{isLocalMode:()=>true,fileDirectoryPath:()=>path.join(base,'legacy'),zipToJson:async x=>x,jsonToObject:async x=>JSON.parse(x),objectToJson:async x=>JSON.stringify(x),jsonToZip:async x=>x},WorldManager:{activeWorldName:'A',listWorlds:()=>worlds.map(name=>({name})),savesDirFor:savesDir,writeWorldFile:()=>true},JsonEx:{parse:JSON.parse,stringify:JSON.stringify},ParchmentToast:{show(){}},confirm:()=>false,alert:()=>{throw Error('Unexpected alert');}};
  game.window=game;vm.createContext(game);vm.runInContext(code,game);game.ExoticSubstancesCleanup.installAutoCleanup();
  const scene=new Scene_ModManager();scene._selectedModIndex=0;scene._container={};
  game.ExoticSubstancesCleanup.chooseDisableMode=async()=> 'cancel';
  scene._toggleSelectedMod();assert(mod.active);assert.equal(saved.length,0);assert.equal(JSON.parse(fs.readFileSync(paths[0])).party._items[9001],3);
  await new Promise(r=>setTimeout(r,5));
  game.ExoticSubstancesCleanup.chooseDisableMode=async()=> 'keep';
  scene._toggleSelectedMod();await new Promise(r=>setTimeout(r,5));
  assert(mod.active,'declining the second warning keeps the mod enabled');
  assert.equal(JSON.parse(fs.readFileSync(paths[0])).party._items[9001],3);
  game.confirm=()=>true;
  scene._toggleSelectedMod();
  for(let i=0;i<40 && mod.active;i++)await new Promise(r=>setTimeout(r,5));
  assert(!mod.active,'power-user choice disables without editing a save');
  assert.equal(JSON.parse(fs.readFileSync(paths[0])).party._items[9001],3);
  assert.equal(fs.readdirSync(savesDir('A')).length,1,'power-user choice does not make a backup');
  mod.active=true;
  game.ExoticSubstancesCleanup.chooseDisableMode=async()=> 'clean';
  scene._toggleSelectedMod();
  for(let i=0;i<40 && mod.active;i++)await new Promise(r=>setTimeout(r,5));
  assert(!mod.active,'cleanup completes before disabling');assert.deepEqual(saved,[false,false]);
  for(const p of paths){const c=JSON.parse(fs.readFileSync(p));assert.equal(c.party._items[9001],undefined);assert.deepEqual(c.actors._data[1]._states,[4]);assert.equal(c.actors._data[1]._exoticSubstanceDrugs,undefined);assert(fs.readdirSync(path.dirname(p)).some(f=>f.startsWith(path.basename(p)+'.exotic-substances-backup-')));}
  assert.equal(JSON.parse(fs.readFileSync(chest)).containers.chest[9011],undefined);
  assert(fs.readdirSync(path.dirname(chest)).some(f=>f.startsWith('containers.json.exotic-substances-backup-')));
  mod.active=true;
  fs.writeFileSync(paths[0],JSON.stringify(fixture()));
  fs.writeFileSync(path.join(savesDir('B'),'file9.rmmzsave'),'corrupt save');
  let warning='';game.alert=text=>{warning=text;};
  scene._toggleSelectedMod();
  for(let i=0;i<40 && !warning;i++)await new Promise(r=>setTimeout(r,5));
  assert(mod.active,'failed validation leaves mod enabled');
  assert.match(warning,/file9\.rmmzsave/);
  assert.equal(JSON.parse(fs.readFileSync(paths[0])).party._items[9001],3,'preflight never partially edits another world');
  console.log('PASS: three disable choices, second warning, backups and cleanup across worlds, and blocked corrupt saves.');
 }finally{fs.rmSync(base,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
