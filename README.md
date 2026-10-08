# Exotic Substances

**v0.4.0 · First release**

Tested on version 0.8.3a

A Chinatown Wars-inspired drug trading loop: learn who wants what, buy into 
local surpluses, and sample your own stock. Rise to become the drug kingpin 
of the observable universe, and whatever lies beyond.

## Install

1. Close the game and back up saves.
2. Copy this download's `mods/ExoticSubstances` folder into the game's `mods`
   folder. The result should be `mods/ExoticSubstances/mod.json`.
3. Enable it in the game's mod manager and restart.

Only **one mod folder** is needed. `source`, `assets`, and `tests` are included
for inspection and development; they are not additional mods.

## Removing the mod from a save

From the **title screen**, open the game's mod manager and disable Exotic
Substances. Choose **Clean saves & disable** for the usual uninstall. The mod
checks saves in every world, makes dated backups of affected files in their
save folders, then removes its items, effects, and trade records. A damaged
save or an unfinished mod-managed prison sentence blocks cleanup; the error
names the file, and the mod remains enabled. Finish the sentence in that save
or restore the damaged save before trying again. **Cancel** leaves the mod
enabled. Restart the game before loading or saving after disabling.

**Disable without cleaning** is for players who intend to re-enable the mod
or manage their own saves. It asks for a second confirmation and changes no
save files. Saved drug states may crash the game when loading without the mod;
re-enable the mod to use those saves again.

**IMPORTANT FOR FULLY UNINSTALLING*
Use the in-game disable action **before deleting the mod folder**. Removing
the files directly bypasses cleanup, and a saved drug state can then crash
the native trait calculation when that save loads. If this already happened,
restore the mod, restart, and use the in-game disable action. For an individual
loaded save, the console command `ExoticSubstances.prepareUninstall()` can be a 
manual recovery option; save in a new slot after it returns.

## The trading loop

- Nine substances with distinct effects, risks, availability and price behavior.
- National markets change on Mondays, with bounded price movement and related
  supply events. Traders keep individual prices and preferences.
- NPC class, occupation and temperament help predict demand. Finite weekly
  buying limits prevent endlessly selling to one profitable customer.
- Drug trading requires **30 disposition**, or **45 for a shopkeeper**, with
  the character conducting the trade. Authorities and current party members
  refuse drug trades. Ordinary goods retain vanilla behavior.
- A trader's buyback offer is never above 80% of that same trader's current
  selling price. Prices use whole euros. Legal shop loyalty does not alter or
  advance through drug transactions.
- PharmaDrop offers convenient online stock through the Hypernet. Market Watch
  and Veilnet Wire give supply clues, not guaranteed profitable destinations.
- Witness reports feed the game's crime system. Friendly ordinary witnesses
  and party members do not report; active manhunts close in-person drug trading.
- NPC conversations and rare flavor lines reveal the setting's drug lore.
  PharmaDrop also unlocks topics to ask about. AI dialogue can still improvise
  or misunderstand; it is not a definitive rules reference.

Drug Items added by this version include:
Meld Resin, Riftflower, Nectar, Syntheogen, Fractilized Cocaine, Vesper Wafers,
Hush (drink kit), Lethe, and Splice.

Meld supports up to five simultaneous layers. A fresh session reaches
10%, 19%, 27%, 34%, then 40% magic protection; existing tolerance reduces it.
Each layer lasts two game hours and expires independently.

Hush uses the cooking system with another ingredient and is consumed
immediately by the party. Sweet mixers provide tiered insulation from it's 
downsides. Raw use is possible, weaker and harsher.

Red Cocaine remains vanilla and outside the illegal trade system. Bloomprint
playback, Red Cocaine maturation and drug crafting are not playable features
in this release and are only featured in lore, but are planned.

## Compatibility

Built against the local upstream **0.8.3a** source snapshot, commit
`920b779`. This is not a promise of compatibility with later game versions.

Reserve companions assigned to shop/workplace shifts are excluded from drug
trading through the game's staff-membership API. Sentence serving wraps the
registered action, including aliases and later registrations, independently
of its plugin's filename. Native trials and release behavior remain in charge.

The package replaces **Economy/MoneyFormatter.js** with its unchanged upstream
base plus the mod's runtime code. Another mod replacing that file may conflict.
**It does not replace RandomLootSystem.js.** Native chest rewards run first;
a separate deterministic 5% roll can add one drug. Premium products are rarer.
Opening the same chest again does not reroll the drug bonus. The game's
restricted-item marker keeps these entries out of ordinary loot/shop pools.

Reserved item IDs: `9000–9003`, `9010–9015` (9000 is the section divider).
Reserved state IDs are listed in `TESTING.md`. Occupied IDs stop initialization
with an explicit conflict message. Numeric IDs do not guarantee compatibility
with other mods.

Multiplayer synchronization has not been validated. This package does not
include Steam Workshop integration.

## Build and tests

No build step is required to play. Developers can use Node.js and an upstream
checkout matching the target version:

```sh
node tests/build.cjs /path/to/hypernet-explorer
node tests/run-all.cjs /path/to/hypernet-explorer
```

The source includes baked assets for synchronous model creation. To regenerate
those from the included PNGs and GLB/GLTF inputs, install Python's Pillow,
NumPy and trimesh, then run `python tests/import-assets.py` before building.
Model export units are converted back to game units; geometry is not redesigned.
Material restoration is recorded in `assets/materials.json` and the importer.

Twelve automated suites cover trading, effects, economy, crime, lore, UI/model
integration, collisions, uninstall cleanup and native loot preservation. This is not a substitute
for a final in-game smoke test; see `TESTING.md`.

## Credits and disclosure

Created and directed by me with AI-assisted coding tools.
Sprites are made by me. The models were manually edited by me from generated bases.
Hypernet Explorer is by **nocoldiz**; this is an unofficial mod.

Code license: MIT. The upstream license is retained in `LICENSE-upstream.txt`.
