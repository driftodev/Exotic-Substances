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
