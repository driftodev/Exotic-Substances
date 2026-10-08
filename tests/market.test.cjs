const fs=require('fs'),vm=require('vm'),assert=require('assert');
global.window=global;let time=0,group='Milano',ev=1;const profiles={Alice:{score:45,itemIds:[]},Bob:{score:44,itemIds:[]}};
global.$gameSystem={};global.$gameTemp={};global.$gameVariables={value:()=>time};global.$gameMap={mapId:()=>10,_interpreter:{eventId:()=>ev}};global.$gameActors={_data:[]};global.$dataItems=JSON.parse(fs.readFileSync(process.argv[2]||'upstream-083/data/Items.json'));
global.TimeDateSystem={getGameTimeMinutes:()=>time};global.NPCSystem={findMapGroupByMap:()=>group};global.NPCEmpathize={_helpers:{_getNPCName:e=>e===1?'Alice':'Bob',_getProfile:n=>profiles[n],_npcEffectiveOpinion:(p,a)=>a.actorId()===1?p.score:100,_computePartyPredisposition:p=>[{actor:lead,score:p.score},{actor:other,score:100}]}};
const lead={actorId:()=>1},other={actorId:()=>2};$gameActors.actor=id=>id===1?lead:other;
let money=10000000,bag={};global.$gameParty={leader:()=>lead,members:()=>[lead,other],gold:()=>money,gainGold:n=>money+=n,numItems:i=>bag[i.id]||0,maxItems:()=>99,gainItem:(i,n)=>bag[i.id]=(bag[i.id]||0)+n};
global.Stockbusters={Catalogue:{sellable:()=>true}};global.HypernetOS={DESKTOP_DEFAULT:[],Net:{ONLINE_APPS:[]},getIconHTML:()=>'<old/>',registerApp(app){this.app=app;}};
global.DataManager={onLoad(){},extractMetadata(i){const category=i.note?.match(/<category:\s*([^>]+)>/i)?.[1];i.meta=category?{category}:{};},extractSaveContents(c){global.$gameSystem=c;}};
class Scene_Base{update(){}};class Scene_Boot{create(){DataManager.onLoad($dataItems);}};
class Scene_Shop{prepare(g){this._goods=g;}getStock(){return 999;}unitBuyPrice(i){return i.price;}unitSellPrice(i){return i.price/10;}buyingPrice(){return this._item.price;}sellingPrice(){return this._item.price/10;}maxBuy(){return 99;}maxSell(){return 99;}doBuy(n){$gameParty.gainGold(-this.buyingPrice()*n);$gameParty.gainItem(this._item,n);}doSell(n){$gameParty.gainGold(this.sellingPrice()*n);$gameParty.gainItem(this._item,-n);}sellSelection(){return this._sellSelection||new Map();}priceQuote(){}terminate(){}isShopBuyMode(){return true;}}
class Window_ShopBuy{price(i){return i.price;}};class Window_ShopSell{isEnabled(){return true;}makeItemList(){this._data=Object.values($dataItems).filter(Boolean);}};class Game_Action{item(){return this._item;}testApply(){return false;}apply(){}};
Object.assign(global,{Scene_Base,Scene_Boot,Scene_Shop,Window_ShopBuy,Window_ShopSell,Game_Action,SceneManager:{}});
class TalkPanel{constructor(){this._eventId=1;} _focusActor(){return lead;} _trade(){$gameTemp._NPCEmpathizeOpenTrade={trader:'Alice'};}}
NPCEmpathize._internal={Scene_NPCEmpathize:TalkPanel};
global.Scene_EnhancedItem=class {drawUIItemIcon(){return 'vanilla';}};global.ItemInspect={drawIcon:()=> 'vanilla'};global.ItemModelSystem={registerFamily(f){this.family=f;}};
vm.runInThisContext(fs.readFileSync(__dirname+'/../source/ExoticSubstances.js','utf8'));new Scene_Boot().create();const M=ExoticSubstances,h=$dataItems[9001];
assert.equal(h.name,'Meld Resin');assert(!Stockbusters.Catalogue.sellable(h));assert(Stockbusters.Catalogue.sellable($dataItems[22]));assert.equal(HypernetOS.app.id,'pharma-drop');assert(HypernetOS.Net.ONLINE_APPS.includes('pharma-drop'));assert(HypernetOS.getIconHTML(9001,40).includes('svg'));assert.equal(HypernetOS.getIconHTML(22,40),'<old/>');assert.equal($dataItems[22].price,4000);
assert.equal($dataItems[9000].name,'<-- Narcotics -->');let filed='';for(const item of $dataItems){if(!item)continue;const divider=/^<--\s*(.*?)\s*-->$/.exec(item.name);if(divider)filed=divider[1];if(item.id===9001)assert.equal(filed,'Narcotics');}
for(const id of Object.keys(M.goods).map(Number))assert.equal($dataItems[id].meta.category,'Narcotics');
let a=new Scene_Shop();a.prepare([],false);assert(a._goods.some(r=>r[1]===9001));assert(M.allowed(a._exoticSubstanceContext));ev=2;let b=new Scene_Shop();b.prepare([[0,9001,0,0]],false);assert(!b._goods.length);assert(!M.allowed(b._exoticSubstanceContext));assert.equal(b.unitSellPrice(h),0);assert.equal(b.getStock(h),0);b._item=h;assert.equal(b.doSell(1),0);
assert.deepEqual(M.bounds('Milano',9001),[4000,12000]);
const ctx=a._exoticSubstanceContext;const sunday=9479;time=sunday;assert.equal(M.week(),0);const q=M.quote(ctx,9001,true),old=M.market('Milano',9001).center;time=9480;assert.equal(M.week(),1);assert(Math.abs(M.market('Milano',9001).center/old-1)<=.045001);
const snapshot=JSON.stringify($gameSystem),q2=M.quote(ctx,9001,true);$gameSystem=JSON.parse(snapshot);assert.equal(M.quote(ctx,9001,true),q2);assert(M.quote(ctx,9001,false)<q2);assert.notEqual(M.market('Elsewhere',9001).center,M.market('Milano',9001).center);
for(const id of Object.keys(M.goods).map(Number)){assert.equal(M.quote(ctx,id,true)%100,0);assert.equal(M.quote(ctx,id,false)%100,0);assert.equal($dataItems[id].price%100,0);}
for(const id of Object.keys(M.goods).map(Number)){const lore=$dataItems[id].note.match(/<Lore: ([\s\S]*?)>/)?.[1]||'';assert(lore.length>=100&&lore.length<360);}
let prev=M.market('Milano',9001).center;for(let w=2;w<104;w++){time=w*10080-600;const next=M.market('Milano',9001).center;assert(Math.abs(next/prev-1)<=.045001);prev=next;}
time=9480;$gameSystem=JSON.parse(snapshot);const stock=M.count(ctx,9001),before=money;assert.equal(M.transact(ctx,h,stock+100,true),stock);assert.equal(M.count(ctx,9001),0);assert.equal(M.transact(ctx,h,1,true),0);assert.equal(bag[9001],stock);assert.equal(before-money,stock*q2);const held=bag[9001],demand=M.ledger(ctx,9001).demand;assert.equal(M.transact(ctx,h,100,false),Math.min(held,demand));assert(money<before);assert.equal(M.transact(ctx,h,-1,true),0);assert.equal(M.transact(ctx,h,NaN,true),0);assert.equal(M.transact(b._exoticSubstanceContext,h,1,true),0);
const npc={city:'Milano',key:'npc:Alice',kind:'barter',role:'npc',name:'Alice'};profiles.Alice.itemIds=[9001,9001];assert.equal(M.transact(npc,h,1,true),1);assert.equal(profiles.Alice.itemIds.length,1);assert.equal(M.count(npc,9001),1);const carried=profiles.Alice.itemIds.length;bag[9001]++;assert.equal(M.transact(npc,h,1,false),1);assert.equal(profiles.Alice.itemIds.length,carried);
const target={mood:95,leisure(){return this.mood;},addLeisure(n){this.mood=Math.max(0,Math.min(100,this.mood+n));},result(){return {};}};$gameActors._data=[target];const action=new Game_Action();action._item=h;assert(action.testApply(target));action.apply(target);assert.equal(target.mood,100);assert(action.testApply(target));time+=120;M.expire();assert.equal(target.mood,97);assert(!target._exoticSubstanceDrugs[9001].active);
// Native scene price paths and both single/bulk transaction guards.
ev=1;a=new Scene_Shop();a.prepare([],false);SceneManager._scene=a;a._item=h;assert.equal(a.buyingPrice(),a.unitBuyPrice(h));assert.equal(a.sellingPrice(),a.unitSellPrice(h));const buyWindow=new Window_ShopBuy();assert.equal(buyWindow.price(h),a.buyingPrice());profiles.Alice.score=44;assert.equal(a.doBuy(1),0);a._sellSelection=new Map([[h,10]]);assert.equal(a.sellSelection().size,0);
// Reused interior templates must keep separate building records.
global.ProceduralHouseSystem={getCurrentBuilding:()=>({mapId:100,x:1,y:2,floorIndex:0})};ev=1;const buildingA=M.context();ProceduralHouseSystem.getCurrentBuilding=()=>({mapId:100,x:3,y:2,floorIndex:0});assert.notEqual(M.context().key,buildingA.key);
console.log('PASS: database, individual keepers, Monday boundary, 104 weeks bounded drift, persistence, city variation, stock/demand, transaction guards, barter transfer, mood expiry, native price paths.');

// Exercise the real launch callback with a DOM that lacks replaceChildren,
// matching the older embedded Chromium build in the user's game.
class OldElement {
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.style={};this.className='';}
 get firstChild(){return this.children[0]||null;}
 appendChild(child){this.children.push(child);return child;}
 removeChild(child){this.children.splice(this.children.indexOf(child),1);return child;}
}
const root=new OldElement('div');global.document={getElementById:()=>root,createElement:tag=>new OldElement(tag)};
const descendants=e=>[e,...e.children.flatMap(descendants)];
HypernetOS.WindowManager={createWindow(){return {};}};
let online=true;HypernetOS.Net.hasUplink=()=>online;
HypernetOS.app.launchFn();
assert.equal(HypernetOS.app.category,'economy');
assert(HypernetOS.DESKTOP_DEFAULT.includes('pharma-drop'));
assert(descendants(root).some(e=>e.textContent.includes('Meld Resin')));
assert(descendants(root).some(e=>e.textContent.includes('Syntheogen')));
const cards=descendants(root).filter(e=>e.className==='pharmadrop-card');assert.equal(cards.length,9);
assert(cards.every(e=>e.style.cssText.includes('margin:0 0 12px')));
const names=descendants(root).filter(e=>e.className==='pharmadrop-drug-name');assert.equal(names.length,9);assert(names.every(e=>e.style.cssText.includes('font-size:1.1em')));
const watches=descendants(root).filter(e=>e.className==='pharmadrop-market-watch');assert.equal(watches.length,9);assert(watches.every(e=>e.children.some(c=>/[↑↓→]/.test(c.textContent))));
const buttons=descendants(root).filter(e=>e.tag==='button');assert.equal(buttons.length,9);
const goldBefore=money,itemsBefore=$gameParty.numItems(h);buttons[0].onclick();
assert.equal($gameParty.numItems(h),itemsBefore+1);assert(money<goldBefore);
const goldAfter=money,itemsAfter=$gameParty.numItems(h);
online=false;descendants(root).find(e=>e.tag==='button').onclick();
assert.equal(money,goldAfter);assert.equal($gameParty.numItems(h),itemsAfter);
assert(root.children.some(e=>e.textContent.includes('No Hypernet connection')));
console.log('PASS: old-browser app rendering, purchase/redraw, offline guard, desktop default and category.');

// The two UI painters must draw the custom pixels without sampling IconSet.
let pixels=0,cleared=0;const canvas={width:32,height:32,getContext:()=>({clearRect(){cleared++;},fillRect(){pixels++;}})};
document.getElementById=()=>canvas;
new Scene_EnhancedItem().drawUIItemIcon(9001,'bag');ItemInspect.drawIcon(9002,'inspect');
assert(pixels>50);assert.equal(cleared,2);assert.equal(new Scene_EnhancedItem().drawUIItemIcon(22,'bag'),'vanilla');assert.equal(ItemInspect.drawIcon(22,'inspect'),'vanilla');
assert.equal(ItemModelSystem.family.unique.i9001,'createExoticSubstancesHash');assert.equal(ItemModelSystem.family.unique.i9002,'createExoticSubstancesVial');
if(process.argv[3]){
 global.THREE=require(require('path').resolve(process.argv[3]));
 for(const fn of ['createExoticSubstancesHash','createExoticSubstancesVial']){
  const model=ItemModelSystem.family.models[fn]();assert(model.isGroup);assert(model.children.length>=1);
  const box=new THREE.Box3().setFromObject(model);assert(Number.isFinite(box.min.x)&&box.max.y>box.min.y);assert(box.min.y>=-0.001);
  model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
 }
}
console.log('PASS: backpack and inspect canvas icons, vanilla fallback, custom model registration and real Three.js geometry.');

// All three items must enforce the exact actor's disposition in both directions,
// even with another party member at 100. Exercise single and bulk sales.
profiles.Alice.score=44;
for(const id of [9001,9002,9003]){
 const item=$dataItems[id];bag[id]=5;const gold=money,n=bag[id];
 a._item=item;assert.equal(a.doSell(2),0);assert.equal(a.doBuy(1),0);
 assert.equal(a.commitSale([[item,2]]),0);assert.equal(bag[id],n);assert.equal(money,gold);
 a._item=item;assert.equal(a.unitSellPrice(item),0);assert.equal(a.maxSell(),0);
}
profiles.Alice.score=45;assert(M.allowed(a._exoticSubstanceContext));
M.ledger(a._exoticSubstanceContext,9001).demand=2;let gold=money,n=bag[9001];assert(a.commitSale([[h,1]])===1);assert(money>gold);assert.equal(bag[9001],n-1);
const barter={city:'Milano',map:10,event:1,key:'barter:Alice',name:'Alice',kind:'barter',role:'npc',actorId:1};
profiles.Alice.score=29;assert(!M.allowed(barter));gold=money;n=bag[9002];
assert.equal(M.transact(barter,$dataItems[9002],1,false),0);assert.equal(money,gold);assert.equal(bag[9002],n);
profiles.Alice.score=30;assert(M.allowed(barter));
profiles.Alice.itemIds=[9002];assert.equal(M.transact(barter,$dataItems[9002],1,true),1);
assert(!M.allowed({...barter,role:'shopkeeper'}));profiles.Alice.score=45;assert(M.allowed({...barter,role:'shopkeeper'}));
for(const marker of ['Police Officer','Prison Guard','Customs Officer','Judge','Mayor']){
 profiles[marker]={score:100,itemIds:[9001]};const cop={...barter,name:marker,key:'npc:'+marker};
 assert(!M.allowed(cop));gold=money;n=bag[9001];assert.equal(M.transact(cop,h,1,true),0);assert.equal(M.transact(cop,h,1,false),0);assert.equal(money,gold);assert.equal(bag[9001],n);
}
profiles.Alice.assignedClassId=44;assert(!M.allowed(barter));delete profiles.Alice.assignedClassId;
profiles.Alice.currentJobId=148;assert(!M.allowed(barter));delete profiles.Alice.currentJobId;
profiles.Alice.currentJobId=149;assert(!M.allowed(barter));delete profiles.Alice.currentJobId;
// Block police event scripts even if the NPC has an ordinary name/class.
$gameMap.event=id=>({event:()=>({name:'Alice',note:'',pages:[{list:[{code:117,parameters:[124]}]}]})});assert(!M.allowed(barter));
$gameMap.event=()=>null;
// Revalidate an already selected basket after the opinion drops.
profiles.Alice.score=45;a._sellSelection=new Map([[h,1]]);profiles.Alice.score=44;gold=money;n=bag[9001];assert.equal(a.sellSelectedItems(),0);assert.equal(money,gold);assert.equal(bag[9001],n);
assert(!M.allowed({...barter,name:'Unknown'}));
console.log('PASS: 44/45 shop boundary, 29/30 barter boundary, focused actor isolation, single/bulk sale and buy guards, three drugs, authority classes/jobs/names/scripts, opinion drop before checkout.');

// Exact shopkeeper and dialogue actor survive the handoff into the shared shop UI.
profiles.Alice.score=44;profiles.Bob.score=100;
$gameMap.event=id=>({eventId:()=>id,event:()=>({note:id===1?'<Shop>':'',name:id===1?'Alice':'Bob',pages:[]})});
new TalkPanel()._trade();$gameTemp._npcTradeWith='Alice';$gameTemp._npcTradeSellFactor=1;
const handedOff=M.context();assert.equal(handedOff.actorId,1);assert.equal(handedOff.role,'shopkeeper');assert.equal(handedOff.name,'Alice');assert(!M.allowed(handedOff));
profiles.Alice.score=45;assert(M.allowed(handedOff));
$gameTemp._npcTradeWith=null;$gameTemp._npcTradeSellFactor=null;$gameTemp._exoticSubstanceTradeOrigin=null;
global.NPCSim={ShopShiftManager:{getActivePersona:()=>({name:'Alice'})},WorkServe:{serverFor:()=> 'Bob'}};
const keeper=M.context();assert.equal(keeper.name,'Alice');profiles.Alice.score=44;assert(!M.allowed(keeper));
profiles.Alice.score=45;assert(M.allowed(keeper));
console.log('PASS: dialogue actor handoff, shopkeeper barter classification, exact counter persona, nearby worker cannot unlock shop.');

// Recruitment blocks both directions, including checkout in an already-open UI.
profiles.Alice.score=100;const partyBefore=$gameParty.members();
$gameParty.allMembers=()=>[...partyBefore,{name:()=> 'Alice'}];
assert(!M.allowed(keeper));assert(!M.allowed({...keeper,kind:'barter'}));
a._item=h;bag[9001]=3;const cashBefore=money;
assert.equal(a.doSell(1),0);assert.equal(a.doBuy(1),0);assert.equal(a.commitSale([[h,2]]),0);
assert.equal(money,cashBefore);assert.equal(bag[9001],3);
const ordinary=$dataItems[22];bag[22]=1;a._item=ordinary;a.doSell(1);assert.equal(bag[22],0);
delete $gameParty.allMembers;assert(M.allowed(keeper));
global.ShopManagement={isPartyStaffName:name=>name==='Alice'};
assert(!M.allowed(keeper));assert(!M.allowed({...keeper,kind:'barter'}));
a._item=h;assert.equal(a.doSell(1),0);assert.equal(a.doBuy(1),0);assert.equal(a.commitSale([[h,2]]),0);
a._item=ordinary;bag[22]=1;a.doSell(1);assert.equal(bag[22],0);
ShopManagement.isPartyStaffName=()=>false;assert(M.allowed(keeper));
console.log('PASS: recruited/reserve shopkeepers refuse drug trading, stale checkout is blocked, ordinary goods remain tradable.');
