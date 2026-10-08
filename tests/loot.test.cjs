const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const upstream=path.resolve(process.argv[2]||process.env.HE_UPSTREAM||'upstream-083');
const fixture=fs.readFileSync(path.join(__dirname,'market.test.cjs'),'utf8').split('vm.runInThisContext')[0];
const s={require,console,process:{argv:[null,null,path.join(upstream,'data/Items.json')]},__dirname};s.global=s;vm.createContext(s);
const run=code=>vm.runInContext(code,s);
run(fixture);
run(`
global.T=key=>key;T.has=()=>false;
global.Utils={RPGMAKER_NAME:'MZ'};
global.fetch=()=>new Promise(()=>{});
global.Game_Interpreter=class{eventId(){return this._eventId;}pluginCommand(){}};
global.PluginManager={_commands:{},registerCommand(plugin,command,fn){this._commands[plugin+':'+command]=fn;},callCommand(it,plugin,command,args){return this._commands[plugin+':'+command]?.call(it,args);}};
global.ItemSystemUtils={isRestrictedEntry:i=>/<Restricted>/i.test(i?.note||'')};
global.ParchmentToast={reward(){}};
$gameParty.hasItem=i=>$gameParty.numItems(i)>0;
lead.level=10;other.level=10;
global.$dataArmors=[null,{id:1,name:'Test armor',price:10000,note:''}];
global.$dataWeapons=[null,{id:1,name:'Test weapon',price:10000,note:''}];
for(const i of $dataItems)if(i){i.meta={};for(const m of (i.note||'').matchAll(/<([^:>]+)(?::\\s*([^>]*))?>/g))i.meta[m[1]]=m[2]??true;}
global.ItemCollectibles={isFixed:i=>/<category:\\s*Collectibles\\s*>/i.test(i?.note||'')};
global.rewards=[];const gain=$gameParty.gainItem;$gameParty.gainItem=(i,n)=>{rewards.push(i.id);gain(i,n);};
global.it=new Game_Interpreter();it._eventId=1;it._index=0;
$gameMap._interpreter=it;global.coords={x:0,y:0};$gameMap.event=()=>coords;
`);
run(fs.readFileSync(path.join(upstream,'js/plugins/Crafting/RandomLootSystem.js'),'utf8'));
// Run the unmodified plugin before any mod hooks or database rows exist.
run(`
global.baseline=[];global.seedCount=0;
for(let x=0;x<1500;x++){coords={x,y:3};bag={};rewards=[];PluginManager.callCommand(it,'RandomLootSystem','getItem',{});baseline.push([...rewards]);if($dataItems[rewards[0]]?.meta.UnlockExpression)seedCount++;}
assert(seedCount>0,'Native Expression Seed branch must actually be exercised');
`);
run(fs.readFileSync(path.join(__dirname,'../source/ExoticSubstances.js'),'utf8'));
run(`new Scene_Boot().create();global.added=0;global.hit=null;
for(const id of Object.keys(ExoticSubstances.goods))assert(ItemSystemUtils.isRestrictedEntry($dataItems[id]));
for(let x=0;x<1500;x++){
 coords={x,y:3};bag={};rewards=[];PluginManager.callCommand(it,'RandomLootSystem','getItem',{});
 assert.equal(rewards[0],baseline[x][0],'Native reward changed at chest '+x);
 assert(rewards.length<=2);if(rewards.length===2){added++;hit=x;assert(ExoticSubstances.goods[rewards[1]]);}
}
assert(added>40&&added<110,'Independent bonus rate should be near 5%, got '+added);
const saved=JSON.stringify($gameSystem);$gameSystem=JSON.parse(saved);
coords={x:hit,y:3};bag={};rewards=[];PluginManager.callCommand(it,'RandomLootSystem','getItem',{});assert.equal(rewards.length,1,'No bonus replay after save/load');
// An armor/weapon command and an unknown command never touch the bonus ledger.
const ledgerSize=Object.keys($gameSystem._exoticSubstances.lootOpened).length;
coords={x:99999,y:3};rewards=[];PluginManager.callCommand(it,'RandomLootSystem','getArmor',{});assert.equal(rewards.length,1);
PluginManager.callCommand(it,'Unknown','getItem',{});assert.equal(Object.keys($gameSystem._exoticSubstances.lootOpened).length,ledgerSize);
// MV and MZ paths share deterministic identity and cannot grant twice.
coords={x:hit,y:3};bag={};$gameSystem._exoticSubstances.lootOpened={};rewards=[];it.pluginCommand('getItem',[]);assert.equal(rewards.length,2);
rewards=[];PluginManager.callCommand(it,'RandomLootSystem','getItem',{});assert.equal(rewards.length,1);
// Separate buildings reusing an interior get separate chest records.
global.ProceduralHouseSystem={getCurrentBuilding:()=>({mapId:636,x:10,y:10,floorIndex:0})};
PluginManager.callCommand(it,'RandomLootSystem','getItem',{});const before=Object.keys($gameSystem._exoticSubstances.lootOpened).length;
ProceduralHouseSystem.getCurrentBuilding=()=>({mapId:636,x:11,y:10,floorIndex:0});PluginManager.callCommand(it,'RandomLootSystem','getItem',{});
assert.equal(Object.keys($gameSystem._exoticSubstances.lootOpened).length,before+1);
console.log('PASS: 1,500 identical native chest rewards ('+seedCount+' Expression Seeds), '+added+' additive drug finds, replay protection, MZ/MV and reused interiors.');
`);
