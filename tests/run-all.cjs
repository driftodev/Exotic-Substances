const {spawnSync}=require('child_process'),path=require('path');
const root=path.resolve(process.argv[2]||process.env.HE_UPSTREAM||'upstream-083');
process.env.HE_UPSTREAM=root;
const suites=['market','drugs','expansion','economy','crime','lore','visuals','update','collision','compatibility','loot','uninstall'];
for(const suite of suites){
 const arg=['market','lore','collision'].includes(suite)?path.join(root,'data/Items.json'):root;
 const result=spawnSync(process.execPath,[path.join(__dirname,suite+'.test.cjs'),arg],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
console.log('All twelve regression suites passed.');
