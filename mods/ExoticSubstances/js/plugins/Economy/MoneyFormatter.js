//=============================================================================
// MoneyFormatter.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Money Formatter v1.1.0
 * @author Omni-Lex
 * @version 1.1.0
 * @description v1.1.0 Formats money display and truncates long item names
 *
 * @help MoneyFormatter.js
 * 
 * This plugin reformats money display by adding a dot before the last two digits.
 * For example: 12345 becomes 123.45
 * 
 * Additionally, item names longer than 10 characters are truncated with "..."
 * 
 * The plugin automatically applies to all money displays in the game including:
 * - Status windows
 * - Shop windows  
 * - Item acquisition messages
 * 
 * No additional setup required - just install and activate the plugin.
 * 
 * License: Free for commercial and non-commercial use
 */

(() => {
    'use strict';

    // Function to format money with dot before last two digits
    Window_Base.prototype.drawCurrencyValue = function(value, unit, x, y, width) {
        const formattedValue = this.formatMoneyValue(value);
        const unitWidth = this.textWidth(unit);
        this.resetTextColor();
        this.drawText(formattedValue, x, y, width - unitWidth - 6, "right");
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(unit, x + width - unitWidth, y, unitWidth, "right");
    };

    // Format money value with dot before last two digits.
    //
    // The rule lives in a plain function rather than only on Window_Base, because most of the
    // game's money is printed by DOM and parchment panels that have no window to call it on.
    // Those had no way to reach this and each wrote the conversion out again.
    function formatMoneyValue(value) {
        // The sign and any fraction are taken off the number BEFORE it is split
        // into euros and cents. Slicing the string straight was what printed a
        // negative wage as "-.50" and -5 as "0.-5", and 12.5 as "12..5": the
        // minus sign and the decimal point were being counted as digits.
        const cents = Math.round(Math.abs(Number(value) || 0));
        const sign = (Number(value) || 0) < 0 ? "-" : "";
        const valueStr = String(cents);

        // Under a euro: no whole part to print, so the cents carry it.
        if (valueStr.length <= 2) {
            const result = "0." + valueStr.padStart(2, '0');
            return result.endsWith(".00") ? "0" : sign + result;
        }

        // Insert dot before last two digits
        const mainPart = valueStr.slice(0, -2);
        const decimalPart = valueStr.slice(-2);
        const result = mainPart + "." + decimalPart;
        return sign + (result.endsWith(".00") ? mainPart : result);
    }

    Window_Base.prototype.formatMoneyValue = function(value) {
        return formatMoneyValue(value);
    };

    // The one place anything outside a window can ask for the same wording. Diary.js already
    // looks for exactly this shape.
    window.MoneyFormatter = { format: formatMoneyValue };

    // Truncate item names longer than 18 characters
    Window_Base.prototype.truncateItemName = function(name) {
        if (name.length > 18) {
            return name.substring(0, 18) + "...";
        }
        return name;
    };

    // Override drawItemName to truncate long names
    const _Window_Base_drawItemName = Window_Base.prototype.drawItemName;
    Window_Base.prototype.drawItemName = function(item, x, y, width) {
        if (item) {
            const iconY = y + (this.lineHeight() - ImageManager.iconHeight) / 2;
            const textMargin = ImageManager.iconWidth + 4;
            const itemWidth = Math.max(0, width - textMargin);
            const truncatedName = this.truncateItemName(item.name);
            this.resetTextColor();
            this.drawIcon(item.iconIndex, x, iconY);
            this.drawText(truncatedName, x + textMargin, y, itemWidth);
        }
    };

    // Override Window_Gold drawValue method (full reimplementation, no super call)
    Window_Gold.prototype.drawValue = function() {
        const x = this.itemPadding();
        const y = 0;
        const width = this.innerWidth - this.itemPadding() * 2;
        const value = $gameParty ? $gameParty._gold : 0;
        const unit = $dataSystem ? $dataSystem.currencyUnit : "";
        const formattedValue = this.formatMoneyValue(value);
        const unitWidth = this.textWidth(unit);
        
        this.resetTextColor();
        this.drawText(formattedValue, x, y, width - unitWidth - 6, "right");
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(unit, x + width - unitWidth, y, unitWidth, "right");
    };



    // Override message display for money gain/loss
    const _Game_Message_add = Game_Message.prototype.add;
    Game_Message.prototype.add = function(text) {
        // Check if the text contains money references and format them
        const moneyRegex = /\\G\[(\d+)\]/g;
        const formattedText = text.replace(moneyRegex, (match, amount) => {
            const formattedAmount = this.formatMoneyForMessage(parseInt(amount));
            const currencyUnit = $dataSystem ? $dataSystem.currencyUnit : "";
            return formattedAmount + " " + currencyUnit;
        });
        
        _Game_Message_add.call(this, formattedText);
    };

    // Format money for message display
    Game_Message.prototype.formatMoneyForMessage = function(value) {
        const valueStr = value.toString();
        
        if (valueStr.length <= 2) {
            return "0." + valueStr.padStart(2, '0');
        }
        
        const mainPart = valueStr.slice(0, -2);
        const decimalPart = valueStr.slice(-2);
        return mainPart + "." + decimalPart;
    };

})();

/* Exotic Substances save cleanup. Runs before disabling in the mod manager. */
(() => {
  'use strict';
  const items = [9000,9001,9002,9003,9010,9011,9012,9013,9014,9015];
  const states = [9001,9002,9003,9004,9005,9006,9010,9011,9012,9013,9014,9015,9020,9021,9022];
  const topics = new Set(['Riftflower family','Meld Resin','Riftflower','Nectar','Syntheogen','Fractilized Cocaine','Vesper Wafers','Hush (drink kit)','Preparing Hush','Lethe','Splice','Continuity','Applied Ecstatics','Bloomprints','Microdosing','Veilnet','PharmaDrop','Underground drug trade']);
  const report = () => ({items:0,states:0,actors:0,npcItems:0,containers:0});
  function remove(bag, ids, result) {
    if (!bag || typeof bag !== 'object') return;
    for (const id of ids) if (Object.prototype.hasOwnProperty.call(bag,id)) {
      result.items += Math.max(0,Number(bag[id])||0);
      delete bag[id];
    }
  }
  function scrub(contents, result=report()) {
    const {system,party,actors}=contents||{};
    if (!system || !party || !actors) throw new Error('Invalid save contents.');
    if (system._exoticSubstancesCrimeSentence) throw new Error('Finish the current sentence before disabling Exotic Substances.');
    remove(party._items,items,result);
    for (const actor of actors._data||[]) {
      if (!actor) continue;
      let touched=false;
      if (Array.isArray(actor._states)) {
        const old=actor._states.length;
        actor._states=actor._states.filter(id=>!states.includes(Number(id)));
        result.states+=old-actor._states.length;
        touched=old!==actor._states.length;
      }
      for (const id of states) {
        if (actor._stateTurns && Object.prototype.hasOwnProperty.call(actor._stateTurns,id)) {delete actor._stateTurns[id];touched=true;}
        if (actor._stateSteps && Object.prototype.hasOwnProperty.call(actor._stateSteps,id)) {delete actor._stateSteps[id];touched=true;}
      }
      if (actor._exoticSubstanceDrugs) {delete actor._exoticSubstanceDrugs;touched=true;}
      if (Array.isArray(actor._keywords)) actor._keywords=actor._keywords.filter(key=>!topics.has(key));
      if (touched) result.actors++;
    }
    for (const profile of Object.values(system._npcSociety||{})) {
      if (!Array.isArray(profile?.itemIds)) continue;
      const old=profile.itemIds.length;
      profile.itemIds=profile.itemIds.filter(id=>!items.includes(Number(id)));
      result.npcItems+=old-profile.itemIds.length;
    }
    const bags=[];
    const data=system._containerData;
    if(data?.extradimensional)bags.push(data.extradimensional);
    if(data?.containers)bags.push(...Object.values(data.containers));
    for(const bag of new Set(bags)){
      const before=result.items;
      remove(bag,items,result);
      if(result.items>before)result.containers++;
    }
    delete system._exoticSubstances;
    delete system._exoticSubstancesLoreDrops;
    delete system._exoticSubstancesCrimeSentence;
    delete system._pharmaLastRegion;
    return result;
  }
  function prepare() {
    if (!window.$gameSystem || !window.$gameParty || !window.$gameActors) throw new Error('Load the save you want to clean first.');
    if (window.prisonManager?._isInPrison) throw new Error('Finish the current sentence before cleaning this save.');
    const result=scrub({system:$gameSystem,party:$gameParty,actors:$gameActors});
    const manager=window.ContainerManager;
    if (manager) {
      for(const bag of new Set([...Object.values(manager._privateContainers||{}),manager._extradimensionalContainer])) remove(bag,items,result);
      manager.save?.();
    }
    const world=window.WorldManager?.getFile?.('containers');
    if (world) {
      for (const bag of new Set([world.extradimensional,...Object.values(world.containers||{})])) {
        const before=result.items;
        remove(bag,items,result);
        if(result.items>before)result.containers++;
      }
      window.WorldManager.flush?.('containers');
    }
    for(const actor of $gameActors._data||[]) actor?.refresh?.();
    console.info('[Exotic Substances] Save cleaned.',result);
    return result;
  }
  async function cleanSaveSlots(progress=()=>{}) {
    if(!window.StorageManager?.isLocalMode?.() || !window.WorldManager?.listWorlds)
      throw new Error('Automatic cleanup requires the desktop game and its world manager.');
    const fs=require('fs'),path=require('path'),worlds=WorldManager.listWorlds(),targets=[];
    const dirs=[StorageManager.fileDirectoryPath(),...worlds.map(w=>WorldManager.savesDirFor(w.name))];
    for(const dir of dirs) {
      if(!fs.existsSync(dir))continue;
      for(const filename of fs.readdirSync(dir)) {
        if(/^file\d+\.rmmzsave$/.test(filename))targets.push({path:path.join(dir,filename),type:'save',world:path.basename(path.dirname(dir))});
      }
    }
    for(const world of worlds) {
      const file=path.join(path.dirname(WorldManager.savesDirFor(world.name)),'containers.json');
      if(fs.existsSync(file))targets.push({path:file,type:'containers',world:world.name});
    }
    // Read, validate and transform every file before touching any original.
    const changes=[];
    for(const target of targets) {
      const original=fs.readFileSync(target.path,'utf8');
      let data;
      try {
        data=target.type==='save'
          ? await StorageManager.jsonToObject(await StorageManager.zipToJson(original))
          : JsonEx.parse(original);
      } catch(error) {throw new Error('Could not read '+target.path+': '+error.message);}
      if(target.type==='save') {
        if(!data?.system || !data?.party || !data?.actors)throw new Error('Invalid save: '+target.path);
        if(data.system._exoticSubstancesCrimeSentence)throw new Error('Finish the sentence in '+target.path+' before disabling.');
        // Leave saves that have never used this mod alone, including other mods'
        // possible use of the same IDs in a different playthrough.
        const used=!!(data.system._exoticSubstances || data.system._exoticSubstancesLoreDrops ||
          (data.actors._data||[]).some(a=>a?._exoticSubstanceDrugs));
        if(!used)continue;
        scrub(data);
      } else {
        const bags=[data?.extradimensional,...Object.values(data?.containers||{})];
        let touched=false;
        for(const bag of bags)for(const id of items)if(bag && Object.prototype.hasOwnProperty.call(bag,id)) {
          delete bag[id];touched=true;
        }
        if(!touched)continue;
      }
      const encoded=target.type==='save'
        ? await StorageManager.jsonToZip(await StorageManager.objectToJson(data))
        : JsonEx.stringify(data);
      changes.push({...target,encoded,original});
    }
    const suffix='.exotic-substances-backup-'+Date.now();
    // A failure while making backups leaves all original files intact.
    for(const c of changes){c.backup=c.path+suffix;fs.copyFileSync(c.path,c.backup,fs.constants.COPYFILE_EXCL);}
    const written=[];
    try {
      for(const c of changes) {
        const temp=c.path+'.exotic-substances-tmp';
        try{fs.writeFileSync(temp,c.encoded,'utf8');fs.renameSync(temp,c.path);}
        finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
        written.push(c);
        if(c.type==='containers' && c.world===WorldManager.activeWorldName){
          const value=JsonEx.parse(c.encoded);
          if(!WorldManager.writeWorldFile(c.world,'containers',value))throw new Error('Could not update active world chests.');
        }
        progress(written.length,changes.length);
      }
    } catch(error) {
      for(const c of written.reverse()){
        fs.copyFileSync(c.backup,c.path);
        if(c.type==='containers' && c.world===WorldManager.activeWorldName)
          WorldManager.writeWorldFile(c.world,'containers',JsonEx.parse(c.original));
      }
      throw error;
    }
    return changes.length;
  }
  function chooseDisableMode() {
    return new Promise(resolve=>{
      const doc=window.document;
      const overlay=doc.createElement('div');
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.setAttribute('aria-label','Disable Exotic Substances');
      overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78);font-family:inherit;color:#efe9d8';
      const panel=doc.createElement('div');
      panel.style.cssText='width:min(520px,calc(100vw - 32px));padding:26px;background:#202229;border:1px solid #9c916f;box-shadow:0 20px 70px #000;border-radius:6px';
      const title=doc.createElement('h2');title.textContent='Disable Exotic Substances?';title.style.cssText='margin:0 0 10px;font-size:22px';panel.appendChild(title);
      const lead=doc.createElement('p');lead.textContent='Choose what happens to your saved drug items and effects.';lead.style.cssText='margin:0 0 20px;line-height:1.45';panel.appendChild(lead);
      const finish=value=>{doc.removeEventListener('keydown',onKey,true);overlay.remove();resolve(value);};
      const onKey=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish('cancel');}};
      const button=(label,description,value)=>{
        const b=doc.createElement('button');b.type='button';b.style.cssText='display:block;width:100%;text-align:left;margin:9px 0;padding:12px 14px;background:#31343d;border:1px solid #746b57;border-radius:4px;color:#fff;cursor:pointer;font:inherit';
        const heading=doc.createElement('strong');heading.textContent=label;b.appendChild(heading);
        const detail=doc.createElement('span');detail.textContent=description;detail.style.cssText='display:block;margin-top:4px;color:#c6bfaf;font-size:13px;line-height:1.35';b.appendChild(detail);
        b.addEventListener('click',()=>finish(value));panel.appendChild(b);
        return b;
      };
      const first=button('Clean saves & disable','Back up affected saves in every world, then remove this mod’s items and effects.','clean');
      button('Disable without cleaning','Keep all saved drug data. Existing saves may fail to load until the mod is enabled again.','keep');
      button('Cancel','Keep the mod enabled.','cancel');
      overlay.appendChild(panel);doc.body.appendChild(overlay);doc.addEventListener('keydown',onKey,true);first.focus();
    });
  }
  function installAutoCleanup() {
    const scene=window.Scene_ModManager;
    if(!scene?.prototype?._toggleSelectedMod || scene.prototype._exoticSubstancesCleanupInstalled)return;
    const original=scene.prototype._toggleSelectedMod;
    scene.prototype._exoticSubstancesCleanupInstalled=true;
    scene.prototype._toggleSelectedMod=function(...args){
      const mod=window.ModManager?.mods?.[this._selectedModIndex];
      if(!mod || mod.name!=='ExoticSubstances' || !mod.active)return original.apply(this,args);
      if(this._exoticSubstancesCleaning)return;
      this._exoticSubstancesCleaning=true;
      window.ExoticSubstancesCleanup.chooseDisableMode()
        .then(async choice=>{
          if(choice==='cancel')return;
          if(choice==='keep'){
            const confirmed=window.confirm?.('Disable without cleaning saved drugs and effects?\n\nSaves containing active drug effects may fail to load while Exotic Substances is disabled. Re-enable the mod to recover them. No save files will be changed.');
            if(!confirmed)return;
          }else if(choice==='clean'){
            window.ParchmentToast?.show?.('Cleaning Exotic Substances from saved games. Please wait.',{severity:'info'});
            await cleanSaveSlots((done,total)=>console.info('[Exotic Substances] Cleaned save '+done+'/'+total));
          }else return;
          mod.active=false;
          ModManager.saveModConfig?.();
          if(this._container)this._refreshDOM();
          window.ParchmentToast?.show?.('Exotic Substances disabled. Restart the game before loading a save.',{severity:'info'});
        })
        .catch(error=>{
          console.error('[Exotic Substances] Automatic cleanup failed; mod remains enabled.',error);
          window.ParchmentToast?.show?.('Could not disable Exotic Substances: '+error.message,{severity:'danger'});
          window.alert?.('Exotic Substances remains enabled. Disable failed:\n'+error.message+'\n\nIf cleanup began, backups are in the save folders.');
        })
        .finally(()=>{this._exoticSubstancesCleaning=false;});
    };
  }
  window.ExoticSubstancesCleanup={prepare,scrub,cleanSaveSlots,chooseDisableMode,installAutoCleanup};
})();

/* Exotic Substances 0.4.0 — MIT. Loaded through the tested MoneyFormatter override. */
(() => {
'use strict';
const VERSION='0.4.0';
const GOODS={9001:{name:'Meld Resin',lo:4000,hi:12000,boost:32,drop:20,duration:120,weight:1,icon:9001},9002:{name:'Syntheogen',lo:5000,hi:18000,boost:42,drop:26,duration:180,weight:1,icon:9002},9003:{name:'Fractilized Cocaine',lo:12500,hi:45000,duration:240,weight:1,icon:9003}};
Object.assign(GOODS,{
 9010:{name:'Riftflower',lo:8000,hi:30000,weight:1,icon:9010},
 9011:{name:'Nectar',lo:17500,hi:65000,weight:8,icon:9011},
 9012:{name:'Vesper Wafers',lo:2500,hi:9000,weight:3,icon:9012},
 9013:{name:'Hush (drink kit)',lo:3000,hi:9000,weight:350,icon:9013},
 9014:{name:'Lethe',lo:9000,hi:32000,weight:5,icon:9014},
 9015:{name:'Splice',lo:6000,hi:24000,weight:1,icon:9015}
});
const GOOD_IDS=Object.keys(GOODS).map(Number);
const ECON={
 9001:{family:'crop',drift:.035,stock:8,netStock:6,demand:16,availability:1,unit:'1 g',rarity:'Common'},
 9002:{family:'perception',drift:.065,stock:6,netStock:4,demand:10,availability:.8,unit:'dose',rarity:'Uncommon'},
 9003:{family:'infernal',drift:.08,stock:4,netStock:3,demand:12,availability:.75,unit:'crystal dose',rarity:'Uncommon'},
 9010:{family:'crop',drift:.05,stock:3,netStock:2,demand:5,availability:.4,unit:'preloaded inhaler',rarity:'Rare'},
 9011:{family:'crop',drift:.06,stock:2,netStock:1,demand:3,availability:.23,unit:'frosted flask',rarity:'Epic'},
 9012:{family:'wafer',drift:.075,stock:8,netStock:6,demand:14,availability:.85,unit:'sleeve',rarity:'Uncommon'},
 9013:{family:'medical',drift:.04,stock:10,netStock:7,demand:18,availability:.95,unit:'communal kit',rarity:'Common'},
 9014:{family:'medical',drift:.055,stock:4,netStock:3,demand:8,availability:.65,unit:'single-use vial',rarity:'Rare'},
 9015:{family:'perception',drift:.09,stock:5,netStock:4,demand:8,availability:.55,unit:'transfer',rarity:'Rare'}
};
const INTEREST=['Avoiding','Indifferent','Interested','Seeking'];
// Classes make the market readable at a glance; individual temperament and
// occupation keep two people in the same uniform from becoming clones.
const PREFERENCES={
 9001:{strong:[4,11,13,15,17,18,22,30,32,33,37,38,40,43,47,52,54,57,62],secondary:[1,9,21,24,28,45,55,56,69]},
 9002:{strong:[2,5,8,12,16,27,29,31,35,36,39,42,48,49,53,58,59],secondary:[1,7,20,23,25,34,37,41,50,56,60,61,67]},
 9003:{strong:[6,16,18,21,23,30,32,37,38,53,54,60,61,66],secondary:[1,11,13,17,19,20,27,28,35,40,42,49,58,69]},
 9010:{strong:[2,5,9,19,20,23,25,27,29,31,37,39,41,42,49,53,56,58],secondary:[4,8,12,15,24,35,36,48,50,59,61,67]},
 9011:{strong:[5,16,19,20,23,27,29,31,37,39,42,49,53,58,61,66],secondary:[2,6,8,25,35,36,41,48,50,56,59,67]},
 9012:{strong:[3,5,8,15,22,25,29,35,36,39,59,60],secondary:[1,2,4,6,12,18,23,27,31,41,48,49,55,61,67]},
 9013:{strong:[1,6,9,21,24,28,32,38,41,43,46,47,51,54,60],secondary:[4,7,11,13,17,25,33,35,39,42,45,48,52,55,57,66]},
 9014:{strong:[4,9,11,13,17,18,22,24,25,30,32,33,37,38,40,41,43,47,51,52,54,57],secondary:[1,6,15,19,20,21,28,39,42,50,55,58,66,69]},
 9015:{strong:[11,12,14,16,21,24,28,29,35,36,49,53,60],secondary:[1,5,8,13,18,23,27,30,31,37,39,42,48,50,58,61,66]}
};
// Avalanche the stable string hash: adjacent weeks should not have adjacent noise.
function noise(key){let n=hash(key);n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;}
function cityBias(c,id){return noise(world()+'|'+c+'|'+ECON[id].family+'|route');}
function marketEvent(c,id,w=week()){
 const e=ECON[id],lag=id===9011?1:0,t=w-lag,block=Math.floor(t/3),phase=((t%3)+3)%3;
 const n=noise(world()+'|'+c+'|'+e.family+'|event:'+block),strength=[.5,1,.5][phase]*(id===9011?.65:1);
 const terms={crop:['Harvest surplus','Disrupted harvest'],perception:['Batch arrival','Batch shortage'],infernal:['Supply arrival','Infernal route disruption'],wafer:['Wafer batch arrival','Social demand surge'],medical:['Pharmaceutical delivery','Distribution disruption']};
 if(n<.22)return {label:terms[e.family][0],price:-.24*strength,supply:1+.5*strength,demand:1};
 if(n>.78)return {label:terms[e.family][1],price:.3*strength,supply:1-.5*strength,demand:1+.3*strength};
 return {label:'Steady trade',price:0,supply:1,demand:1};
}
function traderKind(ctx,id){if(ctx.kind==='net')return 'network';const n=noise(ctx.key+'|'+ECON[id].family+'|trade-role');return n<.22?'supplier':n>.76?'buyer':'stockist';}
function classIdFor(ctx,p=profile(ctx?.name)){
 const ev=ctx?.map==null||ctx.map===$gameMap.mapId()?$gameMap.event?.(ctx.event):null;
 return Number(p?.assignedClassId||p?.classId||window.NPCEmpathize?._helpers?._extractClassId?.(ev))||0;
}
function preference(ctx,id,w=week()){
 if(ctx?.kind==='net')return {base:3,tier:3,label:'Network stock',classId:0};
 const p=profile(ctx?.name),cfg=PREFERENCES[id]||{strong:[],secondary:[]},cid=classIdFor(ctx,p);
 const n=noise((ctx?.key||ctx?.name||'unidentified-trader')+'|'+id+'|preference');
 let base=cfg.strong.includes(cid)?(n<.55?3:2):cfg.secondary.includes(cid)?(n<.15?3:n<.82?2:1):(n<.12?2:n<.78?1:0);
 // Temperament is a nudge, never a replacement for an NPC's class identity.
 const pi=Number(p?.personalityIndex),up={9002:[11,12,13,15,23],9003:[6,10,13,17,23],9012:[4,9,12,23],9013:[0,5,8,9,14],9014:[0,5,7,14],9015:[6,12,13,15,23]}[id]||[];
 const down={9003:[5,7,17],9015:[5,7,17],9002:[5,7,17],9012:[5,7,10,17]}[id]||[];
 let lean=up.includes(pi)?1:down.includes(pi)?-1:0;
 const job=window.WorkSystem?.getJob?.(p?.currentJobId)||window.WorkSystem?.Jobs?.find?.(j=>j.id===p?.currentJobId),work=[job?.category,job?.spec,job?.name,p?.jobName].filter(Boolean).join(' ');
 if((id===9001||id===9014)&&/labor|construction|security|military|medical|rescue/i.test(work))lean++;
 if(id===9013&&/service|transport|courier|journal|medical|office/i.test(work))lean++;
 if((id===9002||id===9015)&&/academic|research|art|entertain|magic|occult/i.test(work))lean++;
 if(id===9012&&/relig|social|entertain|music|service/i.test(work))lean++;
 if(id===9003&&/executive|management|security|military|transport/i.test(work))lean++;
 if(base>0)base=clamp(base+clamp(lean,-1,1),1,3); // Personal aversion remains an aversion.
 const event=marketEvent(ctx.city,id,w);let tier=base;
 if(base>0&&event.price)tier=clamp(base+(event.price>0?1:-1),1,3);
 return {base,tier,label:INTEREST[tier],classId:cid,event:event.label};
}
const isDrug=i=>!!i&&!!GOODS[i.id]&&i.itypeId!==undefined;
const isNew=isDrug;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wholeEuro=v=>Math.round((Number(v)||0)/100)*100;
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const roll=s=>hash(s)/4294967296;
const now=()=>Number(window.TimeDateSystem?.getGameTimeMinutes?.()??$gameVariables.value(114))||0;
// The game's epoch is Monday 2001-01-01 10:00; weeks turn at midnight.
const week=()=>Math.floor((now()+600)/10080);
const world=()=>String(window.WorldManager?.activeWorldName||'default');
function state(){
 const s=$gameSystem._exoticSubstances||($gameSystem._exoticSubstances={version:VERSION,cities:{},dealers:{}});
 s.version=VERSION;return s;
}
// National markets; buildings inherit their origin, never the reused interior template.
const FIXED_COUNTRIES={Ghent:'Belgium',GhentFields:'Belgium',Antwerpen:'Belgium',Brusselles:'Belgium',GreenWitch:'United Kingdom',Milano:'Italy',Rome:'Italy',Roma:'Italy'};
function city(){
 const building=window.ProceduralHouseSystem?.getCurrentBuilding?.(),m=building?.mapId||$gameMap.mapId();
 const group=window.NPCSystem?.findMapGroupByMap?.(m);
 if(['OmegaTower','FrozenStation','PublicTransport'].includes(group))return 'Region:'+group;
 if(FIXED_COUNTRIES[group])return 'Country:'+FIXED_COUNTRIES[group];
 const nation=window.BSE?.Helpers?.getNationName?.()||window.BSE?.Helpers?.getSpawnBand?.()?.nation;
 if(nation)return 'Country:'+nation;
 // If a generated interior has no active band, inherit the last outdoor region.
 if(building&&$gameSystem._pharmaLastRegion)return $gameSystem._pharmaLastRegion;
 return 'Region:'+(group||'Map '+m);
}
function rememberRegion(){if(!window.ProceduralHouseSystem?.getCurrentBuilding?.()&&window.$gameMap&&window.$gameSystem)$gameSystem._pharmaLastRegion=city();}
function regionLabel(c){return String(c).replace(/^(Country|Region):/,'').replace('OmegaTower','Omega Tower').replace('FrozenStation','Frozen Station').replace('PublicTransport','Transit network');}
function bounds(c,id){const g=GOODS[id];return [g.lo,g.hi];}
function market(c,id){
 const key=world()+'|'+c+'|'+id,w=week(),[lo,hi]=bounds(c,id),s=state(),e=ECON[id],bias=cityBias(c,id);let r=s.cities[key];
 if(!r)r=s.cities[key]={week:w,center:lo+(hi-lo)*(.12+.76*bias)};
 // Existing midpoints continue from their saved value; no migration price jump.
 while(r.week<w){r.week++;const event=marketEvent(c,id,r.week),target=(lo+(hi-lo)*(.12+.76*bias))*(1+event.price);
  const step=clamp((target/r.center-1)*.3+(noise(key+':week:'+r.week)*2-1)*e.drift*.35,-e.drift,e.drift);
  const movement=clamp(r.center*step,-(hi-lo)*.15,(hi-lo)*.15);
  r.center=clamp(r.center+movement,lo,hi);
 }
 const event=marketEvent(c,id,r.week);
 return {center:r.center,low:Math.round(r.center*.975),high:Math.round(r.center*1.025),week:r.week,event:event.label,bias:bias<.3?'Supply region':bias>.7?'High-demand region':'Mixed market'};
}
function profile(name,event=null){
 if(!name)return null;
 const existing=window.NPCEmpathize?._helpers?._getProfile?.(name);
 if(existing)return existing;
 const classId=window.NPCEmpathize?._helpers?._extractClassId?.(event)||null;
 return window.NPCSocietyRegistry?.ensureProfile?.(name,classId)||null;
}
function isPartyMember(name){
 return !!name&&(!!window.ShopManagement?.isPartyStaffName?.(name)||($gameParty?.allMembers?.()||$gameParty?.members?.()||[]).some(actor=>actor?.name?.()===name||actor?._npcName===name));
}
function eventId(){let it=$gameMap._interpreter,id=0;while(it){if(it.eventId?.())id=it.eventId();it=it._childInterpreter;}return id;}
const AUTHORITY_RE=/\b(police|officer|cop|constable|sheriff|marshal|guard|warden|jailer|judge|magistrate|mayor|customs|authority|law enforcement)\b|polizi|carabinier|gendarm/i;
function shopRole(name,event){const data=event?.event?.();return !!(window.NPCSystem?.hasShopTag?.(data?.note)||/<Shop\b/i.test(data?.note||'')||$gameSystem._npcShopAssignments?.[name]);}
function context(){
 const c=city(),h=window.NPCEmpathize?._helpers,barter=!!($gameTemp._npcTradeWith&&$gameTemp._npcTradeSellFactor!=null);
 const origin=barter&&$gameTemp._exoticSubstanceTradeOrigin?.name===$gameTemp._npcTradeWith?$gameTemp._exoticSubstanceTradeOrigin:null;
 const e=origin?.event??eventId(),ev=$gameMap.event?.(e),building=window.ProceduralHouseSystem?.getCurrentBuilding?.();
 const place=building?[building.mapId,building.x,building.y,building.floorIndex||0].join(':'):'map:'+$gameMap.mapId();
 // Resolve the exact counter's persona. Never borrow a nearby worker's identity.
 const persona=!barter&&window.NPCSim?.ShopShiftManager?.getActivePersona?.($gameMap.mapId(),e);
 const name=barter?$gameTemp._npcTradeWith:(persona?.name||h?._getNPCName?.(e)||'');
 const actor=origin?.actorId??$gameParty.leader?.()?.actorId?.();
 return {city:c,map:$gameMap.mapId(),event:e,name:name||'',actorId:actor,role:!barter||shopRole(name,ev)?'shopkeeper':'npc',kind:barter?'barter':'shop',key:world()+'|'+c+'|'+(barter?'npc:'+name:'shop:'+place+':'+e)};
}
function isAuthority(ctx,p){
 const ev=ctx.map==null||ctx.map===$gameMap.mapId()?$gameMap.event?.(ctx.event):null;
 if(ev&&window.CrimeSystem?.isOfficerEvent?.(ev))return true;
 if(p?.isPolice||p?.isAuthority||p?.isOfficer||[148,149,155].includes(Number(p?.currentJobId)))return true;
 const cid=Number(p?.assignedClassId||p?.classId||window.NPCEmpathize?._helpers?._extractClassId?.(ev));
 if(cid===44)return true;
 const cls=window.$dataClasses?.[cid],job=window.WorkSystem?.Jobs?.find(j=>j.id===p?.currentJobId),data=ev?.event?.();
 const label=[ctx.name,cls?.name,job?.name,p?.jobName,p?.role,data?.note].filter(Boolean).join(' ');
 return AUTHORITY_RE.test(label)||(data?.pages||[]).some(page=>(page.list||[]).some(cmd=>cmd.code===117&&[124,130].includes(cmd.parameters?.[0])));
}
function access(ctx){
 if(!ctx)return {allowed:false,reason:'No trader'};
 if(ctx.kind==='net')return {allowed:true,reason:'Hypernet'};
 const ev=ctx.map==null||ctx.map===$gameMap.mapId()?$gameMap.event?.(ctx.event):null;
 const p=profile(ctx.name,ev);if(!p||(!ctx.event&&ctx.kind==='shop'))return {allowed:false,reason:'No identified keeper'};
 const threshold=ctx.kind==='shop'||ctx.role==='shopkeeper'?45:30;
 if(isAuthority(ctx,p))return {allowed:false,threshold,reason:'Authority refuses drug trading'};
 if(isPartyMember(ctx.name))return {allowed:false,threshold,reason:'Party members do not trade drugs'};
 if(window.CrimeSystem?.isWanted?.())return {allowed:false,threshold,reason:'Active manhunt'};
 const actor=ctx.actorId!=null?($gameActors.actor?.(ctx.actorId)||$gameParty.members?.().find(a=>a.actorId()===ctx.actorId)):$gameParty.leader?.();
 const h=window.NPCEmpathize?._helpers;let score=null;
 if(actor&&h?._npcEffectiveOpinion)score=h._npcEffectiveOpinion(p,actor);
 else if(actor&&h?._computePartyPredisposition){const row=h._computePartyPredisposition(p).find(x=>x.actor?.actorId?.()===actor.actorId());if(row)score=row.score;}
 if(!Number.isFinite(score))return {allowed:false,threshold,reason:'Disposition unavailable'};
 return {allowed:score>=threshold,score,threshold,name:ctx.name,actorId:actor.actorId(),reason:score>=threshold?'Trusted trader':'Disposition too low'};
}
const allowed=ctx=>access(ctx).allowed;
function ledger(ctx,id){
 const key=ctx.key+'|'+id,w=week(),s=state();let r=s.dealers[key];
 if(!r||r.week<w){const e=ECON[id],event=marketEvent(ctx.city,id,w),kind=traderKind(ctx,id),bias=cityBias(ctx.city,id);
  const offered=noise(key+':available:'+w)<clamp(e.availability*event.supply*(kind==='supplier'?1.25:kind==='buyer'?.6:1),.05,1);
  const stockBase=ctx.kind==='net'?e.netStock:e.stock;
  const stock=offered?Math.max(1,Math.round(stockBase*(.3+noise(key+':stock:'+w)*.7)*event.supply*(1.25-.5*bias)*(kind==='supplier'?1.3:kind==='buyer'?.5:1))):0;
  const pref=preference(ctx,id,w),dn=noise(key+':demand:'+w);
  const demand=pref.tier===0?0:pref.tier===1?1+Math.floor(dn*2):pref.tier===2?Math.max(2,Math.round(e.demand*(.35+dn*.25)*event.demand)):Math.max(4,Math.round(e.demand*(.7+dn*.45)*event.demand));
  r=s.dealers[key]={week:w,stock,demand,initialStock:stock,initialDemand:demand};
 }
 return r;
}
function count(ctx,id){if(!allowed(ctx))return 0;if(ctx.kind==='barter')return (profile(ctx.name)?.itemIds||[]).filter(n=>Number(n)===id).length;return ledger(ctx,id).stock;}
function quote(ctx,id,buy){
 const m=market(ctx.city,id),r=ledger(ctx,id),kind=traderKind(ctx,id),[lo,hi]=bounds(ctx.city,id);
 const local=m.low+(m.high-m.low)*noise(ctx.key+':quote:'+id);
 if(buy){
  const role={supplier:.84,stockist:1,buyer:1.12,network:1.02}[kind],pressure=1+.04*(1-clamp(r.stock/Math.max(1,r.initialStock),0,1));
  return wholeEuro(clamp(Math.round(local*role*1.06*pressure),Math.round(lo*.65),Math.round(hi*1.35)));
 }
 const pref=preference(ctx,id);if(!pref.tier)return 0;
 const interest=[0,.62,.80,1][pref.tier],role={supplier:.92,stockist:1,buyer:1.07,network:1}[kind];
 const pressure=1-.06*(1-clamp(r.demand/Math.max(1,r.initialDemand),0,1));
 const raw=wholeEuro(clamp(Math.round(local*role*interest*pressure),Math.round(lo*.45),Math.round(hi*1.25)));
 // A trader never buys back their own stock for more than 80% of their ask.
 const sameTraderCap=Math.floor(quote(ctx,id,true)*.8/100)*100;
 return Math.max(100,Math.min(raw,sameTraderCap));
}
function transact(ctx,item,n,buy){n=Math.floor(n);if(!isDrug(item)||!Number.isFinite(n)||n<=0||!allowed(ctx))return 0;const r=ledger(ctx,item.id),price=quote(ctx,item.id,buy);const cap=buy?Math.min(count(ctx,item.id),$gameParty.maxItems(item)-$gameParty.numItems(item),Math.floor($gameParty.gold()/price)):Math.min(r.demand,$gameParty.numItems(item));n=Math.min(n,cap);if(n<=0)return 0;
// Illicit trust is its own progression. Deliberately do not call
// NPCSim.noteShopPurchase: legal shop loyalty neither grows from nor discounts
// narcotics trades. A future dealing skill/reputation system will own that.
$gameParty.gainGold((buy?-1:1)*price*n);$gameParty.gainItem(item,(buy?1:-1)*n);
if(ctx.kind==='barter'){
 if(buy){const p=profile(ctx.name);p.itemIds=p.itemIds||[];for(let j=0;j<n;j++){const ix=p.itemIds.findIndex(x=>Number(x)===item.id);if(ix>=0)p.itemIds.splice(ix,1);}}
}else r.stock+=buy?-n:n;
if(!buy){r.demand-=n;recordDrugSale(ctx,item,n);}return n;}
const MENU_TEXT={
9001:'Brown Riftflower resin softened between the palms, worked into the skin and secured with a patch or bandage. Relaxes the user and muffles incoming magic; heavier applications bring greater protection, hunger and drowsiness.',
9002:'Syntheogen, known on the street as Synth: a synthetic derivative of psilocybin that makes the mind receptive to patterned experience. Without a Bloomprint, its trip is unstructured, lifting mood and perception while unsettling aim.',
9003:'Pale, branching crystals reclaimed from matured Red Cocaine. Held beneath the tongue, the fractilized structure dissolves in time with the pulse, driving an overclocked rush followed by a punishing crash. Known as Frack, Frac or Fractal.',
9010:'Selected Riftflower sealed in a clear nasal inhaler, ready to release its aromatic vapor. Restores magical reserves and heightens receptivity, leaving the mind more open to hostile influence.',
9011:'Golden Riftflower concentrate sealed in a frosted glass flask. Flash-freezing releases a dense amber vapor before the concentrate thaws. Improves casting efficiency and resistance to disruption, but narrows attention and slows physical reactions.',
9012:'Scored sacramental wafers with exposed circuitry beneath a golden cross. Held against the roof of the mouth and activated by humming, they warm and dissolve into easy fellowship, lowered defenses and misplaced trust.',
9013:'A bitter, pearlescent sedative kit prepared as a communal drink with jelly cubes and sugar pearls. Held against the cheek to absorb before swallowing, it quiets panic and eases rest while leaving reactions slow. Best “cooked” with one Food item; swallowing it raw weakens the benefits and worsens the sickness.',
9014:'A single-use eardrop ampoule that muffles the body’s warning of injury without healing it. Eases pain and recoverable injury penalties, but disrupts balance, judgment and coordination.',
9015:'A temporary leach-glyph transfer carrying a psychedelic derivative and encoded experiential pattern. Applied directly to the skin, it produces a long anticipatory trip that improves evasion while degrading aim and orientation.'
};
// Inventory inspection stays concise. The complete histories live in the
// dialogue topic bank, where NPCs can recall them without turning item cards
// into codex pages.
const ITEM_LORE={
 9001:'Usually pressed from low-grade Riftflower and trimmings, Meld is softened between the palms and bound against the skin. Recreational circles pass a warm coil from hand to hand before taking a portion.',
 9002:'Developed by Continuity after traditional psychedelic mushrooms became unreliable, Syntheogen replaced the ideal of natural medicine with a standardized gateway to reproducible visions. Underground users usually call it Synth.',
 9003:'Fractilized from matured Red Cocaine, Frack retains the stabilizer\'s branching imprint after its crimson material is removed. Panacea Corporation denies any connection between the drugs.',
 9010:'Cultivators selected seam-touched cannabis until its magical behavior became repeatable. The best flower is sealed into nasal inhalers; rough harvests usually become Meld.',
 9011:'Refined only from exceptional Riftflower, Nectar occupies the premium end of the cannabis trade. Flash-freezing releases the amber vapor concealed inside its golden concentrate.',
 9012:'Born from Christian relief circles and displaced semiconductor workers, Vesper Wafers turn sustained humming into shared emotional warmth. Their scored golden cross still reveals that history.',
 9013:'Developed for couriers passing post-Y2K checkpoints, Hush became a communal ritual of jelly, sugar pearls and stubbornly personal recipes. Users call its artificial calm “going quiet.”',
 9014:'Once an emergency labor drug, Lethe was banned after corporations used it to keep injured workers on the job. Modern supplies are recovered surplus or bootleg reconstructions.',
 9015:'Continuity dissidents combined psychedelic chemistry and symbolic instruction in a temporary skin transfer. Its active glyph regulates absorption and shapes perception through the body.'
};
const ITEM_NATURE={9001:'Both',9002:'Mundane',9003:'Mundane',9010:'Both',9011:'Both',9012:'Both',9013:'Both',9014:'Mundane',9015:'Both'};
function databaseCollision(type,id,occupied){
 const label=String(occupied?.name||'unnamed entry');
 const message='Exotic Substances could not load because '+type+' ID '+id+' is already occupied by “'+label+'”. This usually means another installed mod uses the same database ID. Disable the conflicting mod or install a compatibility patch. Exotic Substances stopped loading to prevent save corruption.';
 console.error('[Exotic Substances] '+message);
 window.Graphics?.printError?.('Exotic Substances conflict',message);
 return new Error(message);
}
function inject(){
 if($dataItems[9000]&&!$dataItems[9000]._exoticSubstancesDivider)throw databaseCollision('item',9000,$dataItems[9000]);
 $dataItems[9000]={id:9000,name:'<-- Narcotics -->',description:'',note:'',iconIndex:0,price:0,itypeId:1,consumable:false,occasion:3,scope:0,speed:0,successRate:100,repeats:1,tpGain:0,hitType:0,animationId:0,damage:{type:0,elementId:0,formula:'0',variance:0,critical:false},effects:[],_exoticSubstancesDivider:true};
 DataManager.extractMetadata($dataItems[9000]);
 for(const id of GOOD_IDS){
 const g=GOODS[id];if($dataItems[id]&&!$dataItems[id]._exoticSubstances)throw databaseCollision('item',id,$dataItems[id]);
 const descriptions={9001:'Relaxed, hungry, distracted. Mood +32 before tolerance. Habit-forming.\n2h high; mild comedown. One gram. Medical.',9002:'Signal bleed: altered perception, rapid tolerance. Low dependency.\nMood +42 before tolerance; 3h high. One dose. Medical.',9003:'50% HP, +75 Sleep, +62.5% STR/INT/DEX; Rage. Before tolerance.\n5 turns: Hit -15pp, WIS -20%. 2h crash: Mood -30, Sleep -40.'};
 $dataItems[id]={id,name:g.name,description:MENU_TEXT[id],note:'<category:Narcotics>\n<Weight: '+g.weight+'>\n<Rarity: '+ECON[id].rarity+'>\n<Nature: '+ITEM_NATURE[id]+'>\n<Uncraftable>\n<Restricted>\n<Lore: '+ITEM_LORE[id]+'>',iconIndex:g.icon,price:wholeEuro((g.lo+g.hi)/2),itypeId:1,consumable:true,occasion:id===9013?3:0,scope:7,speed:0,successRate:100,repeats:1,tpGain:0,hitType:0,animationId:0,damage:{type:0,elementId:0,formula:'0',variance:0,critical:false},effects:[],_exoticSubstances:true};DataManager.extractMetadata($dataItems[id]);
}}
function expire(){if(!window.$gameActors)return;for(const a of $gameActors._data||[])updateDrugs(a);}
// Sweetness is a compatibility list, not a separate recipe tree. All other food is minimal.
function hushTier(item){
 if(!item)return 0;const n=String(item.name||'').toLowerCase(),note=item.note||'';
 if(/\btea\b|\bbeer\b|\bale\b|\bvodka\b|\bwhisk|\brum\b|\bgin\b|\bwine\b|^fresh milk$/.test(n))return 0;
 if(/honey mead|cocktail/.test(n))return 2;
 if(/dragon.s breath fruit|ember pepper berry|phoenix pepper/.test(n))return 3;
 if([1735,1767,1780,2087].includes(item.id))return 1;
 const sweet=/fruit|berr|apple|pear\b|peach|plum|grape|banana|mango|melon|citrus|orange|lemon|coconut|pineapple|fig\b|date\b|cherr|nectar|honey|sugar|syrup|cacao|cocoa|chocol|sweet|candy|caramel|dessert|gelatin|cake|pastry|donut|sundae|ice cream|baklava|panna cotta|tiramisu|pudding|custard|marzipan|macaron|smoothie|cola|soda|punch|shake|fresh mint|red bean/.test(n);
 if(!sweet)return 0;
 const price=Number(item.price)||0,rarity=String(item.meta?.Rarity||note.match(/<Rarity:\s*([^>]+)/i)?.[1]||'');
 if(/mythic|legendary/i.test(rarity)||price>=100000)return 4;
 if(/epic|rare/i.test(rarity)||price>=1500&&/fruit|berr|pepper/.test(n))return 3;
 if(price>=500||/sundae|cake|baklava|tiramisu|panna cotta|ice cream|pastry|custard/.test(n))return 2;
 return 1;
}
function hushInsulation(item,roll,kit=1,skill=1){
 const tier=hushTier(item);if(!tier)return .05;
 const quality=roll?.nat1?.35:roll?.nat20?1:roll?.success?.8:.55;
 return Math.min([.05,.15,.25,.4,.55][tier],[.05,.15,.25,.4,.55][tier]*quality*Math.max(1,kit)*Math.max(1,skill));
}
function installHushCooking(){
 const C=window.CookingSystem;if(!C||C._exoticSubstancesHushInstalled)return;C._exoticSubstancesHushInstalled=true;
 const hasHush=(a,b)=>a?.id===9013||b?.id===9013;
 const food=i=>!!i&&i.id!==9013&&(i.meta?.category==='Food'||/<category:\s*Food>/i.test(i.note||'')||[858,862].includes(i.id));
 wrap(C,'isFoodItem',function(orig,i){return i?.id===9013||orig.call(this,i);});
 wrap(C,'canPairItems',function(orig,a,b){return hasHush(a,b)?(!a||!b||food(a.id===9013?b:a)):orig.call(this,a,b);});
 wrap(C,'canCook',function(orig,a,b){if(!hasHush(a,b))return orig.call(this,a,b);return !this._pharmaPreparing&&!!a&&!!b&&food(a.id===9013?b:a)&&$gameParty.numItems(a)>0&&$gameParty.numItems(b)>0&&($gameParty.members?.()||[]).some(x=>canUseDrug(x,9013,true));});
 wrap(C,'createCookedItemName',function(orig,a,b){return hasHush(a,b)?'Hush':orig.call(this,a,b);});
 wrap(C,'eatSingleItem',function(orig,item){
  if(item?.id!==9013)return orig.call(this,item);
  if(!$gameParty?.hasItem?.(item)&&$gameParty?.numItems?.(item)<1){window.SoundManager?.playBuzzer?.();return false;}
  const consumers=($gameParty.members?.()||[]).filter(x=>canUseDrug(x,9013,true));
  if(!consumers.length){window.SoundManager?.playBuzzer?.();return false;}
  // Eat Raw acts on the focused ingredient only. A second selected ingredient
  // remains in inventory, matching the cooking screen's native behavior.
  $gameParty.gainItem(item,-1);SceneManager._scene?.invalidateFoodList?.();
  for(const actor of consumers)consumeDrug(actor,9013,{raw:true,benefitScale:.5,penaltyScale:1.2,drop:12,sleepDrop:10});
  this.feedAllergens?.([item],item.name);
  window.ParchmentToast?.show?.('Unprepared Hush swallowed — poor absorption and severe nausea.',{severity:'warning',icon:item.iconIndex});
  $gameMap?.requestRefresh?.();SceneManager._scene?.refreshStatus?.();
  return true;
 });
 wrap(C,'cookItems',async function(orig,a,b){
  if(!hasHush(a,b))return orig.call(this,a,b);
  if(!this.canCook(a,b)){window.SoundManager?.playBuzzer?.();return;}
  this._pharmaPreparing=true;
  try{
   const additive=a.id===9013?b:a,cook=this.activeCook?.()||$gameParty.leader?.();
   const consumers=($gameParty.members?.()||[]).filter(x=>canUseDrug(x,9013,true));
   // Spend before waiting on the die; parallel clicks cannot duplicate a meal.
   $gameParty.gainItem(a,-1);$gameParty.gainItem(b,-1);
   SceneManager._scene?.invalidateFoodList?.();
   const roll=this.hasDice?.()&&this.culinaryRoll?await this.culinaryRoll(cook,'Hush'):this.flatRoll?.(cook)||{success:true};
   const kit=this.cookware?.()?.multiplier||1,skill=window.SpecializationXP?.multiplierFor?.(cook,'Cooking',.10)||1;
   const insulation=hushInsulation(additive,roll,kit,skill);
   for(const actor of consumers)consumeDrug(actor,9013,{insulation});
   const nutrition=this.getRecoveryValues?.(additive);
   if(nutrition&&this.serveToParty)this.serveToParty(this.hungerWorthOf(nutrition.hunger,nutrition.tp,nutrition.mp)*skill);
   this.feedAllergens?.([a,b],'Hush');
   window.SpecializationXP?.award?.('Cooking',2,{actor:cook,silent:true});
   window.Diary?.onCrafted?.('cook','Hush',1);
   window.ParchmentToast?.show?.('Hush served to '+consumers.length+' · downside insulation '+Math.round(insulation*100)+'%.',{severity:'info'});
   return {drug:9013,consumers:consumers.length,tier:hushTier(additive),insulation};
  }finally{this._pharmaPreparing=false;}
 });
}
function wrap(obj,name,fn){const orig=obj[name];if(typeof orig==='function')obj[name]=function(...a){return fn.call(this,orig,...a);};}
let installed=false;
function install(){
if(installed)return;installed=true;window.ExoticSubstancesCleanup?.installAutoCleanup();installIcons();installItemVisuals();installHushCooking();installDrugLoot();
wrap(DataManager,'onLoad',function(orig,obj){if(obj===$dataItems)inject();return orig.call(this,obj);});
installDrugEffects();
installDrugInspection();
installLore();
let tick=0;wrap(Scene_Base.prototype,'update',function(orig){orig.call(this);if(++tick%30===0&&window.$gameSystem){expire();rememberRegion();installHushCooking();}});
wrap(DataManager,'extractSaveContents',function(orig,c){orig.call(this,c);expire();});
const S=Scene_Shop.prototype;
wrap(S,'prepare',function(orig,goods,purchaseOnly){
 this._exoticSubstanceContext=context();const gate=access(this._exoticSubstanceContext);
 if(gate.reason==='Active manhunt'&&GOOD_IDS.some(id=>$gameParty.numItems($dataItems[id])>0))window.ParchmentToast?.show?.('Lose the patrol before you bring that here.',{severity:'danger'});
 let rows=goods.filter(r=>r[0]!==0||!GOODS[r[1]]||gate.allowed);orig.call(this,rows,purchaseOnly);
 if(gate.allowed){for(const id of GOOD_IDS){if(this._exoticSubstanceContext.kind==='barter'&&!count(this._exoticSubstanceContext,id))continue;if(!this._goods.some(r=>r[0]===0&&r[1]===id))this._goods.push([0,id,1,quote(this._exoticSubstanceContext,id,true)]);}}
 this._goods=this._goods.filter(r=>r[0]!==0||!isDrug($dataItems[r[1]])||gate.allowed);
});
const managed=(s,i)=>isDrug(i);
wrap(S,'getStock',function(orig,i){return managed(this,i)?count(this._exoticSubstanceContext,i.id):orig.call(this,i);});
for(const [method,buy] of [['unitBuyPrice',true],['unitSellPrice',false]])wrap(S,method,function(orig,i){if(!isDrug(i))return orig.call(this,i);if(!allowed(this._exoticSubstanceContext))return 0;return managed(this,i)?quote(this._exoticSubstanceContext,i.id,buy):orig.call(this,i);});
wrap(S,'buyingPrice',function(orig){return managed(this,this._item)?this.unitBuyPrice(this._item):orig.call(this);});
wrap(S,'sellingPrice',function(orig){return isDrug(this._item)?this.unitSellPrice(this._item):orig.call(this);});
wrap(Window_ShopBuy.prototype,'price',function(orig,i){const s=SceneManager._scene;return s instanceof Scene_Shop&&managed(s,i)?(allowed(s._exoticSubstanceContext)?quote(s._exoticSubstanceContext,i.id,true):0):orig.call(this,i);});
wrap(S,'maxBuy',function(orig){return Math.min(orig.call(this),managed(this,this._item)?count(this._exoticSubstanceContext,this._item.id):Infinity);});
wrap(S,'maxSell',function(orig){return Math.min(orig.call(this),isDrug(this._item)?(allowed(this._exoticSubstanceContext)?ledger(this._exoticSubstanceContext,this._item.id).demand:0):Infinity);});
for(const [method,buy] of [['doBuy',true],['doSell',false]])wrap(S,method,function(orig,n){if(!isDrug(this._item))return orig.call(this,n);const done=transact(this._exoticSubstanceContext,this._item,n,buy);this._shopStockRevision=(this._shopStockRevision||0)+1;this._buyWindow?.refresh();this._sellWindow?.refresh();return done;});
wrap(Window_ShopSell.prototype,'isEnabled',function(orig,i){const s=SceneManager._scene;return orig.call(this,i)&&(!isDrug(i)||(s instanceof Scene_Shop&&allowed(s._exoticSubstanceContext)&&ledger(s._exoticSubstanceContext,i.id).demand>0));});
wrap(Window_ShopSell.prototype,'makeItemList',function(orig){orig.call(this);const s=SceneManager._scene;if(s instanceof Scene_Shop)this._data=this._data.filter(i=>!isDrug(i)||allowed(s._exoticSubstanceContext));});
wrap(S,'sellSelection',function(orig){const sel=orig.call(this);for(const [i,n] of sel)if(isDrug(i)){const cap=allowed(this._exoticSubstanceContext)?ledger(this._exoticSubstanceContext,i.id).demand:0;if(!cap)sel.delete(i);else sel.set(i,Math.min(n,cap));}return sel;});
wrap(S,'priceQuote',function(orig,i){if(!managed(this,i))return orig.call(this,i);const buying=this.isShopBuyMode(),m=market(this._exoticSubstanceContext.city,i.id),price=quote(this._exoticSubstanceContext,i.id,buying),base=wholeEuro(m.center),pref=preference(this._exoticSubstanceContext,i.id);return {buying,price,base,percent:Math.round((price/base-1)*100),company:null,companyName:(buying?traderKind(this._exoticSubstanceContext,i.id):pref.label)+' · '+m.event};});
wrap(S,'terminate',function(orig){orig.call(this);$gameTemp._npcTradeWith=null;$gameTemp._exoticSubstanceTradeOrigin=null;});
if(window.Stockbusters?.Catalogue)wrap(window.Stockbusters.Catalogue,'sellable',function(orig,item){return !isNew(item)&&orig.call(this,item);});
installTradeOrigin();
installBulkSaleGuard(S);
installCrime();
registerNet();
console.info('[Exotic Substances] '+VERSION+' installed');
}

// Additive chest loot: never replace the native roll or consume its RNG.
// Restricted entries stay out of vanilla pools; only this market owns them.
const DRUG_LOOT_CHANCE=.05;
function drugLoot(interpreter){
 if(!window.$gameSystem||!window.$gameMap||!window.$gameParty)return null;
 const eid=interpreter?.eventId?.()||interpreter?._eventId||eventId();
 if(!eid)return null; // Console/common-event calls without a chest are not a farm.
 const ev=$gameMap.event?.(eid),building=window.ProceduralHouseSystem?.getCurrentBuilding?.();
 const seed=window.HistoryManager?.getSeed?.()??$gameSystem._historySeed??19002001;
 const floor=window.DungeonFloors?.currentFloor?.()||window.DungeonFloors?.currentAuthoredFloor?.()||0;
 const place=building?[building.mapId,building.x,building.y,building.floorIndex||0].join(':'):'map:'+$gameMap.mapId();
 const key=[seed,world(),place,floor,eid,ev?.x??'',ev?.y??'',ev?._pageIndex??0,interpreter?._index??0].join('|');
 const s=state(),opened=s.lootOpened||(s.lootOpened={});
 if(opened[key])return null;
 opened[key]=true;
 if(noise(key+'|drug-chance')>=DRUG_LOOT_CHANCE)return null;
 const weights=GOOD_IDS.map(id=>window.MagicNature&&!MagicNature.allowsData($dataItems[id])?0:ECON[id].availability*(id===9010?.35:id===9011?.15:1));
 const total=weights.reduce((a,b)=>a+b,0);if(!total)return null;
 let pick=noise(key+'|drug-kind')*total,id=GOOD_IDS[GOOD_IDS.length-1];
 for(let i=0;i<GOOD_IDS.length;i++){pick-=weights[i];if(pick<0){id=GOOD_IDS[i];break;}}
 const item=$dataItems[id];if(!isDrug(item)||$gameParty.numItems(item)>=$gameParty.maxItems(item))return null;
 $gameParty.gainItem(item,1);
 if(window.ParchmentToast?.reward)ParchmentToast.reward({title:'Found contraband',entries:[{obj:item,qty:1}]});
 else window.$gameMessage?.add?.('Found '+item.name+'.');
 return id;
}
function installDrugLoot(){
 let depth=0;
 const run=(fn,it)=>{depth++;let result;try{result=fn();}finally{depth--;}if(!depth)drugLoot(it);return result;};
 if(window.PluginManager?._commands)for(const key of Object.keys(PluginManager._commands)){
  if(key.split('/').pop()!=='RandomLootSystem:getItem')continue;
  wrap(PluginManager._commands,key,function(orig,args){return run(()=>orig.call(this,args),this);});
 }
 if(window.Game_Interpreter)wrap(Game_Interpreter.prototype,'pluginCommand',function(orig,command,args){
  if(String(command).toLowerCase()!=='getitem')return orig.call(this,command,args);
  return run(()=>orig.call(this,command,args),this);
 });
}

const PALETTE={"\u0100":"#55180c","\u0101":"#481a06","\u0102":"#fff1c9","\u0103":"#fff9cc","\u0104":"#280b08","\u0105":"#ffeebf","\u0106":"#562b28","\u0107":"#641b15","\u0108":"#380e0b","\u0109":"#300906","\u010a":"#ffe9c4","\u010b":"#4e110c","\u010c":"#1b0704","\u010d":"#b45124","\u010e":"#96362f","\u010f":"#8d2f2a","\u0110":"#571616","\u0111":"#46100e","\u0112":"#d38857","\u0113":"#3d1d13","\u0114":"#fff6c0","\u0115":"#ffd5a4","\u0116":"#3f1115","\u0117":"#47261f","\u0118":"#41150c","\u0119":"#5e110f","\u011a":"#6b1711","\u011b":"#220400","\u011c":"#ffffdf","\u011d":"#ffedba","\u011e":"#822e2b","\u011f":"#492120","\u0120":"#3e0a08","\u0121":"#79251f","\u0122":"#5c3122","\u0123":"#42070f","\u0124":"#ffe2b4","\u0125":"#5c2817","\u0126":"#512011","\u0127":"#550e06","\u0128":"#511f1a","\u0129":"#020000","\u012a":"#000000","\u012b":"#040105","\u012c":"#010103","\u012d":"#3f4843","\u012e":"#fbfefc","\u012f":"#4b5959","\u0130":"#040404","\u0131":"#ccd6d7","\u0132":"#8ea3a6","\u0133":"#b5d2b2","\u0134":"#a5b9a8","\u0135":"#7694ca","\u0136":"#5061fe","\u0137":"#5b75fa","\u0138":"#5555cd","\u0139":"#605db3","\u013a":"#72928d","\u013b":"#898baf","\u013c":"#3d19fa","\u013d":"#7326f3","\u013e":"#ffd0ff","\u013f":"#76a4c7","\u0140":"#8e17ef","\u0141":"#79a490","\u0142":"#7fb3a7","\u0143":"#7c8fef","\u0144":"#3a60c4","\u0145":"#688499","\u0146":"#76e1f7","\u0147":"#93e3fa","\u0148":"#d4fbfd","\u0149":"#fcfbfb","\u014a":"#a5e9fd","\u014b":"#a6eef8","\u014c":"#84e8f4","\u014d":"#55d0eb","\u014e":"#20a6d5","\u014f":"#c3e2f1","\u0150":"#0e8dc2","\u0151":"#e59b9f","\u0152":"#6ff1fe","\u0153":"#08669d","\u0154":"#e5c5aa","\u0155":"#46bde3","\u0156":"#283557","\u0157":"#147b9f","\u0158":"#46a2cf","\u0159":"#9b6f7f","\u015a":"#0a5c8b","\u015b":"#ebfdff","\u015c":"#1e4569","\u015d":"#158ed0","\u015e":"#c36661","\u015f":"#876390","\u0160":"#84fdff","\u0161":"#164272","\u0162":"#cbe8e6","\u0163":"#c96140","\u0164":"#72a3cd","\u0165":"#e56b2d","\u0166":"#dfdef1","\u0167":"#016283","\u0168":"#b3d3b9","\u0169":"#ffcbc9","\u016a":"#0d6995","\u016b":"#e3656e","\u016c":"#298cb3","\u016d":"#8dc28d","\u016e":"#98c89c","\u016f":"#c5f5dd","\u0170":"#679979","\u0171":"#608d78","\u0172":"#ce96b6","\u0173":"#efe2c1","\u0174":"#5ba778","\u0175":"#b2e0ac","\u0176":"#fefefb","\u0177":"#c3a3bf","\u0178":"#d09bab","\u0179":"#6db683","\u017a":"#ddffef","\u017b":"#d1c8cb","\u017c":"#cba6af","\u017d":"#4e9d69","\u017e":"#8ebf9b","\u017f":"#8ca591","\u0180":"#e2eaea","\u0181":"#397a67","\u0182":"#f7cbd7","\u0183":"#edcfef","\u0184":"#d1a0d1","\u0185":"#e3aadf","\u0186":"#4d6c69","\u0187":"#bee9c8","\u0188":"#709b86","\u0189":"#fbffb3","\u018a":"#eaead1","\u018b":"#7aa377","\u018c":"#f4fde2","\u018d":"#3e7126","\u018e":"#477d24","\u018f":"#c1e5b9","\u0190":"#5f8679","\u0191":"#dbe9c5","\u0192":"#1c0051","\u0193":"#7ab05e","\u0194":"#689454","\u0195":"#2f443f","\u0196":"#132c17","\u0197":"#427944","\u0198":"#3f6a3f","\u0199":"#320091","\u019a":"#5a8f72","\u019b":"#151c15","\u019c":"#6ead87","\u019d":"#5da96e","\u019e":"#cde7d3","\u019f":"#cbfec5","\u01a0":"#6c97a0","\u01a1":"#75a2a5","\u01a2":"#8bb2b5","\u01a3":"#a8cfd2","\u01a4":"#385b5c","\u01a5":"#9ac2c3","\u01a6":"#2f4c5a","\u01a7":"#bedadd","\u01a8":"#cee5e7","\u01a9":"#deede9","\u01aa":"#568c93","\u01ab":"#284849","\u01ac":"#659586","\u01ad":"#75aeba","\u01ae":"#f0bf43","\u01af":"#f7e084","\u01b0":"#ebb340","\u01b1":"#cbcfae","\u01b2":"#d6b742","\u01b3":"#e69617","\u01b4":"#fdd052","\u01b5":"#f5f390","\u01b6":"#cd8d25","\u01b7":"#5c7c74","\u01b8":"#408684","\u01b9":"#ffe549","\u01ba":"#fbb525","\u01bb":"#dd7f0d","\u01bc":"#8a7a37","\u01bd":"#9a7735","\u01be":"#9e9681","\u01bf":"#ebe9d9","\u01c0":"rgba(235,233,217,0.96862745)","\u01c1":"#ebe9da","\u01c2":"#da9e17","\u01c3":"#3d3003","\u01c4":"#d89a00","\u01c5":"#ebe8d8","\u01c6":"rgba(0,0,0,0.00784314)","\u01c7":"#e6dec9","\u01c8":"#da9d11","\u01c9":"#4f4109","\u01ca":"#d89b00","\u01cb":"rgba(235,232,216,0.96862745)","\u01cc":"#a47106","\u01cd":"#d99c01","\u01ce":"#3c2f03","\u01cf":"#d89b01","\u01d0":"#a47000","\u01d1":"#eae8d8","\u01d2":"#c59600","\u01d3":"#c59601","\u01d4":"#d5b000","\u01d5":"#4e4000","\u01d6":"#896602","\u01d7":"#896601","\u01d8":"#896600","\u01d9":"#886500","\u01da":"#a47103","\u01db":"#4f4100","\u01dc":"#514312","\u01dd":"#eceada","\u01de":"#a57318","\u01df":"#ebeada","\u01e0":"#3b2e03","\u01e1":"#d99c00","\u01e2":"#767205","\u01e3":"#d6d3bf","\u01e4":"#171062","\u01e5":"#767204","\u01e6":"#d5d2be","\u01e7":"#d99c08","\u01e8":"#381480","\u01e9":"#a37104","\u01ea":"#645379","\u01eb":"rgba(0,0,0,0.00392157)","\u01ec":"#64678b","\u01ed":"#575a7d","\u01ee":"#a6cfd1","\u01ef":"#6c7694","\u01f0":"#d7eadd","\u01f1":"#99c2d1","\u01f2":"#d4ebce","\u01f3":"#fc99a8","\u01f4":"#a56580","\u01f5":"#c1e2d0","\u01f6":"#91a6de","\u01f7":"#89b0d1","\u01f8":"#c0d0e9","\u01f9":"#9ba5da","\u01fa":"#fefdf6","\u01fb":"#bddad7","\u01fc":"#8e91cc","\u01fd":"#837dc6","\u01fe":"#7689d0","\u01ff":"#fdddcd","\u0200":"#ab80cb","\u0201":"#9fdddf","\u0202":"#ff5e98","\u0203":"#e7d1db","\u0204":"#f94897","\u0205":"#c5fbdd","\u0206":"#e5c1e8","\u0207":"#fd6387","\u0208":"#b06fd3","\u0209":"#689dc8","\u020a":"#8191e5","\u020b":"#8b764e","\u020c":"#716247","\u020d":"#08c5ac","\u020e":"#74cfdf","\u020f":"#016869","\u0210":"#008e9b","\u0211":"#034e6b","\u0212":"#00809f","\u0213":"#007b87","\u0214":"#005759","\u0215":"#004f5c","\u0216":"#006076","\u0217":"#ffef16","\u0218":"#f2eecb","\u0219":"#ff0000","\u021a":"#dccfc1","\u021b":"#eae0d1","\u021c":"#f5e9dc","\u021d":"#aecdd5","\u021e":"#b05384","\u021f":"#a6c2cc","\u0220":"#cbc5b3","\u0221":"#eae7da","\u0222":"#bab0a8","\u0223":"#ece0c9","\u0224":"#2b6277","\u0225":"#e0deca","\u0226":"#b54980","\u0227":"#254572","\u0228":"#a1a7a2","\u0229":"#97a7b0","\u022a":"#1e6369","\u022b":"#ebd4d3","\u022c":"#186975","\u022d":"#e5ebbb","\u022e":"#f1f3de","\u022f":"#126260","\u0230":"#af688e","\u0231":"#bb4e97","\u0232":"#b24971","\u0233":"#a75279","\u0234":"#ffd9d3","\u0235":"#175c70","\u0236":"#ca448c","\u0237":"#c17294"};
const PIXELS={"9001":["...\u0100\u0100...........","..\u0101\u0102\u0103\u0100.....\u0104\u0104...",".\u0100\u0103\u0103\u0103\u0105\u0106...\u0104\u0107\u0107\u0108\u0104.","\u0109\u0103\u0103\u0105\u0105\u0105\u010a\u010b.\u010c\u010d\u010e\u010f\u010e\u0110\u0111","\u0108\u0103\u0103\u0103\u0105\u0105\u0103\u0103\u0109\u0112\u010e\u010f\u010f\u010e\u0107.",".\u0113\u0105\u0103\u0105\u0105\u0114\u0104\u0115\u0109\u010e\u010e\u010e\u0108\u0116.","..\u0117\u0103\u0103\u0114\u0118\u010a\u0102\u0105\u0119\u011a\u0108\u0106..","...\u011b\u0105\u0118\u011c\u0103\u0105\u0105\u011d\u011b....","...\u010c\u0109\u0103\u0103\u0103\u0105\u0103\u011b\u0108\u0106...","..\u0104\u011e\u011e\u011b\u0105\u0103\u010a\u010b\u0108\u0105\u0105\u011f..",".\u0120\u011e\u0121\u011e\u011e\u0118\u0103\u0104\u0109\u011c\u0105\u0103\u0105\u0122.","\u0108\u0123\u011e\u011e\u011e\u010f\u0104\u0104\u0100\u0124\u0124\u0103\u0103\u0103\u0102\u0125",".\u0104\u010e\u010e\u010e\u0109\u0108.\u0100\u0103\u0103\u0103\u0103\u0103\u0103\u0101","..\u0109\u0120\u0108....\u0126\u0103\u0103\u0103\u0114\u0127.","..........\u0128\u0105\u0105\u0108..","...........\u010b\u0111..."],"9002":["................","....\u0129\u012a\u0129\u012b\u012b\u012c\u012a\u012a....","....\u012a\u012d\u012e\u012e\u012e\u012e\u012d\u012a....","....\u012b\u012f\u012f\u012f\u012d\u012d\u012f\u012a....",".....\u012a\u012a\u0129\u0130\u0129\u012a.....",".....\u012a\u0131\u0132\u0132\u0133\u012c.....","....\u012a\u0133\u012e\u0132\u0132\u0134\u012e\u012a....","...\u012a\u0132\u0135\u0136\u0136\u0137\u0138\u0139\u013a\u012a...","...\u012c\u013b\u0137\u0136\u013c\u013c\u013c\u013d\u013a\u012a...","...\u012c\u0135\u0136\u012e\u013e\u013c\u013c\u013d\u013a\u012a...","...\u012b\u013f\u0136\u013c\u013c\u013c\u013c\u0140\u0141\u012c...","...\u012b\u013f\u0137\u013c\u013c\u013c\u013c\u0140\u0142\u012b...","...\u012b\u0141\u0137\u013c\u013c\u013c\u013c\u0143\u0132\u012b...","...\u012b\u012d\u0142\u0137\u0138\u0144\u0144\u0145\u012d\u012c...","....\u0130\u0130\u0130\u0130\u012a\u012c\u012c\u0130....","................"],"9003":["................","......\u0146.........",".....\u0147\u0148\u0146........",".....\u0147\u0149\u0146........","....\u014a\u014b\u0149\u014c\u014d.......","....\u014e\u0149\u0149\u014f\u014e..\u0146....","....\u0150\u014f\u0151\u0152\u0150..\u014c....","....\u0153\u0154\u0151\u0155\u0156.\u0148\u014b\u014a...","....\u0157\u0158\u0149\u0159\u015a\u015b\u015b\u0149\u0146...","...\u014b\u0149\u015a\u0149\u015c\u0155\u0148\u0149\u0149\u015d...","...\u014b\u0149\u015a\u015e\u015f\u014d\u0148\u0151\u0160\u015d...","..\u0152\u014f\u0149\u015b\u0161\u0161\u0152\u0162\u0151\u0152\u0153...","..\u0147\u0148\u0163\u015b\u0153\u015a\u014c\u014f\u014d\u0164....","...\u014a\u014d\u0165\u0166\u0167\u0168\u0148\u0150.....","....\u0155\u0155\u0169\u016a\u016b\u014e......","......\u016a.\u016c......."],"9010":["................","............\u016d\u016e..","...........\u016e\u016f\u0170\u0171.","..........\u016e\u016f\u0172\u0173\u0174.","....\u0175\u0175\u0175\u0175.\u016d\u0176\u0177\u0178\u0179..","...\u016e\u0170\u0170\u0170\u0170\u016e\u017a\u017b\u017c\u017d...","...\u017e\u0176\u017f\u0180\u0180\u0181\u0178\u0182\u0174....","...\u017e\u0183\u0183\u0184\u0185\u0186\u0187\u0188.....","..\u0171\u0176\u0176\u0189\u0189\u018a\u0176\u018b......",".\u0188\u0176\u0176\u018c\u018d\u018e\u0176\u0176\u018f\u0190.....",".\u0188\u0176\u0191\u0192\u0193\u0194\u0195\u016d\u0176\u0171.....",".\u0188\u0176\u0196\u0197\u0198\u0199\u0192\u016e\u0176\u019a.....",".\u0188\u018c\u018c\u0196\u019b\u0192\u019c\u018c\u019d......","..\u0190\u019e\u019f\u018b\u0187\u018c\u0179.......","...\u0190\u0188\u0188\u0170\u019a........","................"],"9011":["................","......\u01a0\u01a1\u01a1\u01a1......",".....\u01a2\u01a3\u01a4\u01a4\u01a5\u01a1.....",".....\u01a1\u01a5\u01a3\u01a3\u01a5\u01a0.....","......\u01a2\u01a6\u01a6\u01a0......","....\u01a1\u01a1\u01a7\u01a1\u01a1\u01a5\u01a0\u01a0....","...\u01a1\u01a7\u01a8\u01a8\u01a8\u01a7\u01a8\u01a9\u01a7\u01a1...","...\u01a5\u01a9\u01a8\u01a2\u01a2\u01a1\u01a1\u01a3\u01a9\u01a3...","..\u01aa\u01a9\u01a8\u01a5\u01a7\u01a0\u01ab\u01ab\u01a2\u01a7\u01a3\u01aa..","..\u01a5\u01a9\u01a7\u01a3\u01ac\u01ab\u01ab\u01ab\u01a2\u01a7\u01a2\u01aa..","..\u01ad\u01a8\u01a7\u01a0\u01a6\u01ab\u01ab\u01ab\u01a4\u01a5\u01a3\u01aa..","..\u01aa\u01ae\u01af\u01ae\u01ae\u01ae\u01ae\u01b0\u01b0\u01b1\u01b2\u01aa..","..\u01a0\u01b3\u01b4\u01af\u01b4\u01b4\u01b4\u01b4\u01b5\u01b4\u01b6\u01b7..","...\u01b8\u01b3\u01b9\u01ba\u01ba\u01ba\u01ba\u01ba\u01bb\u01b8...","....\u01b8\u01bc\u01bc\u01bc\u01bc\u01bc\u01bd\u01b8....","................"],"9012":["\u01be\u01bf\u01c0\u01bf\u01bf\u01c1\u01c2\u01c3\u01c4\u01c5\u01bf\u01c0\u01c1\u01c0\u01be\u01c6","\u01be\u01bf\u01c0\u01c7\u01bf\u01bf\u01c8\u01c9\u01ca\u01c5\u01bf\u01bf\u01bf\u01c7\u01be\u01c6","\u01be\u01bf\u01cb\u01bf\u01bf\u01cc\u01cd\u01ce\u01cf\u01d0\u01d1\u01bf\u01bf\u01bf\u01be\u01c6","\u01be\u01d2\u01d3\u01d3\u01d2\u01cd\u01d4\u01d5\u01d4\u01cd\u01d2\u01d3\u01d3\u01d2\u01be.","\u01be\u01d6\u01d7\u01d8\u01d9\u01da\u01db.\u01dc\u01da\u01d6\u01d7\u01d8\u01d9\u01be.","\u01be\u01bf\u01bf\u01bf\u01dd\u01de\u01d4\u01d5\u01d4\u01d0\u01bf\u01bf\u01bf\u01bf\u01be.","\u01be\u01c0\u01c7\u01bf\u01bf\u01df\u01cd\u01e0\u01cd\u01bf\u01bf\u01bf\u01bf\u01bf\u01be.","\u01be\u01c0\u01bf\u01bf\u01c7\u01bf\u01cd\u01ce\u01cd\u01bf\u01bf\u01bf\u01bf\u01bf\u01be.","\u01be\u01cb\u01bf\u01bf\u01bf\u01bf\u01e1\u01ce\u01cd\u01bf\u01bf\u01c7\u01e2\u01be\u01be.","\u01be\u01e3\u01e3\u01e3\u01e3\u01e3\u01e1\u01e0\u01cd\u01e3\u01e3\u01e4\u01e5\u01be..","\u01be\u01e6\u01e6\u01e6\u01e6\u01e6\u01ca\u01ce\u01e7\u01e3\u01e3\u01e8\u01e2\u01be..","\u01be\u01e6\u01e6\u01e6\u01e6\u01e6\u01e9\u01c3\u01e9\u01e6\u01e6\u01ea\u01be\u01eb..","\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be...","\u01e6\u01e6\u01ca\u01ce\u01e7\u01e3\u01e3\u01e3\u01e3\u01e3\u01be.....","\u01e3\u01e3\u01e9\u01c3\u01e9\u01e3\u01e3\u01e3\u01e3\u01e3\u01be.....","\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be\u01be....."],"9013":["................","................","..\u01ec\u01ed\u01ed..\u01ee\u01ee\u01ee\u01ee\u01ee\u01ee\u01ee\u01ee.","..\u01ec\u01ef\u01ed..\u01f0\u01f0\u01f0\u01f0\u01f0\u01f0\u01f0\u01f0.","..\u01ef\u01ef\u01ed..\u01ee\u01f1\u01f1\u01f1\u01f1\u01f1\u01f1\u01f1.",".\u01ec\u01ef\u01ef\u01ef\u01ec.\u01f2\u01f2\u01f2\u01f2\u01f2\u01f2\u01f2\u01ee.",".\u01ec\u01f3\u01f4\u01ec\u01ec.\u01f5\u01f6\u01f7\u01f8\u01f9\u01f6\u01f0\u01ee.",".\u01ec\u01fa\u01fa\u01ec\u01ed.\u01fb\u01fc\u01f0\u01fd\u01f8\u01f8\u01fe\u01ee.",".\u01ec\u01ff\u01fa\u01ec\u01ec.\u01fb\u01f0\u0200\u01f8\u0201\u01fc\u01fb\u01fb.",".\u01ec\u01fa\u01fa\u01ec\u01ec.\u01f5\u0202\u0203\u01f8\u0204\u0205\u01fb\u01ee.",".\u01ec\u01fa\u01fa\u01ec\u01ec.\u01fb\u0206\u01f5\u0207\u0208\u01f3\u0202\u01f8.",".\u01ec\u01ec\u01ec\u01ef\u01ec.\u01fb\u0209\u01f1\u01f2\u01fe\u0200\u01f9\u01f1.",".\u01ec\u01ef\u01ef\u01ef\u01ec.\u01f2\u01f2\u01f6\u01f6\u01f6\u020a\u01f5\u01f1.","..\u01ec\u01ef\u01ec..\u01f5\u01f5\u01f5\u01f2\u01f5\u01f5\u01f5\u01ee.","................","................"],"9014":[".........\u012a\u012a.....","........\u012a\u020b\u020b\u012a....",".......\u012a\u020c\u020b\u012a.....","......\u012a\u020c\u020c\u012a......","......\u012a\u020c\u012a.......",".....\u012a\u020d\u020e\u020f\u012a\u012a.....",".....\u012a\u0210\u0211\u0211\u0211\u012a.....","....\u012a\u0212\u0211\u020d\u0213\u0213\u0214\u012a....","....\u012a\u0215\u020f\u0216\u0213\u0216\u0216\u012a....","....\u012a\u0217\u012a\u0217\u012a\u0217\u012a\u012a....","....\u012a\u0218\u0218\u0218\u0218\u0218\u0218\u012a....","....\u012a\u0218\u0219\u0218\u012a\u012a\u0218\u012a....","....\u012a\u0218\u0218\u0218\u0218\u0218\u0218\u012a....","....\u012a\u012a\u0217\u012a\u0217\u012a\u0217\u012a....","....\u012a\u0215\u020f\u0216\u0213\u0216\u0216\u012a....",".....\u012a\u012a\u012a\u012a\u012a\u012a....."],"9015":["................","................","...\u021a\u021a\u021b\u021b..\u021c\u021c\u021c\u021d...","..\u021b\u021b\u021b\u021b\u021b\u021b\u021b\u021b\u021b\u021e\u021d\u021f..","..\u021b\u021b\u0220\u021a\u0221\u021b\u021b\u021b\u021e\u0222\u021d\u021d\u021f.","..\u021a\u021b\u0223\u0224\u0225\u0226\u021b\u021e\u021e\u0222\u0227\u0228\u0229.","..\u021b\u021b\u022a\u022a\u021a\u021e\u021e\u022b\u021b\u0223\u0223...","..\u0223\u021b\u022c\u022d\u022e\u021b\u0226\u021e\u021b\u021e\u021b...","..\u021b\u022a\u022f\u022b\u0230\u022e\u021c\u0226\u0231\u021e\u021b...","..\u0223\u0223\u022f\u022d\u0232\u0233\u022b\u0226\u0234\u021c\u0223...","..\u021c\u021b\u022a\u0224\u0232\u021c\u0221\u0226\u021e\u021c\u0223...","..\u021b\u021b\u0223\u0235\u021b\u0221\u0236\u0236\u0221\u0226\u0225...","..\u021b\u0223\u0225\u0235\u021b\u0221\u0237\u022d\u0235\u0221\u0223...","..\u021a\u021b\u0225\u021b\u021b\u0225\u021b\u0235\u0235\u021a....","..\u021b.\u021b\u0225\u021b.\u021b\u0225\u021b\u021b....","................"]};
const MODEL_DATA={"9001":[{"name":"Resin grain 6","positions":[0.021287862,0.015280736,0.004627799,0.019889365,0.015402957,0.005866268,0.021817132,0.014371208,0.00741863,0.021287862,0.015280736,0.004627799,0.021817132,0.014371208,0.00741863,0.023891712,0.013808984,0.005350749,0.021287862,0.015280736,0.004627799,0.023891712,0.013808984,0.005350749,0.023246104,0.014493259,0.002520366,0.021287862,0.015280736,0.004627799,0.023246104,0.014493259,0.002520366,0.020772518,0.015478388,0.002838974,0.021287862,0.015280736,0.004627799,0.020772518,0.015478388,0.002838974,0.019889365,0.015402957,0.005866268,0.023891712,0.013808984,0.005350749,0.021817132,0.014371208,0.00741863,0.024102482,0.013021612,0.007036026,0.021817132,0.014371208,0.00741863,0.019889365,0.015402957,0.005866268,0.021628896,0.014006741,0.007354634,0.019889365,0.015402957,0.005866268,0.020772518,0.015478388,0.002838974,0.020983288,0.014691016,0.004524251,0.020772518,0.015478388,0.002838974,0.023246104,0.014493259,0.002520366,0.023057868,0.014128792,0.00245637,0.023246104,0.014493259,0.002520366,0.023891712,0.013808984,0.005350749,0.024985635,0.013097043,0.004008732,0.023587138,0.013219264,0.005247201,0.024102482,0.013021612,0.007036026,0.021628896,0.014006741,0.007354634,0.023587138,0.013219264,0.005247201,0.021628896,0.014006741,0.007354634,0.020983288,0.014691016,0.004524251,0.023587138,0.013219264,0.005247201,0.020983288,0.014691016,0.004524251,0.023057868,0.014128792,0.00245637,0.023587138,0.013219264,0.005247201,0.023057868,0.014128792,0.00245637,0.024985635,0.013097043,0.004008732,0.023587138,0.013219264,0.005247201,0.024985635,0.013097043,0.004008732,0.024102482,0.013021612,0.007036026,0.021628896,0.014006741,0.007354634,0.024102482,0.013021612,0.007036026,0.021817132,0.014371208,0.00741863,0.020983288,0.014691016,0.004524251,0.021628896,0.014006741,0.007354634,0.019889365,0.015402957,0.005866268,0.023057868,0.014128792,0.00245637,0.020983288,0.014691016,0.004524251,0.020772518,0.015478388,0.002838974,0.024985635,0.013097043,0.004008732,0.023057868,0.014128792,0.00245637,0.023246104,0.014493259,0.002520366,0.024102482,0.013021612,0.007036026,0.024985635,0.013097043,0.004008732,0.023891712,0.013808984,0.005350749],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#805032","opacity":1,"roughness":0.78,"metalness":0},{"name":"Resin grain 5","positions":[-0.001577193,0.005398379,0.016625,-0.002551952,0.00425,0.018202193,0.0,0.004959737,0.019176952,-0.001577193,0.005398379,0.016625,0.0,0.004959737,0.019176952,0.001577193,0.005398379,0.016625,-0.001577193,0.005398379,0.016625,0.001577193,0.005398379,0.016625,0.0,0.004959737,0.014073048,-0.001577193,0.005398379,0.016625,0.0,0.004959737,0.014073048,-0.002551952,0.00425,0.015047807,-0.001577193,0.005398379,0.016625,-0.002551952,0.00425,0.015047807,-0.002551952,0.00425,0.018202193,0.001577193,0.005398379,0.016625,0.0,0.004959737,0.019176952,0.002551952,0.00425,0.018202193,0.0,0.004959737,0.019176952,-0.002551952,0.00425,0.018202193,0.0,0.003540263,0.019176952,-0.002551952,0.00425,0.018202193,-0.002551952,0.00425,0.015047807,-0.001577193,0.003101621,0.016625,-0.002551952,0.00425,0.015047807,0.0,0.004959737,0.014073048,0.0,0.003540263,0.014073048,0.0,0.004959737,0.014073048,0.001577193,0.005398379,0.016625,0.002551952,0.00425,0.015047807,0.001577193,0.003101621,0.016625,0.002551952,0.00425,0.018202193,0.0,0.003540263,0.019176952,0.001577193,0.003101621,0.016625,0.0,0.003540263,0.019176952,-0.001577193,0.003101621,0.016625,0.001577193,0.003101621,0.016625,-0.001577193,0.003101621,0.016625,0.0,0.003540263,0.014073048,0.001577193,0.003101621,0.016625,0.0,0.003540263,0.014073048,0.002551952,0.00425,0.015047807,0.001577193,0.003101621,0.016625,0.002551952,0.00425,0.015047807,0.002551952,0.00425,0.018202193,0.0,0.003540263,0.019176952,0.002551952,0.00425,0.018202193,0.0,0.004959737,0.019176952,-0.001577193,0.003101621,0.016625,0.0,0.003540263,0.019176952,-0.002551952,0.00425,0.018202193,0.0,0.003540263,0.014073048,-0.001577193,0.003101621,0.016625,-0.002551952,0.00425,0.015047807,0.002551952,0.00425,0.015047807,0.0,0.003540263,0.014073048,0.0,0.004959737,0.014073048,0.002551952,0.00425,0.018202193,0.002551952,0.00425,0.015047807,0.001577193,0.005398379,0.016625],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#805032","opacity":1,"roughness":0.78,"metalness":0},{"name":"Resin grain 4","positions":[-0.010577193,0.018085879,0.0045,-0.011551952,0.0169375,0.006077193,-0.009,0.017647237,0.007051952,-0.010577193,0.018085879,0.0045,-0.009,0.017647237,0.007051952,-0.007422807,0.018085879,0.0045,-0.010577193,0.018085879,0.0045,-0.007422807,0.018085879,0.0045,-0.009,0.017647237,0.001948048,-0.010577193,0.018085879,0.0045,-0.009,0.017647237,0.001948048,-0.011551952,0.0169375,0.002922807,-0.010577193,0.018085879,0.0045,-0.011551952,0.0169375,0.002922807,-0.011551952,0.0169375,0.006077193,-0.007422807,0.018085879,0.0045,-0.009,0.017647237,0.007051952,-0.006448048,0.0169375,0.006077193,-0.009,0.017647237,0.007051952,-0.011551952,0.0169375,0.006077193,-0.009,0.016227763,0.007051952,-0.011551952,0.0169375,0.006077193,-0.011551952,0.0169375,0.002922807,-0.010577193,0.015789121,0.0045,-0.011551952,0.0169375,0.002922807,-0.009,0.017647237,0.001948048,-0.009,0.016227763,0.001948048,-0.009,0.017647237,0.001948048,-0.007422807,0.018085879,0.0045,-0.006448048,0.0169375,0.002922807,-0.007422807,0.015789121,0.0045,-0.006448048,0.0169375,0.006077193,-0.009,0.016227763,0.007051952,-0.007422807,0.015789121,0.0045,-0.009,0.016227763,0.007051952,-0.010577193,0.015789121,0.0045,-0.007422807,0.015789121,0.0045,-0.010577193,0.015789121,0.0045,-0.009,0.016227763,0.001948048,-0.007422807,0.015789121,0.0045,-0.009,0.016227763,0.001948048,-0.006448048,0.0169375,0.002922807,-0.007422807,0.015789121,0.0045,-0.006448048,0.0169375,0.002922807,-0.006448048,0.0169375,0.006077193,-0.009,0.016227763,0.007051952,-0.006448048,0.0169375,0.006077193,-0.009,0.017647237,0.007051952,-0.010577193,0.015789121,0.0045,-0.009,0.016227763,0.007051952,-0.011551952,0.0169375,0.006077193,-0.009,0.016227763,0.001948048,-0.010577193,0.015789121,0.0045,-0.011551952,0.0169375,0.002922807,-0.006448048,0.0169375,0.002922807,-0.009,0.016227763,0.001948048,-0.009,0.017647237,0.001948048,-0.006448048,0.0169375,0.006077193,-0.006448048,0.0169375,0.002922807,-0.007422807,0.018085879,0.0045],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#805032","opacity":1,"roughness":0.78,"metalness":0},{"name":"Resin grain 3","positions":[0.013672807,0.014023379,-0.014125,0.012698048,0.012875,-0.012547807,0.01525,0.013584737,-0.011573048,0.013672807,0.014023379,-0.014125,0.01525,0.013584737,-0.011573048,0.016827193,0.014023379,-0.014125,0.013672807,0.014023379,-0.014125,0.016827193,0.014023379,-0.014125,0.01525,0.013584737,-0.016676952,0.013672807,0.014023379,-0.014125,0.01525,0.013584737,-0.016676952,0.012698048,0.012875,-0.015702193,0.013672807,0.014023379,-0.014125,0.012698048,0.012875,-0.015702193,0.012698048,0.012875,-0.012547807,0.016827193,0.014023379,-0.014125,0.01525,0.013584737,-0.011573048,0.017801952,0.012875,-0.012547807,0.01525,0.013584737,-0.011573048,0.012698048,0.012875,-0.012547807,0.01525,0.012165263,-0.011573048,0.012698048,0.012875,-0.012547807,0.012698048,0.012875,-0.015702193,0.013672807,0.011726621,-0.014125,0.012698048,0.012875,-0.015702193,0.01525,0.013584737,-0.016676952,0.01525,0.012165263,-0.016676952,0.01525,0.013584737,-0.016676952,0.016827193,0.014023379,-0.014125,0.017801952,0.012875,-0.015702193,0.016827193,0.011726621,-0.014125,0.017801952,0.012875,-0.012547807,0.01525,0.012165263,-0.011573048,0.016827193,0.011726621,-0.014125,0.01525,0.012165263,-0.011573048,0.013672807,0.011726621,-0.014125,0.016827193,0.011726621,-0.014125,0.013672807,0.011726621,-0.014125,0.01525,0.012165263,-0.016676952,0.016827193,0.011726621,-0.014125,0.01525,0.012165263,-0.016676952,0.017801952,0.012875,-0.015702193,0.016827193,0.011726621,-0.014125,0.017801952,0.012875,-0.015702193,0.017801952,0.012875,-0.012547807,0.01525,0.012165263,-0.011573048,0.017801952,0.012875,-0.012547807,0.01525,0.013584737,-0.011573048,0.013672807,0.011726621,-0.014125,0.01525,0.012165263,-0.011573048,0.012698048,0.012875,-0.012547807,0.01525,0.012165263,-0.016676952,0.013672807,0.011726621,-0.014125,0.012698048,0.012875,-0.015702193,0.017801952,0.012875,-0.015702193,0.01525,0.012165263,-0.016676952,0.01525,0.013584737,-0.016676952,0.017801952,0.012875,-0.012547807,0.017801952,0.012875,-0.015702193,0.016827193,0.014023379,-0.014125],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#805032","opacity":1,"roughness":0.78,"metalness":0},{"name":"Resin grain 2","positions":[-0.001577193,0.002835879,-0.0045,-0.002551952,0.0016875,-0.002922807,0.0,0.002397237,-0.001948048,-0.001577193,0.002835879,-0.0045,0.0,0.002397237,-0.001948048,0.001577193,0.002835879,-0.0045,-0.001577193,0.002835879,-0.0045,0.001577193,0.002835879,-0.0045,0.0,0.002397237,-0.007051952,-0.001577193,0.002835879,-0.0045,0.0,0.002397237,-0.007051952,-0.002551952,0.0016875,-0.006077193,-0.001577193,0.002835879,-0.0045,-0.002551952,0.0016875,-0.006077193,-0.002551952,0.0016875,-0.002922807,0.001577193,0.002835879,-0.0045,0.0,0.002397237,-0.001948048,0.002551952,0.0016875,-0.002922807,0.0,0.002397237,-0.001948048,-0.002551952,0.0016875,-0.002922807,0.0,0.000977763,-0.001948048,-0.002551952,0.0016875,-0.002922807,-0.002551952,0.0016875,-0.006077193,-0.001577193,0.000539121,-0.0045,-0.002551952,0.0016875,-0.006077193,0.0,0.002397237,-0.007051952,0.0,0.000977763,-0.007051952,0.0,0.002397237,-0.007051952,0.001577193,0.002835879,-0.0045,0.002551952,0.0016875,-0.006077193,0.001577193,0.000539121,-0.0045,0.002551952,0.0016875,-0.002922807,0.0,0.000977763,-0.001948048,0.001577193,0.000539121,-0.0045,0.0,0.000977763,-0.001948048,-0.001577193,0.000539121,-0.0045,0.001577193,0.000539121,-0.0045,-0.001577193,0.000539121,-0.0045,0.0,0.000977763,-0.007051952,0.001577193,0.000539121,-0.0045,0.0,0.000977763,-0.007051952,0.002551952,0.0016875,-0.006077193,0.001577193,0.000539121,-0.0045,0.002551952,0.0016875,-0.006077193,0.002551952,0.0016875,-0.002922807,0.0,0.000977763,-0.001948048,0.002551952,0.0016875,-0.002922807,0.0,0.002397237,-0.001948048,-0.001577193,0.000539121,-0.0045,0.0,0.000977763,-0.001948048,-0.002551952,0.0016875,-0.002922807,0.0,0.000977763,-0.007051952,-0.001577193,0.000539121,-0.0045,-0.002551952,0.0016875,-0.006077193,0.002551952,0.0016875,-0.006077193,0.0,0.000977763,-0.007051952,0.0,0.002397237,-0.007051952,0.002551952,0.0016875,-0.002922807,0.002551952,0.0016875,-0.006077193,0.001577193,0.002835879,-0.0045],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#805032","opacity":1,"roughness":0.78,"metalness":0},{"name":"Resin grain 1","positions":[-0.010577193,0.012460879,-0.0191875,-0.011551952,0.0113125,-0.017610307,-0.009,0.012022237,-0.016635548,-0.010577193,0.012460879,-0.0191875,-0.009,0.012022237,-0.016635548,-0.007422807,0.012460879,-0.0191875,-0.010577193,0.012460879,-0.0191875,-0.007422807,0.012460879,-0.0191875,-0.009,0.012022237,-0.021739452,-0.010577193,0.012460879,-0.0191875,-0.009,0.012022237,-0.021739452,-0.011551952,0.0113125,-0.020764693,-0.010577193,0.012460879,-0.0191875,-0.011551952,0.0113125,-0.020764693,-0.011551952,0.0113125,-0.017610307,-0.007422807,0.012460879,-0.0191875,-0.009,0.012022237,-0.016635548,-0.006448048,0.0113125,-0.017610307,-0.009,0.012022237,-0.016635548,-0.011551952,0.0113125,-0.017610307,-0.009,0.010602763,-0.016635548,-0.011551952,0.0113125,-0.017610307,-0.011551952,0.0113125,-0.020764693,-0.010577193,0.010164121,-0.0191875,-0.011551952,0.0113125,-0.020764693,-0.009,0.012022237,-0.021739452,-0.009,0.010602763,-0.021739452,-0.009,0.012022237,-0.021739452,-0.007422807,0.012460879,-0.0191875,-0.006448048,0.0113125,-0.020764693,-0.007422807,0.010164121,-0.0191875,-0.006448048,0.0113125,-0.017610307,-0.009,0.010602763,-0.016635548,-0.007422807,0.010164121,-0.0191875,-0.009,0.010602763,-0.016635548,-0.010577193,0.010164121,-0.0191875,-0.007422807,0.010164121,-0.0191875,-0.010577193,0.010164121,-0.0191875,-0.009,0.010602763,-0.021739452,-0.007422807,0.010164121,-0.0191875,-0.009,0.010602763,-0.021739452,-0.006448048,0.0113125,-0.020764693,-0.007422807,0.010164121,-0.0191875,-0.006448048,0.0113125,-0.020764693,-0.006448048,0.0113125,-0.017610307,-0.009,0.010602763,-0.016635548,-0.006448048,0.0113125,-0.017610307,-0.009,0.012022237,-0.016635548,-0.010577193,0.010164121,-0.0191875,-0.009,0.010602763,-0.016635548,-0.011551952,0.0113125,-0.017610307,-0.009,0.010602763,-0.021739452,-0.010577193,0.010164121,-0.0191875,-0.011551952,0.0113125,-0.020764693,-0.006448048,0.0113125,-0.020764693,-0.009,0.010602763,-0.021739452,-0.009,0.012022237,-0.021739452,-0.006448048,0.0113125,-0.017610307,-0.006448048,0.0113125,-0.020764693,-0.007422807,0.012460879,-0.0191875],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#805032","opacity":1,"roughness":0.78,"metalness":0},{"name":"Pressed resin","positions":[-0.015614215,0.01727873,0.0,-0.024027805,0.01412375,0.00727735,-0.009177805,0.01690413,0.011775,-0.025264328,0.009625,0.012380968,-0.01485,0.01240538,0.019052351,-0.024027805,0.01412375,0.00727735,0.0,0.014355266,0.020032825,-0.009177805,0.01690413,0.011775,-0.01485,0.01240538,0.019052351,-0.024027805,0.01412375,0.00727735,-0.01485,0.01240538,0.019052351,-0.009177805,0.01690413,0.011775,-0.015614215,0.01727873,0.0,-0.009177805,0.01690413,0.011775,0.0,0.0186225,0.0,0.0,0.014355266,0.020032825,0.009177805,0.01690413,0.011775,-0.009177805,0.01690413,0.011775,0.015614215,0.01727873,0.0,0.0,0.0186225,0.0,0.009177805,0.01690413,0.011775,-0.009177805,0.01690413,0.011775,0.009177805,0.01690413,0.011775,0.0,0.0186225,0.0,-0.015614215,0.01727873,0.0,0.0,0.0186225,0.0,-0.009177805,0.01690413,-0.011775,0.015614215,0.01727873,0.0,0.009177805,0.01690413,-0.011775,0.0,0.0186225,0.0,0.0,0.014355266,-0.020032825,-0.009177805,0.01690413,-0.011775,0.009177805,0.01690413,-0.011775,0.0,0.0186225,0.0,0.009177805,0.01690413,-0.011775,-0.009177805,0.01690413,-0.011775,-0.015614215,0.01727873,0.0,-0.009177805,0.01690413,-0.011775,-0.024027805,0.01412375,-0.00727735,0.0,0.014355266,-0.020032825,-0.01485,0.01240538,-0.019052351,-0.009177805,0.01690413,-0.011775,-0.025264328,0.009625,-0.012380968,-0.024027805,0.01412375,-0.00727735,-0.01485,0.01240538,-0.019052351,-0.009177805,0.01690413,-0.011775,-0.01485,0.01240538,-0.019052351,-0.024027805,0.01412375,-0.00727735,-0.015614215,0.01727873,0.0,-0.024027805,0.01412375,-0.00727735,-0.024027805,0.01412375,0.00727735,-0.025264328,0.009625,-0.012380968,-0.029700001,0.009625,0.0,-0.024027805,0.01412375,-0.00727735,-0.025264328,0.009625,0.012380968,-0.024027805,0.01412375,0.00727735,-0.029700001,0.009625,0.0,-0.024027805,0.01412375,-0.00727735,-0.029700001,0.009625,0.0,-0.024027805,0.01412375,0.00727735,0.015614215,0.01727873,0.0,0.009177805,0.01690413,0.011775,0.024027805,0.01412375,0.00727735,0.0,0.014355266,0.020032825,0.01485,0.01240538,0.019052351,0.009177805,0.01690413,0.011775,0.025264328,0.009625,0.012380968,0.024027805,0.01412375,0.00727735,0.01485,0.01240538,0.019052351,0.009177805,0.01690413,0.011775,0.01485,0.01240538,0.019052351,0.024027805,0.01412375,0.00727735,0.0,0.014355266,0.020032825,-0.01485,0.01240538,0.019052351,0.0,0.009625,0.023549999,-0.025264328,0.009625,0.012380968,-0.01485,0.00684462,0.019052351,-0.01485,0.01240538,0.019052351,0.0,0.004894734,0.020032825,0.0,0.009625,0.023549999,-0.01485,0.00684462,0.019052351,-0.01485,0.01240538,0.019052351,-0.01485,0.00684462,0.019052351,0.0,0.009625,0.023549999,-0.025264328,0.009625,0.012380968,-0.029700001,0.009625,0.0,-0.024027805,0.00512625,0.00727735,-0.025264328,0.009625,-0.012380968,-0.024027805,0.00512625,-0.00727735,-0.029700001,0.009625,0.0,-0.015614215,0.00197127,0.0,-0.024027805,0.00512625,0.00727735,-0.024027805,0.00512625,-0.00727735,-0.029700001,0.009625,0.0,-0.024027805,0.00512625,-0.00727735,-0.024027805,0.00512625,0.00727735,-0.025264328,0.009625,-0.012380968,-0.01485,0.01240538,-0.019052351,-0.01485,0.00684462,-0.019052351,0.0,0.014355266,-0.020032825,0.0,0.009625,-0.023549999,-0.01485,0.01240538,-0.019052351,0.0,0.004894734,-0.020032825,-0.01485,0.00684462,-0.019052351,0.0,0.009625,-0.023549999,-0.01485,0.01240538,-0.019052351,0.0,0.009625,-0.023549999,-0.01485,0.00684462,-0.019052351,0.0,0.014355266,-0.020032825,0.009177805,0.01690413,-0.011775,0.01485,0.01240538,-0.019052351,0.015614215,0.01727873,0.0,0.024027805,0.01412375,-0.00727735,0.009177805,0.01690413,-0.011775,0.025264328,0.009625,-0.012380968,0.01485,0.01240538,-0.019052351,0.024027805,0.01412375,-0.00727735,0.009177805,0.01690413,-0.011775,0.024027805,0.01412375,-0.00727735,0.01485,0.01240538,-0.019052351,0.015614215,0.00197127,0.0,0.024027805,0.00512625,0.00727735,0.009177805,0.00234587,0.011775,0.025264328,0.009625,0.012380968,0.01485,0.00684462,0.019052351,0.024027805,0.00512625,0.00727735,0.0,0.004894734,0.020032825,0.009177805,0.00234587,0.011775,0.01485,0.00684462,0.019052351,0.024027805,0.00512625,0.00727735,0.01485,0.00684462,0.019052351,0.009177805,0.00234587,0.011775,0.015614215,0.00197127,0.0,0.009177805,0.00234587,0.011775,0.0,0.0006275,0.0,0.0,0.004894734,0.020032825,-0.009177805,0.00234587,0.011775,0.009177805,0.00234587,0.011775,-0.015614215,0.00197127,0.0,0.0,0.0006275,0.0,-0.009177805,0.00234587,0.011775,0.009177805,0.00234587,0.011775,-0.009177805,0.00234587,0.011775,0.0,0.0006275,0.0,0.015614215,0.00197127,0.0,0.0,0.0006275,0.0,0.009177805,0.00234587,-0.011775,-0.015614215,0.00197127,0.0,-0.009177805,0.00234587,-0.011775,0.0,0.0006275,0.0,0.0,0.004894734,-0.020032825,0.009177805,0.00234587,-0.011775,-0.009177805,0.00234587,-0.011775,0.0,0.0006275,0.0,-0.009177805,0.00234587,-0.011775,0.009177805,0.00234587,-0.011775,0.015614215,0.00197127,0.0,0.009177805,0.00234587,-0.011775,0.024027805,0.00512625,-0.00727735,0.0,0.004894734,-0.020032825,0.01485,0.00684462,-0.019052351,0.009177805,0.00234587,-0.011775,0.025264328,0.009625,-0.012380968,0.024027805,0.00512625,-0.00727735,0.01485,0.00684462,-0.019052351,0.009177805,0.00234587,-0.011775,0.01485,0.00684462,-0.019052351,0.024027805,0.00512625,-0.00727735,0.015614215,0.00197127,0.0,0.024027805,0.00512625,-0.00727735,0.024027805,0.00512625,0.00727735,0.025264328,0.009625,-0.012380968,0.029700001,0.009625,0.0,0.024027805,0.00512625,-0.00727735,0.025264328,0.009625,0.012380968,0.024027805,0.00512625,0.00727735,0.029700001,0.009625,0.0,0.024027805,0.00512625,-0.00727735,0.029700001,0.009625,0.0,0.024027805,0.00512625,0.00727735,0.0,0.004894734,0.020032825,0.01485,0.00684462,0.019052351,0.0,0.009625,0.023549999,0.025264328,0.009625,0.012380968,0.01485,0.01240538,0.019052351,0.01485,0.00684462,0.019052351,0.0,0.014355266,0.020032825,0.0,0.009625,0.023549999,0.01485,0.01240538,0.019052351,0.01485,0.00684462,0.019052351,0.01485,0.01240538,0.019052351,0.0,0.009625,0.023549999,-0.015614215,0.00197127,0.0,-0.009177805,0.00234587,0.011775,-0.024027805,0.00512625,0.00727735,0.0,0.004894734,0.020032825,-0.01485,0.00684462,0.019052351,-0.009177805,0.00234587,0.011775,-0.025264328,0.009625,0.012380968,-0.024027805,0.00512625,0.00727735,-0.01485,0.00684462,0.019052351,-0.009177805,0.00234587,0.011775,-0.01485,0.00684462,0.019052351,-0.024027805,0.00512625,0.00727735,0.0,0.004894734,-0.020032825,-0.009177805,0.00234587,-0.011775,-0.01485,0.00684462,-0.019052351,-0.015614215,0.00197127,0.0,-0.024027805,0.00512625,-0.00727735,-0.009177805,0.00234587,-0.011775,-0.025264328,0.009625,-0.012380968,-0.01485,0.00684462,-0.019052351,-0.024027805,0.00512625,-0.00727735,-0.009177805,0.00234587,-0.011775,-0.024027805,0.00512625,-0.00727735,-0.01485,0.00684462,-0.019052351,0.025264328,0.009625,-0.012380968,0.01485,0.00684462,-0.019052351,0.01485,0.01240538,-0.019052351,0.0,0.004894734,-0.020032825,0.0,0.009625,-0.023549999,0.01485,0.00684462,-0.019052351,0.0,0.014355266,-0.020032825,0.01485,0.01240538,-0.019052351,0.0,0.009625,-0.023549999,0.01485,0.00684462,-0.019052351,0.0,0.009625,-0.023549999,0.01485,0.01240538,-0.019052351,0.025264328,0.009625,0.012380968,0.029700001,0.009625,0.0,0.024027805,0.01412375,0.00727735,0.025264328,0.009625,-0.012380968,0.024027805,0.01412375,-0.00727735,0.029700001,0.009625,0.0,0.015614215,0.01727873,0.0,0.024027805,0.01412375,0.00727735,0.024027805,0.01412375,-0.00727735,0.029700001,0.009625,0.0,0.024027805,0.01412375,-0.00727735,0.024027805,0.01412375,0.00727735],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239],"color":"#613c27","opacity":1,"roughness":0.78,"metalness":0}],"9002":[{"name":"Vial cap","positions":[0.008,0.0495,0.0,0.008,0.0565,0.0,0.005656854,0.0565,0.005656854,0.008,0.0495,0.0,0.005656854,0.0565,0.005656854,0.005656854,0.0495,0.005656854,0.0,0.0495,0.0,0.005656854,0.0495,0.005656854,0.008,0.0495,0.0,0.0,0.0565,0.0,0.008,0.0565,0.0,0.005656854,0.0565,0.005656854,0.005656854,0.0495,0.005656854,0.005656854,0.0565,0.005656854,0.0,0.0565,0.008,0.005656854,0.0495,0.005656854,0.0,0.0565,0.008,0.0,0.0495,0.008,0.0,0.0495,0.0,0.0,0.0495,0.008,0.005656854,0.0495,0.005656854,0.0,0.0565,0.0,0.005656854,0.0565,0.005656854,0.0,0.0565,0.008,0.0,0.0495,0.008,0.0,0.0565,0.008,-0.005656854,0.0565,0.005656854,0.0,0.0495,0.008,-0.005656854,0.0565,0.005656854,-0.005656854,0.0495,0.005656854,0.0,0.0495,0.0,-0.005656854,0.0495,0.005656854,0.0,0.0495,0.008,0.0,0.0565,0.0,0.0,0.0565,0.008,-0.005656854,0.0565,0.005656854,-0.005656854,0.0495,0.005656854,-0.005656854,0.0565,0.005656854,-0.008,0.0565,0.0,-0.005656854,0.0495,0.005656854,-0.008,0.0565,0.0,-0.008,0.0495,0.0,0.0,0.0495,0.0,-0.008,0.0495,0.0,-0.005656854,0.0495,0.005656854,0.0,0.0565,0.0,-0.005656854,0.0565,0.005656854,-0.008,0.0565,0.0,-0.008,0.0495,0.0,-0.008,0.0565,0.0,-0.005656854,0.0565,-0.005656854,-0.008,0.0495,0.0,-0.005656854,0.0565,-0.005656854,-0.005656854,0.0495,-0.005656854,0.0,0.0495,0.0,-0.005656854,0.0495,-0.005656854,-0.008,0.0495,0.0,0.0,0.0565,0.0,-0.008,0.0565,0.0,-0.005656854,0.0565,-0.005656854,-0.005656854,0.0495,-0.005656854,-0.005656854,0.0565,-0.005656854,-0.0,0.0565,-0.008,-0.005656854,0.0495,-0.005656854,-0.0,0.0565,-0.008,-0.0,0.0495,-0.008,0.0,0.0495,0.0,-0.0,0.0495,-0.008,-0.005656854,0.0495,-0.005656854,0.0,0.0565,0.0,-0.005656854,0.0565,-0.005656854,-0.0,0.0565,-0.008,-0.0,0.0495,-0.008,-0.0,0.0565,-0.008,0.005656854,0.0565,-0.005656854,-0.0,0.0495,-0.008,0.005656854,0.0565,-0.005656854,0.005656854,0.0495,-0.005656854,0.0,0.0495,0.0,0.005656854,0.0495,-0.005656854,-0.0,0.0495,-0.008,0.0,0.0565,0.0,-0.0,0.0565,-0.008,0.005656854,0.0565,-0.005656854,0.005656854,0.0495,-0.005656854,0.005656854,0.0565,-0.005656854,0.008,0.0565,0.0,0.005656854,0.0495,-0.005656854,0.008,0.0565,0.0,0.008,0.0495,0.0,0.0,0.0495,0.0,0.008,0.0495,0.0,0.005656854,0.0495,-0.005656854,0.0,0.0565,0.0,0.005656854,0.0565,-0.005656854,0.008,0.0565,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#273131","opacity":1,"roughness":0.78,"metalness":0},{"name":"Vial neck","positions":[0.01,0.041,0.0,0.007,0.051,0.0,0.004949748,0.051,0.004949748,0.01,0.041,0.0,0.004949748,0.051,0.004949748,0.007071068,0.041,0.007071068,0.0,0.041,0.0,0.007071068,0.041,0.007071068,0.01,0.041,0.0,0.0,0.051,0.0,0.007,0.051,0.0,0.004949748,0.051,0.004949748,0.007071068,0.041,0.007071068,0.004949748,0.051,0.004949748,0.0,0.051,0.007,0.007071068,0.041,0.007071068,0.0,0.051,0.007,0.0,0.041,0.01,0.0,0.041,0.0,0.0,0.041,0.01,0.007071068,0.041,0.007071068,0.0,0.051,0.0,0.004949748,0.051,0.004949748,0.0,0.051,0.007,0.0,0.041,0.01,0.0,0.051,0.007,-0.004949748,0.051,0.004949748,0.0,0.041,0.01,-0.004949748,0.051,0.004949748,-0.007071068,0.041,0.007071068,0.0,0.041,0.0,-0.007071068,0.041,0.007071068,0.0,0.041,0.01,0.0,0.051,0.0,0.0,0.051,0.007,-0.004949748,0.051,0.004949748,-0.007071068,0.041,0.007071068,-0.004949748,0.051,0.004949748,-0.007,0.051,0.0,-0.007071068,0.041,0.007071068,-0.007,0.051,0.0,-0.01,0.041,0.0,0.0,0.041,0.0,-0.01,0.041,0.0,-0.007071068,0.041,0.007071068,0.0,0.051,0.0,-0.004949748,0.051,0.004949748,-0.007,0.051,0.0,-0.01,0.041,0.0,-0.007,0.051,0.0,-0.004949748,0.051,-0.004949748,-0.01,0.041,0.0,-0.004949748,0.051,-0.004949748,-0.007071068,0.041,-0.007071068,0.0,0.041,0.0,-0.007071068,0.041,-0.007071068,-0.01,0.041,0.0,0.0,0.051,0.0,-0.007,0.051,0.0,-0.004949748,0.051,-0.004949748,-0.007071068,0.041,-0.007071068,-0.004949748,0.051,-0.004949748,-0.0,0.051,-0.007,-0.007071068,0.041,-0.007071068,-0.0,0.051,-0.007,-0.0,0.041,-0.01,0.0,0.041,0.0,-0.0,0.041,-0.01,-0.007071068,0.041,-0.007071068,0.0,0.051,0.0,-0.004949748,0.051,-0.004949748,-0.0,0.051,-0.007,-0.0,0.041,-0.01,-0.0,0.051,-0.007,0.004949748,0.051,-0.004949748,-0.0,0.041,-0.01,0.004949748,0.051,-0.004949748,0.007071068,0.041,-0.007071068,0.0,0.041,0.0,0.007071068,0.041,-0.007071068,-0.0,0.041,-0.01,0.0,0.051,0.0,-0.0,0.051,-0.007,0.004949748,0.051,-0.004949748,0.007071068,0.041,-0.007071068,0.004949748,0.051,-0.004949748,0.007,0.051,0.0,0.007071068,0.041,-0.007071068,0.007,0.051,0.0,0.01,0.041,0.0,0.0,0.041,0.0,0.01,0.041,0.0,0.007071068,0.041,-0.007071068,0.0,0.051,0.0,0.004949748,0.051,-0.004949748,0.007,0.051,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#b6bbcd","opacity":1,"roughness":0.78,"metalness":0},{"name":"Vial body","positions":[0.012,0.0005,0.0,0.012,0.0415,0.0,0.008485281,0.0415,0.008485281,0.012,0.0005,0.0,0.008485281,0.0415,0.008485281,0.008485281,0.0005,0.008485281,0.0,0.0005,0.0,0.008485281,0.0005,0.008485281,0.012,0.0005,0.0,0.0,0.0415,0.0,0.012,0.0415,0.0,0.008485281,0.0415,0.008485281,0.008485281,0.0005,0.008485281,0.008485281,0.0415,0.008485281,0.0,0.0415,0.012,0.008485281,0.0005,0.008485281,0.0,0.0415,0.012,0.0,0.0005,0.012,0.0,0.0005,0.0,0.0,0.0005,0.012,0.008485281,0.0005,0.008485281,0.0,0.0415,0.0,0.008485281,0.0415,0.008485281,0.0,0.0415,0.012,0.0,0.0005,0.012,0.0,0.0415,0.012,-0.008485281,0.0415,0.008485281,0.0,0.0005,0.012,-0.008485281,0.0415,0.008485281,-0.008485281,0.0005,0.008485281,0.0,0.0005,0.0,-0.008485281,0.0005,0.008485281,0.0,0.0005,0.012,0.0,0.0415,0.0,0.0,0.0415,0.012,-0.008485281,0.0415,0.008485281,-0.008485281,0.0005,0.008485281,-0.008485281,0.0415,0.008485281,-0.012,0.0415,0.0,-0.008485281,0.0005,0.008485281,-0.012,0.0415,0.0,-0.012,0.0005,0.0,0.0,0.0005,0.0,-0.012,0.0005,0.0,-0.008485281,0.0005,0.008485281,0.0,0.0415,0.0,-0.008485281,0.0415,0.008485281,-0.012,0.0415,0.0,-0.012,0.0005,0.0,-0.012,0.0415,0.0,-0.008485281,0.0415,-0.008485281,-0.012,0.0005,0.0,-0.008485281,0.0415,-0.008485281,-0.008485281,0.0005,-0.008485281,0.0,0.0005,0.0,-0.008485281,0.0005,-0.008485281,-0.012,0.0005,0.0,0.0,0.0415,0.0,-0.012,0.0415,0.0,-0.008485281,0.0415,-0.008485281,-0.008485281,0.0005,-0.008485281,-0.008485281,0.0415,-0.008485281,-0.0,0.0415,-0.012,-0.008485281,0.0005,-0.008485281,-0.0,0.0415,-0.012,-0.0,0.0005,-0.012,0.0,0.0005,0.0,-0.0,0.0005,-0.012,-0.008485281,0.0005,-0.008485281,0.0,0.0415,0.0,-0.008485281,0.0415,-0.008485281,-0.0,0.0415,-0.012,-0.0,0.0005,-0.012,-0.0,0.0415,-0.012,0.008485281,0.0415,-0.008485281,-0.0,0.0005,-0.012,0.008485281,0.0415,-0.008485281,0.008485281,0.0005,-0.008485281,0.0,0.0005,0.0,0.008485281,0.0005,-0.008485281,-0.0,0.0005,-0.012,0.0,0.0415,0.0,-0.0,0.0415,-0.012,0.008485281,0.0415,-0.008485281,0.008485281,0.0005,-0.008485281,0.008485281,0.0415,-0.008485281,0.012,0.0415,0.0,0.008485281,0.0005,-0.008485281,0.012,0.0415,0.0,0.012,0.0005,0.0,0.0,0.0005,0.0,0.012,0.0005,0.0,0.008485281,0.0005,-0.008485281,0.0,0.0415,0.0,0.008485281,0.0415,-0.008485281,0.012,0.0415,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#3821f4","opacity":1,"roughness":0.78,"metalness":0}],"9003":[{"name":"Fractal crystal 6","positions":[-0.006004496,0.060957005,-0.010373541,0.002572072,0.030224303,-0.010373541,-0.006004496,0.030224303,-0.001796973,-0.006004496,0.060957005,-0.010373541,-0.006004496,0.030224303,-0.001796973,-0.014581063,0.030224303,-0.010373541,-0.006004496,0.060957005,-0.010373541,-0.014581063,0.030224303,-0.010373541,-0.006004496,0.030224303,-0.018950108,-0.006004496,0.060957005,-0.010373541,-0.006004496,0.030224303,-0.018950108,0.002572072,0.030224303,-0.010373541,-0.006004496,-0.000508399,-0.010373541,-0.006004496,0.030224303,-0.001796973,0.002572072,0.030224303,-0.010373541,-0.006004496,-0.000508399,-0.010373541,-0.014581063,0.030224303,-0.010373541,-0.006004496,0.030224303,-0.001796973,-0.006004496,-0.000508399,-0.010373541,-0.006004496,0.030224303,-0.018950108,-0.014581063,0.030224303,-0.010373541,-0.006004496,-0.000508399,-0.010373541,0.002572072,0.030224303,-0.010373541,-0.006004496,0.030224303,-0.018950108],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#cceff5","opacity":1,"roughness":0.3,"metalness":0.1},{"name":"Fractal crystal 5","positions":[0.004816875,0.061567625,0.001271875,0.013384875,0.030865625,0.001271875,0.004816875,0.030865625,0.009839875,0.004816875,0.061567625,0.001271875,0.004816875,0.030865625,0.009839875,-0.003751125,0.030865625,0.001271875,0.004816875,0.061567625,0.001271875,-0.003751125,0.030865625,0.001271875,0.004816875,0.030865625,-0.007296125,0.004816875,0.061567625,0.001271875,0.004816875,0.030865625,-0.007296125,0.013384875,0.030865625,0.001271875,0.004816875,0.000163625,0.001271875,0.004816875,0.030865625,0.009839875,0.013384875,0.030865625,0.001271875,0.004816875,0.000163625,0.001271875,-0.003751125,0.030865625,0.001271875,0.004816875,0.030865625,0.009839875,0.004816875,0.000163625,0.001271875,0.004816875,0.030865625,-0.007296125,-0.003751125,0.030865625,0.001271875,0.004816875,0.000163625,0.001271875,0.013384875,0.030865625,0.001271875,0.004816875,0.030865625,-0.007296125],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#cceff5","opacity":1,"roughness":0.3,"metalness":0.1},{"name":"Fractal crystal 4","positions":[-0.0159375,0.051737499,-0.0031875,-0.0087375,0.0259375,-0.0031875,-0.0159375,0.0259375,0.0040125,-0.0159375,0.051737499,-0.0031875,-0.0159375,0.0259375,0.0040125,-0.0231375,0.0259375,-0.0031875,-0.0159375,0.051737499,-0.0031875,-0.0231375,0.0259375,-0.0031875,-0.0159375,0.0259375,-0.0103875,-0.0159375,0.051737499,-0.0031875,-0.0159375,0.0259375,-0.0103875,-0.0087375,0.0259375,-0.0031875,-0.0159375,0.000137501,-0.0031875,-0.0159375,0.0259375,0.0040125,-0.0087375,0.0259375,-0.0031875,-0.0159375,0.000137501,-0.0031875,-0.0231375,0.0259375,-0.0031875,-0.0159375,0.0259375,0.0040125,-0.0159375,0.000137501,-0.0031875,-0.0159375,0.0259375,-0.0103875,-0.0231375,0.0259375,-0.0031875,-0.0159375,0.000137501,-0.0031875,-0.0087375,0.0259375,-0.0031875,-0.0159375,0.0259375,-0.0103875],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#cceff5","opacity":1,"roughness":0.3,"metalness":0.1},{"name":"Fractal crystal 3","positions":[0.0018125,0.048737499,0.0148125,0.0090125,0.0259375,0.0148125,0.0018125,0.0259375,0.0220125,0.0018125,0.048737499,0.0148125,0.0018125,0.0259375,0.0220125,-0.0053875,0.0259375,0.0148125,0.0018125,0.048737499,0.0148125,-0.0053875,0.0259375,0.0148125,0.0018125,0.0259375,0.0076125,0.0018125,0.048737499,0.0148125,0.0018125,0.0259375,0.0076125,0.0090125,0.0259375,0.0148125,0.0018125,0.003137501,0.0148125,0.0018125,0.0259375,0.0220125,0.0090125,0.0259375,0.0148125,0.0018125,0.003137501,0.0148125,-0.0053875,0.0259375,0.0148125,0.0018125,0.0259375,0.0220125,0.0018125,0.003137501,0.0148125,0.0018125,0.0259375,0.0076125,-0.0053875,0.0259375,0.0148125,0.0018125,0.003137501,0.0148125,0.0090125,0.0259375,0.0148125,0.0018125,0.0259375,0.0076125],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#cceff5","opacity":1,"roughness":0.3,"metalness":0.1},{"name":"Fractal crystal 2","positions":[-0.0068125,0.045737499,0.005875,0.0003875,0.0259375,0.005875,-0.0068125,0.0259375,0.013075,-0.0068125,0.045737499,0.005875,-0.0068125,0.0259375,0.013075,-0.0140125,0.0259375,0.005875,-0.0068125,0.045737499,0.005875,-0.0140125,0.0259375,0.005875,-0.0068125,0.0259375,-0.001325,-0.0068125,0.045737499,0.005875,-0.0068125,0.0259375,-0.001325,0.0003875,0.0259375,0.005875,-0.0068125,0.006137501,0.005875,-0.0068125,0.0259375,0.013075,0.0003875,0.0259375,0.005875,-0.0068125,0.006137501,0.005875,-0.0140125,0.0259375,0.005875,-0.0068125,0.0259375,0.013075,-0.0068125,0.006137501,0.005875,-0.0068125,0.0259375,-0.001325,-0.0140125,0.0259375,0.005875,-0.0068125,0.006137501,0.005875,0.0003875,0.0259375,0.005875,-0.0068125,0.0259375,-0.001325],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#cceff5","opacity":1,"roughness":0.3,"metalness":0.1},{"name":"Fractal crystal 0","positions":[-0.0069725,0.03926925,0.02322375,-0.0022205,0.02818125,0.02322375,-0.0069725,0.02818125,0.02797575,-0.0069725,0.03926925,0.02322375,-0.0069725,0.02818125,0.02797575,-0.0117245,0.02818125,0.02322375,-0.0069725,0.03926925,0.02322375,-0.0117245,0.02818125,0.02322375,-0.0069725,0.02818125,0.01847175,-0.0069725,0.03926925,0.02322375,-0.0069725,0.02818125,0.01847175,-0.0022205,0.02818125,0.02322375,-0.0069725,0.01709325,0.02322375,-0.0069725,0.02818125,0.02797575,-0.0022205,0.02818125,0.02322375,-0.0069725,0.01709325,0.02322375,-0.0117245,0.02818125,0.02322375,-0.0069725,0.02818125,0.02797575,-0.0069725,0.01709325,0.02322375,-0.0069725,0.02818125,0.01847175,-0.0117245,0.02818125,0.02322375,-0.0069725,0.01709325,0.02322375,-0.0022205,0.02818125,0.02322375,-0.0069725,0.02818125,0.01847175],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#cceff5","opacity":1,"roughness":0.3,"metalness":0.1},{"name":"Fractal crystal 1","positions":[-0.01525,0.042737499,0.0155625,-0.00805,0.0259375,0.0155625,-0.01525,0.0259375,0.0227625,-0.01525,0.042737499,0.0155625,-0.01525,0.0259375,0.0227625,-0.02245,0.0259375,0.0155625,-0.01525,0.042737499,0.0155625,-0.02245,0.0259375,0.0155625,-0.01525,0.0259375,0.0083625,-0.01525,0.042737499,0.0155625,-0.01525,0.0259375,0.0083625,-0.00805,0.0259375,0.0155625,-0.01525,0.009137501,0.0155625,-0.01525,0.0259375,0.0227625,-0.00805,0.0259375,0.0155625,-0.01525,0.009137501,0.0155625,-0.02245,0.0259375,0.0155625,-0.01525,0.0259375,0.0227625,-0.01525,0.009137501,0.0155625,-0.01525,0.0259375,0.0083625,-0.02245,0.0259375,0.0155625,-0.01525,0.009137501,0.0155625,-0.00805,0.0259375,0.0155625,-0.01525,0.0259375,0.0083625],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#cceff5","opacity":1,"roughness":0.3,"metalness":0.1}],"9010":[{"name":"Nasal Cap","positions":[0.044,0.0,0.025,0.044,0.012,0.025,0.041949748,0.012,0.029949748,0.044,0.0,0.025,0.041949748,0.012,0.029949748,0.041949748,0.0,0.029949748,0.037,0.0,0.025,0.041949748,0.0,0.029949748,0.044,0.0,0.025,0.037,0.012,0.025,0.044,0.012,0.025,0.041949748,0.012,0.029949748,0.041949748,0.0,0.029949748,0.041949748,0.012,0.029949748,0.037,0.012,0.032,0.041949748,0.0,0.029949748,0.037,0.012,0.032,0.037,0.0,0.032,0.037,0.0,0.025,0.037,0.0,0.032,0.041949748,0.0,0.029949748,0.037,0.012,0.025,0.041949748,0.012,0.029949748,0.037,0.012,0.032,0.037,0.0,0.032,0.037,0.012,0.032,0.032050252,0.012,0.029949748,0.037,0.0,0.032,0.032050252,0.012,0.029949748,0.032050252,0.0,0.029949748,0.037,0.0,0.025,0.032050252,0.0,0.029949748,0.037,0.0,0.032,0.037,0.012,0.025,0.037,0.012,0.032,0.032050252,0.012,0.029949748,0.032050252,0.0,0.029949748,0.032050252,0.012,0.029949748,0.03,0.012,0.025,0.032050252,0.0,0.029949748,0.03,0.012,0.025,0.03,0.0,0.025,0.037,0.0,0.025,0.03,0.0,0.025,0.032050252,0.0,0.029949748,0.037,0.012,0.025,0.032050252,0.012,0.029949748,0.03,0.012,0.025,0.03,0.0,0.025,0.03,0.012,0.025,0.032050252,0.012,0.020050252,0.03,0.0,0.025,0.032050252,0.012,0.020050252,0.032050252,0.0,0.020050252,0.037,0.0,0.025,0.032050252,0.0,0.020050252,0.03,0.0,0.025,0.037,0.012,0.025,0.03,0.012,0.025,0.032050252,0.012,0.020050252,0.032050252,0.0,0.020050252,0.032050252,0.012,0.020050252,0.037,0.012,0.018,0.032050252,0.0,0.020050252,0.037,0.012,0.018,0.037,0.0,0.018,0.037,0.0,0.025,0.037,0.0,0.018,0.032050252,0.0,0.020050252,0.037,0.012,0.025,0.032050252,0.012,0.020050252,0.037,0.012,0.018,0.037,0.0,0.018,0.037,0.012,0.018,0.041949748,0.012,0.020050252,0.037,0.0,0.018,0.041949748,0.012,0.020050252,0.041949748,0.0,0.020050252,0.037,0.0,0.025,0.041949748,0.0,0.020050252,0.037,0.0,0.018,0.037,0.012,0.025,0.037,0.012,0.018,0.041949748,0.012,0.020050252,0.041949748,0.0,0.020050252,0.041949748,0.012,0.020050252,0.044,0.012,0.025,0.041949748,0.0,0.020050252,0.044,0.012,0.025,0.044,0.0,0.025,0.037,0.0,0.025,0.044,0.0,0.025,0.041949748,0.0,0.020050252,0.037,0.012,0.025,0.041949748,0.012,0.020050252,0.044,0.012,0.025],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Purple flower crystal","positions":[-0.008,0.03,0.004,-0.003,0.025,0.004,-0.008,0.025,0.009,-0.008,0.03,0.004,-0.008,0.025,0.009,-0.013,0.025,0.004,-0.008,0.03,0.004,-0.013,0.025,0.004,-0.008,0.025,-0.001,-0.008,0.03,0.004,-0.008,0.025,-0.001,-0.003,0.025,0.004,-0.008,0.02,0.004,-0.008,0.025,0.009,-0.003,0.025,0.004,-0.008,0.02,0.004,-0.013,0.025,0.004,-0.008,0.025,0.009,-0.008,0.02,0.004,-0.008,0.025,-0.001,-0.013,0.025,0.004,-0.008,0.02,0.004,-0.003,0.025,0.004,-0.008,0.025,-0.001],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#9567ac","opacity":1,"roughness":0.78,"metalness":0},{"name":"Riftflower bud","positions":[-0.019939651,0.026550011,0.0,-0.02422859,0.02,0.00404813,-0.013,0.02404813,0.006550011,-0.019939651,0.026550011,0.0,-0.013,0.02404813,0.006550011,-0.006060349,0.026550011,0.0,-0.019939651,0.026550011,0.0,-0.006060349,0.026550011,0.0,-0.013,0.02404813,-0.006550011,-0.019939651,0.026550011,0.0,-0.013,0.02404813,-0.006550011,-0.02422859,0.02,-0.00404813,-0.019939651,0.026550011,0.0,-0.02422859,0.02,-0.00404813,-0.02422859,0.02,0.00404813,-0.006060349,0.026550011,0.0,-0.013,0.02404813,0.006550011,-0.00177141,0.02,0.00404813,-0.013,0.02404813,0.006550011,-0.02422859,0.02,0.00404813,-0.013,0.01595187,0.006550011,-0.02422859,0.02,0.00404813,-0.02422859,0.02,-0.00404813,-0.019939651,0.013449989,0.0,-0.02422859,0.02,-0.00404813,-0.013,0.02404813,-0.006550011,-0.013,0.01595187,-0.006550011,-0.013,0.02404813,-0.006550011,-0.006060349,0.026550011,0.0,-0.00177141,0.02,-0.00404813,-0.006060349,0.013449989,0.0,-0.00177141,0.02,0.00404813,-0.013,0.01595187,0.006550011,-0.006060349,0.013449989,0.0,-0.013,0.01595187,0.006550011,-0.019939651,0.013449989,0.0,-0.006060349,0.013449989,0.0,-0.019939651,0.013449989,0.0,-0.013,0.01595187,-0.006550011,-0.006060349,0.013449989,0.0,-0.013,0.01595187,-0.006550011,-0.00177141,0.02,-0.00404813,-0.006060349,0.013449989,0.0,-0.00177141,0.02,-0.00404813,-0.00177141,0.02,0.00404813,-0.013,0.01595187,0.006550011,-0.00177141,0.02,0.00404813,-0.013,0.02404813,0.006550011,-0.019939651,0.013449989,0.0,-0.013,0.01595187,0.006550011,-0.02422859,0.02,0.00404813,-0.013,0.01595187,-0.006550011,-0.019939651,0.013449989,0.0,-0.02422859,0.02,-0.00404813,-0.00177141,0.02,-0.00404813,-0.013,0.01595187,-0.006550011,-0.013,0.02404813,-0.006550011,-0.00177141,0.02,0.00404813,-0.00177141,0.02,-0.00404813,-0.006060349,0.026550011,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#7e9147","opacity":1,"roughness":0.78,"metalness":0},{"name":"Nasal tip 2","positions":[0.039347314,0.02183162,0.0,0.043938073,0.043440066,0.0,0.041979391,0.044045956,0.004949748,0.039347314,0.02183162,0.0,0.041979391,0.044045956,0.004949748,0.036829009,0.022610621,0.006363961,0.030749284,0.024491297,0.0,0.036829009,0.022610621,0.006363961,0.039347314,0.02183162,0.0,0.037250716,0.045508703,0.0,0.043938073,0.043440066,0.0,0.041979391,0.044045956,0.004949748,0.036829009,0.022610621,0.006363961,0.041979391,0.044045956,0.004949748,0.037250716,0.045508703,0.007,0.036829009,0.022610621,0.006363961,0.037250716,0.045508703,0.007,0.030749284,0.024491297,0.009,0.030749284,0.024491297,0.0,0.030749284,0.024491297,0.009,0.036829009,0.022610621,0.006363961,0.037250716,0.045508703,0.0,0.041979391,0.044045956,0.004949748,0.037250716,0.045508703,0.007,0.030749284,0.024491297,0.009,0.037250716,0.045508703,0.007,0.032522041,0.046971451,0.004949748,0.030749284,0.024491297,0.009,0.032522041,0.046971451,0.004949748,0.024669558,0.026371972,0.006363961,0.030749284,0.024491297,0.0,0.024669558,0.026371972,0.006363961,0.030749284,0.024491297,0.009,0.037250716,0.045508703,0.0,0.037250716,0.045508703,0.007,0.032522041,0.046971451,0.004949748,0.024669558,0.026371972,0.006363961,0.032522041,0.046971451,0.004949748,0.030563359,0.047577341,0.0,0.024669558,0.026371972,0.006363961,0.030563359,0.047577341,0.0,0.022151254,0.027150973,0.0,0.030749284,0.024491297,0.0,0.022151254,0.027150973,0.0,0.024669558,0.026371972,0.006363961,0.037250716,0.045508703,0.0,0.032522041,0.046971451,0.004949748,0.030563359,0.047577341,0.0,0.022151254,0.027150973,0.0,0.030563359,0.047577341,0.0,0.032522041,0.046971451,-0.004949748,0.022151254,0.027150973,0.0,0.032522041,0.046971451,-0.004949748,0.024669558,0.026371972,-0.006363961,0.030749284,0.024491297,0.0,0.024669558,0.026371972,-0.006363961,0.022151254,0.027150973,0.0,0.037250716,0.045508703,0.0,0.030563359,0.047577341,0.0,0.032522041,0.046971451,-0.004949748,0.024669558,0.026371972,-0.006363961,0.032522041,0.046971451,-0.004949748,0.037250716,0.045508703,-0.007,0.024669558,0.026371972,-0.006363961,0.037250716,0.045508703,-0.007,0.030749284,0.024491297,-0.009,0.030749284,0.024491297,0.0,0.030749284,0.024491297,-0.009,0.024669558,0.026371972,-0.006363961,0.037250716,0.045508703,0.0,0.032522041,0.046971451,-0.004949748,0.037250716,0.045508703,-0.007,0.030749284,0.024491297,-0.009,0.037250716,0.045508703,-0.007,0.041979391,0.044045956,-0.004949748,0.030749284,0.024491297,-0.009,0.041979391,0.044045956,-0.004949748,0.036829009,0.022610621,-0.006363961,0.030749284,0.024491297,0.0,0.036829009,0.022610621,-0.006363961,0.030749284,0.024491297,-0.009,0.037250716,0.045508703,0.0,0.037250716,0.045508703,-0.007,0.041979391,0.044045956,-0.004949748,0.036829009,0.022610621,-0.006363961,0.041979391,0.044045956,-0.004949748,0.043938073,0.043440066,0.0,0.036829009,0.022610621,-0.006363961,0.043938073,0.043440066,0.0,0.039347314,0.02183162,0.0,0.030749284,0.024491297,0.0,0.039347314,0.02183162,0.0,0.036829009,0.022610621,-0.006363961,0.037250716,0.045508703,0.0,0.041979391,0.044045956,-0.004949748,0.043938073,0.043440066,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Nasal tip","positions":[0.040840424,0.043660884,0.0,0.03995259,0.051696812,-0.0,0.039531327,0.052401062,0.001299309,0.040840424,0.043660884,0.0,0.039531327,0.052401062,0.001299309,0.039671126,0.043860518,0.002863783,0.03684819,0.044342479,0.0,0.039671126,0.043860518,0.002863783,0.040840424,0.043660884,0.0,0.03851431,0.054101271,-0.0,0.03995259,0.051696812,-0.0,0.039531327,0.052401062,0.001299309,0.039671126,0.043860518,0.002863783,0.039531327,0.052401062,0.001299309,0.03851431,0.054101271,0.0018375,0.039671126,0.043860518,0.002863783,0.03851431,0.054101271,0.0018375,0.03684819,0.044342479,0.00405,0.03684819,0.044342479,0.0,0.03684819,0.044342479,0.00405,0.039671126,0.043860518,0.002863783,0.03851431,0.054101271,-0.0,0.039531327,0.052401062,0.001299309,0.03851431,0.054101271,0.0018375,0.03684819,0.044342479,0.00405,0.03851431,0.054101271,0.0018375,0.037497293,0.055801482,0.001299309,0.03684819,0.044342479,0.00405,0.037497293,0.055801482,0.001299309,0.034025254,0.044824439,0.002863783,0.03684819,0.044342479,0.0,0.034025254,0.044824439,0.002863783,0.03684819,0.044342479,0.00405,0.03851431,0.054101271,-0.0,0.03851431,0.054101271,0.0018375,0.037497293,0.055801482,0.001299309,0.034025254,0.044824439,0.002863783,0.037497293,0.055801482,0.001299309,0.03707603,0.056505732,0.0,0.034025254,0.044824439,0.002863783,0.03707603,0.056505732,0.0,0.032855956,0.045024073,0.0,0.03684819,0.044342479,0.0,0.032855956,0.045024073,0.0,0.034025254,0.044824439,0.002863783,0.03851431,0.054101271,-0.0,0.037497293,0.055801482,0.001299309,0.03707603,0.056505732,0.0,0.032855956,0.045024073,0.0,0.03707603,0.056505732,0.0,0.037497293,0.055801482,-0.001299309,0.032855956,0.045024073,0.0,0.037497293,0.055801482,-0.001299309,0.034025254,0.044824439,-0.002863783,0.03684819,0.044342479,0.0,0.034025254,0.044824439,-0.002863783,0.032855956,0.045024073,0.0,0.03851431,0.054101271,-0.0,0.03707603,0.056505732,0.0,0.037497293,0.055801482,-0.001299309,0.034025254,0.044824439,-0.002863783,0.037497293,0.055801482,-0.001299309,0.03851431,0.054101271,-0.0018375,0.034025254,0.044824439,-0.002863783,0.03851431,0.054101271,-0.0018375,0.03684819,0.044342479,-0.00405,0.03684819,0.044342479,0.0,0.03684819,0.044342479,-0.00405,0.034025254,0.044824439,-0.002863783,0.03851431,0.054101271,-0.0,0.037497293,0.055801482,-0.001299309,0.03851431,0.054101271,-0.0018375,0.03684819,0.044342479,-0.00405,0.03851431,0.054101271,-0.0018375,0.039531327,0.052401062,-0.001299309,0.03684819,0.044342479,-0.00405,0.039531327,0.052401062,-0.001299309,0.039671126,0.043860518,-0.002863783,0.03684819,0.044342479,0.0,0.039671126,0.043860518,-0.002863783,0.03684819,0.044342479,-0.00405,0.03851431,0.054101271,-0.0,0.03851431,0.054101271,-0.0018375,0.039531327,0.052401062,-0.001299309,0.039671126,0.043860518,-0.002863783,0.039531327,0.052401062,-0.001299309,0.03995259,0.051696812,-0.0,0.039671126,0.043860518,-0.002863783,0.03995259,0.051696812,-0.0,0.040840424,0.043660884,0.0,0.03684819,0.044342479,0.0,0.040840424,0.043660884,0.0,0.039671126,0.043860518,-0.002863783,0.03851431,0.054101271,-0.0,0.039531327,0.052401062,-0.001299309,0.03995259,0.051696812,-0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Inhaler elbow","positions":[0.013895732,0.012122205,-0.007,0.030104268,0.031877795,-0.007,0.034561935,0.019665948,-0.007,0.013895732,0.012122205,-0.007,0.009438065,0.024334052,-0.007,0.030104268,0.031877795,-0.007,0.013895732,0.012122205,0.007,0.034561935,0.019665948,0.007,0.030104268,0.031877795,0.007,0.013895732,0.012122205,0.007,0.030104268,0.031877795,0.007,0.009438065,0.024334052,0.007,0.013895732,0.012122205,-0.007,0.034561935,0.019665948,-0.007,0.034561935,0.019665948,0.007,0.013895732,0.012122205,-0.007,0.034561935,0.019665948,0.007,0.013895732,0.012122205,0.007,0.009438065,0.024334052,-0.007,0.009438065,0.024334052,0.007,0.030104268,0.031877795,0.007,0.009438065,0.024334052,-0.007,0.030104268,0.031877795,0.007,0.030104268,0.031877795,-0.007,0.013895732,0.012122205,-0.007,0.013895732,0.012122205,0.007,0.009438065,0.024334052,0.007,0.013895732,0.012122205,-0.007,0.009438065,0.024334052,0.007,0.009438065,0.024334052,-0.007,0.034561935,0.019665948,-0.007,0.030104268,0.031877795,-0.007,0.030104268,0.031877795,0.007,0.034561935,0.019665948,-0.007,0.030104268,0.031877795,0.007,0.034561935,0.019665948,0.007],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Purple collar","positions":[0.0115,0.038,0.0,0.0045,0.038,0.0,0.0045,0.032727922,0.012727922,0.0115,0.038,0.0,0.0045,0.032727922,0.012727922,0.0115,0.032727922,0.012727922,0.0115,0.02,0.0,0.0115,0.032727922,0.012727922,0.0115,0.038,0.0,0.0045,0.02,0.0,0.0045,0.038,0.0,0.0045,0.032727922,0.012727922,0.0115,0.032727922,0.012727922,0.0045,0.032727922,0.012727922,0.0045,0.02,0.018,0.0115,0.032727922,0.012727922,0.0045,0.02,0.018,0.0115,0.02,0.018,0.0115,0.02,0.0,0.0115,0.02,0.018,0.0115,0.032727922,0.012727922,0.0045,0.02,0.0,0.0045,0.032727922,0.012727922,0.0045,0.02,0.018,0.0115,0.02,0.018,0.0045,0.02,0.018,0.0045,0.007272078,0.012727922,0.0115,0.02,0.018,0.0045,0.007272078,0.012727922,0.0115,0.007272078,0.012727922,0.0115,0.02,0.0,0.0115,0.007272078,0.012727922,0.0115,0.02,0.018,0.0045,0.02,0.0,0.0045,0.02,0.018,0.0045,0.007272078,0.012727922,0.0115,0.007272078,0.012727922,0.0045,0.007272078,0.012727922,0.0045,0.002,0.0,0.0115,0.007272078,0.012727922,0.0045,0.002,0.0,0.0115,0.002,0.0,0.0115,0.02,0.0,0.0115,0.002,0.0,0.0115,0.007272078,0.012727922,0.0045,0.02,0.0,0.0045,0.007272078,0.012727922,0.0045,0.002,0.0,0.0115,0.002,0.0,0.0045,0.002,0.0,0.0045,0.007272078,-0.012727922,0.0115,0.002,0.0,0.0045,0.007272078,-0.012727922,0.0115,0.007272078,-0.012727922,0.0115,0.02,0.0,0.0115,0.007272078,-0.012727922,0.0115,0.002,0.0,0.0045,0.02,0.0,0.0045,0.002,0.0,0.0045,0.007272078,-0.012727922,0.0115,0.007272078,-0.012727922,0.0045,0.007272078,-0.012727922,0.0045,0.02,-0.018,0.0115,0.007272078,-0.012727922,0.0045,0.02,-0.018,0.0115,0.02,-0.018,0.0115,0.02,0.0,0.0115,0.02,-0.018,0.0115,0.007272078,-0.012727922,0.0045,0.02,0.0,0.0045,0.007272078,-0.012727922,0.0045,0.02,-0.018,0.0115,0.02,-0.018,0.0045,0.02,-0.018,0.0045,0.032727922,-0.012727922,0.0115,0.02,-0.018,0.0045,0.032727922,-0.012727922,0.0115,0.032727922,-0.012727922,0.0115,0.02,0.0,0.0115,0.032727922,-0.012727922,0.0115,0.02,-0.018,0.0045,0.02,0.0,0.0045,0.02,-0.018,0.0045,0.032727922,-0.012727922,0.0115,0.032727922,-0.012727922,0.0045,0.032727922,-0.012727922,0.0045,0.038,0.0,0.0115,0.032727922,-0.012727922,0.0045,0.038,0.0,0.0115,0.038,0.0,0.0115,0.02,0.0,0.0115,0.038,0.0,0.0115,0.032727922,-0.012727922,0.0045,0.02,0.0,0.0045,0.032727922,-0.012727922,0.0045,0.038,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#765295","opacity":1,"roughness":0.78,"metalness":0},{"name":"Rear cap","positions":[-0.028,0.038,0.0,-0.032,0.038,0.0,-0.032,0.032727922,0.012727922,-0.028,0.038,0.0,-0.032,0.032727922,0.012727922,-0.028,0.032727922,0.012727922,-0.028,0.02,0.0,-0.028,0.032727922,0.012727922,-0.028,0.038,0.0,-0.032,0.02,0.0,-0.032,0.038,0.0,-0.032,0.032727922,0.012727922,-0.028,0.032727922,0.012727922,-0.032,0.032727922,0.012727922,-0.032,0.02,0.018,-0.028,0.032727922,0.012727922,-0.032,0.02,0.018,-0.028,0.02,0.018,-0.028,0.02,0.0,-0.028,0.02,0.018,-0.028,0.032727922,0.012727922,-0.032,0.02,0.0,-0.032,0.032727922,0.012727922,-0.032,0.02,0.018,-0.028,0.02,0.018,-0.032,0.02,0.018,-0.032,0.007272078,0.012727922,-0.028,0.02,0.018,-0.032,0.007272078,0.012727922,-0.028,0.007272078,0.012727922,-0.028,0.02,0.0,-0.028,0.007272078,0.012727922,-0.028,0.02,0.018,-0.032,0.02,0.0,-0.032,0.02,0.018,-0.032,0.007272078,0.012727922,-0.028,0.007272078,0.012727922,-0.032,0.007272078,0.012727922,-0.032,0.002,0.0,-0.028,0.007272078,0.012727922,-0.032,0.002,0.0,-0.028,0.002,0.0,-0.028,0.02,0.0,-0.028,0.002,0.0,-0.028,0.007272078,0.012727922,-0.032,0.02,0.0,-0.032,0.007272078,0.012727922,-0.032,0.002,0.0,-0.028,0.002,0.0,-0.032,0.002,0.0,-0.032,0.007272078,-0.012727922,-0.028,0.002,0.0,-0.032,0.007272078,-0.012727922,-0.028,0.007272078,-0.012727922,-0.028,0.02,0.0,-0.028,0.007272078,-0.012727922,-0.028,0.002,0.0,-0.032,0.02,0.0,-0.032,0.002,0.0,-0.032,0.007272078,-0.012727922,-0.028,0.007272078,-0.012727922,-0.032,0.007272078,-0.012727922,-0.032,0.02,-0.018,-0.028,0.007272078,-0.012727922,-0.032,0.02,-0.018,-0.028,0.02,-0.018,-0.028,0.02,0.0,-0.028,0.02,-0.018,-0.028,0.007272078,-0.012727922,-0.032,0.02,0.0,-0.032,0.007272078,-0.012727922,-0.032,0.02,-0.018,-0.028,0.02,-0.018,-0.032,0.02,-0.018,-0.032,0.032727922,-0.012727922,-0.028,0.02,-0.018,-0.032,0.032727922,-0.012727922,-0.028,0.032727922,-0.012727922,-0.028,0.02,0.0,-0.028,0.032727922,-0.012727922,-0.028,0.02,-0.018,-0.032,0.02,0.0,-0.032,0.02,-0.018,-0.032,0.032727922,-0.012727922,-0.028,0.032727922,-0.012727922,-0.032,0.032727922,-0.012727922,-0.032,0.038,0.0,-0.028,0.032727922,-0.012727922,-0.032,0.038,0.0,-0.028,0.038,0.0,-0.028,0.02,0.0,-0.028,0.038,0.0,-0.028,0.032727922,-0.012727922,-0.032,0.02,0.0,-0.032,0.032727922,-0.012727922,-0.032,0.038,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#cda052","opacity":1,"roughness":0.78,"metalness":0},{"name":"Glass chamber","positions":[0.0045,0.037,0.0,-0.0285,0.037,0.0,-0.0285,0.032020815,0.012020815,0.0045,0.037,0.0,-0.0285,0.032020815,0.012020815,0.0045,0.032020815,0.012020815,0.0045,0.02,0.0,0.0045,0.032020815,0.012020815,0.0045,0.037,0.0,-0.0285,0.02,0.0,-0.0285,0.037,0.0,-0.0285,0.032020815,0.012020815,0.0045,0.032020815,0.012020815,-0.0285,0.032020815,0.012020815,-0.0285,0.02,0.017,0.0045,0.032020815,0.012020815,-0.0285,0.02,0.017,0.0045,0.02,0.017,0.0045,0.02,0.0,0.0045,0.02,0.017,0.0045,0.032020815,0.012020815,-0.0285,0.02,0.0,-0.0285,0.032020815,0.012020815,-0.0285,0.02,0.017,0.0045,0.02,0.017,-0.0285,0.02,0.017,-0.0285,0.007979185,0.012020815,0.0045,0.02,0.017,-0.0285,0.007979185,0.012020815,0.0045,0.007979185,0.012020815,0.0045,0.02,0.0,0.0045,0.007979185,0.012020815,0.0045,0.02,0.017,-0.0285,0.02,0.0,-0.0285,0.02,0.017,-0.0285,0.007979185,0.012020815,0.0045,0.007979185,0.012020815,-0.0285,0.007979185,0.012020815,-0.0285,0.003,0.0,0.0045,0.007979185,0.012020815,-0.0285,0.003,0.0,0.0045,0.003,0.0,0.0045,0.02,0.0,0.0045,0.003,0.0,0.0045,0.007979185,0.012020815,-0.0285,0.02,0.0,-0.0285,0.007979185,0.012020815,-0.0285,0.003,0.0,0.0045,0.003,0.0,-0.0285,0.003,0.0,-0.0285,0.007979185,-0.012020815,0.0045,0.003,0.0,-0.0285,0.007979185,-0.012020815,0.0045,0.007979185,-0.012020815,0.0045,0.02,0.0,0.0045,0.007979185,-0.012020815,0.0045,0.003,0.0,-0.0285,0.02,0.0,-0.0285,0.003,0.0,-0.0285,0.007979185,-0.012020815,0.0045,0.007979185,-0.012020815,-0.0285,0.007979185,-0.012020815,-0.0285,0.02,-0.017,0.0045,0.007979185,-0.012020815,-0.0285,0.02,-0.017,0.0045,0.02,-0.017,0.0045,0.02,0.0,0.0045,0.02,-0.017,0.0045,0.007979185,-0.012020815,-0.0285,0.02,0.0,-0.0285,0.007979185,-0.012020815,-0.0285,0.02,-0.017,0.0045,0.02,-0.017,-0.0285,0.02,-0.017,-0.0285,0.032020815,-0.012020815,0.0045,0.02,-0.017,-0.0285,0.032020815,-0.012020815,0.0045,0.032020815,-0.012020815,0.0045,0.02,0.0,0.0045,0.032020815,-0.012020815,0.0045,0.02,-0.017,-0.0285,0.02,0.0,-0.0285,0.02,-0.017,-0.0285,0.032020815,-0.012020815,0.0045,0.032020815,-0.012020815,-0.0285,0.032020815,-0.012020815,-0.0285,0.037,0.0,0.0045,0.032020815,-0.012020815,-0.0285,0.037,0.0,0.0045,0.037,0.0,0.0045,0.02,0.0,0.0045,0.037,0.0,0.0045,0.032020815,-0.012020815,-0.0285,0.02,0.0,-0.0285,0.032020815,-0.012020815,-0.0285,0.037,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#cfe1d0","opacity":0.24,"roughness":0.25,"metalness":0}],"9011":[{"name":"Amber drop","positions":[0.034,0.0155625,-0.000125,0.0375,0.0044375,-0.000125,0.034,0.0044375,0.003625,0.034,0.0155625,-0.000125,0.034,0.0044375,0.003625,0.0305,0.00466,0.0,0.034,0.0155625,-0.000125,0.0305,0.00466,0.0,0.034,0.00466,-0.0035,0.034,0.0155625,-0.000125,0.034,0.00466,-0.0035,0.0375,0.0044375,-0.000125,0.034,0.001,0.0,0.034,0.0044375,0.003625,0.0375,0.0044375,-0.000125,0.034,0.001,0.0,0.0305,0.00466,0.0,0.034,0.0044375,0.003625,0.034,0.001,0.0,0.034,0.00466,-0.0035,0.0305,0.00466,0.0,0.034,0.001,0.0,0.0375,0.0044375,-0.000125,0.034,0.00466,-0.0035],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"color":"#e7b444","opacity":1,"roughness":0.78,"metalness":0},{"name":"Side nozzle","positions":[0.034,0.024,0.0,0.028,0.024,0.0,0.028,0.022535534,0.003535534,0.034,0.024,0.0,0.028,0.022535534,0.003535534,0.034,0.022535534,0.003535534,0.034,0.019,0.0,0.034,0.022535534,0.003535534,0.034,0.024,0.0,0.028,0.019,0.0,0.028,0.024,0.0,0.028,0.022535534,0.003535534,0.034,0.022535534,0.003535534,0.028,0.022535534,0.003535534,0.028,0.019,0.005,0.034,0.022535534,0.003535534,0.028,0.019,0.005,0.034,0.019,0.005,0.034,0.019,0.0,0.034,0.019,0.005,0.034,0.022535534,0.003535534,0.028,0.019,0.0,0.028,0.022535534,0.003535534,0.028,0.019,0.005,0.034,0.019,0.005,0.028,0.019,0.005,0.028,0.015464466,0.003535534,0.034,0.019,0.005,0.028,0.015464466,0.003535534,0.034,0.015464466,0.003535534,0.034,0.019,0.0,0.034,0.015464466,0.003535534,0.034,0.019,0.005,0.028,0.019,0.0,0.028,0.019,0.005,0.028,0.015464466,0.003535534,0.034,0.015464466,0.003535534,0.028,0.015464466,0.003535534,0.028,0.014,0.0,0.034,0.015464466,0.003535534,0.028,0.014,0.0,0.034,0.014,0.0,0.034,0.019,0.0,0.034,0.014,0.0,0.034,0.015464466,0.003535534,0.028,0.019,0.0,0.028,0.015464466,0.003535534,0.028,0.014,0.0,0.034,0.014,0.0,0.028,0.014,0.0,0.028,0.015464466,-0.003535534,0.034,0.014,0.0,0.028,0.015464466,-0.003535534,0.034,0.015464466,-0.003535534,0.034,0.019,0.0,0.034,0.015464466,-0.003535534,0.034,0.014,0.0,0.028,0.019,0.0,0.028,0.014,0.0,0.028,0.015464466,-0.003535534,0.034,0.015464466,-0.003535534,0.028,0.015464466,-0.003535534,0.028,0.019,-0.005,0.034,0.015464466,-0.003535534,0.028,0.019,-0.005,0.034,0.019,-0.005,0.034,0.019,0.0,0.034,0.019,-0.005,0.034,0.015464466,-0.003535534,0.028,0.019,0.0,0.028,0.015464466,-0.003535534,0.028,0.019,-0.005,0.034,0.019,-0.005,0.028,0.019,-0.005,0.028,0.022535534,-0.003535534,0.034,0.019,-0.005,0.028,0.022535534,-0.003535534,0.034,0.022535534,-0.003535534,0.034,0.019,0.0,0.034,0.022535534,-0.003535534,0.034,0.019,-0.005,0.028,0.019,0.0,0.028,0.019,-0.005,0.028,0.022535534,-0.003535534,0.034,0.022535534,-0.003535534,0.028,0.022535534,-0.003535534,0.028,0.024,0.0,0.034,0.022535534,-0.003535534,0.028,0.024,0.0,0.034,0.024,0.0,0.034,0.019,0.0,0.034,0.024,0.0,0.034,0.022535534,-0.003535534,0.028,0.019,0.0,0.028,0.022535534,-0.003535534,0.028,0.024,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#e7b444","opacity":1,"roughness":0.78,"metalness":0},{"name":"Teal side cap","positions":[0.0275,0.0338125,0.0,0.0185,0.0338125,0.0,0.0185,0.029474019,0.010385631,0.0275,0.0338125,0.0,0.0185,0.029474019,0.010385631,0.0275,0.029474019,0.010385631,0.0275,0.019,0.0,0.0275,0.029474019,0.010385631,0.0275,0.0338125,0.0,0.0185,0.019,0.0,0.0185,0.0338125,0.0,0.0185,0.029474019,0.010385631,0.0275,0.029474019,0.010385631,0.0185,0.029474019,0.010385631,0.0185,0.019,0.0146875,0.0275,0.029474019,0.010385631,0.0185,0.019,0.0146875,0.0275,0.019,0.0146875,0.0275,0.019,0.0,0.0275,0.019,0.0146875,0.0275,0.029474019,0.010385631,0.0185,0.019,0.0,0.0185,0.029474019,0.010385631,0.0185,0.019,0.0146875,0.0275,0.019,0.0146875,0.0185,0.019,0.0146875,0.0185,0.008525981,0.010385631,0.0275,0.019,0.0146875,0.0185,0.008525981,0.010385631,0.0275,0.008525981,0.010385631,0.0275,0.019,0.0,0.0275,0.008525981,0.010385631,0.0275,0.019,0.0146875,0.0185,0.019,0.0,0.0185,0.019,0.0146875,0.0185,0.008525981,0.010385631,0.0275,0.008525981,0.010385631,0.0185,0.008525981,0.010385631,0.0185,0.0041875,0.0,0.0275,0.008525981,0.010385631,0.0185,0.0041875,0.0,0.0275,0.0041875,0.0,0.0275,0.019,0.0,0.0275,0.0041875,0.0,0.0275,0.008525981,0.010385631,0.0185,0.019,0.0,0.0185,0.008525981,0.010385631,0.0185,0.0041875,0.0,0.0275,0.0041875,0.0,0.0185,0.0041875,0.0,0.0185,0.008525981,-0.010385631,0.0275,0.0041875,0.0,0.0185,0.008525981,-0.010385631,0.0275,0.008525981,-0.010385631,0.0275,0.019,0.0,0.0275,0.008525981,-0.010385631,0.0275,0.0041875,0.0,0.0185,0.019,0.0,0.0185,0.0041875,0.0,0.0185,0.008525981,-0.010385631,0.0275,0.008525981,-0.010385631,0.0185,0.008525981,-0.010385631,0.0185,0.019,-0.0146875,0.0275,0.008525981,-0.010385631,0.0185,0.019,-0.0146875,0.0275,0.019,-0.0146875,0.0275,0.019,0.0,0.0275,0.019,-0.0146875,0.0275,0.008525981,-0.010385631,0.0185,0.019,0.0,0.0185,0.008525981,-0.010385631,0.0185,0.019,-0.0146875,0.0275,0.019,-0.0146875,0.0185,0.019,-0.0146875,0.0185,0.029474019,-0.010385631,0.0275,0.019,-0.0146875,0.0185,0.029474019,-0.010385631,0.0275,0.029474019,-0.010385631,0.0275,0.019,0.0,0.0275,0.029474019,-0.010385631,0.0275,0.019,-0.0146875,0.0185,0.019,0.0,0.0185,0.019,-0.0146875,0.0185,0.029474019,-0.010385631,0.0275,0.029474019,-0.010385631,0.0185,0.029474019,-0.010385631,0.0185,0.0338125,0.0,0.0275,0.029474019,-0.010385631,0.0185,0.0338125,0.0,0.0275,0.0338125,0.0,0.0275,0.019,0.0,0.0275,0.0338125,0.0,0.0275,0.029474019,-0.010385631,0.0185,0.019,0.0,0.0185,0.029474019,-0.010385631,0.0185,0.0338125,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#17515a","opacity":1,"roughness":0.78,"metalness":0},{"name":"Golden concentrate","positions":[0.017,0.004,0.0,0.015,0.022,0.0,0.008849242,0.022,0.014849242,0.017,0.004,0.0,0.008849242,0.022,0.014849242,0.010263456,0.004,0.016263456,-0.006,0.004,0.0,0.010263456,0.004,0.016263456,0.017,0.004,0.0,-0.006,0.022,0.0,0.015,0.022,0.0,0.008849242,0.022,0.014849242,0.010263456,0.004,0.016263456,0.008849242,0.022,0.014849242,-0.006,0.022,0.021,0.010263456,0.004,0.016263456,-0.006,0.022,0.021,-0.006,0.004,0.023,-0.006,0.004,0.0,-0.006,0.004,0.023,0.010263456,0.004,0.016263456,-0.006,0.022,0.0,0.008849242,0.022,0.014849242,-0.006,0.022,0.021,-0.006,0.004,0.023,-0.006,0.022,0.021,-0.020849242,0.022,0.014849242,-0.006,0.004,0.023,-0.020849242,0.022,0.014849242,-0.022263456,0.004,0.016263456,-0.006,0.004,0.0,-0.022263456,0.004,0.016263456,-0.006,0.004,0.023,-0.006,0.022,0.0,-0.006,0.022,0.021,-0.020849242,0.022,0.014849242,-0.022263456,0.004,0.016263456,-0.020849242,0.022,0.014849242,-0.027,0.022,0.0,-0.022263456,0.004,0.016263456,-0.027,0.022,0.0,-0.029,0.004,0.0,-0.006,0.004,0.0,-0.029,0.004,0.0,-0.022263456,0.004,0.016263456,-0.006,0.022,0.0,-0.020849242,0.022,0.014849242,-0.027,0.022,0.0,-0.029,0.004,0.0,-0.027,0.022,0.0,-0.020849242,0.022,-0.014849242,-0.029,0.004,0.0,-0.020849242,0.022,-0.014849242,-0.022263456,0.004,-0.016263456,-0.006,0.004,0.0,-0.022263456,0.004,-0.016263456,-0.029,0.004,0.0,-0.006,0.022,0.0,-0.027,0.022,0.0,-0.020849242,0.022,-0.014849242,-0.022263456,0.004,-0.016263456,-0.020849242,0.022,-0.014849242,-0.006,0.022,-0.021,-0.022263456,0.004,-0.016263456,-0.006,0.022,-0.021,-0.006,0.004,-0.023,-0.006,0.004,0.0,-0.006,0.004,-0.023,-0.022263456,0.004,-0.016263456,-0.006,0.022,0.0,-0.020849242,0.022,-0.014849242,-0.006,0.022,-0.021,-0.006,0.004,-0.023,-0.006,0.022,-0.021,0.008849242,0.022,-0.014849242,-0.006,0.004,-0.023,0.008849242,0.022,-0.014849242,0.010263456,0.004,-0.016263456,-0.006,0.004,0.0,0.010263456,0.004,-0.016263456,-0.006,0.004,-0.023,-0.006,0.022,0.0,-0.006,0.022,-0.021,0.008849242,0.022,-0.014849242,0.010263456,0.004,-0.016263456,0.008849242,0.022,-0.014849242,0.015,0.022,0.0,0.010263456,0.004,-0.016263456,0.015,0.022,0.0,0.017,0.004,0.0,-0.006,0.004,0.0,0.017,0.004,0.0,0.010263456,0.004,-0.016263456,-0.006,0.022,0.0,0.008849242,0.022,-0.014849242,0.015,0.022,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#d99b20","opacity":1,"roughness":0.78,"metalness":0},{"name":"Frosted glass reservoir","positions":[0.02,0.0045,0.0,0.016,0.0335,0.0,0.009556349,0.0335,0.015556349,0.02,0.0045,0.0,0.009556349,0.0335,0.015556349,0.012384777,0.0045,0.018384777,-0.006,0.0045,0.0,0.012384777,0.0045,0.018384777,0.02,0.0045,0.0,-0.006,0.0335,0.0,0.016,0.0335,0.0,0.009556349,0.0335,0.015556349,0.012384777,0.0045,0.018384777,0.009556349,0.0335,0.015556349,-0.006,0.0335,0.022,0.012384777,0.0045,0.018384777,-0.006,0.0335,0.022,-0.006,0.0045,0.026,-0.006,0.0045,0.0,-0.006,0.0045,0.026,0.012384777,0.0045,0.018384777,-0.006,0.0335,0.0,0.009556349,0.0335,0.015556349,-0.006,0.0335,0.022,-0.006,0.0045,0.026,-0.006,0.0335,0.022,-0.021556349,0.0335,0.015556349,-0.006,0.0045,0.026,-0.021556349,0.0335,0.015556349,-0.024384777,0.0045,0.018384777,-0.006,0.0045,0.0,-0.024384777,0.0045,0.018384777,-0.006,0.0045,0.026,-0.006,0.0335,0.0,-0.006,0.0335,0.022,-0.021556349,0.0335,0.015556349,-0.024384777,0.0045,0.018384777,-0.021556349,0.0335,0.015556349,-0.028,0.0335,0.0,-0.024384777,0.0045,0.018384777,-0.028,0.0335,0.0,-0.032,0.0045,0.0,-0.006,0.0045,0.0,-0.032,0.0045,0.0,-0.024384777,0.0045,0.018384777,-0.006,0.0335,0.0,-0.021556349,0.0335,0.015556349,-0.028,0.0335,0.0,-0.032,0.0045,0.0,-0.028,0.0335,0.0,-0.021556349,0.0335,-0.015556349,-0.032,0.0045,0.0,-0.021556349,0.0335,-0.015556349,-0.024384777,0.0045,-0.018384777,-0.006,0.0045,0.0,-0.024384777,0.0045,-0.018384777,-0.032,0.0045,0.0,-0.006,0.0335,0.0,-0.028,0.0335,0.0,-0.021556349,0.0335,-0.015556349,-0.024384777,0.0045,-0.018384777,-0.021556349,0.0335,-0.015556349,-0.006,0.0335,-0.022,-0.024384777,0.0045,-0.018384777,-0.006,0.0335,-0.022,-0.006,0.0045,-0.026,-0.006,0.0045,0.0,-0.006,0.0045,-0.026,-0.024384777,0.0045,-0.018384777,-0.006,0.0335,0.0,-0.021556349,0.0335,-0.015556349,-0.006,0.0335,-0.022,-0.006,0.0045,-0.026,-0.006,0.0335,-0.022,0.009556349,0.0335,-0.015556349,-0.006,0.0045,-0.026,0.009556349,0.0335,-0.015556349,0.012384777,0.0045,-0.018384777,-0.006,0.0045,0.0,0.012384777,0.0045,-0.018384777,-0.006,0.0045,-0.026,-0.006,0.0335,0.0,-0.006,0.0335,-0.022,0.009556349,0.0335,-0.015556349,0.012384777,0.0045,-0.018384777,0.009556349,0.0335,-0.015556349,0.016,0.0335,0.0,0.012384777,0.0045,-0.018384777,0.016,0.0335,0.0,0.02,0.0045,0.0,-0.006,0.0045,0.0,0.02,0.0045,0.0,0.012384777,0.0045,-0.018384777,-0.006,0.0335,0.0,0.009556349,0.0335,-0.015556349,0.016,0.0335,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#e5c67b","opacity":0.24,"roughness":0.25,"metalness":0}],"9012":[{"name":"Wafer 1 contact 1","positions":[-0.0025,0.0054,0.0046875,0.0005,0.006,0.0046875,0.0005,0.0054,0.0046875,-0.0025,0.0054,0.0046875,-0.0025,0.006,0.0046875,0.0005,0.006,0.0046875,-0.0025,0.0054,0.0076875,0.0005,0.0054,0.0076875,0.0005,0.006,0.0076875,-0.0025,0.0054,0.0076875,0.0005,0.006,0.0076875,-0.0025,0.006,0.0076875,-0.0025,0.0054,0.0046875,0.0005,0.0054,0.0046875,0.0005,0.0054,0.0076875,-0.0025,0.0054,0.0046875,0.0005,0.0054,0.0076875,-0.0025,0.0054,0.0076875,-0.0025,0.006,0.0046875,-0.0025,0.006,0.0076875,0.0005,0.006,0.0076875,-0.0025,0.006,0.0046875,0.0005,0.006,0.0076875,0.0005,0.006,0.0046875,-0.0025,0.0054,0.0046875,-0.0025,0.0054,0.0076875,-0.0025,0.006,0.0076875,-0.0025,0.0054,0.0046875,-0.0025,0.006,0.0076875,-0.0025,0.006,0.0046875,0.0005,0.0054,0.0046875,0.0005,0.006,0.0046875,0.0005,0.006,0.0076875,0.0005,0.0054,0.0046875,0.0005,0.006,0.0076875,0.0005,0.0054,0.0076875],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#f4d894","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 1 circuit 1","positions":[-0.0015,0.0054,-0.0018125,-0.0005,0.006,-0.0018125,-0.0005,0.0054,-0.0018125,-0.0015,0.0054,-0.0018125,-0.0015,0.006,-0.0018125,-0.0005,0.006,-0.0018125,-0.0015,0.0054,0.0061875,-0.0005,0.0054,0.0061875,-0.0005,0.006,0.0061875,-0.0015,0.0054,0.0061875,-0.0005,0.006,0.0061875,-0.0015,0.006,0.0061875,-0.0015,0.0054,-0.0018125,-0.0005,0.0054,-0.0018125,-0.0005,0.0054,0.0061875,-0.0015,0.0054,-0.0018125,-0.0005,0.0054,0.0061875,-0.0015,0.0054,0.0061875,-0.0015,0.006,-0.0018125,-0.0015,0.006,0.0061875,-0.0005,0.006,0.0061875,-0.0015,0.006,-0.0018125,-0.0005,0.006,0.0061875,-0.0005,0.006,-0.0018125,-0.0015,0.0054,-0.0018125,-0.0015,0.0054,0.0061875,-0.0015,0.006,0.0061875,-0.0015,0.0054,-0.0018125,-0.0015,0.006,0.0061875,-0.0015,0.006,-0.0018125,-0.0005,0.0054,-0.0018125,-0.0005,0.006,-0.0018125,-0.0005,0.006,0.0061875,-0.0005,0.0054,-0.0018125,-0.0005,0.006,0.0061875,-0.0005,0.0054,0.0061875],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d2a337","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 1 contact -1","positions":[-0.0165,0.0054,0.004875,-0.0135,0.006,0.004875,-0.0135,0.0054,0.004875,-0.0165,0.0054,0.004875,-0.0165,0.006,0.004875,-0.0135,0.006,0.004875,-0.0165,0.0054,0.007875,-0.0135,0.0054,0.007875,-0.0135,0.006,0.007875,-0.0165,0.0054,0.007875,-0.0135,0.006,0.007875,-0.0165,0.006,0.007875,-0.0165,0.0054,0.004875,-0.0135,0.0054,0.004875,-0.0135,0.0054,0.007875,-0.0165,0.0054,0.004875,-0.0135,0.0054,0.007875,-0.0165,0.0054,0.007875,-0.0165,0.006,0.004875,-0.0165,0.006,0.007875,-0.0135,0.006,0.007875,-0.0165,0.006,0.004875,-0.0135,0.006,0.007875,-0.0135,0.006,0.004875,-0.0165,0.0054,0.004875,-0.0165,0.0054,0.007875,-0.0165,0.006,0.007875,-0.0165,0.0054,0.004875,-0.0165,0.006,0.007875,-0.0165,0.006,0.004875,-0.0135,0.0054,0.004875,-0.0135,0.006,0.004875,-0.0135,0.006,0.007875,-0.0135,0.0054,0.004875,-0.0135,0.006,0.007875,-0.0135,0.0054,0.007875],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#f4d894","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 1 circuit -1","positions":[-0.0155,0.0054,-0.001625,-0.0145,0.006,-0.001625,-0.0145,0.0054,-0.001625,-0.0155,0.0054,-0.001625,-0.0155,0.006,-0.001625,-0.0145,0.006,-0.001625,-0.0155,0.0054,0.006375,-0.0145,0.0054,0.006375,-0.0145,0.006,0.006375,-0.0155,0.0054,0.006375,-0.0145,0.006,0.006375,-0.0155,0.006,0.006375,-0.0155,0.0054,-0.001625,-0.0145,0.0054,-0.001625,-0.0145,0.0054,0.006375,-0.0155,0.0054,-0.001625,-0.0145,0.0054,0.006375,-0.0155,0.0054,0.006375,-0.0155,0.006,-0.001625,-0.0155,0.006,0.006375,-0.0145,0.006,0.006375,-0.0155,0.006,-0.001625,-0.0145,0.006,0.006375,-0.0145,0.006,-0.001625,-0.0155,0.0054,-0.001625,-0.0155,0.0054,0.006375,-0.0155,0.006,0.006375,-0.0155,0.0054,-0.001625,-0.0155,0.006,0.006375,-0.0155,0.006,-0.001625,-0.0145,0.0054,-0.001625,-0.0145,0.006,-0.001625,-0.0145,0.006,0.006375,-0.0145,0.0054,-0.001625,-0.0145,0.006,0.006375,-0.0145,0.0054,0.006375],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d2a337","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 1 horizontal cross","positions":[-0.0215,0.0054,-0.013,0.0055,0.006,-0.013,0.0055,0.0054,-0.013,-0.0215,0.0054,-0.013,-0.0215,0.006,-0.013,0.0055,0.006,-0.013,-0.0215,0.0054,-0.011,0.0055,0.0054,-0.011,0.0055,0.006,-0.011,-0.0215,0.0054,-0.011,0.0055,0.006,-0.011,-0.0215,0.006,-0.011,-0.0215,0.0054,-0.013,0.0055,0.0054,-0.013,0.0055,0.0054,-0.011,-0.0215,0.0054,-0.013,0.0055,0.0054,-0.011,-0.0215,0.0054,-0.011,-0.0215,0.006,-0.013,-0.0215,0.006,-0.011,0.0055,0.006,-0.011,-0.0215,0.006,-0.013,0.0055,0.006,-0.011,0.0055,0.006,-0.013,-0.0215,0.0054,-0.013,-0.0215,0.0054,-0.011,-0.0215,0.006,-0.011,-0.0215,0.0054,-0.013,-0.0215,0.006,-0.011,-0.0215,0.006,-0.013,0.0055,0.0054,-0.013,0.0055,0.006,-0.013,0.0055,0.006,-0.011,0.0055,0.0054,-0.013,0.0055,0.006,-0.011,0.0055,0.0054,-0.011],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d2a337","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 1 vertical cross","positions":[-0.009,0.0054,-0.0235,-0.007,0.006,-0.0235,-0.007,0.0054,-0.0235,-0.009,0.0054,-0.0235,-0.009,0.006,-0.0235,-0.007,0.006,-0.0235,-0.009,0.0054,0.0115,-0.007,0.0054,0.0115,-0.007,0.006,0.0115,-0.009,0.0054,0.0115,-0.007,0.006,0.0115,-0.009,0.006,0.0115,-0.009,0.0054,-0.0235,-0.007,0.0054,-0.0235,-0.007,0.0054,0.0115,-0.009,0.0054,-0.0235,-0.007,0.0054,0.0115,-0.009,0.0054,0.0115,-0.009,0.006,-0.0235,-0.009,0.006,0.0115,-0.007,0.006,0.0115,-0.009,0.006,-0.0235,-0.007,0.006,0.0115,-0.007,0.006,-0.0235,-0.009,0.0054,-0.0235,-0.009,0.0054,0.0115,-0.009,0.006,0.0115,-0.009,0.0054,-0.0235,-0.009,0.006,0.0115,-0.009,0.006,-0.0235,-0.007,0.0054,-0.0235,-0.007,0.006,-0.0235,-0.007,0.006,0.0115,-0.007,0.0054,-0.0235,-0.007,0.006,0.0115,-0.007,0.0054,0.0115],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d2a337","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 1 face","positions":[-0.021,0.00505,-0.0235,0.005,0.00555,-0.0235,0.005,0.00505,-0.0235,-0.021,0.00505,-0.0235,-0.021,0.00555,-0.0235,0.005,0.00555,-0.0235,-0.021,0.00505,0.0115,0.005,0.00505,0.0115,0.005,0.00555,0.0115,-0.021,0.00505,0.0115,0.005,0.00555,0.0115,-0.021,0.00555,0.0115,-0.021,0.00505,-0.0235,0.005,0.00505,-0.0235,0.005,0.00505,0.0115,-0.021,0.00505,-0.0235,0.005,0.00505,0.0115,-0.021,0.00505,0.0115,-0.021,0.00555,-0.0235,-0.021,0.00555,0.0115,0.005,0.00555,0.0115,-0.021,0.00555,-0.0235,0.005,0.00555,0.0115,0.005,0.00555,-0.0235,-0.021,0.00505,-0.0235,-0.021,0.00505,0.0115,-0.021,0.00555,0.0115,-0.021,0.00505,-0.0235,-0.021,0.00555,0.0115,-0.021,0.00555,-0.0235,0.005,0.00505,-0.0235,0.005,0.00555,-0.0235,0.005,0.00555,0.0115,0.005,0.00505,-0.0235,0.005,0.00555,0.0115,0.005,0.00505,0.0115],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#675080","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 1 base","positions":[-0.023,0.003,-0.0255,0.007,0.005,-0.0255,0.007,0.003,-0.0255,-0.023,0.003,-0.0255,-0.023,0.005,-0.0255,0.007,0.005,-0.0255,-0.023,0.003,0.0135,0.007,0.003,0.0135,0.007,0.005,0.0135,-0.023,0.003,0.0135,0.007,0.005,0.0135,-0.023,0.005,0.0135,-0.023,0.003,-0.0255,0.007,0.003,-0.0255,0.007,0.003,0.0135,-0.023,0.003,-0.0255,0.007,0.003,0.0135,-0.023,0.003,0.0135,-0.023,0.005,-0.0255,-0.023,0.005,0.0135,0.007,0.005,0.0135,-0.023,0.005,-0.0255,0.007,0.005,0.0135,0.007,0.005,-0.0255,-0.023,0.003,-0.0255,-0.023,0.003,0.0135,-0.023,0.005,0.0135,-0.023,0.003,-0.0255,-0.023,0.005,0.0135,-0.023,0.005,-0.0255,0.007,0.003,-0.0255,0.007,0.005,-0.0255,0.007,0.005,0.0135,0.007,0.003,-0.0255,0.007,0.005,0.0135,0.007,0.003,0.0135],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 2 contact 1","positions":[0.0145,0.0110875,0.016625,0.0175,0.0116875,0.016625,0.0175,0.0110875,0.016625,0.0145,0.0110875,0.016625,0.0145,0.0116875,0.016625,0.0175,0.0116875,0.016625,0.0145,0.0110875,0.019625,0.0175,0.0110875,0.019625,0.0175,0.0116875,0.019625,0.0145,0.0110875,0.019625,0.0175,0.0116875,0.019625,0.0145,0.0116875,0.019625,0.0145,0.0110875,0.016625,0.0175,0.0110875,0.016625,0.0175,0.0110875,0.019625,0.0145,0.0110875,0.016625,0.0175,0.0110875,0.019625,0.0145,0.0110875,0.019625,0.0145,0.0116875,0.016625,0.0145,0.0116875,0.019625,0.0175,0.0116875,0.019625,0.0145,0.0116875,0.016625,0.0175,0.0116875,0.019625,0.0175,0.0116875,0.016625,0.0145,0.0110875,0.016625,0.0145,0.0110875,0.019625,0.0145,0.0116875,0.019625,0.0145,0.0110875,0.016625,0.0145,0.0116875,0.019625,0.0145,0.0116875,0.016625,0.0175,0.0110875,0.016625,0.0175,0.0116875,0.016625,0.0175,0.0116875,0.019625,0.0175,0.0110875,0.016625,0.0175,0.0116875,0.019625,0.0175,0.0110875,0.019625],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#f4d894","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 2 circuit 1","positions":[0.0155,0.0110875,0.010125,0.0165,0.0116875,0.010125,0.0165,0.0110875,0.010125,0.0155,0.0110875,0.010125,0.0155,0.0116875,0.010125,0.0165,0.0116875,0.010125,0.0155,0.0110875,0.018125,0.0165,0.0110875,0.018125,0.0165,0.0116875,0.018125,0.0155,0.0110875,0.018125,0.0165,0.0116875,0.018125,0.0155,0.0116875,0.018125,0.0155,0.0110875,0.010125,0.0165,0.0110875,0.010125,0.0165,0.0110875,0.018125,0.0155,0.0110875,0.010125,0.0165,0.0110875,0.018125,0.0155,0.0110875,0.018125,0.0155,0.0116875,0.010125,0.0155,0.0116875,0.018125,0.0165,0.0116875,0.018125,0.0155,0.0116875,0.010125,0.0165,0.0116875,0.018125,0.0165,0.0116875,0.010125,0.0155,0.0110875,0.010125,0.0155,0.0110875,0.018125,0.0155,0.0116875,0.018125,0.0155,0.0110875,0.010125,0.0155,0.0116875,0.018125,0.0155,0.0116875,0.010125,0.0165,0.0110875,0.010125,0.0165,0.0116875,0.010125,0.0165,0.0116875,0.018125,0.0165,0.0110875,0.010125,0.0165,0.0116875,0.018125,0.0165,0.0110875,0.018125],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d2a337","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 2 contact -1","positions":[0.0005,0.0110875,0.017125,0.0035,0.0116875,0.017125,0.0035,0.0110875,0.017125,0.0005,0.0110875,0.017125,0.0005,0.0116875,0.017125,0.0035,0.0116875,0.017125,0.0005,0.0110875,0.020125,0.0035,0.0110875,0.020125,0.0035,0.0116875,0.020125,0.0005,0.0110875,0.020125,0.0035,0.0116875,0.020125,0.0005,0.0116875,0.020125,0.0005,0.0110875,0.017125,0.0035,0.0110875,0.017125,0.0035,0.0110875,0.020125,0.0005,0.0110875,0.017125,0.0035,0.0110875,0.020125,0.0005,0.0110875,0.020125,0.0005,0.0116875,0.017125,0.0005,0.0116875,0.020125,0.0035,0.0116875,0.020125,0.0005,0.0116875,0.017125,0.0035,0.0116875,0.020125,0.0035,0.0116875,0.017125,0.0005,0.0110875,0.017125,0.0005,0.0110875,0.020125,0.0005,0.0116875,0.020125,0.0005,0.0110875,0.017125,0.0005,0.0116875,0.020125,0.0005,0.0116875,0.017125,0.0035,0.0110875,0.017125,0.0035,0.0116875,0.017125,0.0035,0.0116875,0.020125,0.0035,0.0110875,0.017125,0.0035,0.0116875,0.020125,0.0035,0.0110875,0.020125],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#f4d894","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 2 circuit -1","positions":[0.0015,0.0110875,0.010625,0.0025,0.0116875,0.010625,0.0025,0.0110875,0.010625,0.0015,0.0110875,0.010625,0.0015,0.0116875,0.010625,0.0025,0.0116875,0.010625,0.0015,0.0110875,0.018625,0.0025,0.0110875,0.018625,0.0025,0.0116875,0.018625,0.0015,0.0110875,0.018625,0.0025,0.0116875,0.018625,0.0015,0.0116875,0.018625,0.0015,0.0110875,0.010625,0.0025,0.0110875,0.010625,0.0025,0.0110875,0.018625,0.0015,0.0110875,0.010625,0.0025,0.0110875,0.018625,0.0015,0.0110875,0.018625,0.0015,0.0116875,0.010625,0.0015,0.0116875,0.018625,0.0025,0.0116875,0.018625,0.0015,0.0116875,0.010625,0.0025,0.0116875,0.018625,0.0025,0.0116875,0.010625,0.0015,0.0110875,0.010625,0.0015,0.0110875,0.018625,0.0015,0.0116875,0.018625,0.0015,0.0110875,0.010625,0.0015,0.0116875,0.018625,0.0015,0.0116875,0.010625,0.0025,0.0110875,0.010625,0.0025,0.0116875,0.010625,0.0025,0.0116875,0.018625,0.0025,0.0110875,0.010625,0.0025,0.0116875,0.018625,0.0025,0.0110875,0.018625],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d2a337","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 2 horizontal cross","positions":[-0.0045,0.0110875,-0.001,0.0225,0.0116875,-0.001,0.0225,0.0110875,-0.001,-0.0045,0.0110875,-0.001,-0.0045,0.0116875,-0.001,0.0225,0.0116875,-0.001,-0.0045,0.0110875,0.001,0.0225,0.0110875,0.001,0.0225,0.0116875,0.001,-0.0045,0.0110875,0.001,0.0225,0.0116875,0.001,-0.0045,0.0116875,0.001,-0.0045,0.0110875,-0.001,0.0225,0.0110875,-0.001,0.0225,0.0110875,0.001,-0.0045,0.0110875,-0.001,0.0225,0.0110875,0.001,-0.0045,0.0110875,0.001,-0.0045,0.0116875,-0.001,-0.0045,0.0116875,0.001,0.0225,0.0116875,0.001,-0.0045,0.0116875,-0.001,0.0225,0.0116875,0.001,0.0225,0.0116875,-0.001,-0.0045,0.0110875,-0.001,-0.0045,0.0110875,0.001,-0.0045,0.0116875,0.001,-0.0045,0.0110875,-0.001,-0.0045,0.0116875,0.001,-0.0045,0.0116875,-0.001,0.0225,0.0110875,-0.001,0.0225,0.0116875,-0.001,0.0225,0.0116875,0.001,0.0225,0.0110875,-0.001,0.0225,0.0116875,0.001,0.0225,0.0110875,0.001],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d2a337","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 2 vertical cross","positions":[0.008,0.0110875,-0.0115,0.01,0.0116875,-0.0115,0.01,0.0110875,-0.0115,0.008,0.0110875,-0.0115,0.008,0.0116875,-0.0115,0.01,0.0116875,-0.0115,0.008,0.0110875,0.0235,0.01,0.0110875,0.0235,0.01,0.0116875,0.0235,0.008,0.0110875,0.0235,0.01,0.0116875,0.0235,0.008,0.0116875,0.0235,0.008,0.0110875,-0.0115,0.01,0.0110875,-0.0115,0.01,0.0110875,0.0235,0.008,0.0110875,-0.0115,0.01,0.0110875,0.0235,0.008,0.0110875,0.0235,0.008,0.0116875,-0.0115,0.008,0.0116875,0.0235,0.01,0.0116875,0.0235,0.008,0.0116875,-0.0115,0.01,0.0116875,0.0235,0.01,0.0116875,-0.0115,0.008,0.0110875,-0.0115,0.008,0.0110875,0.0235,0.008,0.0116875,0.0235,0.008,0.0110875,-0.0115,0.008,0.0116875,0.0235,0.008,0.0116875,-0.0115,0.01,0.0110875,-0.0115,0.01,0.0116875,-0.0115,0.01,0.0116875,0.0235,0.01,0.0110875,-0.0115,0.01,0.0116875,0.0235,0.01,0.0110875,0.0235],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d2a337","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 2 face","positions":[-0.004,0.0107375,-0.0115,0.022,0.0112375,-0.0115,0.022,0.0107375,-0.0115,-0.004,0.0107375,-0.0115,-0.004,0.0112375,-0.0115,0.022,0.0112375,-0.0115,-0.004,0.0107375,0.0235,0.022,0.0107375,0.0235,0.022,0.0112375,0.0235,-0.004,0.0107375,0.0235,0.022,0.0112375,0.0235,-0.004,0.0112375,0.0235,-0.004,0.0107375,-0.0115,0.022,0.0107375,-0.0115,0.022,0.0107375,0.0235,-0.004,0.0107375,-0.0115,0.022,0.0107375,0.0235,-0.004,0.0107375,0.0235,-0.004,0.0112375,-0.0115,-0.004,0.0112375,0.0235,0.022,0.0112375,0.0235,-0.004,0.0112375,-0.0115,0.022,0.0112375,0.0235,0.022,0.0112375,-0.0115,-0.004,0.0107375,-0.0115,-0.004,0.0107375,0.0235,-0.004,0.0112375,0.0235,-0.004,0.0107375,-0.0115,-0.004,0.0112375,0.0235,-0.004,0.0112375,-0.0115,0.022,0.0107375,-0.0115,0.022,0.0112375,-0.0115,0.022,0.0112375,0.0235,0.022,0.0107375,-0.0115,0.022,0.0112375,0.0235,0.022,0.0107375,0.0235],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#675080","opacity":1,"roughness":0.78,"metalness":0},{"name":"Wafer 2 base","positions":[-0.006,0.0086875,-0.0135,0.024,0.0106875,-0.0135,0.024,0.0086875,-0.0135,-0.006,0.0086875,-0.0135,-0.006,0.0106875,-0.0135,0.024,0.0106875,-0.0135,-0.006,0.0086875,0.0255,0.024,0.0086875,0.0255,0.024,0.0106875,0.0255,-0.006,0.0086875,0.0255,0.024,0.0106875,0.0255,-0.006,0.0106875,0.0255,-0.006,0.0086875,-0.0135,0.024,0.0086875,-0.0135,0.024,0.0086875,0.0255,-0.006,0.0086875,-0.0135,0.024,0.0086875,0.0255,-0.006,0.0086875,0.0255,-0.006,0.0106875,-0.0135,-0.006,0.0106875,0.0255,0.024,0.0106875,0.0255,-0.006,0.0106875,-0.0135,0.024,0.0106875,0.0255,0.024,0.0106875,-0.0135,-0.006,0.0086875,-0.0135,-0.006,0.0086875,0.0255,-0.006,0.0106875,0.0255,-0.006,0.0086875,-0.0135,-0.006,0.0106875,0.0255,-0.006,0.0106875,-0.0135,0.024,0.0086875,-0.0135,0.024,0.0106875,-0.0135,0.024,0.0106875,0.0255,0.024,0.0086875,-0.0135,0.024,0.0106875,0.0255,0.024,0.0086875,0.0255],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0}],"9013":[{"name":"Sugar pearl 5","positions":[0.011422807,0.020551952,0.002,0.010448048,0.018,0.003577193,0.013,0.019577193,0.004551952,0.011422807,0.020551952,0.002,0.013,0.019577193,0.004551952,0.014577193,0.020551952,0.002,0.011422807,0.020551952,0.002,0.014577193,0.020551952,0.002,0.013,0.019577193,-0.000551952,0.011422807,0.020551952,0.002,0.013,0.019577193,-0.000551952,0.010448048,0.018,0.000422807,0.011422807,0.020551952,0.002,0.010448048,0.018,0.000422807,0.010448048,0.018,0.003577193,0.014577193,0.020551952,0.002,0.013,0.019577193,0.004551952,0.015551952,0.018,0.003577193,0.013,0.019577193,0.004551952,0.010448048,0.018,0.003577193,0.013,0.016422807,0.004551952,0.010448048,0.018,0.003577193,0.010448048,0.018,0.000422807,0.011422807,0.015448048,0.002,0.010448048,0.018,0.000422807,0.013,0.019577193,-0.000551952,0.013,0.016422807,-0.000551952,0.013,0.019577193,-0.000551952,0.014577193,0.020551952,0.002,0.015551952,0.018,0.000422807,0.014577193,0.015448048,0.002,0.015551952,0.018,0.003577193,0.013,0.016422807,0.004551952,0.014577193,0.015448048,0.002,0.013,0.016422807,0.004551952,0.011422807,0.015448048,0.002,0.014577193,0.015448048,0.002,0.011422807,0.015448048,0.002,0.013,0.016422807,-0.000551952,0.014577193,0.015448048,0.002,0.013,0.016422807,-0.000551952,0.015551952,0.018,0.000422807,0.014577193,0.015448048,0.002,0.015551952,0.018,0.000422807,0.015551952,0.018,0.003577193,0.013,0.016422807,0.004551952,0.015551952,0.018,0.003577193,0.013,0.019577193,0.004551952,0.011422807,0.015448048,0.002,0.013,0.016422807,0.004551952,0.010448048,0.018,0.003577193,0.013,0.016422807,-0.000551952,0.011422807,0.015448048,0.002,0.010448048,0.018,0.000422807,0.015551952,0.018,0.000422807,0.013,0.016422807,-0.000551952,0.013,0.019577193,-0.000551952,0.015551952,0.018,0.003577193,0.015551952,0.018,0.000422807,0.014577193,0.020551952,0.002],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Sugar pearl 4","positions":[0.001422807,0.020551952,0.002,0.000448048,0.018,0.003577193,0.003,0.019577193,0.004551952,0.001422807,0.020551952,0.002,0.003,0.019577193,0.004551952,0.004577193,0.020551952,0.002,0.001422807,0.020551952,0.002,0.004577193,0.020551952,0.002,0.003,0.019577193,-0.000551952,0.001422807,0.020551952,0.002,0.003,0.019577193,-0.000551952,0.000448048,0.018,0.000422807,0.001422807,0.020551952,0.002,0.000448048,0.018,0.000422807,0.000448048,0.018,0.003577193,0.004577193,0.020551952,0.002,0.003,0.019577193,0.004551952,0.005551952,0.018,0.003577193,0.003,0.019577193,0.004551952,0.000448048,0.018,0.003577193,0.003,0.016422807,0.004551952,0.000448048,0.018,0.003577193,0.000448048,0.018,0.000422807,0.001422807,0.015448048,0.002,0.000448048,0.018,0.000422807,0.003,0.019577193,-0.000551952,0.003,0.016422807,-0.000551952,0.003,0.019577193,-0.000551952,0.004577193,0.020551952,0.002,0.005551952,0.018,0.000422807,0.004577193,0.015448048,0.002,0.005551952,0.018,0.003577193,0.003,0.016422807,0.004551952,0.004577193,0.015448048,0.002,0.003,0.016422807,0.004551952,0.001422807,0.015448048,0.002,0.004577193,0.015448048,0.002,0.001422807,0.015448048,0.002,0.003,0.016422807,-0.000551952,0.004577193,0.015448048,0.002,0.003,0.016422807,-0.000551952,0.005551952,0.018,0.000422807,0.004577193,0.015448048,0.002,0.005551952,0.018,0.000422807,0.005551952,0.018,0.003577193,0.003,0.016422807,0.004551952,0.005551952,0.018,0.003577193,0.003,0.019577193,0.004551952,0.001422807,0.015448048,0.002,0.003,0.016422807,0.004551952,0.000448048,0.018,0.003577193,0.003,0.016422807,-0.000551952,0.001422807,0.015448048,0.002,0.000448048,0.018,0.000422807,0.005551952,0.018,0.000422807,0.003,0.016422807,-0.000551952,0.003,0.019577193,-0.000551952,0.005551952,0.018,0.003577193,0.005551952,0.018,0.000422807,0.004577193,0.020551952,0.002],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Sugar pearl 3","positions":[0.021422807,0.011551952,0.002,0.020448048,0.009,0.003577193,0.023,0.010577193,0.004551952,0.021422807,0.011551952,0.002,0.023,0.010577193,0.004551952,0.024577193,0.011551952,0.002,0.021422807,0.011551952,0.002,0.024577193,0.011551952,0.002,0.023,0.010577193,-0.000551952,0.021422807,0.011551952,0.002,0.023,0.010577193,-0.000551952,0.020448048,0.009,0.000422807,0.021422807,0.011551952,0.002,0.020448048,0.009,0.000422807,0.020448048,0.009,0.003577193,0.024577193,0.011551952,0.002,0.023,0.010577193,0.004551952,0.025551952,0.009,0.003577193,0.023,0.010577193,0.004551952,0.020448048,0.009,0.003577193,0.023,0.007422807,0.004551952,0.020448048,0.009,0.003577193,0.020448048,0.009,0.000422807,0.021422807,0.006448048,0.002,0.020448048,0.009,0.000422807,0.023,0.010577193,-0.000551952,0.023,0.007422807,-0.000551952,0.023,0.010577193,-0.000551952,0.024577193,0.011551952,0.002,0.025551952,0.009,0.000422807,0.024577193,0.006448048,0.002,0.025551952,0.009,0.003577193,0.023,0.007422807,0.004551952,0.024577193,0.006448048,0.002,0.023,0.007422807,0.004551952,0.021422807,0.006448048,0.002,0.024577193,0.006448048,0.002,0.021422807,0.006448048,0.002,0.023,0.007422807,-0.000551952,0.024577193,0.006448048,0.002,0.023,0.007422807,-0.000551952,0.025551952,0.009,0.000422807,0.024577193,0.006448048,0.002,0.025551952,0.009,0.000422807,0.025551952,0.009,0.003577193,0.023,0.007422807,0.004551952,0.025551952,0.009,0.003577193,0.023,0.010577193,0.004551952,0.021422807,0.006448048,0.002,0.023,0.007422807,0.004551952,0.020448048,0.009,0.003577193,0.023,0.007422807,-0.000551952,0.021422807,0.006448048,0.002,0.020448048,0.009,0.000422807,0.025551952,0.009,0.000422807,0.023,0.007422807,-0.000551952,0.023,0.010577193,-0.000551952,0.025551952,0.009,0.003577193,0.025551952,0.009,0.000422807,0.024577193,0.011551952,0.002],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Sugar pearl 2","positions":[0.011422807,0.011551952,0.002,0.010448048,0.009,0.003577193,0.013,0.010577193,0.004551952,0.011422807,0.011551952,0.002,0.013,0.010577193,0.004551952,0.014577193,0.011551952,0.002,0.011422807,0.011551952,0.002,0.014577193,0.011551952,0.002,0.013,0.010577193,-0.000551952,0.011422807,0.011551952,0.002,0.013,0.010577193,-0.000551952,0.010448048,0.009,0.000422807,0.011422807,0.011551952,0.002,0.010448048,0.009,0.000422807,0.010448048,0.009,0.003577193,0.014577193,0.011551952,0.002,0.013,0.010577193,0.004551952,0.015551952,0.009,0.003577193,0.013,0.010577193,0.004551952,0.010448048,0.009,0.003577193,0.013,0.007422807,0.004551952,0.010448048,0.009,0.003577193,0.010448048,0.009,0.000422807,0.011422807,0.006448048,0.002,0.010448048,0.009,0.000422807,0.013,0.010577193,-0.000551952,0.013,0.007422807,-0.000551952,0.013,0.010577193,-0.000551952,0.014577193,0.011551952,0.002,0.015551952,0.009,0.000422807,0.014577193,0.006448048,0.002,0.015551952,0.009,0.003577193,0.013,0.007422807,0.004551952,0.014577193,0.006448048,0.002,0.013,0.007422807,0.004551952,0.011422807,0.006448048,0.002,0.014577193,0.006448048,0.002,0.011422807,0.006448048,0.002,0.013,0.007422807,-0.000551952,0.014577193,0.006448048,0.002,0.013,0.007422807,-0.000551952,0.015551952,0.009,0.000422807,0.014577193,0.006448048,0.002,0.015551952,0.009,0.000422807,0.015551952,0.009,0.003577193,0.013,0.007422807,0.004551952,0.015551952,0.009,0.003577193,0.013,0.010577193,0.004551952,0.011422807,0.006448048,0.002,0.013,0.007422807,0.004551952,0.010448048,0.009,0.003577193,0.013,0.007422807,-0.000551952,0.011422807,0.006448048,0.002,0.010448048,0.009,0.000422807,0.015551952,0.009,0.000422807,0.013,0.007422807,-0.000551952,0.013,0.010577193,-0.000551952,0.015551952,0.009,0.003577193,0.015551952,0.009,0.000422807,0.014577193,0.011551952,0.002],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Sugar pearl 1","positions":[0.001422807,0.011551952,0.002,0.000448048,0.009,0.003577193,0.003,0.010577193,0.004551952,0.001422807,0.011551952,0.002,0.003,0.010577193,0.004551952,0.004577193,0.011551952,0.002,0.001422807,0.011551952,0.002,0.004577193,0.011551952,0.002,0.003,0.010577193,-0.000551952,0.001422807,0.011551952,0.002,0.003,0.010577193,-0.000551952,0.000448048,0.009,0.000422807,0.001422807,0.011551952,0.002,0.000448048,0.009,0.000422807,0.000448048,0.009,0.003577193,0.004577193,0.011551952,0.002,0.003,0.010577193,0.004551952,0.005551952,0.009,0.003577193,0.003,0.010577193,0.004551952,0.000448048,0.009,0.003577193,0.003,0.007422807,0.004551952,0.000448048,0.009,0.003577193,0.000448048,0.009,0.000422807,0.001422807,0.006448048,0.002,0.000448048,0.009,0.000422807,0.003,0.010577193,-0.000551952,0.003,0.007422807,-0.000551952,0.003,0.010577193,-0.000551952,0.004577193,0.011551952,0.002,0.005551952,0.009,0.000422807,0.004577193,0.006448048,0.002,0.005551952,0.009,0.003577193,0.003,0.007422807,0.004551952,0.004577193,0.006448048,0.002,0.003,0.007422807,0.004551952,0.001422807,0.006448048,0.002,0.004577193,0.006448048,0.002,0.001422807,0.006448048,0.002,0.003,0.007422807,-0.000551952,0.004577193,0.006448048,0.002,0.003,0.007422807,-0.000551952,0.005551952,0.009,0.000422807,0.004577193,0.006448048,0.002,0.005551952,0.009,0.000422807,0.005551952,0.009,0.003577193,0.003,0.007422807,0.004551952,0.005551952,0.009,0.003577193,0.003,0.010577193,0.004551952,0.001422807,0.006448048,0.002,0.003,0.007422807,0.004551952,0.000448048,0.009,0.003577193,0.003,0.007422807,-0.000551952,0.001422807,0.006448048,0.002,0.000448048,0.009,0.000422807,0.005551952,0.009,0.000422807,0.003,0.007422807,-0.000551952,0.003,0.010577193,-0.000551952,0.005551952,0.009,0.003577193,0.005551952,0.009,0.000422807,0.004577193,0.011551952,0.002],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Jelly cube 3","positions":[0.018700915,0.009433218,-0.0025,0.025299085,0.021941782,-0.0025,0.028254282,0.012388415,-0.0025,0.018700915,0.009433218,-0.0025,0.015745718,0.018986585,-0.0025,0.025299085,0.021941782,-0.0025,0.018700915,0.009433218,0.0025,0.028254282,0.012388415,0.0025,0.025299085,0.021941782,0.0025,0.018700915,0.009433218,0.0025,0.025299085,0.021941782,0.0025,0.015745718,0.018986585,0.0025,0.018700915,0.009433218,-0.0025,0.028254282,0.012388415,-0.0025,0.028254282,0.012388415,0.0025,0.018700915,0.009433218,-0.0025,0.028254282,0.012388415,0.0025,0.018700915,0.009433218,0.0025,0.015745718,0.018986585,-0.0025,0.015745718,0.018986585,0.0025,0.025299085,0.021941782,0.0025,0.015745718,0.018986585,-0.0025,0.025299085,0.021941782,0.0025,0.025299085,0.021941782,-0.0025,0.018700915,0.009433218,-0.0025,0.018700915,0.009433218,0.0025,0.015745718,0.018986585,0.0025,0.018700915,0.009433218,-0.0025,0.015745718,0.018986585,0.0025,0.015745718,0.018986585,-0.0025,0.028254282,0.012388415,-0.0025,0.025299085,0.021941782,-0.0025,0.025299085,0.021941782,0.0025,0.028254282,0.012388415,-0.0025,0.025299085,0.021941782,0.0025,0.028254282,0.012388415,0.0025],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#8b245b","opacity":1,"roughness":0.78,"metalness":0},{"name":"Jelly cube 2","positions":[0.018700915,0.023745718,-0.0025,0.025299085,0.036254282,-0.0025,0.028254282,0.026700915,-0.0025,0.018700915,0.023745718,-0.0025,0.015745718,0.033299085,-0.0025,0.025299085,0.036254282,-0.0025,0.018700915,0.023745718,0.0025,0.028254282,0.026700915,0.0025,0.025299085,0.036254282,0.0025,0.018700915,0.023745718,0.0025,0.025299085,0.036254282,0.0025,0.015745718,0.033299085,0.0025,0.018700915,0.023745718,-0.0025,0.028254282,0.026700915,-0.0025,0.028254282,0.026700915,0.0025,0.018700915,0.023745718,-0.0025,0.028254282,0.026700915,0.0025,0.018700915,0.023745718,0.0025,0.015745718,0.033299085,-0.0025,0.015745718,0.033299085,0.0025,0.025299085,0.036254282,0.0025,0.015745718,0.033299085,-0.0025,0.025299085,0.036254282,0.0025,0.025299085,0.036254282,-0.0025,0.018700915,0.023745718,-0.0025,0.018700915,0.023745718,0.0025,0.015745718,0.033299085,0.0025,0.018700915,0.023745718,-0.0025,0.015745718,0.033299085,0.0025,0.015745718,0.033299085,-0.0025,0.028254282,0.026700915,-0.0025,0.025299085,0.036254282,-0.0025,0.025299085,0.036254282,0.0025,0.028254282,0.026700915,-0.0025,0.025299085,0.036254282,0.0025,0.028254282,0.026700915,0.0025],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#8b245b","opacity":1,"roughness":0.78,"metalness":0},{"name":"Jelly cube 1","positions":[0.001700915,0.023745718,-0.0025,0.008299085,0.036254282,-0.0025,0.011254282,0.026700915,-0.0025,0.001700915,0.023745718,-0.0025,-0.001254282,0.033299085,-0.0025,0.008299085,0.036254282,-0.0025,0.001700915,0.023745718,0.0025,0.011254282,0.026700915,0.0025,0.008299085,0.036254282,0.0025,0.001700915,0.023745718,0.0025,0.008299085,0.036254282,0.0025,-0.001254282,0.033299085,0.0025,0.001700915,0.023745718,-0.0025,0.011254282,0.026700915,-0.0025,0.011254282,0.026700915,0.0025,0.001700915,0.023745718,-0.0025,0.011254282,0.026700915,0.0025,0.001700915,0.023745718,0.0025,-0.001254282,0.033299085,-0.0025,-0.001254282,0.033299085,0.0025,0.008299085,0.036254282,0.0025,-0.001254282,0.033299085,-0.0025,0.008299085,0.036254282,0.0025,0.008299085,0.036254282,-0.0025,0.001700915,0.023745718,-0.0025,0.001700915,0.023745718,0.0025,-0.001254282,0.033299085,0.0025,0.001700915,0.023745718,-0.0025,-0.001254282,0.033299085,0.0025,-0.001254282,0.033299085,-0.0025,0.011254282,0.026700915,-0.0025,0.008299085,0.036254282,-0.0025,0.008299085,0.036254282,0.0025,0.011254282,0.026700915,-0.0025,0.008299085,0.036254282,0.0025,0.011254282,0.026700915,0.0025],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#8b245b","opacity":1,"roughness":0.78,"metalness":0},{"name":"Case lid","positions":[-0.003,0.045,-0.005,0.031,0.049,-0.005,0.031,0.045,-0.005,-0.003,0.045,-0.005,-0.003,0.049,-0.005,0.031,0.049,-0.005,-0.003,0.045,0.005,0.031,0.045,0.005,0.031,0.049,0.005,-0.003,0.045,0.005,0.031,0.049,0.005,-0.003,0.049,0.005,-0.003,0.045,-0.005,0.031,0.045,-0.005,0.031,0.045,0.005,-0.003,0.045,-0.005,0.031,0.045,0.005,-0.003,0.045,0.005,-0.003,0.049,-0.005,-0.003,0.049,0.005,0.031,0.049,0.005,-0.003,0.049,-0.005,0.031,0.049,0.005,0.031,0.049,-0.005,-0.003,0.045,-0.005,-0.003,0.045,0.005,-0.003,0.049,0.005,-0.003,0.045,-0.005,-0.003,0.049,0.005,-0.003,0.049,-0.005,0.031,0.045,-0.005,0.031,0.049,-0.005,0.031,0.049,0.005,0.031,0.045,-0.005,0.031,0.049,0.005,0.031,0.045,0.005],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#abb0b4","opacity":1,"roughness":0.78,"metalness":0},{"name":"Transparent kit case","positions":[-0.0015,0.001,-0.004,0.0295,0.045,-0.004,0.0295,0.001,-0.004,-0.0015,0.001,-0.004,-0.0015,0.045,-0.004,0.0295,0.045,-0.004,-0.0015,0.001,0.004,0.0295,0.001,0.004,0.0295,0.045,0.004,-0.0015,0.001,0.004,0.0295,0.045,0.004,-0.0015,0.045,0.004,-0.0015,0.001,-0.004,0.0295,0.001,-0.004,0.0295,0.001,0.004,-0.0015,0.001,-0.004,0.0295,0.001,0.004,-0.0015,0.001,0.004,-0.0015,0.045,-0.004,-0.0015,0.045,0.004,0.0295,0.045,0.004,-0.0015,0.045,-0.004,0.0295,0.045,0.004,0.0295,0.045,-0.004,-0.0015,0.001,-0.004,-0.0015,0.001,0.004,-0.0015,0.045,0.004,-0.0015,0.001,-0.004,-0.0015,0.045,0.004,-0.0015,0.045,-0.004,0.0295,0.001,-0.004,0.0295,0.045,-0.004,0.0295,0.045,0.004,0.0295,0.001,-0.004,0.0295,0.045,0.004,0.0295,0.001,0.004],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#c7d6d5","opacity":0.24,"roughness":0.25,"metalness":0},{"name":"Bottle label","positions":[-0.028,0.012,0.0105,-0.018,0.03,0.0105,-0.018,0.012,0.0105,-0.028,0.012,0.0105,-0.028,0.03,0.0105,-0.018,0.03,0.0105,-0.028,0.012,0.0115,-0.018,0.012,0.0115,-0.018,0.03,0.0115,-0.028,0.012,0.0115,-0.018,0.03,0.0115,-0.028,0.03,0.0115,-0.028,0.012,0.0105,-0.018,0.012,0.0105,-0.018,0.012,0.0115,-0.028,0.012,0.0105,-0.018,0.012,0.0115,-0.028,0.012,0.0115,-0.028,0.03,0.0105,-0.028,0.03,0.0115,-0.018,0.03,0.0115,-0.028,0.03,0.0105,-0.018,0.03,0.0115,-0.018,0.03,0.0105,-0.028,0.012,0.0105,-0.028,0.012,0.0115,-0.028,0.03,0.0115,-0.028,0.012,0.0105,-0.028,0.03,0.0115,-0.028,0.03,0.0105,-0.018,0.012,0.0105,-0.018,0.03,0.0105,-0.018,0.03,0.0115,-0.018,0.012,0.0105,-0.018,0.03,0.0115,-0.018,0.012,0.0115],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Bottle cap","positions":[-0.0173125,0.038,0.0,-0.017944445,0.048,0.0,-0.019425182,0.048,0.003456966,-0.0173125,0.038,0.0,-0.019425182,0.048,0.003456966,-0.01897833,0.038,0.003889087,-0.023,0.038,0.0,-0.01897833,0.038,0.003889087,-0.0173125,0.038,0.0,-0.023,0.048,0.0,-0.017944445,0.048,0.0,-0.019425182,0.048,0.003456966,-0.01897833,0.038,0.003889087,-0.019425182,0.048,0.003456966,-0.023,0.048,0.004888889,-0.01897833,0.038,0.003889087,-0.023,0.048,0.004888889,-0.023,0.038,0.0055,-0.023,0.038,0.0,-0.023,0.038,0.0055,-0.01897833,0.038,0.003889087,-0.023,0.048,0.0,-0.019425182,0.048,0.003456966,-0.023,0.048,0.004888889,-0.023,0.038,0.0055,-0.023,0.048,0.004888889,-0.026574818,0.048,0.003456966,-0.023,0.038,0.0055,-0.026574818,0.048,0.003456966,-0.02702167,0.038,0.003889087,-0.023,0.038,0.0,-0.02702167,0.038,0.003889087,-0.023,0.038,0.0055,-0.023,0.048,0.0,-0.023,0.048,0.004888889,-0.026574818,0.048,0.003456966,-0.02702167,0.038,0.003889087,-0.026574818,0.048,0.003456966,-0.028055555,0.048,0.0,-0.02702167,0.038,0.003889087,-0.028055555,0.048,0.0,-0.0286875,0.038,0.0,-0.023,0.038,0.0,-0.0286875,0.038,0.0,-0.02702167,0.038,0.003889087,-0.023,0.048,0.0,-0.026574818,0.048,0.003456966,-0.028055555,0.048,0.0,-0.0286875,0.038,0.0,-0.028055555,0.048,0.0,-0.026574818,0.048,-0.003456966,-0.0286875,0.038,0.0,-0.026574818,0.048,-0.003456966,-0.02702167,0.038,-0.003889087,-0.023,0.038,0.0,-0.02702167,0.038,-0.003889087,-0.0286875,0.038,0.0,-0.023,0.048,0.0,-0.028055555,0.048,0.0,-0.026574818,0.048,-0.003456966,-0.02702167,0.038,-0.003889087,-0.026574818,0.048,-0.003456966,-0.023,0.048,-0.004888889,-0.02702167,0.038,-0.003889087,-0.023,0.048,-0.004888889,-0.023,0.038,-0.0055,-0.023,0.038,0.0,-0.023,0.038,-0.0055,-0.02702167,0.038,-0.003889087,-0.023,0.048,0.0,-0.026574818,0.048,-0.003456966,-0.023,0.048,-0.004888889,-0.023,0.038,-0.0055,-0.023,0.048,-0.004888889,-0.019425182,0.048,-0.003456966,-0.023,0.038,-0.0055,-0.019425182,0.048,-0.003456966,-0.01897833,0.038,-0.003889087,-0.023,0.038,0.0,-0.01897833,0.038,-0.003889087,-0.023,0.038,-0.0055,-0.023,0.048,0.0,-0.023,0.048,-0.004888889,-0.019425182,0.048,-0.003456966,-0.01897833,0.038,-0.003889087,-0.019425182,0.048,-0.003456966,-0.017944445,0.048,0.0,-0.01897833,0.038,-0.003889087,-0.017944445,0.048,0.0,-0.0173125,0.038,0.0,-0.023,0.038,0.0,-0.0173125,0.038,0.0,-0.01897833,0.038,-0.003889087,-0.023,0.048,0.0,-0.019425182,0.048,-0.003456966,-0.017944445,0.048,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#50345e","opacity":1,"roughness":0.78,"metalness":0},{"name":"Concentrate bottle","positions":[-0.012,0.0005,0.0,-0.012,0.0375,0.0,-0.015221826,0.0375,0.007778174,-0.012,0.0005,0.0,-0.015221826,0.0375,0.007778174,-0.015221826,0.0005,0.007778174,-0.023,0.0005,0.0,-0.015221826,0.0005,0.007778174,-0.012,0.0005,0.0,-0.023,0.0375,0.0,-0.012,0.0375,0.0,-0.015221826,0.0375,0.007778174,-0.015221826,0.0005,0.007778174,-0.015221826,0.0375,0.007778174,-0.023,0.0375,0.011,-0.015221826,0.0005,0.007778174,-0.023,0.0375,0.011,-0.023,0.0005,0.011,-0.023,0.0005,0.0,-0.023,0.0005,0.011,-0.015221826,0.0005,0.007778174,-0.023,0.0375,0.0,-0.015221826,0.0375,0.007778174,-0.023,0.0375,0.011,-0.023,0.0005,0.011,-0.023,0.0375,0.011,-0.030778174,0.0375,0.007778174,-0.023,0.0005,0.011,-0.030778174,0.0375,0.007778174,-0.030778174,0.0005,0.007778174,-0.023,0.0005,0.0,-0.030778174,0.0005,0.007778174,-0.023,0.0005,0.011,-0.023,0.0375,0.0,-0.023,0.0375,0.011,-0.030778174,0.0375,0.007778174,-0.030778174,0.0005,0.007778174,-0.030778174,0.0375,0.007778174,-0.034,0.0375,0.0,-0.030778174,0.0005,0.007778174,-0.034,0.0375,0.0,-0.034,0.0005,0.0,-0.023,0.0005,0.0,-0.034,0.0005,0.0,-0.030778174,0.0005,0.007778174,-0.023,0.0375,0.0,-0.030778174,0.0375,0.007778174,-0.034,0.0375,0.0,-0.034,0.0005,0.0,-0.034,0.0375,0.0,-0.030778174,0.0375,-0.007778174,-0.034,0.0005,0.0,-0.030778174,0.0375,-0.007778174,-0.030778174,0.0005,-0.007778174,-0.023,0.0005,0.0,-0.030778174,0.0005,-0.007778174,-0.034,0.0005,0.0,-0.023,0.0375,0.0,-0.034,0.0375,0.0,-0.030778174,0.0375,-0.007778174,-0.030778174,0.0005,-0.007778174,-0.030778174,0.0375,-0.007778174,-0.023,0.0375,-0.011,-0.030778174,0.0005,-0.007778174,-0.023,0.0375,-0.011,-0.023,0.0005,-0.011,-0.023,0.0005,0.0,-0.023,0.0005,-0.011,-0.030778174,0.0005,-0.007778174,-0.023,0.0375,0.0,-0.030778174,0.0375,-0.007778174,-0.023,0.0375,-0.011,-0.023,0.0005,-0.011,-0.023,0.0375,-0.011,-0.015221826,0.0375,-0.007778174,-0.023,0.0005,-0.011,-0.015221826,0.0375,-0.007778174,-0.015221826,0.0005,-0.007778174,-0.023,0.0005,0.0,-0.015221826,0.0005,-0.007778174,-0.023,0.0005,-0.011,-0.023,0.0375,0.0,-0.023,0.0375,-0.011,-0.015221826,0.0375,-0.007778174,-0.015221826,0.0005,-0.007778174,-0.015221826,0.0375,-0.007778174,-0.012,0.0375,0.0,-0.015221826,0.0005,-0.007778174,-0.012,0.0375,0.0,-0.012,0.0005,0.0,-0.023,0.0005,0.0,-0.012,0.0005,0.0,-0.015221826,0.0005,-0.007778174,-0.023,0.0375,0.0,-0.015221826,0.0375,-0.007778174,-0.012,0.0375,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#9b82c5","opacity":1,"roughness":0.78,"metalness":0}],"9014":[{"name":"Bottle label","positions":[-0.00825,0.0145,0.0115,0.00825,0.030375,0.0115,0.00825,0.0145,0.0115,-0.00825,0.0145,0.0115,-0.00825,0.030375,0.0115,0.00825,0.030375,0.0115,-0.00825,0.0145,0.0125,0.00825,0.0145,0.0125,0.00825,0.030375,0.0125,-0.00825,0.0145,0.0125,0.00825,0.030375,0.0125,-0.00825,0.030375,0.0125,-0.00825,0.0145,0.0115,0.00825,0.0145,0.0115,0.00825,0.0145,0.0125,-0.00825,0.0145,0.0115,0.00825,0.0145,0.0125,-0.00825,0.0145,0.0125,-0.00825,0.030375,0.0115,-0.00825,0.030375,0.0125,0.00825,0.030375,0.0125,-0.00825,0.030375,0.0115,0.00825,0.030375,0.0125,0.00825,0.030375,0.0115,-0.00825,0.0145,0.0115,-0.00825,0.0145,0.0125,-0.00825,0.030375,0.0125,-0.00825,0.0145,0.0115,-0.00825,0.030375,0.0125,-0.00825,0.030375,0.0115,0.00825,0.0145,0.0115,0.00825,0.030375,0.0115,0.00825,0.030375,0.0125,0.00825,0.0145,0.0115,0.00825,0.030375,0.0125,0.00825,0.0145,0.0125],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#8bb7b6","opacity":1,"roughness":0.78,"metalness":0},{"name":"Ear nozzle","positions":[0.006040067,0.057888633,0.0,-0.001100113,0.05240978,0.0,-0.000743509,0.051945045,0.001414214,0.006040067,0.057888633,0.0,-0.000743509,0.051945045,0.001414214,0.006396671,0.057423897,0.001414214,0.00725759,0.056301926,0.0,0.006396671,0.057423897,0.001414214,0.006040067,0.057888633,0.0,0.00011741,0.050823074,0.0,-0.001100113,0.05240978,0.0,-0.000743509,0.051945045,0.001414214,0.006396671,0.057423897,0.001414214,-0.000743509,0.051945045,0.001414214,0.00011741,0.050823074,0.002,0.006396671,0.057423897,0.001414214,0.00011741,0.050823074,0.002,0.00725759,0.056301926,0.002,0.00725759,0.056301926,0.0,0.00725759,0.056301926,0.002,0.006396671,0.057423897,0.001414214,0.00011741,0.050823074,0.0,-0.000743509,0.051945045,0.001414214,0.00011741,0.050823074,0.002,0.00725759,0.056301926,0.002,0.00011741,0.050823074,0.002,0.000978329,0.049701103,0.001414214,0.00725759,0.056301926,0.002,0.000978329,0.049701103,0.001414214,0.008118509,0.055179955,0.001414214,0.00725759,0.056301926,0.0,0.008118509,0.055179955,0.001414214,0.00725759,0.056301926,0.002,0.00011741,0.050823074,0.0,0.00011741,0.050823074,0.002,0.000978329,0.049701103,0.001414214,0.008118509,0.055179955,0.001414214,0.000978329,0.049701103,0.001414214,0.001334933,0.049236367,0.0,0.008118509,0.055179955,0.001414214,0.001334933,0.049236367,0.0,0.008475113,0.05471522,0.0,0.00725759,0.056301926,0.0,0.008475113,0.05471522,0.0,0.008118509,0.055179955,0.001414214,0.00011741,0.050823074,0.0,0.000978329,0.049701103,0.001414214,0.001334933,0.049236367,0.0,0.008475113,0.05471522,0.0,0.001334933,0.049236367,0.0,0.000978329,0.049701103,-0.001414214,0.008475113,0.05471522,0.0,0.000978329,0.049701103,-0.001414214,0.008118509,0.055179955,-0.001414214,0.00725759,0.056301926,0.0,0.008118509,0.055179955,-0.001414214,0.008475113,0.05471522,0.0,0.00011741,0.050823074,0.0,0.001334933,0.049236367,0.0,0.000978329,0.049701103,-0.001414214,0.008118509,0.055179955,-0.001414214,0.000978329,0.049701103,-0.001414214,0.00011741,0.050823074,-0.002,0.008118509,0.055179955,-0.001414214,0.00011741,0.050823074,-0.002,0.00725759,0.056301926,-0.002,0.00725759,0.056301926,0.0,0.00725759,0.056301926,-0.002,0.008118509,0.055179955,-0.001414214,0.00011741,0.050823074,0.0,0.000978329,0.049701103,-0.001414214,0.00011741,0.050823074,-0.002,0.00725759,0.056301926,-0.002,0.00011741,0.050823074,-0.002,-0.000743509,0.051945045,-0.001414214,0.00725759,0.056301926,-0.002,-0.000743509,0.051945045,-0.001414214,0.006396671,0.057423897,-0.001414214,0.00725759,0.056301926,0.0,0.006396671,0.057423897,-0.001414214,0.00725759,0.056301926,-0.002,0.00011741,0.050823074,0.0,0.00011741,0.050823074,-0.002,-0.000743509,0.051945045,-0.001414214,0.006396671,0.057423897,-0.001414214,-0.000743509,0.051945045,-0.001414214,-0.001100113,0.05240978,0.0,0.006396671,0.057423897,-0.001414214,-0.001100113,0.05240978,0.0,0.006040067,0.057888633,0.0,0.00725759,0.056301926,0.0,0.006040067,0.057888633,0.0,0.006396671,0.057423897,-0.001414214,0.00011741,0.050823074,0.0,-0.000743509,0.051945045,-0.001414214,-0.001100113,0.05240978,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#cfe1d0","opacity":1,"roughness":0.78,"metalness":0},{"name":"Dropper stem","positions":[0.002,0.039375,0.0,0.002,0.052375,0.0,0.001414214,0.052375,0.001414214,0.002,0.039375,0.0,0.001414214,0.052375,0.001414214,0.001414214,0.039375,0.001414214,0.0,0.039375,0.0,0.001414214,0.039375,0.001414214,0.002,0.039375,0.0,0.0,0.052375,0.0,0.002,0.052375,0.0,0.001414214,0.052375,0.001414214,0.001414214,0.039375,0.001414214,0.001414214,0.052375,0.001414214,0.0,0.052375,0.002,0.001414214,0.039375,0.001414214,0.0,0.052375,0.002,0.0,0.039375,0.002,0.0,0.039375,0.0,0.0,0.039375,0.002,0.001414214,0.039375,0.001414214,0.0,0.052375,0.0,0.001414214,0.052375,0.001414214,0.0,0.052375,0.002,0.0,0.039375,0.002,0.0,0.052375,0.002,-0.001414214,0.052375,0.001414214,0.0,0.039375,0.002,-0.001414214,0.052375,0.001414214,-0.001414214,0.039375,0.001414214,0.0,0.039375,0.0,-0.001414214,0.039375,0.001414214,0.0,0.039375,0.002,0.0,0.052375,0.0,0.0,0.052375,0.002,-0.001414214,0.052375,0.001414214,-0.001414214,0.039375,0.001414214,-0.001414214,0.052375,0.001414214,-0.002,0.052375,0.0,-0.001414214,0.039375,0.001414214,-0.002,0.052375,0.0,-0.002,0.039375,0.0,0.0,0.039375,0.0,-0.002,0.039375,0.0,-0.001414214,0.039375,0.001414214,0.0,0.052375,0.0,-0.001414214,0.052375,0.001414214,-0.002,0.052375,0.0,-0.002,0.039375,0.0,-0.002,0.052375,0.0,-0.001414214,0.052375,-0.001414214,-0.002,0.039375,0.0,-0.001414214,0.052375,-0.001414214,-0.001414214,0.039375,-0.001414214,0.0,0.039375,0.0,-0.001414214,0.039375,-0.001414214,-0.002,0.039375,0.0,0.0,0.052375,0.0,-0.002,0.052375,0.0,-0.001414214,0.052375,-0.001414214,-0.001414214,0.039375,-0.001414214,-0.001414214,0.052375,-0.001414214,-0.0,0.052375,-0.002,-0.001414214,0.039375,-0.001414214,-0.0,0.052375,-0.002,-0.0,0.039375,-0.002,0.0,0.039375,0.0,-0.0,0.039375,-0.002,-0.001414214,0.039375,-0.001414214,0.0,0.052375,0.0,-0.001414214,0.052375,-0.001414214,-0.0,0.052375,-0.002,-0.0,0.039375,-0.002,-0.0,0.052375,-0.002,0.001414214,0.052375,-0.001414214,-0.0,0.039375,-0.002,0.001414214,0.052375,-0.001414214,0.001414214,0.039375,-0.001414214,0.0,0.039375,0.0,0.001414214,0.039375,-0.001414214,-0.0,0.039375,-0.002,0.0,0.052375,0.0,-0.0,0.052375,-0.002,0.001414214,0.052375,-0.001414214,0.001414214,0.039375,-0.001414214,0.001414214,0.052375,-0.001414214,0.002,0.052375,0.0,0.001414214,0.039375,-0.001414214,0.002,0.052375,0.0,0.002,0.039375,0.0,0.0,0.039375,0.0,0.002,0.039375,0.0,0.001414214,0.039375,-0.001414214,0.0,0.052375,0.0,0.001414214,0.052375,-0.001414214,0.002,0.052375,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#cfe1d0","opacity":1,"roughness":0.78,"metalness":0},{"name":"Dropper shoulder","positions":[0.008,0.039,0.0,0.006,0.045,0.0,0.00424264,0.045,0.00424264,0.008,0.039,0.0,0.00424264,0.045,0.00424264,0.005656854,0.039,0.005656854,0.0,0.039,0.0,0.005656854,0.039,0.005656854,0.008,0.039,0.0,0.0,0.045,0.0,0.006,0.045,0.0,0.00424264,0.045,0.00424264,0.005656854,0.039,0.005656854,0.00424264,0.045,0.00424264,0.0,0.045,0.006,0.005656854,0.039,0.005656854,0.0,0.045,0.006,0.0,0.039,0.008,0.0,0.039,0.0,0.0,0.039,0.008,0.005656854,0.039,0.005656854,0.0,0.045,0.0,0.00424264,0.045,0.00424264,0.0,0.045,0.006,0.0,0.039,0.008,0.0,0.045,0.006,-0.00424264,0.045,0.00424264,0.0,0.039,0.008,-0.00424264,0.045,0.00424264,-0.005656854,0.039,0.005656854,0.0,0.039,0.0,-0.005656854,0.039,0.005656854,0.0,0.039,0.008,0.0,0.045,0.0,0.0,0.045,0.006,-0.00424264,0.045,0.00424264,-0.005656854,0.039,0.005656854,-0.00424264,0.045,0.00424264,-0.006,0.045,0.0,-0.005656854,0.039,0.005656854,-0.006,0.045,0.0,-0.008,0.039,0.0,0.0,0.039,0.0,-0.008,0.039,0.0,-0.005656854,0.039,0.005656854,0.0,0.045,0.0,-0.00424264,0.045,0.00424264,-0.006,0.045,0.0,-0.008,0.039,0.0,-0.006,0.045,0.0,-0.00424264,0.045,-0.00424264,-0.008,0.039,0.0,-0.00424264,0.045,-0.00424264,-0.005656854,0.039,-0.005656854,0.0,0.039,0.0,-0.005656854,0.039,-0.005656854,-0.008,0.039,0.0,0.0,0.045,0.0,-0.006,0.045,0.0,-0.00424264,0.045,-0.00424264,-0.005656854,0.039,-0.005656854,-0.00424264,0.045,-0.00424264,-0.0,0.045,-0.006,-0.005656854,0.039,-0.005656854,-0.0,0.045,-0.006,-0.0,0.039,-0.008,0.0,0.039,0.0,-0.0,0.039,-0.008,-0.005656854,0.039,-0.005656854,0.0,0.045,0.0,-0.00424264,0.045,-0.00424264,-0.0,0.045,-0.006,-0.0,0.039,-0.008,-0.0,0.045,-0.006,0.00424264,0.045,-0.00424264,-0.0,0.039,-0.008,0.00424264,0.045,-0.00424264,0.005656854,0.039,-0.005656854,0.0,0.039,0.0,0.005656854,0.039,-0.005656854,-0.0,0.039,-0.008,0.0,0.045,0.0,-0.0,0.045,-0.006,0.00424264,0.045,-0.00424264,0.005656854,0.039,-0.005656854,0.00424264,0.045,-0.00424264,0.006,0.045,0.0,0.005656854,0.039,-0.005656854,0.006,0.045,0.0,0.008,0.039,0.0,0.0,0.039,0.0,0.008,0.039,0.0,0.005656854,0.039,-0.005656854,0.0,0.045,0.0,0.00424264,0.045,-0.00424264,0.006,0.045,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#2e7b80","opacity":1,"roughness":0.78,"metalness":0},{"name":"Drop bottle","positions":[0.012,0.0015,0.0,0.012,0.0385,0.0,0.008485281,0.0385,0.008485281,0.012,0.0015,0.0,0.008485281,0.0385,0.008485281,0.008485281,0.0015,0.008485281,0.0,0.0015,0.0,0.008485281,0.0015,0.008485281,0.012,0.0015,0.0,0.0,0.0385,0.0,0.012,0.0385,0.0,0.008485281,0.0385,0.008485281,0.008485281,0.0015,0.008485281,0.008485281,0.0385,0.008485281,0.0,0.0385,0.012,0.008485281,0.0015,0.008485281,0.0,0.0385,0.012,0.0,0.0015,0.012,0.0,0.0015,0.0,0.0,0.0015,0.012,0.008485281,0.0015,0.008485281,0.0,0.0385,0.0,0.008485281,0.0385,0.008485281,0.0,0.0385,0.012,0.0,0.0015,0.012,0.0,0.0385,0.012,-0.008485281,0.0385,0.008485281,0.0,0.0015,0.012,-0.008485281,0.0385,0.008485281,-0.008485281,0.0015,0.008485281,0.0,0.0015,0.0,-0.008485281,0.0015,0.008485281,0.0,0.0015,0.012,0.0,0.0385,0.0,0.0,0.0385,0.012,-0.008485281,0.0385,0.008485281,-0.008485281,0.0015,0.008485281,-0.008485281,0.0385,0.008485281,-0.012,0.0385,0.0,-0.008485281,0.0015,0.008485281,-0.012,0.0385,0.0,-0.012,0.0015,0.0,0.0,0.0015,0.0,-0.012,0.0015,0.0,-0.008485281,0.0015,0.008485281,0.0,0.0385,0.0,-0.008485281,0.0385,0.008485281,-0.012,0.0385,0.0,-0.012,0.0015,0.0,-0.012,0.0385,0.0,-0.008485281,0.0385,-0.008485281,-0.012,0.0015,0.0,-0.008485281,0.0385,-0.008485281,-0.008485281,0.0015,-0.008485281,0.0,0.0015,0.0,-0.008485281,0.0015,-0.008485281,-0.012,0.0015,0.0,0.0,0.0385,0.0,-0.012,0.0385,0.0,-0.008485281,0.0385,-0.008485281,-0.008485281,0.0015,-0.008485281,-0.008485281,0.0385,-0.008485281,-0.0,0.0385,-0.012,-0.008485281,0.0015,-0.008485281,-0.0,0.0385,-0.012,-0.0,0.0015,-0.012,0.0,0.0015,0.0,-0.0,0.0015,-0.012,-0.008485281,0.0015,-0.008485281,0.0,0.0385,0.0,-0.008485281,0.0385,-0.008485281,-0.0,0.0385,-0.012,-0.0,0.0015,-0.012,-0.0,0.0385,-0.012,0.008485281,0.0385,-0.008485281,-0.0,0.0015,-0.012,0.008485281,0.0385,-0.008485281,0.008485281,0.0015,-0.008485281,0.0,0.0015,0.0,0.008485281,0.0015,-0.008485281,-0.0,0.0015,-0.012,0.0,0.0385,0.0,-0.0,0.0385,-0.012,0.008485281,0.0385,-0.008485281,0.008485281,0.0015,-0.008485281,0.008485281,0.0385,-0.008485281,0.012,0.0385,0.0,0.008485281,0.0015,-0.008485281,0.012,0.0385,0.0,0.012,0.0015,0.0,0.0,0.0015,0.0,0.012,0.0015,0.0,0.008485281,0.0015,-0.008485281,0.0,0.0385,0.0,0.008485281,0.0385,-0.008485281,0.012,0.0385,0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95],"color":"#17515a","opacity":1,"roughness":0.78,"metalness":0}],"9015":[{"name":"Transfer backing","positions":[-0.0185,0.0015,-0.023,0.0185,0.0015,-0.016299999,0.0118,0.0015,-0.023,-0.0185,0.0025,-0.023,0.0118,0.0025,-0.023,0.0185,0.0025,-0.016299999,-0.0185,0.0015,-0.023,0.0185,0.0015,0.023,0.0185,0.0015,-0.016299999,-0.0185,0.0025,-0.023,0.0185,0.0025,-0.016299999,0.0185,0.0025,0.023,-0.0185,0.0015,-0.023,-0.0185,0.0015,0.023,0.0185,0.0015,0.023,-0.0185,0.0025,-0.023,0.0185,0.0025,0.023,-0.0185,0.0025,0.023,-0.0185,0.0015,-0.023,0.0118,0.0015,-0.023,0.0118,0.0025,-0.023,-0.0185,0.0015,-0.023,0.0118,0.0025,-0.023,-0.0185,0.0025,-0.023,0.0118,0.0015,-0.023,0.0185,0.0015,-0.016299999,0.0185,0.0025,-0.016299999,0.0118,0.0015,-0.023,0.0185,0.0025,-0.016299999,0.0118,0.0025,-0.023,0.0185,0.0015,-0.016299999,0.0185,0.0015,0.023,0.0185,0.0025,0.023,0.0185,0.0015,-0.016299999,0.0185,0.0025,0.023,0.0185,0.0025,-0.016299999,0.0185,0.0015,0.023,-0.0185,0.0015,0.023,-0.0185,0.0025,0.023,0.0185,0.0015,0.023,-0.0185,0.0025,0.023,0.0185,0.0025,0.023,-0.0185,0.0015,0.023,-0.0185,0.0015,-0.023,-0.0185,0.0025,-0.023,-0.0185,0.0015,0.023,-0.0185,0.0025,-0.023,-0.0185,0.0025,0.023],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47],"color":"#ece3d5","opacity":1,"roughness":0.78,"metalness":0},{"name":"Glyph line -1-1","positions":[-0.006159472,0.0027,-0.01954072,-0.002649142,0.0033,-0.017623017,-0.002649142,0.0027,-0.017623017,-0.006159472,0.0027,-0.01954072,-0.006159472,0.0033,-0.01954072,-0.002649142,0.0033,-0.017623017,-0.013350858,0.0027,-0.006376983,-0.009840528,0.0027,-0.00445928,-0.009840528,0.0033,-0.00445928,-0.013350858,0.0027,-0.006376983,-0.009840528,0.0033,-0.00445928,-0.013350858,0.0033,-0.006376983,-0.006159472,0.0027,-0.01954072,-0.002649142,0.0027,-0.017623017,-0.009840528,0.0027,-0.00445928,-0.006159472,0.0027,-0.01954072,-0.009840528,0.0027,-0.00445928,-0.013350858,0.0027,-0.006376983,-0.006159472,0.0033,-0.01954072,-0.013350858,0.0033,-0.006376983,-0.009840528,0.0033,-0.00445928,-0.006159472,0.0033,-0.01954072,-0.009840528,0.0033,-0.00445928,-0.002649142,0.0033,-0.017623017,-0.006159472,0.0027,-0.01954072,-0.013350858,0.0027,-0.006376983,-0.013350858,0.0033,-0.006376983,-0.006159472,0.0027,-0.01954072,-0.013350858,0.0033,-0.006376983,-0.006159472,0.0033,-0.01954072,-0.002649142,0.0027,-0.017623017,-0.002649142,0.0033,-0.017623017,-0.009840528,0.0033,-0.00445928,-0.002649142,0.0027,-0.017623017,-0.009840528,0.0033,-0.00445928,-0.009840528,0.0027,-0.00445928],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#2e7b80","opacity":1,"roughness":0.78,"metalness":0},{"name":"Glyph line -1-2","positions":[-0.013350858,0.0027,-0.005623017,-0.009840528,0.0033,-0.00754072,-0.009840528,0.0027,-0.00754072,-0.013350858,0.0027,-0.005623017,-0.013350858,0.0033,-0.005623017,-0.009840528,0.0033,-0.00754072,-0.006159472,0.0027,0.00754072,-0.002649142,0.0027,0.005623017,-0.002649142,0.0033,0.005623017,-0.006159472,0.0027,0.00754072,-0.002649142,0.0033,0.005623017,-0.006159472,0.0033,0.00754072,-0.013350858,0.0027,-0.005623017,-0.009840528,0.0027,-0.00754072,-0.002649142,0.0027,0.005623017,-0.013350858,0.0027,-0.005623017,-0.002649142,0.0027,0.005623017,-0.006159472,0.0027,0.00754072,-0.013350858,0.0033,-0.005623017,-0.006159472,0.0033,0.00754072,-0.002649142,0.0033,0.005623017,-0.013350858,0.0033,-0.005623017,-0.002649142,0.0033,0.005623017,-0.009840528,0.0033,-0.00754072,-0.013350858,0.0027,-0.005623017,-0.006159472,0.0027,0.00754072,-0.006159472,0.0033,0.00754072,-0.013350858,0.0027,-0.005623017,-0.006159472,0.0033,0.00754072,-0.013350858,0.0033,-0.005623017,-0.009840528,0.0027,-0.00754072,-0.009840528,0.0033,-0.00754072,-0.002649142,0.0033,0.005623017,-0.009840528,0.0027,-0.00754072,-0.002649142,0.0033,0.005623017,-0.002649142,0.0027,0.005623017],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#2e7b80","opacity":1,"roughness":0.78,"metalness":0},{"name":"Glyph line -1-3","positions":[-0.006159472,0.0027,0.00445928,-0.002649142,0.0033,0.006376983,-0.002649142,0.0027,0.006376983,-0.006159472,0.0027,0.00445928,-0.006159472,0.0033,0.00445928,-0.002649142,0.0033,0.006376983,-0.013350858,0.0027,0.017623017,-0.009840528,0.0027,0.01954072,-0.009840528,0.0033,0.01954072,-0.013350858,0.0027,0.017623017,-0.009840528,0.0033,0.01954072,-0.013350858,0.0033,0.017623017,-0.006159472,0.0027,0.00445928,-0.002649142,0.0027,0.006376983,-0.009840528,0.0027,0.01954072,-0.006159472,0.0027,0.00445928,-0.009840528,0.0027,0.01954072,-0.013350858,0.0027,0.017623017,-0.006159472,0.0033,0.00445928,-0.013350858,0.0033,0.017623017,-0.009840528,0.0033,0.01954072,-0.006159472,0.0033,0.00445928,-0.009840528,0.0033,0.01954072,-0.002649142,0.0033,0.006376983,-0.006159472,0.0027,0.00445928,-0.013350858,0.0027,0.017623017,-0.013350858,0.0033,0.017623017,-0.006159472,0.0027,0.00445928,-0.013350858,0.0033,0.017623017,-0.006159472,0.0033,0.00445928,-0.002649142,0.0027,0.006376983,-0.002649142,0.0033,0.006376983,-0.009840528,0.0033,0.01954072,-0.002649142,0.0027,0.006376983,-0.009840528,0.0033,0.01954072,-0.009840528,0.0027,0.01954072],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#2e7b80","opacity":1,"roughness":0.78,"metalness":0},{"name":"Glyph line 1-1","positions":[0.002649142,0.0027,-0.017623017,0.006159472,0.0033,-0.01954072,0.006159472,0.0027,-0.01954072,0.002649142,0.0027,-0.017623017,0.002649142,0.0033,-0.017623017,0.006159472,0.0033,-0.01954072,0.009840528,0.0027,-0.00445928,0.013350858,0.0027,-0.006376983,0.013350858,0.0033,-0.006376983,0.009840528,0.0027,-0.00445928,0.013350858,0.0033,-0.006376983,0.009840528,0.0033,-0.00445928,0.002649142,0.0027,-0.017623017,0.006159472,0.0027,-0.01954072,0.013350858,0.0027,-0.006376983,0.002649142,0.0027,-0.017623017,0.013350858,0.0027,-0.006376983,0.009840528,0.0027,-0.00445928,0.002649142,0.0033,-0.017623017,0.009840528,0.0033,-0.00445928,0.013350858,0.0033,-0.006376983,0.002649142,0.0033,-0.017623017,0.013350858,0.0033,-0.006376983,0.006159472,0.0033,-0.01954072,0.002649142,0.0027,-0.017623017,0.009840528,0.0027,-0.00445928,0.009840528,0.0033,-0.00445928,0.002649142,0.0027,-0.017623017,0.009840528,0.0033,-0.00445928,0.002649142,0.0033,-0.017623017,0.006159472,0.0027,-0.01954072,0.006159472,0.0033,-0.01954072,0.013350858,0.0033,-0.006376983,0.006159472,0.0027,-0.01954072,0.013350858,0.0033,-0.006376983,0.013350858,0.0027,-0.006376983],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#bf619a","opacity":1,"roughness":0.78,"metalness":0},{"name":"Glyph line 1-2","positions":[0.009840528,0.0027,-0.00754072,0.013350858,0.0033,-0.005623017,0.013350858,0.0027,-0.005623017,0.009840528,0.0027,-0.00754072,0.009840528,0.0033,-0.00754072,0.013350858,0.0033,-0.005623017,0.002649142,0.0027,0.005623017,0.006159472,0.0027,0.00754072,0.006159472,0.0033,0.00754072,0.002649142,0.0027,0.005623017,0.006159472,0.0033,0.00754072,0.002649142,0.0033,0.005623017,0.009840528,0.0027,-0.00754072,0.013350858,0.0027,-0.005623017,0.006159472,0.0027,0.00754072,0.009840528,0.0027,-0.00754072,0.006159472,0.0027,0.00754072,0.002649142,0.0027,0.005623017,0.009840528,0.0033,-0.00754072,0.002649142,0.0033,0.005623017,0.006159472,0.0033,0.00754072,0.009840528,0.0033,-0.00754072,0.006159472,0.0033,0.00754072,0.013350858,0.0033,-0.005623017,0.009840528,0.0027,-0.00754072,0.002649142,0.0027,0.005623017,0.002649142,0.0033,0.005623017,0.009840528,0.0027,-0.00754072,0.002649142,0.0033,0.005623017,0.009840528,0.0033,-0.00754072,0.013350858,0.0027,-0.005623017,0.013350858,0.0033,-0.005623017,0.006159472,0.0033,0.00754072,0.013350858,0.0027,-0.005623017,0.006159472,0.0033,0.00754072,0.006159472,0.0027,0.00754072],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#bf619a","opacity":1,"roughness":0.78,"metalness":0},{"name":"Glyph line 1-3","positions":[0.002649142,0.0027,0.006376983,0.006159472,0.0033,0.00445928,0.006159472,0.0027,0.00445928,0.002649142,0.0027,0.006376983,0.002649142,0.0033,0.006376983,0.006159472,0.0033,0.00445928,0.009840528,0.0027,0.01954072,0.013350858,0.0027,0.017623017,0.013350858,0.0033,0.017623017,0.009840528,0.0027,0.01954072,0.013350858,0.0033,0.017623017,0.009840528,0.0033,0.01954072,0.002649142,0.0027,0.006376983,0.006159472,0.0027,0.00445928,0.013350858,0.0027,0.017623017,0.002649142,0.0027,0.006376983,0.013350858,0.0027,0.017623017,0.009840528,0.0027,0.01954072,0.002649142,0.0033,0.006376983,0.009840528,0.0033,0.01954072,0.013350858,0.0033,0.017623017,0.002649142,0.0033,0.006376983,0.013350858,0.0033,0.017623017,0.006159472,0.0033,0.00445928,0.002649142,0.0027,0.006376983,0.009840528,0.0027,0.01954072,0.009840528,0.0033,0.01954072,0.002649142,0.0027,0.006376983,0.009840528,0.0033,0.01954072,0.002649142,0.0033,0.006376983,0.006159472,0.0027,0.00445928,0.006159472,0.0033,0.00445928,0.013350858,0.0033,0.017623017,0.006159472,0.0027,0.00445928,0.013350858,0.0033,0.017623017,0.013350858,0.0027,0.017623017],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#bf619a","opacity":1,"roughness":0.78,"metalness":0},{"name":"Central seal","positions":[-0.004949747,0.00265,0.0,-0.0,0.00335,-0.004949747,-0.0,0.00265,-0.004949747,-0.004949747,0.00265,0.0,-0.004949747,0.00335,0.0,-0.0,0.00335,-0.004949747,0.0,0.00265,0.004949747,0.004949747,0.00265,-0.0,0.004949747,0.00335,-0.0,0.0,0.00265,0.004949747,0.004949747,0.00335,-0.0,0.0,0.00335,0.004949747,-0.004949747,0.00265,0.0,-0.0,0.00265,-0.004949747,0.004949747,0.00265,-0.0,-0.004949747,0.00265,0.0,0.004949747,0.00265,-0.0,0.0,0.00265,0.004949747,-0.004949747,0.00335,0.0,0.0,0.00335,0.004949747,0.004949747,0.00335,-0.0,-0.004949747,0.00335,0.0,0.004949747,0.00335,-0.0,-0.0,0.00335,-0.004949747,-0.004949747,0.00265,0.0,0.0,0.00265,0.004949747,0.0,0.00335,0.004949747,-0.004949747,0.00265,0.0,0.0,0.00335,0.004949747,-0.004949747,0.00335,0.0,-0.0,0.00265,-0.004949747,-0.0,0.00335,-0.004949747,0.004949747,0.00335,-0.0,-0.0,0.00265,-0.004949747,0.004949747,0.00335,-0.0,0.004949747,0.00265,-0.0],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#bf619a","opacity":1,"roughness":0.78,"metalness":0},{"name":"Peeled corner","positions":[0.007817205,0.007882196,-0.021346821,0.011004113,0.001981302,-0.024500377,0.010511176,0.001561208,-0.024000065,0.007817205,0.007882196,-0.021346821,0.008310142,0.00830229,-0.021847134,0.011004113,0.001981302,-0.024500377,0.015366087,0.007952698,-0.013850023,0.018060058,0.00163171,-0.016503266,0.018552995,0.002051804,-0.017003578,0.015366087,0.007952698,-0.013850023,0.018552995,0.002051804,-0.017003578,0.015859024,0.008372792,-0.014350336,0.007817205,0.007882196,-0.021346821,0.010511176,0.001561208,-0.024000065,0.018060058,0.00163171,-0.016503266,0.007817205,0.007882196,-0.021346821,0.018060058,0.00163171,-0.016503266,0.015366087,0.007952698,-0.013850023,0.008310142,0.00830229,-0.021847134,0.015859024,0.008372792,-0.014350336,0.018552995,0.002051804,-0.017003578,0.008310142,0.00830229,-0.021847134,0.018552995,0.002051804,-0.017003578,0.011004113,0.001981302,-0.024500377,0.007817205,0.007882196,-0.021346821,0.015366087,0.007952698,-0.013850023,0.015859024,0.008372792,-0.014350336,0.007817205,0.007882196,-0.021346821,0.015859024,0.008372792,-0.014350336,0.008310142,0.00830229,-0.021847134,0.010511176,0.001561208,-0.024000065,0.011004113,0.001981302,-0.024500377,0.018552995,0.002051804,-0.017003578,0.010511176,0.001561208,-0.024000065,0.018552995,0.002051804,-0.017003578,0.018060058,0.00163171,-0.016503266],"indices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"color":"#d3c6a8","opacity":1,"roughness":0.78,"metalness":0}]};
function newDrugModel(id){
 const group=new THREE.Group();
 for(const part of MODEL_DATA[id]||[]){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));
  geo.setIndex(part.indices);geo.computeVertexNormals();
  const transparent=part.opacity<1;
  const material=new THREE.MeshStandardMaterial({color:part.color,roughness:part.roughness,metalness:part.metalness,opacity:part.opacity,transparent,depthWrite:!transparent,flatShading:true,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geo,material);mesh.name=part.name;
  if(transparent)mesh.renderOrder=2;
  group.add(mesh);
 }
 return group;
}
function iconSvg(id){let body='';PIXELS[id].forEach((row,y)=>[...row].forEach((v,x)=>{if(PALETTE[v])body+='<rect x="'+x*2+'" y="'+y*2+'" width="2" height="2" fill="'+PALETTE[v]+'"/>';}));return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">'+body+'</svg>');}
function installIcons(){
if(typeof document!=='undefined'){const style=document.createElement('style');style.id='pharma-drop-icons';style.textContent=Object.keys(PIXELS).map(id=>{const x=id%16*32,y=Math.floor(id/16)*32;return '[style*="-'+x+'px -'+y+'px"]{background-image:url("'+iconSvg(id)+'")!important;background-position:0 0!important;background-size:32px 32px!important;}';}).join('\n');document.head.appendChild(style);}
if(window.Window_Base)wrap(Window_Base.prototype,'drawIcon',function(orig,id,x,y){if(!PIXELS[id])return orig.call(this,id,x,y);PIXELS[id].forEach((row,py)=>[...row].forEach((v,px)=>{if(PALETTE[v])this.contents.fillRect(x+px*2,y+py*2,2,2,PALETTE[v]);}));});
}

// Backpack and shared inspection cards draw directly to canvases, bypassing
// Window_Base and the CSS/Hypernet icon helpers.
function drawMarketCanvas(id,canvasId){
 const canvas=document.getElementById(canvasId);if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.clearRect(0,0,canvas.width||32,canvas.height||32);ctx.imageSmoothingEnabled=false;
 PIXELS[id].forEach((row,y)=>[...row].forEach((v,x)=>{if(PALETTE[v]){ctx.fillStyle=PALETTE[v];ctx.fillRect(x*2,y*2,2,2);}}));
}
function drugDetails(item){
 if(!isDrug(item))return '';const d=DRUGS[item.id],info=DRUG_INFO[item.id];
 const family=d.family===9001?'Shared cannabis tolerance / dependence':d.family===9002?'Shared psychedelic tolerance; no physical dependence':'Separate '+d.name+' tolerance / dependence';
 const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 return '<section class="exotic-drug-details"><div class="inspect-section-title">Effects and duration</div><div class="inspect-spec-grid">'+[['Duration',d.duration+' game minutes'],['Benefits',info.benefit],['Downsides',info.cost],['Afterwards',info.end],['Tolerance',family],['Use',ECON[item.id].unit+'; benefits diminish with tolerance; same-family highs cannot overlap except up to five Meld layers.']].map(([k,v])=>'<div class="inspect-spec-row inspect-spec-row--stacked"><span class="inspect-spec-label">'+esc(k)+':</span><span class="inspect-spec-value inspect-spec-value--wrap">'+esc(v)+'</span></div>').join('')+'</div></section>';
}
function installDrugInspection(){
 if(!window.ItemInspect)return;
 wrap(ItemInspect,'build',function(orig,item,opts){
  const html=orig.call(this,item,opts);if(!isDrug(item)||typeof html!=='string')return html;
  // extraHTML belongs to the fixed-size model viewport, not flowing text.
  return html.replace(/(<div\b[^>]*class=["'][^"']*\binspect-lore\b[^"']*["'][^>]*>)/,(_,opening)=>opening+drugDetails(item));
 });
 wrap(ItemInspect,'detailsHTML',function(orig,item,opts){return orig.call(this,item,opts)+drugDetails(item);});
}
function installItemVisuals(){
 if(window.Scene_EnhancedItem)wrap(Scene_EnhancedItem.prototype,'drawUIItemIcon',function(orig,id,canvasId){return PIXELS[id]?drawMarketCanvas(id,canvasId):orig.call(this,id,canvasId);});
 if(window.ItemInspect)wrap(window.ItemInspect,'drawIcon',function(orig,id,canvasId){return PIXELS[id]?drawMarketCanvas(id,canvasId):orig.call(this,id,canvasId);});
 if(window.ItemModelSystem){const family={
  name:'ExoticSubstances',unique:{i9001:'createExoticSubstancesHash',i9002:'createExoticSubstancesVial',i9003:'createExoticSubstancesCrystal',...Object.fromEntries([9010,9011,9012,9013,9014,9015].map(id=>['i'+id,'createPharma'+id]))},models:{
...Object.fromEntries([9010,9011,9012,9013,9014,9015].map(id=>['createPharma'+id,()=>newDrugModel(id)])),
   createExoticSubstancesCrystal(){return newDrugModel(9003);},
   createExoticSubstancesHash(){return newDrugModel(9001);},
   createExoticSubstancesVial(){return newDrugModel(9002);}
  }
 };
 // Metadata survives native caching/cloning; preview posing never changes geometry.
 for(const [key,fn] of Object.entries(family.unique)){
  const build=family.models[fn],id=Number(key.slice(1));
  family.models[fn]=()=>{const model=build();model.userData.exoticSubstancesItem=id;return model;};
 }
 const system=window.ItemModelSystem;system.registerFamily(family);
 wrap(system,'framePreview',function(orig,model,opts){
  const id=model?.userData?.exoticSubstancesItem;if(!GOODS[id])return orig.call(this,model,opts);
  const flat=id===9012||id===9015,pitch=flat?1.48:id===9001?.55:.04,yaw=flat?.06:.12;
  // Native callers may supply the generic tilted pose; these tiny objects need
  // their own near-front presentation to avoid appearing to lean away.
  const pose={...opts,pitch,yaw};
  const elongation=this.PREVIEW_ELONGATION;this.PREVIEW_ELONGATION=Infinity;
  try{return orig.call(this,model,pose);}finally{this.PREVIEW_ELONGATION=elongation;}
 });
 }
}


function installTradeOrigin(){
 const E=window.NPCEmpathize?._internal?.Scene_NPCEmpathize;if(!E)return;
 wrap(E.prototype,'_trade',function(orig,...args){
  const name=window.NPCEmpathize._helpers._getNPCName(this._eventId),actor=this._focusActor?.()||$gameParty.leader?.();
  const origin={name,event:this._eventId,actorId:actor?.actorId?.()};
  const result=orig.apply(this,args);
  if($gameTemp._NPCEmpathizeOpenTrade?.trader===name)$gameTemp._exoticSubstanceTradeOrigin=origin;
  return result;
 });
}
function installBulkSaleGuard(S){
 // Some game builds settle a whole basket directly, skipping doSell. Own that
 // entry point and recheck each drug line at the moment money changes hands.
 const original=S.commitSale;
 S.commitSale=function(entries){
  if(!entries.some(([i])=>isDrug(i)))return original?original.call(this,entries):0;
  let sold=0;
  for(const [item,qty] of entries){
   if(isDrug(item)){sold+=transact(this._exoticSubstanceContext,item,qty,false);}
   else if(original){sold+=Number(original.call(this,[[item,qty]]))||0;}
   else {this._item=item;const n=Math.min(Math.max(0,Math.floor(qty)),$gameParty.numItems(item));if(n){this.doSell(n);sold+=n;}}
  }
  this._item=null;this._shopStockRevision=(this._shopStockRevision||0)+1;
  if(sold&&window.SoundManager)SoundManager.playShop();
  this._sellWindow?.refresh();this._buyWindow?.refresh();this._statusWindow?.refresh();this.refreshUIShop?.();return sold;
 };
 // Route the basket button through the guarded settlement, even on builds
 // whose older sellSelectedItems implementation paid the party directly.
 S.sellSelectedItems=function(){const selection=this.sellSelection();const entries=Array.from(selection);selection.clear();if(entries.length)return this.commitSale(entries);return 0;};
}

// Wire reports describe existing numerical events; they do not create world incidents.
const WIRE_COPY={
 crop:['Selected flower is moving freely; pressed resin is loosening too. Refined stock may follow a week behind.','Harvest consignments are thin. Buyers are holding good flower, and refiners may feel the squeeze later.'],
 perception:['Fresh laboratory batches are reaching primer sellers and transfer artists. Regular buyers are becoming selective.','Consistent laboratory material is harder to replace. Primer sellers and transfer artists are watching remaining batches.'],
 infernal:['Reclaimed crystal consignments are reaching more counters. Regular suppliers have room to negotiate.','Replacement crystal consignments are thinning. Remaining batches are attracting persistent buyers.'],
 wafer:['Fresh wafer sleeves are arriving from fabrication routes. Social stock is moving more slowly.','Wafer deliveries are falling behind demand. Unopened sleeves are changing hands quickly.'],
 medical:['Courier routes are bringing more sedative kits and pain-suppression ampoules. Supplies are loosening.','Medical smuggling routes are disrupted. Kits and ampoules are becoming harder to replace.']
};
function wireReports(c,w=week()){
 const ids=[9001,9002,9003,9012,9014],out=[];
 for(let age=0;age<3;age++){
  const at=w-age;
  for(const id of ids){
   const e=marketEvent(c,id,at);if(!e.price)continue;
   const family=ECON[id].family,previous=marketEvent(c,id,at-1);
   const trend=Math.abs(e.price)>Math.abs(previous.price)?'building':Math.abs(e.price)<Math.abs(previous.price)?'easing':'holding';
   out.push({region:c,week:at,age,family,kind:e.price<0?'surplus':'shortage',trend,local:true,text:WIRE_COPY[family][e.price<0?0:1]});
  }
 }
 // A small stable sample, never a price-ranked best route. No report reroll on reopen.
 const candidates=['Belgium','United Kingdom','France','Italy','Germany','Spain','Netherlands'].map(n=>'Country:'+n).filter(n=>n!==c);
 const selected=candidates.sort((a,b)=>noise(world()+'|wire|'+w+a)-noise(world()+'|wire|'+w+b)).slice(0,2);
 for(const region of selected){
  const id=ids[Math.floor(noise(world()+'|wire-family|'+w+region)*ids.length)],e=marketEvent(region,id,w);
  if(e.price)out.push({region,week:w,age:0,family:ECON[id].family,kind:e.price<0?'surplus':'shortage',local:false,text:WIRE_COPY[ECON[id].family][e.price<0?0:1]});
 }
 return out;
}
function marketSignals(m){
 if(m.event==='Steady trade')return [{text:'→ STABLE — no major supply shift',color:'#a9b6ae'}];
 if(/surplus|arrival|delivery/i.test(m.event))return [
  {text:'↓ BUY — cheaper local supply',color:'#8fe6a8'},
  {text:'↓ SELL — weaker local demand',color:'#ef8e8e'}
 ];
 return [
  {text:'↑ BUY — expensive local supply',color:'#ef8e8e'},
  {text:'↑ SELL — stronger local demand',color:'#8fe6a8'}
 ];
}
function registerNet(){const os=window.HypernetOS;if(!os?.registerApp)return;
 if(Array.isArray(os.DESKTOP_DEFAULT)&&!os.DESKTOP_DEFAULT.includes('pharma-drop'))os.DESKTOP_DEFAULT.push('pharma-drop');
 if(os.Net?.ONLINE_APPS&&!os.Net.ONLINE_APPS.includes('pharma-drop'))os.Net.ONLINE_APPS.push('pharma-drop');
 wrap(os,'getIconHTML',function(orig,id,size=32){return PIXELS[id]?'<img alt="" src="'+iconSvg(id)+'" style="width:'+size+'px;height:'+size+'px;image-rendering:pixelated"/>':orig.call(this,id,size);});
 os.registerApp({id:'pharma-drop',name:'PharmaDrop',category:'economy',icon:177,desktopShortcut:true,launchFn(){
 os.WindowManager.createWindow({id:'pharma-drop',title:'PharmaDrop',icon:177,width:720,height:520,contentHTML:'<div id="pharma-drop-content" style="padding:20px;color:#eee;background:#18221f;height:100%;box-sizing:border-box;overflow:auto"></div>'});
 const root=document.getElementById('pharma-drop-content');if(!root)return;
 const render=()=>{
  while(root.firstChild)root.removeChild(root.firstChild);
  const text=(tag,value,parent=root)=>{const e=document.createElement(tag);e.textContent=value;parent.appendChild(e);return e;};
  text('h2','PharmaDrop');
  if(os.isEmptyWorld?.()||(os.Net?.hasUplink&&!os.Net.hasUplink())){text('p','No Hypernet connection. Reopen when connected.');return;}
  learnLore('PharmaDrop');learnLore('Veilnet');for(const p of LORE)if(p.item)learnLore(p.key);learnLore('Underground drug trade');
  const c=city(),ctx={city:c,kind:'net',key:world()+'|'+c+'|hypernet'};
  text('p',regionLabel(c)+' · Monday refresh in '+Math.ceil(((week()+1)*10080-600-now())/1440)+' days · €'+($gameParty.gold()/100).toFixed(2));
  const wire=text('details','');text('summary','Veilnet Wire — supply reports & route chatter',wire);
  const reports=wireReports(c);
  if(!reports.length)text('p','Quiet routes. No material supply disruption reported.',wire);
  for(const report of reports){
   const place=report.local?'Local signal':(/Italy|Spain/.test(report.region)?'Southern routes':/Germany|Netherlands/.test(report.region)?'Continental routes':'Western routes');
   text('p',place+' · '+(report.age?report.age+' week'+(report.age===1?'':'s')+' ago':'This week')+' · '+(report.local?report.trend:'route chatter')+' — '+report.text,wire);
  }
  for(const id of GOOD_IDS){
   const item=$dataItems[id],r=ledger(ctx,id),m=market(c,id);
   const card=text('div','');card.className='pharmadrop-card';card.style.cssText='background:#13271f;border:1px solid #315f49;border-radius:5px;margin:0 0 12px;padding:12px 14px;box-shadow:inset 0 1px rgba(255,255,255,.025)';
   const heading=text('div','',card);heading.style.cssText='margin:0 0 6px;line-height:1.35';
   const name=text('strong',item.name,heading);name.className='pharmadrop-drug-name';name.style.cssText='color:#a8f0bd;font-size:1.1em;letter-spacing:.2px';
   text('span',' — €'+quote(ctx,id,true)/100+' / '+ECON[id].unit+' · '+(r.stock?r.stock+' available':r.initialStock>0?'Sold out':'Unavailable this week'),heading);
   const signal=text('small',m.bias+' · '+m.event,card);signal.style.cssText='display:block;color:#83aa94;margin-bottom:4px';
   const watch=text('div','',card);watch.className='pharmadrop-market-watch';watch.style.cssText='display:flex;flex-wrap:wrap;gap:5px 12px;margin:0 0 8px;font-family:monospace;font-size:.92em';
   for(const row of marketSignals(m)){const chip=text('span',row.text,watch);chip.style.cssText='color:'+row.color+';font-weight:bold';}
   const summary=text('p',DRUG_INFO[id].summary,card);summary.style.cssText='white-space:pre-line;margin:0 0 9px;line-height:1.35';
   const b=text('button','Buy one',card);b.disabled=count(ctx,id)<1||$gameParty.gold()<quote(ctx,id,true)||$gameParty.numItems(item)>=$gameParty.maxItems(item);
   b.onclick=()=>{if(os.isEmptyWorld?.()||(os.Net?.hasUplink&&!os.Net.hasUplink()))return render();transact(ctx,item,1,true);render();};
  }
  for(const d of drugStatus($gameParty.leader()))text('p',d.name+' — tolerance '+d.tolerance+'% · dependence '+d.dependence+' · craving '+d.craving+'%'+(d.minutesRemaining?' · '+d.minutesRemaining+' min remaining':''));
  text('p','Sell through trusted shopkeepers or NPC barter.');
 };pharmaIntro(root,render);
 }});
}
// Fictional gameplay rates, not clinical probabilities or real-world doses.
const DRUGS={
 9001:{key:'meld',name:'Meld Resin',family:9001,tolerance:12,recovery:12,dependence:5,depRecovery:4,grace:1440,ramp:1440,duration:120,boost:32,drop:20},
 9002:{key:'synth',name:'Syntheogen',family:9002,tolerance:65,recovery:25,dependence:0,depRecovery:0,grace:0,ramp:1440,duration:180,boost:42,drop:26},
 9003:{key:'frack',name:'Frack',family:9003,tolerance:25,recovery:15,dependence:16,depRecovery:6,grace:240,ramp:720,duration:240,boost:35,drop:40},
 9010:{key:'riftflower',name:'Riftflower',family:9001,tolerance:18,dependence:7,duration:150,boost:12,drop:7},
 9011:{key:'nectar',name:'Nectar',family:9001,tolerance:25,dependence:10,duration:120,boost:8,drop:5},
 9012:{key:'vesper',name:'Vesper Wafers',family:9012,tolerance:30,recovery:18,dependence:3,depRecovery:4,grace:1440,ramp:1440,duration:180,boost:30,drop:20},
 9013:{key:'hush',name:'Hush',family:9013,tolerance:15,recovery:12,dependence:5,depRecovery:5,grace:720,ramp:1440,duration:240,boost:16,drop:10},
 9014:{key:'lethe',name:'Lethe',family:9014,tolerance:20,recovery:14,dependence:13,depRecovery:6,grace:360,ramp:720,duration:180,boost:24,drop:18},
 9015:{key:'splice',name:'Splice',family:9002,tolerance:55,duration:360,dependence:0,boost:18,drop:12}
};
const DRUG_INFO={
 9001:{summary:'Relaxation and layered magic protection.\n2h per layer; up to five layers protect 10/19/27/34/40%.',benefit:'Mood +32; Social +6 on first use; magic damage reduced by up to 40%.',cost:'Each layer worsens coordination, accuracy, hunger and tiredness.',end:'Mood falls by up to 20, scaled to the lift received.'},
 9002:{summary:'Signal bleed: mood and perception; rapid tolerance.\nMood +42, WIS +15% before tolerance; 3h high.',benefit:'Mood +42; WIS +15%.',cost:'Hit -10 percentage points, or -15 during an uneasy trip.',end:'Mood falls by up to 26, scaled to the lift received.'},
 9003:{summary:'50% HP, +100 Sleep; four hours wired.\n7-turn rush: STR/INT/DEX +75%, hit -15pp, WIS -25%.',benefit:'Restore 50% max HP and 100 Sleep; STR/INT/DEX +75% for 7 turns; stun resistance.',cost:'Native Rage; hit -15 percentage points and WIS -25% during rush. Cannot sleep while wired.',end:'After 4h: Mood -40 and Sleep -60.'},
 9010:{summary:'Mana recovery +15% max MP per hour; WIS +10%.\n150 min. More susceptible to confusion and charm.',benefit:'Recover 15% max MP per game hour while active; WIS +10%; Mood +12.',cost:'Confusion/charm/fear application rates x1.35.',end:'Mood falls by up to 7.'},
 9011:{summary:'MP costs -20%; silence/stun/confusion rates halved.\n2h. DEX -15%, evasion -8 percentage points.',benefit:'MP costs -20%; silence, stun and confusion application rates up to 50% lower; Mood +8.',cost:'DEX -15%; evasion -8 percentage points.',end:'Mood falls by up to 5.'},
 9012:{summary:'Friendly social actions +20%; social odds +8pp.\n3h. WIS -15%, charm susceptibility +40%; mood slump.',benefit:'Positive social actions up to 20% more effective; bribe/join/romance look bonuses +8pp; Mood +30.',cost:'WIS -15%; charm application rate x1.4. Existing social requirements remain.',end:'Mood falls by up to 20; Sleep -10.'},
 9013:{summary:'Rest recovery improved; confusion/fear resistance.\n4h. DEX -20%, hit -8pp; habit-forming.',benefit:'Rest recovery up to 25% greater; confusion/fear application rate up to 50% lower; Mood +16.',cost:'DEX -20%; hit -8 percentage points. Separate sedative dependence.',end:'Mood falls by up to 10; no healing or automatic sleep.'},
 9014:{summary:'Ease half of attached, recoverable injury stat penalties.\n3h. DEX -15%, WIS -10%, evasion -10pp. Strong dependence risk.',benefit:'Temporarily ease up to half of applied stat penalties from attached, non-ruined injuries; Mood +24.',cost:'DEX -15%; WIS -10%; evasion -10 percentage points. Does not heal, stop bleeding or restore limbs.',end:'Mood falls by up to 18; underlying injuries remain.'},
 9015:{summary:'Evasion +15 percentage points; a six-hour trip.\nHit -12pp; confusion susceptibility +50%.',benefit:'Evasion +15 percentage points; Mood +18. No actual future sight.',cost:'Hit -12 percentage points; confusion application rate x1.5; shares psychedelic tolerance.',end:'Mood falls by up to 12; Sleep -12.'}
};
const FAMILY_WITHDRAWAL={9001:9005,9003:9006,9012:9022,9013:9020,9014:9021};
const DEPENDENT_IDS=Object.keys(FAMILY_WITHDRAWAL).map(Number);
const drugUpdating=new WeakSet();
const STATE_NAMES={9001:'relaxed / distracted',9002:'signal bleed',9003:'wired',9004:'rush: 7 turns',9005:'withdrawal',9006:'withdrawal',9010:'attuned / receptive',9011:'focused / tunnel vision',9012:'connected / trusting',9013:'quiet / sluggish',9014:'distant / unsteady',9015:'echoes / disoriented',9020:'withdrawal',9021:'withdrawal',9022:'withdrawal'};
const DRUG_STATES=Object.keys(STATE_NAMES).map(Number);
function injectDrugStates(){
 if(!window.$dataStates)return;
 DRUG_STATES.forEach(id=>{
  if($dataStates[id]&&!$dataStates[id]._exoticSubstances)throw databaseCollision('state',id,$dataStates[id]);
  $dataStates[id]={id,name:STATE_NAMES[id],iconIndex:GOODS[id]?id:id===9004?9003:176,restriction:0,priority:50,motion:0,overlay:0,traits:[],note:'<Nature: Mundane>',message1:'',message2:'',message3:'',message4:'',messageType:1,autoRemovalTiming:id===9004?2:0,minTurns:7,maxTurns:7,removeAtBattleEnd:id===9004,removeByDamage:false,removeByRestriction:false,removeByWalking:false,stepsToRemove:100,chanceByDamage:0,_exoticSubstances:true};
  DataManager.extractMetadata($dataStates[id]);
 });
}
function drugRecords(a){return a._exoticSubstanceDrugs||(a._exoticSubstanceDrugs={});}
function drugRecord(a,id){const records=drugRecords(a);return records[id]||(records[id]={stamp:now(),last:null,tolerance:0,dependence:0,dependent:false,craving:0,relief:0,uses:0});}
function notifyDrug(a,message){if(window.ParchmentToast?.show)ParchmentToast.show((a.name?.()||'Character')+': '+message,{severity:'info'});}
function updateDrug(a,id){
 id=Number(id);const d=DRUGS[id],r=a?._exoticSubstanceDrugs?.[id];if(!d||!r)return null;
 if(drugUpdating.has(a))return r;
 if(d.family!==id)updateDrug(a,d.family);
 drugUpdating.add(a);try{
 const t=now(),elapsed=Math.max(0,t-r.stamp),age=r.last===null?0:Math.max(0,t-r.last);
 if(d.family===id){
  r.tolerance=Math.max(0,r.tolerance-elapsed*d.recovery/1440);
  const recovery=Math.max(0,t-Math.max(r.stamp,(r.last??t)+d.grace));
  r.dependence=Math.max(0,r.dependence-recovery*d.depRecovery/1440);
  r.relief=Math.max(0,(r.relief||0)-elapsed/6);
  if(r.dependent&&r.dependence<20)r.dependent=false;
  r.craving=r.dependent?clamp(clamp((age-d.grace)/d.ramp*100,0,100)-r.relief,0,100):0;
 }
 r.stamp=t;
 if(id===9001&&r.active){
  const layers=(r.active.layers||[{until:r.active.until,strength:r.active.strength}]).filter(x=>x.until>t);
  r.active.layers=layers;
  if(layers.length)r.active.until=Math.max(...layers.map(x=>x.until));
 }
 if(r.active&&id===9010){
  const high=r.active,end=Math.min(t,high.until),minutes=Math.max(0,end-(high.manaStamp??t));
  high.manaStamp=end;
  const mana=(high.manaRemainder||0)+minutes/60*(a.mmp||0)*.15*high.strength,whole=Math.floor(mana);
  high.manaRemainder=mana-whole;
  if(whole>0&&(!a.isAlive||a.isAlive()))a.gainMp?.(whole);
 }
 if(r.active&&t>=r.active.until){
  const high=r.active;delete r.active; // Remove before callbacks can refresh/re-enter.
  if(id===9003){a.addLeisure?.(-40);a.addSleep?.(-60);notifyDrug(a,'Crash: Mood -40, Sleep -60.');}
  else {a.addLeisure?.(-(high.drop||0));if(id===9012)a.addSleep?.(-10);if(id===9013&&high.sleepDrop)a.addSleep?.(-high.sleepDrop);if(id===9015)a.addSleep?.(-12);}
  a.removeState?.(id);if(id===9003)a.removeState?.(9004);
 }
 const withdrawal=FAMILY_WITHDRAWAL[id];
 if(withdrawal){const wanted=r.dependent&&r.craving>=50;
  if(wanted&&!a.isStateAffected?.(withdrawal)){a.addState?.(withdrawal);notifyDrug(a,'Withdrawal. Rest and abstinence gradually resolve dependence.');}
  else if(!wanted&&a.isStateAffected?.(withdrawal))a.removeState(withdrawal);
 }
 return r;
 }finally{drugUpdating.delete(a);}
}
function updateDrugs(a){if(!a)return;for(const id of Object.keys(a._exoticSubstanceDrugs||{}))if(DRUGS[id])updateDrug(a,id);}
function activeDrug(a,id){return updateDrug(a,id)?.active||null;}
function canUseDrug(a,id,prepared=false){
 if(!a||!DRUGS[id])return false;updateDrugs(a);
 if(id===9013&&!prepared)return false;
 return (!a.isAlive||a.isAlive())&&!GOOD_IDS.some(other=>{
  if(DRUGS[other].family!==DRUGS[id].family||!a._exoticSubstanceDrugs?.[other]?.active)return false;
  return !(id===9001&&other===9001&&(a._exoticSubstanceDrugs[other].active.layers?.length||1)<5);
 });
}
function consumeDrug(a,id,preparation=null){
 if(!canUseDrug(a,id,!!preparation))return false;
 const d=DRUGS[id],r=drugRecord(a,id),f=drugRecord(a,d.family),previous=r.active;
 // One freshly layered Meld application is one session: later patches use the
 // tolerance present when the first layer went on, rather than creating and
 // immediately suffering their own tolerance. Old tolerance still matters.
 const strength=id===9001&&previous?(previous.stackStrength??previous.strength):Math.max(.3,1-f.tolerance/100),before=a.leisure?.()||0;
 const insulation=clamp(Number(preparation?.insulation)||0,0,.55),benefitScale=clamp(Number(preparation?.benefitScale??1),0,1),penaltyScale=Math.max(0,Number(preparation?.penaltyScale??1));
 if(d.boost&&!previous)a.addLeisure?.(Math.round(d.boost*strength*benefitScale));
 const gained=Math.max(0,(a.leisure?.()||0)-before);
 r.active={until:now()+d.duration,strength,stackStrength:id===9001?strength:undefined,benefitStrength:strength*benefitScale,penaltyScale,raw:!!preparation?.raw,sleepDrop:Number(preparation?.sleepDrop)||0,drop:previous?.drop??(preparation?.drop??(d.boost?Math.floor(gained*d.drop/d.boost*(1-insulation)):0)),insulation,uneasy:id===9002&&Math.random()<(before<30?.35:.1),manaStamp:now(),manaRemainder:0};
 if(id===9001)r.active.layers=[...(previous?.layers|| (previous?[{until:previous.until,strength:previous.strength}]:[])),{until:r.active.until,strength}];
 f.tolerance=clamp(f.tolerance+d.tolerance,0,100);f.dependence=clamp(f.dependence+d.dependence,0,100);r.uses++;r.last=now();r.stamp=now();f.last=now();f.stamp=now();f.craving=0;f.relief=0;
 if(f.dependence>=45&&!f.dependent){f.dependent=true;notifyDrug(a,(d.family===9001?'Cannabis':d.name)+' dependence developed.');}
 a.addState?.(id);
 if(id===9001&&!previous)a.addSocial?.(6);
 if(id===9012)a.addSocial?.(Math.round(12*strength));
 if(id===9003){a.gainHp?.(Math.round(a.mhp*.5*strength));a.addSleep?.(Math.round(100*strength));a.addState?.(7);a.addState?.(9004);}
 updateDrug(a,d.family);a.refresh?.();
 notifyDrug(a,STATE_NAMES[id]+'. Benefits '+Math.round(r.active.benefitStrength*100)+'%.');return true;
}
function drugStatus(a){if(!a)return [];updateDrugs(a);return Object.entries(a._exoticSubstanceDrugs||{}).filter(([id,r])=>DRUGS[id]&&(r.uses||r.active||r.dependent)).map(([id,r])=>{const f=a._exoticSubstanceDrugs[DRUGS[id].family]||r;return {name:DRUGS[id].name,family:DRUGS[id].family===9001?'Cannabis':DRUGS[id].family===9002?'Psychedelics':DRUGS[id].name,tolerance:Math.round(f.tolerance),dependence:Math.round(f.dependence),dependent:f.dependent,craving:Math.round(f.craving),minutesRemaining:r.active?Math.max(0,r.active.until-now()):0,uses:r.uses};});}
function injuryRelief(a,id){
 const high=activeDrug(a,9014);if(!high||![1,2,3].includes(a.actorId?.())||id===0)return 1;
 const total=Number(a._statModifiers?.[id])||0;if(total>=0||total<=-95)return 1;
 let eligible=0;
 for(const p of Object.values(a._bodyParts||{}))if(p?.damaged&&!p.ruined&&!p._cutOff&&p.appliedStatEffect&&p.statEffect?.param===id)eligible+=Math.min(0,Number(p._appliedStatAmount??p.statEffect.brokenAmount??p.statEffect.amount)||0);
 const relief=Math.min(-total,-eligible)*.5*high.strength;
 return (1+(total+relief)/100)/(1+total/100);
}
function meldLayers(a){const h=activeDrug(a,9001);return h?(h.layers?.length||1):0;}
function meldProtection(a){const h=activeDrug(a,9001);if(!h)return 0;const layers=h.layers||[{strength:h.strength}];return layers.reduce((v,x,i)=>v+([.10,.09,.08,.07,.06][i]||0)*x.strength,0);}
function hushPenalty(a){const h=activeDrug(a,9013);return h?(1-(h.insulation||0))*(h.penaltyScale??1):0;}
function hushBenefit(a){const h=activeDrug(a,9013);return h?(h.benefitStrength??h.strength):0;}
function installDrugEffects(){
 wrap(DataManager,'onLoad',function(orig,obj){if(obj===window.$dataStates)injectDrugStates();return orig.call(this,obj);});
 if(window.$dataStates?.length)injectDrugStates();
 wrap(Game_Action.prototype,'testApply',function(orig,a){return isDrug(this.item())?canUseDrug(a,this.item().id):orig.call(this,a);});
 wrap(Game_Action.prototype,'apply',function(orig,a){const item=this.item();if(!isDrug(item))return orig.call(this,a);if(!canUseDrug(a,item.id)){a.clearResult?.();return;}orig.call(this,a);const result=a.result?.();if(result?.isHit&&!result.isHit())return;if(consumeDrug(a,item.id)&&result)result.success=true;});
 const B=window.Game_BattlerBase?.prototype;
 if(B){
  wrap(B,'paramRate',function(orig,id){let v=orig.call(this,id);const h=activeDrug(this,9001),s=activeDrug(this,9002),c=activeDrug(this,9003),seam=activeDrug(this,9010);
   if(h&&id===6)v*=1-(.1+.03*(meldLayers(this)-1));if(s&&id===5)v*=1+.15*s.strength;
   if(c&&this.isStateAffected?.(9004)){if([2,4,6].includes(id))v*=1+.75*c.strength;if(id===5)v*=.75;}
   if(seam&&id===5)v*=1+.1*seam.strength;
   if(activeDrug(this,9011)&&id===6)v*=.85;
   if(activeDrug(this,9012)&&id===5)v*=.85;
   if(activeDrug(this,9013)&&id===6)v*=1-.2*hushPenalty(this);
   if(activeDrug(this,9014)){if(id===6)v*=.85;if(id===5)v*=.9;}
   if(this.isStateAffected?.(9005)&&[5,6].includes(id))v*=.95;
   if(this.isStateAffected?.(9006)&&[2,4,6].includes(id))v*=.9;
   if(this.isStateAffected?.(9020)&&id===6)v*=.95;
   if(this.isStateAffected?.(9021)&&id===6)v*=.9;
   return v;
  });
  wrap(B,'xparam',function(orig,id){let v=orig.call(this,id);
   if(id===0){if(activeDrug(this,9001))v-=.05+.01*(meldLayers(this)-1);const s=activeDrug(this,9002);if(s)v-=s.uneasy?.15:.1;if(activeDrug(this,9003)&&this.isStateAffected?.(9004))v-=.15;if(activeDrug(this,9013))v-=.08*hushPenalty(this);if(activeDrug(this,9015))v-=.12;}
   if(id===1){if(activeDrug(this,9011))v-=.08;if(activeDrug(this,9014))v-=.1;const high=activeDrug(this,9015);if(high)v+=.15*high.strength;}
   return v;
  });
  wrap(B,'sparam',function(orig,id){const v=orig.call(this,id);return id===7?v*(1-meldProtection(this)):v;});
  wrap(B,'skillMpCost',function(orig,skill){const cost=orig.call(this,skill),high=activeDrug(this,9011);return high?Math.ceil(cost*(1-.2*high.strength)):cost;});
  wrap(B,'stateRate',function(orig,id){let v=orig.call(this,id);const name=window.$dataStates?.[id]?.name||'',conf=id===8||/confus|confond/i.test(name),fear=/fear|afraid|terror|panic|paura/i.test(name),charm=id===9||/charm|ammalia/i.test(name);
   if(activeDrug(this,9010)&&(conf||fear||charm))v*=1.35;
   const wax=activeDrug(this,9011);if(wax&&(conf||id===6||id===13))v*=1-.5*wax.strength;
   if(activeDrug(this,9012)&&charm)v*=1.4;
   const hush=activeDrug(this,9013);if(hush&&(conf||fear))v*=1-.5*hushBenefit(this);
   if(activeDrug(this,9015)&&conf)v*=1.5;
   if(activeDrug(this,9003)&&this.isStateAffected?.(9004)&&(id===13||/stun/i.test(name)))v*=.25;
   if(this.isStateAffected?.(9020)&&(fear||conf))v*=1.25;
   return v;
  });
 }
 const A=window.Game_Actor?.prototype;
 if(A){
  wrap(A,'param',function(orig,id){return Math.max(1,Math.round(orig.call(this,id)*injuryRelief(this,id)));});
  wrap(A,'reduceHunger',function(orig,n){const stacks=meldLayers(this);return orig.call(this,n*(stacks?1+.05+.1*stacks:1));});
  wrap(A,'reduceSleep',function(orig,n){return orig.call(this,n*(1+.15*meldLayers(this)));});
  wrap(A,'addSleep',function(orig,n){updateDrugs(this);let factor=this.isStateAffected?.(9005)?.85:1;if(this.isStateAffected?.(9020))factor*=.8;
   // Only small rest ticks, not stimulant/food/injection Sleep bonuses.
   const h=activeDrug(this,9013);if(h&&n>0&&n<=1)factor*=1+.25*hushBenefit(this);return orig.call(this,n>0?n*factor:n);});
  wrap(A,'addLeisure',function(orig,n){updateDrugs(this);let f=this.isStateAffected?.(9006)?.8:1;if(this.isStateAffected?.(9021)||this.isStateAffected?.(9022))f*=.85;return orig.call(this,n>0?n*f:n);});
 }
 if(window.Scene_Map)wrap(Scene_Map.prototype,'_beginSleepAdvance',function(orig,...args){const a=$gameParty.leader?.(),high=activeDrug(a,9013);if(activeDrug(a,9003)&&!args[1]){notifyDrug(a,'Too wired to sleep.');return;}const r=orig.apply(this,args),s=this._sleepAdvance;
  if(high&&s&&!s.isWait&&s.sleepTarget>s.sleepStart){const overlap=clamp((high.until-now())/Math.max(1,s.totalMinutes),0,1);const limit=Number(window.PluginManager?.parameters?.('Core/TimeDateSystem')?.maxSleep)||100;s.sleepTarget=Math.min(limit,s.sleepTarget+(s.sleepTarget-s.sleepStart)*.25*high.strength*overlap);}return r;
 });
 const look=window.NPCEmpathize?.Look;
 if(look){wrap(look,'socialMult',function(orig,a,tone){const v=orig.call(this,a,tone),h=activeDrug(a,9012);return h&&tone==='positive'?v*(1+.2*h.strength):v;});
  wrap(look,'odds',function(orig,kind,a,p){return orig.call(this,kind,a,p)+(['bribe','join','romance'].includes(kind)?Math.round(8*(activeDrug(a,9012)?.strength||0)):0);});}
 const sys=window.AddictionSystem;
 if(sys){
  for(const id of DEPENDENT_IDS){const d=DRUGS[id];if(!sys.LIST.some(x=>x.key===d.key))sys.LIST.push({key:d.key,traitId:-id,rate:0});}
  let nativeWithdrawal=false;const byKey=key=>DEPENDENT_IDS.find(id=>DRUGS[id].key===key);
  wrap(sys,'label',function(orig,key){return key==='meld'?'Cannabis':DRUGS[byKey(key)]?.name||orig.call(this,key);});
  wrap(sys,'keysFor',function(orig,a){const keys=orig.call(this,a);if(nativeWithdrawal)return keys.filter(k=>!byKey(k));updateDrugs(a);for(const id of DEPENDENT_IDS)if(a?._exoticSubstanceDrugs?.[id]?.dependent&&!keys.includes(DRUGS[id].key))keys.push(DRUGS[id].key);return keys;});
  wrap(sys,'craving',function(orig,a,key){const id=byKey(key);if(!id)return orig.call(this,a,key);const r=updateDrug(a,id);return r?.dependent?r.craving:null;});
  wrap(sys,'setCraving',function(orig,a,key,value){const id=byKey(key);if(!id)return orig.call(this,a,key,value);const r=updateDrug(a,id);if(r){r.relief=Math.max(0,r.relief+r.craving-clamp(value,0,100));r.craving=clamp(value,0,100);}});
  wrap(sys,'updateWithdrawal',function(orig,a){nativeWithdrawal=true;try{return orig.call(this,a);}finally{nativeWithdrawal=false;updateDrugs(a);}});
 }
 if(window.Intoxication)wrap(Intoxication,'slur',function(orig,text,a){let out=orig.call(this,text,a);if(!String(text||'').trim()||Math.random()>.2)return out;
  const lines={9003:' ...Right. What next?',9002:' ...There is a pattern here.',9001:' ...Lost my train of thought.',9010:' ...Did you feel that?',9011:' ...One thing at a time.',9012:' ...It is good to talk to you.',9013:' ...Give me a moment.',9014:' ...Sounds far away.',9015:' ...For a moment, that looked different.'};
  for(const id of Object.keys(lines))if(activeDrug(a,Number(id)))return out+lines[id];return out;
 });
}

// Crime integration: capture sight while the map is active, decide reporting
// only after an actual sale, and aggregate a checkout before filing its charge.
let crimeBatch=null;
const crimeDebug={enabled:false,last:null};
function crimePlace(){return String(window.ProceduralHouseSystem?.getContainerInstanceKey?.()||$gameMap.mapId());}
function actorFor(ctx){return $gameActors.actor?.(ctx.actorId)||$gameParty.leader?.();}
function partyWitness(w){return !!w.party||($gameParty.allMembers?.()||$gameParty.members?.()||[]).some(a=>a.name?.()===w.name||a._npcName===w.name);}
function reportingChance(w,ctx){
 if(partyWitness(w)||w.name===ctx.name||(w.eventId!=null&&w.eventId===ctx.event))return 0;
 if(w.officer)return 1;
 const p=profile(w.name),actor=actorFor(ctx),helper=window.NPCEmpathize?._helpers;
 const score=clamp(Number(p&&actor&&helper?._npcEffectiveOpinion?helper._npcEffectiveOpinion(p,actor):(w.opinion||0))||0,-100,100);
 if(score>=50)return 0;
 // Retain the native intimidation exemption, using the actual seller's look.
 const intimidation=Number(window.LookStats?.ofActor?.(actor)?.intimidation)||0;
 const fear=Math.round(intimidation/2*(intimidation>=100?1.5:1));
 if(score>=60-fear)return 0;
 const mode=window.$gameWeather?.sunlightMode,h=Number(window.$gameWeather?.currentHour??String($gameVariables.value(113)||'').match(/ (\d{1,2}):\d{2}$/)?.[1]);
 const night=mode==='night'||(mode!=='day'&&Number.isFinite(h)&&(h>=20||h<6));
 return Math.min(.75,(score<0?.25-score*.005:.25)+(night?.10:0));
}
function captureCrimeSight(){
 const cs=window.CrimeSystem;
 if(!window.Scene_Map||!(SceneManager._scene instanceof Scene_Map)||!cs?.witnessesAt)return null;
 const witnesses=cs.witnessesAt($gamePlayer.x,$gamePlayer.y).map(w=>{
  const ev=$gameMap.event?.(w.eventId);
  const name=window.NPCSim?.npcNameForEvent?.(ev)||window.NPCEmpathize?._helpers?._getNPCName?.(w.eventId)||w.name;
  return {...w,name,party:w.party||partyWitness({name})};
 }).filter(w=>w.officer||w.party||profile(w.name)); // Named furniture is not a witness.
 const sight={map:$gameMap.mapId(),place:crimePlace(),x:$gamePlayer.x,y:$gamePlayer.y,witnesses};
 $gameTemp._exoticSubstancesCrimeSight=sight;return sight;
}
function attachCrimeSight(ctx){
 const sight=captureCrimeSight()||$gameTemp._exoticSubstancesCrimeSight;
 ctx.crimeSight=sight&&sight.map===ctx.map&&sight.place===crimePlace()?sight:null;
}
function recordDrugSale(ctx,item,n){
 if(ctx.kind==='net'||!n||!window.CrimeSystem)return;
 const m=market(ctx.city,item.id),value=Math.round(m.low+(m.high-m.low)*roll(ctx.key+':quote:'+item.id))*n;
 if(crimeBatch&&crimeBatch.ctx===ctx){crimeBatch.value+=value;crimeBatch.units+=n;return;}
 finishDrugSale({ctx,value,units:n});
}
function finishDrugSale(sale){
 if(!sale.value)return;
 const {ctx}=sale,cs=window.CrimeSystem,sight=ctx.crimeSight;
 const result={gameMinute:now(),map:$gameMap.mapId(),buyer:ctx.name,actorId:ctx.actorId,units:sale.units,value:sale.value,baseFine:25000+Math.round(sale.value*.5),reported:false,charged:0,witnesses:[]};
 crimeDebug.last=result;
 if(!cs?.addCrime||!sight||sight.map!==$gameMap.mapId()||sight.place!==crimePlace()){
  result.unavailable='Map witness context unavailable';
  console.warn('[Exotic Substances] Completed sale has no crime sight context.');return;
 }
 const seen=new Set();
 for(const w of sight.witnesses){
  if(seen.has(w.name))continue;seen.add(w.name);
  const chance=reportingChance(w,ctx),reported=chance===1||(chance>0&&Math.random()<chance);
  result.witnesses.push({name:w.name,chance,reported});
 }
 result.reported=result.witnesses.some(w=>w.reported);
 const oldDeed=cs._deedFiled;
 try {
  if(window.WorldEvents?.record){
   window.WorldEvents.record({verb:'drugDealing',actor:'player',target:ctx.name,witnesses:sight.witnesses.map(w=>w.name),reported:result.reported,severity:Math.min(100,Math.round(20*Math.log10(1+result.baseFine/25)))});
   cs._deedFiled=true;
  }
 if(result.reported){const before=cs.getTotalBounty(),wasWanted=!!cs.isWanted?.();cs.addCrime('Drug Dealing',result.baseFine,'drugDealing');result.charged=Math.max(0,cs.getTotalBounty()-before);result.heat=cs.heatPercent?.()??cs.getHeat?.()??0;result.manhunt=!wasWanted&&!!cs.isWanted?.();$gameTemp._exoticSubstancesPoliceRefresh=true;}
 } finally {cs._deedFiled=oldDeed;}
 if(result.charged>0){
  const message='Drug deal reported — Heat '+result.heat+'%'+(result.manhunt?' · MANHUNT':'');
  if(window.ParchmentToast?.show)ParchmentToast.show(message,{severity:'danger'});else window.$gameMessage?.add(message);
 }
 if(crimeDebug.enabled)console.info('[Exotic Substances] sale witnesses',result);
}
function withCrimeCheckout(ctx,fn){
 if(crimeBatch)return fn();
 const batch={ctx,value:0,units:0};crimeBatch=batch;
 try{return fn();}finally{crimeBatch=null;finishDrugSale(batch);}
}
function prisonMinutes(bounty){return Math.min(7*24,Math.ceil(Math.max(0,bounty)/10000))*60;}
function payArrestFine(){
 const cs=window.CrimeSystem;if(!cs)return;
 const amount=cs.payableBounty?.()??cs.getTotalBounty();
 if($gameParty.gold()<amount){
  window.$gameMessage?.add('You do not have enough money to pay the fine.');
  this.command119?.(['Restart']);return;
 }
 $gameParty.loseGold(amount);
 if(cs.getCrimes&&cs.removeCrime){while(cs.getCrimes().length)cs.removeCrime(0);}
 else cs.clearBounty();
 window.$gameMessage?.add('Paid €'+(amount/100).toFixed(2)+'.'+(cs.getTotalBounty()>0?' Other charges or marks remain.':' Your bounty is cleared.'));
}
function arrestPaymentList(list){
 if(list!==window.$dataCommonEvents?.[124]?.list)return list;
 const start=list.findIndex(c=>c.code===402&&c.parameters[0]===0);
 if(start<0)return list;
 let end=start+1;while(end<list.length&&!(list[end].code===402&&list[end].indent===list[start].indent))end++;
 const branch=list.slice(start+1,end);
 // A later upstream build that already deducts money must not pay twice.
 if(branch.some(c=>c.code===125||([355,655].includes(c.code)&&/loseGold|gainGold/.test(String(c.parameters[0])))))return list;
 return list.map((c,i)=>i>start&&i<end&&c.code===357&&/CrimeSystem$/.test(c.parameters[0])&&c.parameters[1]==='clearBounty'
  ?{...c,parameters:['ExoticSubstances','payArrestFine','Pay arrest fine',{}]}:c);
}
function installCrime(){
 if(window.Scene_Map){
  wrap(Scene_Map.prototype,'stop',function(orig){captureCrimeSight();return orig.apply(this,Array.prototype.slice.call(arguments,1));});
  wrap(Scene_Map.prototype,'start',function(orig){$gameTemp._exoticSubstancesCrimeSight=null;return orig.apply(this,Array.prototype.slice.call(arguments,1));});
  wrap(Scene_Map.prototype,'update',function(orig,...args){
   const result=orig.apply(this,args);
   if($gameTemp._exoticSubstancesPoliceRefresh&&!$gameMap.isEventRunning?.()){
    $gameTemp._exoticSubstancesPoliceRefresh=false;
    try{window.NPCSystem?.staffPolice?.();}catch(e){console.warn('[Exotic Substances] Deferred police staffing failed.',e);}
   }
   return result;
  });
 }
 wrap(Scene_Shop.prototype,'prepare',function(orig,...args){const result=orig.apply(this,args);attachCrimeSight(this._exoticSubstanceContext);return result;});
 wrap(Scene_Shop.prototype,'commitSale',function(orig,entries){return withCrimeCheckout(this._exoticSubstanceContext,()=>orig.call(this,entries));});
 if(window.Game_Interpreter)wrap(Game_Interpreter.prototype,'setup',function(orig,list,event){return orig.call(this,arrestPaymentList(list),event);});
 window.PluginManager?.registerCommand?.('ExoticSubstances','payArrestFine',payArrestFine);
 const pm=window.prisonManager;
 if(pm){
  wrap(DataManager,'createGameObjects',function(orig,...args){if(window.$gameSystem)pm.stopPrisonTime();return orig.apply(this,args);});
  wrap(pm,'startPrisonTime',function(orig,bounty,minutes){
   if(this._isInPrison)return;
   const saved=$gameSystem._exoticSubstancesCrimeSentence;
   const deadline=saved&&saved.map===$gameMap.mapId()?saved.release:now()+(minutes>0?minutes:prisonMinutes(bounty));
   orig.call(this,bounty,Math.max(1,deadline-now()));
   this._sentenceReleaseTime=deadline;this._servedSentence=true;
   $gameSystem._exoticSubstancesCrimeSentence={map:$gameMap.mapId(),release:deadline};
   this._refresh?.(bounty);
  });
  wrap(pm,'stopPrisonTime',function(orig){delete $gameSystem._exoticSubstancesCrimeSentence;return orig.call(this);});
  // The base manager is a singleton; reset the previous session before loading
  // a save, without deleting the sentence from the newly loaded game system.
  wrap(DataManager,'extractSaveContents',function(orig,c){pm.stopPrisonTime();$gameTemp._exoticSubstancesCrimeSight=null;return orig.call(this,c);});
 }
 // Bind the action, not its containing plugin name. Aliases share one wrapper,
 // and commands registered later receive the same guard.
 if(window.PluginManager){
  const wrappers=new WeakMap();
  const adapt=fn=>{
   if(typeof fn!=='function')return fn;
   if(wrappers.has(fn))return wrappers.get(fn);
   const wrapped=function(...args){
   const manager=window.prisonManager;
   if(!manager?._isInPrison||manager._releasing)return;
   const remaining=Math.max(0,(manager._sentenceReleaseTime??now())-now());
   if(remaining>0){
    if(!window.TimeDateSystem?.passTime){window.$gameMessage?.add('Time advancement is unavailable. Use the prison sleep option.');return;}
    // Custody provides meals/rest; normal world and addiction time still passes.
    TimeDateSystem.passTime(remaining,{drain:false});
    expire();
   }
    return fn.apply(this,args);
   };
   wrappers.set(fn,wrapped);wrappers.set(wrapped,wrapped);return wrapped;
  };
  for(const key of Object.keys(PluginManager._commands||{}))if(key.endsWith(':autoServeSentence'))PluginManager._commands[key]=adapt(PluginManager._commands[key]);
  wrap(PluginManager,'registerCommand',function(orig,plugin,command,fn){return orig.call(this,plugin,command,command==='autoServeSentence'?adapt(fn):fn);});
 }
}

// Authored mod lore. Rumours are explicitly distinguished from world facts.
const LORE=[
 {
  "key": "Riftflower family",
  "aliases": [
   "seam-reactive cannabis",
   "cannabis"
  ],
  "text": "Cannabis growing near dimensional seams changed gradually during the Squishing. Growers selected stable flower as Riftflower, pressed lower-grade material into Meld Resin, and refined exceptional harvests into Nectar. The preparations offer different benefits: magical protection, replenished reserves, or efficient uninterrupted casting. All forms are illegal because their seam-reactive properties cannot be reliably separated from the plant. They share tolerance and dependence; expensive preparations do not erase an existing habit.",
  "brief": "Riftflower, Meld Resin and Nectar are illegal seam-reactive cannabis preparations with shared tolerance and dependence, but distinct magical benefits."
 },
 {
  "key": "Meld Resin",
  "aliases": [
   "Meld"
  ],
  "item": 9001,
  "text": "Meld Resin is made by applying heat and sustained physical or magical pressure to Riftflower. Ordinary makers crush low-quality flower and trimmings into dense brown resin; it is rarely made with higher-quality material, though the method permits it. Users soften and work the resin into the skin, securing it with a patch or bandage. In recreational circles, a ball or coil passes between palms before each person takes a portion. Meld makes the user's magical boundary less receptive, dulling incoming magic as well as sharpening hunger and drowsiness. Light use is sociable and relaxing; fighters load up before dangerous work. Up to five applications can overlap, each lasting two hours, with gradually diminishing protection and mounting physical penalties. It shares cannabis tolerance and dependence with Riftflower and Nectar.",
  "brief": "Meld is usually low-grade brown Riftflower resin compressed with heat and force. Worked into skin and secured with cloth, it relaxes and protects against magic; layered use increases protection, hunger, drowsiness and distraction."
 },
 {
  "key": "Riftflower",
  "aliases": [],
  "item": 9010,
  "text": "As the Squishing made cannabis near magical seams unpredictable, growers selected lines with a repeatable magical character. Carefully selected flower became Riftflower; poorer harvests and trimmings usually became Meld, while exceptional flower supplied Nectar refiners. Preloaded clear nasal inhalers release the flower's aromatic vapor without burning it. Travelling casters value the gradual recovery of magical reserves and heightened receptivity. The same receptivity increases susceptibility to fear, confusion and charm. Good flower travels in small quantities and commands more than ordinary Meld. Its effects last roughly two and a half hours, and changing to another cannabis preparation does not bypass tolerance.",
  "brief": "Riftflower is selected seam-reactive cannabis in a preloaded nasal inhaler. It restores magical reserves and improves Wisdom but increases susceptibility to fear, confusion and charm."
 },
 {
  "key": "Nectar",
  "aliases": [],
  "item": 9011,
  "text": "Nectar is a golden concentrate refined from exceptional Riftflower. Developed for spellcasters who needed sustained control rather than a broad rush of receptivity, it improves casting efficiency and resistance to disruption. Flash-freezing the concentrate produces a crystalline skin and releases dense amber vapor, inhaled before it thaws. Frosted glass flasks protect the preparation in transit. The focus is narrow: users resist magical interruption while reacting more slowly to physical danger. Only the best flower yields consistent batches, making Nectar rare and lucrative. It occupies the premium end of the Riftflower trade and shares the family's tolerance and dependence.",
  "brief": "Nectar is premium golden Riftflower concentrate. Flash-freezing releases inhalable amber vapor; it reduces MP costs and magical disruption at the expense of physical reactions and awareness."
 },
 {
  "key": "Syntheogen",
  "aliases": [
   "Synth",
   "synthetic psilocybin",
   "Synth. Psilocybin"
  ],
  "item": 9002,
  "text": "Syntheogen, usually called Synth, is a synthetic derivative of psilocybin developed by Continuity researchers. Traditional psychedelic mushroom strains gradually stopped fruiting reliably as the Squishing progressed; ordinary fungi were not universally lost. Growers, chemists and ecstatic practitioners sought to preserve experiences their cultures could no longer reliably reproduce. Synth deliberately inverted the old ideal of unprocessed natural medicine: a standardized chemical primer whose receptive state could be shaped by a Bloomprint. Without a print, it produces a weaker, unstructured trip shaped by mood and surroundings. It lifts mood and encourages unusual associations while impairing aim; poor mental state increases the risk of unease. Rapid tolerance makes repeated use unrewarding. It shares psychedelic tolerance with Splice and creates little physical dependence.",
  "brief": "Syntheogen, street name Synth, is a synthetic psilocybin derivative born from Continuity. Unprinted Synth produces a weaker, unstructured trip; mood and Wisdom rise, aim suffers, and unease is possible. Rapid tolerance overlaps with Splice."
 },
 {
  "key": "Fractilized Cocaine",
  "aliases": [
   "Frack",
   "Frac",
   "Fractal",
   "Frack Coca"
  ],
  "item": 9003,
  "text": "Fractilized Cocaine is an illegal derivative of Panacea's decriminalized Red Cocaine, known as Frack, Frac or Fractal. Red Cocaine processing assembles a proprietary crimson stabilizing co-crystal from ordinary ingredients. Its structure regulates absorption, but cannot be isolated, stored or synthesized independently. Once the completed preparation matures, reclamation can remove the stabilizer while repeating its structural imprint through the remaining cocaine. The result is pale branching crystals that accelerate rather than restrain the drug's effects. Raw source material lacks that imprint: Frack depends on completed Red Cocaine. Old or damaged stock became traditional cheap feedstock, not a chemical necessity. The first batches were traced to Y2K-era reclamation work; claims about the facility and its ownership remain disputed, and Panacea denies the lineage. Held beneath the tongue, the branches dissolve in time with the pulse and accelerate as the heart does. Users call the rush overclocking: a brief surge of capability followed by hours of wakeful confidence and impulsiveness, then exhaustion, sour mood and strong cravings.",
  "brief": "Frack, also Frac or Fractal, is Fractilized Cocaine reclaimed from matured Red Cocaine. Removing its crimson stabilizer leaves a repeating imprint and an uncontrolled overclocking effect. Powerful, habit-forming and illegal; Red Cocaine remains decriminalized."
 },
 {
  "key": "Vesper Wafers",
  "aliases": [
   "Wafer",
   "Vesper"
  ],
  "item": 9012,
  "text": "Vesper Wafers originated among post-Y2K Christian relief groups and displaced semiconductor workers. Repurposed fabrication equipment produced sacramental wafers whose circuitry could retain and convey emotional impressions. Informal vesper circles used them for fellowship and shared grief. After Continuity fractured, some of its researchers joined Vesper circles through informal channels and helped refine later designs. The wafers' origins predate that exchange. A wafer is held against the roof of the mouth and activated by sustained humming; vibration excites the circuitry, warming and dissolving its active layer. Groups often hum together. Modern makers need not share the founders' faith, but the scored golden cross remains recognizable. Users become sociable, trusting and less guarded. That trust can outrun judgment: recruitment schemes, confidence tricks and coercive rituals helped drive the wafers underground. They do not change another person's feelings or guarantee consent. Frequent use can make ordinary social connection feel unrewarding.",
  "brief": "Vesper Wafers, street name Wafer, are humming-activated sacramental circuit wafers of Christian relief origins. They improve sociability while weakening judgment and resistance to charm; repeated use is mildly habit-forming."
 },
 {
  "key": "Hush (drink kit)",
  "aliases": [
   "Hush",
   "Hush kit"
  ],
  "item": 9013,
  "text": "Hush began with underground compounders helping couriers navigate improvised post-Y2K checkpoints. It quieted shaking and panic without making lies true or defeating serious investigation. Bitter and poorly absorbed when swallowed outright, it became a thick communal drink prepared with jelly cubes and sugar pearls, held against the cheek to absorb before swallowing. Virtually every experienced user sweetens it, whether with plain juice or an elaborate crew recipe; supposed bitter devotees belong mostly to boasts and legends. Every crew swears by its own preparation as optimal. Sweet additives improve tolerability; better preparation insulates against sluggish reactions and the comedown without strengthening the main high or preventing dependence. Hush improves mood, rest and resistance to fear and confusion, but slows coordination. Users call it going quiet. Kits contain concentrate, jelly material and pearls because prepared batches degrade quickly. Hush and Lethe share some smuggling routes: Hush suppresses the mind's reaction to threat, while Lethe suppresses the body's warning of injury.",
  "brief": "Hush is a bitter communal sedative drink kit held against the cheek before swallowing. It quiets panic and aids rest but impairs coordination. Sweet preparation reduces downsides; dependence remains possible."
 },
 {
  "key": "Preparing Hush",
  "aliases": [
   "Hush preparation"
  ],
  "text": "For personal use, a Hush drink kit must be combined with one Food item through the cooking system. The completed batch is consumed immediately by the party; there is no Prepared Hush inventory item. Any Food works, but virtually every experienced user chooses something sweet. Personal recipes should vary with region, means and taste: simple juice or preserves are as credible as elaborate fruit, syrup, dessert or cocktail preparations. Non-sweet foods, milk, tea, beer and distilled alcohol all provide the same minimal insulation. Common sweets, fruit, sweetcorn, sea grapes, cacao pods and fresh mint form the first tier; richer desserts, honey mead and sweet cocktails the second; rare enchanted or hot fruit the third; exceptionally rare sweet produce the fourth. The cooking check, skill and tools influence preparation quality. Insulation reduces coordination penalties and the mood comedown, not tolerance or dependence.",
  "brief": "“Cook” Hush with one Food to serve the party immediately. Sweetness, price and rarity determine insulation potential; skill, tools and preparation quality determine the result. No separate prepared item is created."
 },
 {
  "key": "Lethe",
  "aliases": [
   "Lethe drops"
  ],
  "item": 9014,
  "text": "Lethe began as an emergency drug developed to meet the post-Y2K labor crisis. Corporations turned the emergency measure into policy, dosing injured workers and returning them to dangerous jobs until deaths, concealed injuries and dependence scandals led to its prohibition. Weaker supervised descendants remain legal in limited medical settings. Modern Lethe comes from two sources: old surplus recovered by smugglers and bootleg batches reconstructed from surviving field formulas. It remains familiar in older labor, courier and mercenary circles as dangerous occupational insurance. The eardrops suppress pain and physical urgency without repairing damage. Users can function through some recoverable injury penalties but lose balance, judgment and coordination. Repeated use produces substantial dependence; ordinary pain and bodily warnings become harder to tolerate while sober. Lethe does not restore health, stop bleeding or repair damaged limbs.",
  "brief": "Lethe is an illegal emergency eardrop drug abused by corporations during the post-Y2K labor crisis. Current supply is recovered surplus or bootleg production. It suppresses injury penalties without healing, impairing balance and judgment and creating substantial dependence."
 },
 {
  "key": "Splice",
  "aliases": [
   "Splice glyph",
   "Splice tattoo",
   "Splice patch"
  ],
  "item": 9015,
  "text": "Splice emerged from former Continuity workers who rejected the conversion of preserved experiences into licensed software. They embedded a psychedelic derivative and symbolic instructions into temporary leach-glyph transfers. Applied to skin, the glyph regulates absorption while shaping perception through the body itself. No licensed playback device or separate Bloomprint is needed. The anticipatory trip produces temporal distortions: users may avoid danger with uncanny timing while misjudging distance, direction and intent. Apparent foresight remains disputed, not established future sight. Its six-hour effects improve evasion and mood while harming aim and increasing confusion susceptibility. Splice shares Synth's rapid psychedelic tolerance but creates little physical dependence. Faulty transfers can distort the intended experience, and the active trip cannot simply be closed. Illegal psychedelic glyphwork appeals to occultists, clubgoers and those who distrust licensed media.",
  "brief": "Splice is a temporary leach-glyph transfer descended from Continuity. The body becomes both delivery system and experiential program; evasion improves while accuracy and orientation suffer. Shared psychedelic tolerance with Synth."
 },
 {
  "key": "Continuity",
  "aliases": [
   "Continuity work",
   "Continuity movement"
  ],
  "text": "Before Y2K, mushroom growers, counterculture chemists, rave artists, religious ecstatics, cultists, programmers and magical practitioners already shared techniques despite disagreeing about their meaning. The Squishing gradually made traditional psychedelic mushroom strains unreliable. Y2K's mass death and labor collapse pushed surviving practitioners into laboratories, clinics and magical research. Their unified goal was simple: a vision should not have to die with its witness. They separated altered experience into Syntheogen's receptive chemical state and a Bloomprint's structured instructions. The movement fractured over who could copy, sell, alter or suppress a preserved experience. Pharmaceutical ownership, religious revelation, art and consent became competing claims. Splice later carried the same research into the body.",
  "brief": "Continuity united disparate ecstatic traditions to preserve endangered experiences: a vision should not have to die with its witness. It produced Syntheogen and Bloomprints, then fractured over ownership and consent; Splice emerged from its dissidents."
 },
 {
  "key": "Applied Ecstatics",
  "aliases": [
   "ecstatic research"
  ],
  "text": "Applied ecstatics is the formal discipline descended from Continuity. Chemistry, sensory design, ritual, symbolism and magic are studied together to produce repeatable altered states. Institutional researchers adopted the term; some original practitioners object because it obscures the field's underground origins.",
  "brief": "Applied ecstatics is the institutional name for constructing altered states through drugs, sensory media, ritual and magic."
 },
 {
  "key": "Bloomprints",
  "aliases": [
   "Bloomprint",
   "trip prints"
  ],
  "text": "A Bloomprint encodes sensory, symbolic and sometimes magical instructions for a Synth-primed mind. The experience unfolds through each user's memories, retaining a recognizable emotional pattern rather than identical images. Prints preserve vanished mushroom trips, revelations, rituals, club experiences and dead artists' dreams. Some are therapeutic or devotional; others conceal recruitment, propaganda or malicious instructions. Religious authorities dispute whether a replayed revelation is communion or forgery; magical researchers ask whether a recorded spell-state is documentation or an executable spell. Underground copies can be remixed without warning. Bloomprints are reusable in the lore, but their gameplay playback is not available in this release; only unprinted Synth can currently be used.",
  "brief": "Bloomprints are reusable experiential programs for Synth, capable of carrying art, rituals or malicious instructions. Playback is a future feature; the player currently has only unprinted Synth."
 },
 {
  "key": "Microdosing",
  "aliases": [
   "microdose",
   "microdoses"
  ],
  "text": "Microdosing means taking a deliberately sub-intoxicating fraction for milder or more functional effects. The idea is discussed across every drug family, though inconsistent batches and delivery methods make precision unreliable. Familiarity with the concept does not imply personal use. This is a lore concept, not a separate dosing mechanic in this release.",
  "brief": "NPCs know microdosing as taking a small fraction of a drug for milder or functional effects. Views vary; some preparations are difficult to divide. Do not invent a player microdosing mechanic or assume the speaker uses drugs."
 },
 {
  "key": "Veilnet",
  "aliases": [
   "Veilnet Wire"
  ],
  "text": "The old dark web fractured when Y2K destroyed networks, infrastructure and the people who maintained them. Veilnet grew from efforts to reconnect concealed routes. Its modern surviving trade is dominated by drug smuggling. PharmaDrop hides its illicit catalogue behind a legitimate-looking pharmacy frontage. Veilnet Wire circulates local supply reports and route chatter: useful clues to changing markets, not promises of profit or proof that a specific factory or incident exists.",
  "brief": "Veilnet is a post-collapse clandestine network dominated by drug smuggling. PharmaDrop uses a pharmacy cover; Veilnet Wire reports real market conditions without guaranteeing profitable trades."
 },
 {
  "key": "PharmaDrop",
  "aliases": [],
  "text": "PharmaDrop is a Veilnet drug marketplace behind a pharmacy frontage. National catalogues share online stock and prices across cities and refresh on Mondays. Individual street traders retain their own stock, demand and trust requirements. Veilnet Wire reports supply changes and route chatter, leaving traders to investigate prices themselves.",
  "brief": "PharmaDrop is a covert Veilnet marketplace with country-based weekly catalogues. Its Wire carries supply signals, not guaranteed trading instructions."
 },
 {
  "key": "Underground drug trade",
  "aliases": [
   "illicit drug trade",
   "illegal drugs",
   "black market",
   "drug trade",
   "drug game",
   "drug dealing"
  ],
  "text": "Most drugs known before Y2K were decriminalized during reconstruction, and several were legalized outright. Modern enforcement focuses on unlicensed post-Y2K compounds associated with magical contamination, unauthorized alterations to the soul and unstable effects on surrounding reality. PharmaDrop's nine commodities are illegal, while Red Cocaine remains decriminalized and follows ordinary medical trade. National supply differences and individual traders create opportunities. Markets reconsider availability, stock, demand and prices each Monday. Related goods respond to shared supply events; these reports describe market conditions, not simulated factories or harvests. Personal trust opens counters; authorities refuse. Witnessed dealing may be reported, but party members never report and friendly ordinary witnesses do not report. Drug knowledge does not imply use, possession or willingness to sell.",
  "brief": "Most pre-Y2K drugs were decriminalized or legalized during reconstruction. Enforcement targets unlicensed post-Y2K compounds; their trade depends on regional supply, Monday cycles, individual demand and trust."
 }
];
const RARE_LORE_CHANCE=1/175;
const RARE_LORE=[
 ['meld-quality','Meld Resin','Good Meld can come from good flower. It usually doesn’t. Most people would rather inhale the nice crop and press the ugly bits.'],
 ['meld-circle','Meld Resin','You warm Meld between your palms, work it into the skin, then bind it down. Passing the coil around is half the pleasure.'],
 ['meld-five','Meld Resin','I’ve seen fighters go into a job wearing five Meld patches. Protected from every spell in the room and nearly asleep standing up.'],
 ['rift-inhaler','Riftflower','Riftflower isn’t burned. The inhaler draws its vapor through the nose. Smells pleasant enough, right until someone charms you out of your boots.'],
 ['rift-selection','Riftflower family','Growers didn’t invent Riftflower. They kept planting whatever survived near the seams until the plant started behaving consistently.'],
 ['nectar-frost','Nectar','Nectar is flash-frozen until the concentrate releases amber vapor that you inhale. Experienced refiners claim the frost pattern reveals whether the batch will steady a spell or smother it.'],
 ['nectar-harvest','Nectar','Meld is what growers do with the rough harvest. Nectar is what refiners do when the harvest is too good to waste.'],
 ['synth-fruiting','Syntheogen','Psychedelic shrooms didn’t vanish after Y2K. The useful ones just stopped fruiting when people expected them to. Synth was the answer.'],
 ['synth-unprinted','Syntheogen','Unprinted Synth doesn’t show you nothing. It shows you whatever your own head brought along.'],
 ['continuity-rule','Continuity','Continuity had one rule everyone understood: a vision shouldn’t have to die with its witness. Everything after that became an argument.'],
 ['print-label','Bloomprints','A familiar Bloomprint title proves nothing. Somebody can cut open the experience, put something else inside and keep the label.'],
 ['print-oldest','Bloomprints','The oldest Bloomprints supposedly preserve trips from mushroom strains that no longer fruit. Maybe they do; nobody alive can authenticate the originals.'],
 ['print-same-place','Bloomprints','Two people can run the same Bloomprint and see completely different things. Somehow, they still know they went to the same place.'],
 ['print-dreams','Bloomprints','Some Bloomprints preserve the recurring dreams of artists who died during Y2K. Every playback changes the details, but the dream always returns to the same place.'],
 ['print-revelation','Bloomprints','A Bloomprint can preserve a religious revelation. Whether replaying it is communion, imitation or theft depends entirely on which priest you ask.'],
 ['print-ritual','Bloomprints','Magicians still dispute whether a Bloomprint of a ritual is merely a recording or the ritual itself waiting to happen again.'],
 ['print-y2k','Bloomprints','There are Bloomprints recorded during the worst hours of Y2K. People trade them under false names because the originals have reputations.'],
 ['print-licensed','Bloomprints','Licensed Bloomprints have everything dangerous removed. Underground editors spend years trying to put it all back.'],
 ['splice-skin','Splice','Splice is a trip your skin runs for you. No screen, no player and no button to close it when you’ve had enough.'],
 ['splice-anticipation','Splice','Splice users sometimes turn before a door opens or move before something falls. Researchers call it distorted anticipation. Glyph artists insist the body simply knows before the mind does.'],
 ['splice-body','Continuity','Continuity preserved experiences as software. Splice artists put them back into the body.'],
 ['frack-finished','Fractilized Cocaine','Frack has to begin as finished Red Cocaine. The red part leaves a pattern behind when they pull it out, and that pattern is what makes the crystals run.'],
 ['frack-old-stock','Fractilized Cocaine','Old Red Cocaine became the traditional feedstock because reclamation crews could buy damaged stock cheaply. Fresh works too—if you’re willing to ruin it.'],
 ['frack-pulse','Fractilized Cocaine','Frack branches dissolve under your tongue in time with your pulse. Then your pulse gets faster, and so does everything else.'],
 ['frack-panacea','Fractilized Cocaine','Panacea Corporation insists Frack has no connection to Red Cocaine. Dealers think that’s the funniest thing Panacea has ever said.'],
 ['vesper-note','Vesper Wafers','Hold a Wafer against the roof of your mouth and hum. The circuitry warms when you find the right note. When a whole circle finds it together, users describe feeling the group breathe as one body.'],
 ['vesper-memory','Vesper Wafers','Vesper circles hum together until every wafer answers with heat. Older circles claim that if the harmony holds long enough, emotional memories begin passing between the singers.'],
 ['vesper-origin','Vesper Wafers','The cross on a Wafer came from Christian relief workers. The circuitry came from semiconductor workers standing beside them in the same ruined factories.'],
 ['vesper-trust','Vesper Wafers','Wafers make trust feel effortless. They don’t make the person you trusted worthy of it.'],
 ['hush-cheek','Hush (drink kit)','You don’t really drink Hush. You hold it against your cheek until everything starts going quiet, then swallow what’s left.'],
 ['hush-seagrape','Preparing Hush','My crew makes Hush with sea grapes and crushed sugar pearls. Hold it on the left side of your mouth, too. Everybody says that part’s nonsense, but everybody says their own way is best.'],
 ['hush-clockwise','Preparing Hush','Before a crossing, we pass the cup clockwise. One mouthful each, nobody swallows until the first person stops shaking. Nobody breaks the order.'],
 ['hush-residue','Hush (drink kit)','You can spot somebody who went quiet in a hurry. Slow hands, perfect composure and half a sugar pearl still stuck behind their teeth.'],
 ['hush-eleven','Preparing Hush','Ask ten crews how to prepare Hush and you’ll get eleven answers. The eleventh is from somebody who changed their mind while explaining it.'],
 ['hush-dry','Hush (drink kit)','Hush kits travel dry because a prepared batch goes foul quickly. What tastes terrible now tastes indescribable tomorrow.'],
 ['lethe-supply','Lethe','Some Lethe is old corporate surplus. Some is bootlegged from field formulas. If the seller won’t say which, they may not know either.'],
 ['lethe-body','Lethe','Lethe does not heal wounds. There are workers who finished an entire shift under it, then collapsed the moment their bodies were permitted to speak again.'],
 ['lethe-ban','Lethe','Companies once dosed injured workers with Lethe and sent them back onto the floor. That’s why the medical versions are weaker—and the old formula is illegal.'],
 ['microdose','Microdosing','A microdose is just less of a drug. People talk about it like the word itself makes the dose precise.'],
 ['shared-synth','Syntheogen','Synth and Splice recognize each other. Change the delivery system all you like—your tolerance doesn’t care.'],
 ['shared-rift','Riftflower family','Meld, Riftflower and Nectar all come from the same plant. A habit follows the family, not the packaging.'],
 ['continuity-benches','Continuity','Continuity put mushroom growers, chemists, programmers, priests, cult survivors and witches at the same benches. They agreed on almost nothing except that a vision should not have to die with its witness.']
].map(([id,topic,line])=>({id,topic,line}));
function rareLoreNPC(interpreter){
 const id=Number(interpreter?._eventId||interpreter?.eventId?.())||0,ev=id?$gameMap?.event?.(id):null;
 if(!ev)return null;
 const h=window.NPCEmpathize?._helpers,name=h?._getNPCName?.(id)||ev.event?.()?.name||'',profile=h?._getProfile?.(name);
 if(!name||!profile||profile.personalityIndex==null||window.NPCEmpathize?.isNonSentientNPC?.(name))return null;
 return {ev,name,profile};
}
function tryRareLore(interpreter){
 const npc=rareLoreNPC(interpreter);if(!npc||Math.random()>=RARE_LORE_CHANCE)return false;
 const state=$gameSystem._exoticSubstancesLoreDrops||($gameSystem._exoticSubstancesLoreDrops={seen:{}}),unseen=RARE_LORE.filter(f=>!state.seen[f.id]),pool=unseen.length?unseen:RARE_LORE;
 const fact=pool[Math.floor(Math.random()*pool.length)];if(!fact)return false;
 npc.ev.turnTowardPlayer?.();let shown=false;
 if(window.NPCTalk?.exchange&&window.NPCTalk?.eventStep&&SceneManager._scene?._bustManager)shown=!!NPCTalk.exchange([NPCTalk.eventStep(npc.ev,npc.name,fact.line)]);
 if(!shown&&window.$gameMessage){$gameMessage.setBackground?.(0);$gameMessage.setPositionType?.(2);$gameMessage.add?.(fact.line);shown=true;}
 if(!shown)return false;
 state.seen[fact.id]=true;state.last=fact.id;learnLore(fact.topic);window.NPCTalk?.pushCreed?.(npc.name,npc.profile);interpreter?.setWaitMode?.('message');return true;
}
function loreMatches(phrase){const s=String(phrase||'').toLowerCase();return LORE.filter(p=>[p.key,...p.aliases].some(a=>{const escaped=a.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(?:^|[^a-z])'+escaped+'(?=$|[^a-z])').test(s);}));}
function registerLore(){
 const bank=window.Messages?.DialogueTopics;if(!bank)return false;
 LORE.forEach((p,i)=>{const page={type:'topic',group:'topics',order:18000+i*10,keyword:p.key,title:p.key,description:p.text,synonyms:p.aliases.slice(),image:'',raw:true,_exoticSubstances:true};
  // Preserve native entries if a future game version authors the same subject.
  const existing=(Array.isArray(bank)?bank:Object.values(bank)).find(x=>x?.keyword?.toLowerCase()===p.key.toLowerCase());
  if(existing&&!existing._exoticSubstances)return;
  if(Array.isArray(bank)){if(existing)bank[bank.indexOf(existing)]=page;else bank.push(page);}else bank['exoticSubstancesLore'+i]=page;
 });return true;
}
const DRUG_WORLD='Most pre-Y2K drugs were decriminalized or legalized during reconstruction; enforcement focuses on unlicensed post-Y2K compounds. PharmaDrop trades on Veilnet: Meld Resin, Riftflower and Nectar (cannabis), Syntheogen/Synth and Splice (psychedelics), Fractilized Cocaine/Frack (stimulant), Vesper Wafers/Wafer (social), Hush (drink kit), Lethe (eardrops). All nine are illegal; Red Cocaine is decriminalized. NPCs know microdosing as taking a small fraction for milder effects, not necessarily safe or precise. Knowledge does not imply use or willingness to sell. Bloomprint playback and Red Cocaine maturation/crafting are future mechanics, not available player actions.';
const DRUG_CHAT_RE=/\b(?:pharmadrop|veilnet|illegal drugs?|narcotics?|black market|drug (?:trade|game|deals?|dealing)|meld|riftflower|nectar|syntheogen|synth\b|frack|frac\b|fractal|red cocaine|vesper|wafer|hush|lethe|splice|bloomprint|microdos|psychedelic mushroom)/i;
const CANON_FALLBACK={
 'Riftflower family':'CANON: Meld, Riftflower and Nectar are illegal forms of one seam-reactive plant and share tolerance and dependence.',
 'Meld Resin':'CANON: Meld is Riftflower resin worked into skin and bound down; good flower works but is rarely wasted on it; up to five layers stack.',
 'Riftflower':'CANON: Riftflower is aromatic vapor inhaled from a preloaded clear nasal inhaler; it is not burned, smoked or snorted as loose flower.',
 'Nectar':'CANON: Nectar is flash-frozen; inhale its released amber vapor before it thaws. It is never dissolved in water or swallowed.',
 'Syntheogen':'CANON: Synth primes an unstructured psychedelic trip unless a reusable Bloomprint shapes it; Synth and Splice share rapid tolerance.',
 'Fractilized Cocaine':'CANON: Frack requires matured, completed Red Cocaine; removing its crimson stabilizer leaves the branching overclocking imprint.',
 'Vesper Wafers':'CANON: Wafers are circuitry, not food; hold one against the roof of the mouth and hum to dissolve it into sociability and lowered guard.',
 'Hush (drink kit)':'CANON: Prepare Hush with food, hold the mixture against cheek and gums, then swallow; sweet ingredients reduce its downsides.',
 'Preparing Hush':'CANON: Experienced Hush users almost always sweeten it; personal recipes vary, while bitter use is mostly boasting or legend.',
 'Lethe':'CANON: Lethe eardrops suppress pain and recoverable injury penalties but never heal, erase memory, treat trauma or repair damage.',
 'Splice':'CANON: Splice is a skin-applied temporary glyph derived from Continuity; it combines a psychedelic with its experiential pattern.',
 'Continuity':'CANON: Continuity preserved endangered altered states; it produced Synth, reusable Bloomprints and later the bodily derivative Splice.',
 'Bloomprints':'CANON: Bloomprints are reusable programs that shape Synth trips; they do not wear out, but playback is not yet a player mechanic.',
 'PharmaDrop':'CANON: PharmaDrop stock and prices are national and reconsidered every Monday; there is no lunar or supernatural schedule.',
 'Underground drug trade':'CANON: Illegal: Meld, Riftflower, Nectar, Synth, Splice, Frack, Wafers, Hush and Lethe. Red Cocaine is decriminalized.'
};
function canonCapsule(phrase,hits){
 const s=String(phrase||'').toLowerCase(),has=w=>s.includes(w),hush=has('hush');
 if(has('red cocaine')&&/\b(?:legal|illegal|decriminal)/.test(s))return 'CANON: Red Cocaine is decriminalized and traded as ordinary medicine; Frack is the illegal derivative. No permit exception is needed.';
 if(has('meld')&&/\b(?:legal|illegal|permit|license)/.test(s))return 'CANON: Meld is illegal everywhere. No guild permit, registry or regional exception legalizes it; up to five layers can overlap.';
 if(/\b(?:illegal drugs?|black market|drug trade|drug game|drug dealing)\b/.test(s))return CANON_FALLBACK['Underground drug trade'];
 if((has('pharmadrop')||has('price'))&&/\b(?:price|stock|change|reset|refresh|when)\b/.test(s))return CANON_FALLBACK.PharmaDrop;
 if(/\bwitness/.test(s)&&/\b(?:report|deal|police|crime)/.test(s))return 'CANON: Party members never report drug deals. Friendly ordinary witnesses never report; others have a disposition-based chance, higher at night.';
 if(has('nectar')&&/\b(?:take|taken|use|drink|dissolv|inhale|freeze|vapor)/.test(s))return CANON_FALLBACK.Nectar;
 if(has('lethe')&&/\b(?:heal|injur|wound|pain|memory|trauma|take|use)/.test(s))return CANON_FALLBACK.Lethe;
 if(has('riftflower')&&/\b(?:smoke|take|use|snort|inhale|nose|burn)/.test(s))return CANON_FALLBACK.Riftflower;
 if(has('meld')&&/\b(?:good|quality|flower|made|make|layer|stack)/.test(s))return CANON_FALLBACK['Meld Resin'];
 if(/\b(?:vesper|wafer)/.test(s)&&/\b(?:food|eat|take|use|hum|mouth)/.test(s))return CANON_FALLBACK['Vesper Wafers'];
 if(has('splice')&&has('bloomprint'))return CANON_FALLBACK.Splice;
 if(/\b(?:psychedelic|psilocybin) mushroom/.test(s))return 'CANON: During the Squishing, psychedelic mushroom strains gradually stopped fruiting reliably; they did not suddenly vanish at Y2K.';
 if(has('bloomprint')&&/\b(?:same|again|reuse|wear|expire)/.test(s))return CANON_FALLBACK.Bloomprints;
 if(has('bloomprint')&&/\b(?:without|no |unprinted)/.test(s))return 'CANON: Without a Bloomprint, Synth still causes a weaker unstructured trip shaped by mood and surroundings; magic does not become unstable.';
 if(/\b(?:frack|frac\b|fractal)/.test(s)&&/\b(?:coca|red cocaine|related|direct|make|made|exactly|what)/.test(s))return CANON_FALLBACK['Fractilized Cocaine'];
 if(hush&&/\b(?:raw|unprepared|without prepar|swallow it|straight)/.test(s))return 'CANON: Raw Hush is possible but poorly absorbed: weaker benefits, severe nausea and worse penalties. It consumes only the selected kit.';
 if(hush&&/\b(?:sugar|sweet|honey|help|insulat)/.test(s))return 'CANON: Sweet Hush ingredients reduce coordination penalties and the comedown; they never worsen Hush or prevent tolerance and dependence.';
 if(hush&&/\b(?:favorite|favourite|recipe|prepare|preparation|put in|mix|make yours|like yours)/.test(s))return 'CANON: If this NPC uses Hush, invent a personal sweet recipe fitting their life; experienced users do not take it bitter.';
 if(hush&&/\b(?:take|drink|kit|cheek|swallow|what is|what\'s)/.test(s))return CANON_FALLBACK['Hush (drink kit)'];
 return hits.length?(CANON_FALLBACK[hits[0].key]||('CANON: '+hits[0].brief)):'';
}
function loreSpec(spec){
 if(!spec||typeof spec!=='object')return spec;
 const out={...spec},phrase=[spec.startText,...(spec.history||[]).slice(-3).map(x=>x?.text||'')].join(' '),hits=loreMatches(phrase),drugContext=DRUG_CHAT_RE.test(phrase)||hits.length>0;
 if(!drugContext)return out;
 const canon=canonCapsule(phrase,hits);
 out.world=[canon,DRUG_WORLD,spec.world].filter(Boolean).join(' ');
 const facts=hits.slice(0,3).map(p=>p.brief).join(' ');
 const limits='Mandatory canon outranks personality and rumours. Be ignorant, evasive or opinionated if appropriate, but never contradict canon or invent laws, permits, institutions, origins, ingestion methods, effects, schedules or mechanics. If canon does not answer a factual question, admit uncertainty. Invent only clearly personal tastes, subjective experiences and labelled rumours. Do not invent the player\'s inventory, use, crimes or shared drug history. Conversation cannot transfer goods or money or change trade eligibility.';
 const hushCreative=hushRecipeContext(phrase)?'If the NPC personally uses Hush, invent a concise sweet preparation suited to their region, job, wealth and personality. Vary fruit, juice, preserves, syrups, sweets, cacao, mint, sweet alcohol, hot fruit, desserts, temperature, texture and crew ritual. Treat it as personal custom, not universal fact. An abstainer may refuse; an inexperienced braggart may claim bitter use only if clearly framed as doubtful.':'';
 out.topics=[canon,facts,hushCreative,limits,spec.topics].filter(Boolean).join(' ');
 // Tiny models retain roughly 120 characters of npcBio and may never reach
 // world/topics. Put the question-specific capsule first; npcSheet still
 // carries the speaker's personality in the next prompt fact.
 out.npcBio=[canon,facts,spec.npcBio].filter(Boolean).join(' ');
 return out;
}
function hushRecipeContext(phrase){const s=String(phrase||'').toLowerCase();return s.includes('hush')&&/\b(?:favorite|favourite|recipe|prepare|preparation|put in|mix|make yours|like yours|sweeten)/.test(s);}
function installRareLore(){
 if(window.PluginManager&&!PluginManager._exoticSubstancesRareLore){PluginManager._exoticSubstancesRareLore=true;
  wrap(PluginManager,'callCommand',function(orig,interpreter,plugin,command,args){
   if(/(?:^|\/)DialogueSystem$/.test(String(plugin))&&command==='Rumors'&&tryRareLore(interpreter))return true;
   return orig.call(this,interpreter,plugin,command,args);
  });
 }
 if(window.NPCTalk&&!NPCTalk._exoticSubstancesRareLore){NPCTalk._exoticSubstancesRareLore=true;
  wrap(NPCTalk,'play',function(orig,interpreter){return tryRareLore(interpreter)||orig.call(this,interpreter);});
 }
}
function installLore(){
 registerLore();installRareLore();
 wrap(DataManager,'onLoad',function(orig,obj){const r=orig.call(this,obj);registerLore();return r;});
 wrap(DataManager,'isDatabaseLoaded',function(orig){const r=orig.call(this);if(r)registerLore();return r;});
 wrap(Scene_Boot.prototype,'start',function(orig,...args){registerLore();installRareLore();return orig.apply(this,args);});
 for(const method of ['reply','generate'])if(window.MarkovLLM)wrap(MarkovLLM,method,function(orig,spec,...args){return orig.call(this,loreSpec(spec),...args);});
 if(window.NPCEmpathize){
  for(const method of ['conversationContext','companionContext'])wrap(NPCEmpathize,method,function(orig,...args){const c=orig.apply(this,args);return c?{...c,world:[c.world,DRUG_WORLD].filter(Boolean).join(' ')}:c;});
  wrap(NPCEmpathize,'worldTopics',function(orig,phrase){return [orig.call(this,phrase),...loreMatches(phrase).map(p=>p.brief)].filter(Boolean).join(' ');});
 }
}
function learnLore(key){window.DialogueTopics?.learn?.(key);}
function pharmaIntro(root,render){
 if(!root.style||!root.addEventListener){render();return;}
 let finished=false,timer;
 const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);root.removeEventListener('click',finish);root.style.background='#101b16';root.style.color='#deeee4';render();};
 root.style.transition='background-color 900ms ease, color 900ms ease';
 root.style.background='#f5fbfa';root.style.color='#145f60';
 root.innerHTML='<h2 style="font-family:Arial,sans-serif">PharmaDrop +</h2><p>Pharmacy · Health &amp; wellbeing</p><hr><p>Loading catalogue…</p><small>Click to skip</small>';
 root.addEventListener('click',finish);
 timer=setTimeout(()=>{
  if(finished)return;
  if(root.isConnected===false){finished=true;root.removeEventListener('click',finish);return;}
  root.style.background='#09130e';root.style.color='#65d48e';
  root.innerHTML='<style>@keyframes pharmaSignal{0%{opacity:.15;transform:translateY(-8px)}55%{opacity:.85}100%{opacity:.45;transform:translateY(8px)}}.pharma-signal{animation:pharmaSignal 1.6s ease-in-out infinite alternate}</style><h2 style="font-family:monospace;letter-spacing:3px">PharmaDrop</h2><pre class="pharma-signal" style="overflow:hidden">0101 RX 0110 0011 1010 0100\n0110 1001 RX 1100 0101 1010\n1001 0011 0110 RX 0100 1101\n0100 RX 1101 1010 0110 0011</pre><p>Connecting to Veilnet…</p><small>Click to skip</small>';
  timer=setTimeout(finish,2200);
 },1700);
}

window.ExoticSubstances={loot:{chance:DRUG_LOOT_CHANCE},lore:{entries:LORE,rare:RARE_LORE,chance:RARE_LORE_CHANCE,tryDrop:tryRareLore,register:registerLore,matches:loreMatches,context:loreSpec},drugs:{status:drugStatus,definitions:DRUGS,info:DRUG_INFO,consume:consumeDrug,update:updateDrugs,canUse:canUseDrug,meldProtection},cooking:{tier:hushTier,insulation:hushInsulation,install:installHushCooking},economy:{profiles:ECON,event:marketEvent,traderKind,preference,signals:marketSignals,region:city,wire:wireReports,lootWeight:item=>item?.id===9010?.35:item?.id===9011?.15:1},crime:{debug:crimeDebug,reportingChance,captureSight:captureCrimeSight,prisonMinutes},intro:pharmaIntro,version:VERSION,prepareUninstall:()=>window.ExoticSubstancesCleanup.prepare(),access,isAuthority,inspectTrade:()=>access(SceneManager._scene?._exoticSubstanceContext),goods:GOODS,hash,week,market,bounds,context,allowed,ledger,count,quote,transact,expire,install};
const boot=Scene_Boot.prototype.create;Scene_Boot.prototype.create=function(){install();return boot.apply(this,arguments);};
})();
