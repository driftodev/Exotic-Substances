# Release smoke test

Use a new disposable save with only Exotic Substances enabled first.

1. Open PharmaDrop; check nine distinct cards and whole-euro prices. Close and
   reopen: the pharmacy/Veilnet intro should play each time.
2. Inspect all nine items in the backpack and Object Index. Check both icons and
   models, especially transparent Riftflower glass, Syntheogen's blue body,
   readable wafer faces, and Splice's cut corner.
3. Try sales at 29/30 NPC disposition and 44/45 shopkeeper disposition. Test the
   selected character, not a more popular companion. Test both single and bulk
   sales. Authorities should refuse regardless of score.
4. Recruit a shopkeeper. Their drug trades should be blocked; ordinary goods
   should still follow the game's rules. Dismissal must not replenish weekly
   stock or demand.
   On 0.8.3a, also assign a reserve companion to a shop/workplace shift and
   check both single and bulk drug trades with them: both must be blocked.
5. On a fresh, sober actor use five Meld layers. Protection should progress
   10/19/27/34/40%; a sixth is blocked. Stagger layers and wait two game hours to
   check independent expiry. Try an energy item without removing the protection.
6. Prepare Hush with a sweet mixer and with a nonsweet mixer. Compare raw Hush.
   The cooking route consumes the ingredients and serves the party immediately;
   raw use consumes only Hush, even with a second ingredient selected.
7. Make a witnessed sale, check heat feedback, and test refusal during an active
   manhunt. Party members should never report. Friendly normal NPCs should not.
   In prison, use "Serve your sentence": the remaining sentence must advance
   game time once before native release. Partial time already served counts.
8. Deplete one trader's demand, reopen the scene, recruit/dismiss if possible,
   and save/reload: no refill until Monday. Verify same-trader buyback is at
   most 80%. Compare a specialist buyer with an indifferent one.
9. Ask a few NPCs about preparation, legality and relationships between drugs.
   They may invent personal anecdotes, not alternate mechanics or legal status.
10. Open ordinary item chests. Drugs are occasional extra finds, not replacements
    for the native reward. Save/reload an opened chest: no extra bonus reroll.

## Console helpers (test saves only)

Confirm installed version:

```js
ExoticSubstances.version
```

Give ten of each drug:

```js
Object.keys(ExoticSubstances.goods).forEach(id => $gameParty.gainItem($dataItems[id], 10));
```

Inspect the current trade gate while the shop is open:

```js
ExoticSubstances.inspectTrade()
```

Inspect all current trade quotes and limits:

```js
(() => {
  const m = ExoticSubstances;
  const c = SceneManager._scene?._exoticSubstanceContext;
  if (!c) return 'Open a trade first';
  console.table(Object.keys(m.goods).map(id => ({
    item: m.goods[id].name,
    preference: m.economy.preference(c, +id).label,
    stock: m.count(c, +id),
    demand: m.ledger(c, +id).demand,
    askEuros: m.quote(c, +id, true) / 100,
    offerEuros: m.quote(c, +id, false) / 100
  })));
})()
```

Check Meld without adding doses:

```js
Math.round(ExoticSubstances.drugs.meldProtection($gameParty.leader()) * 100) + '%'
console.table(ExoticSubstances.drugs.status($gameParty.leader()))
```

## Automated coverage

Run `node tests/run-all.cjs /path/to/upstream`. The suites use the target
database, native loot plugin, native preview fitting and selected crime/dialogue
code alongside simulated engine objects. They do not launch the full game.

The native loot comparison checks 1,500 chest positions before and after the
mod, including actual Expression Seed outcomes. Exact base rewards must match.
Model checks cover finite geometry, alpha materials, intended color values,
primitive counts, original hand-edited inputs and preview orientation.

Reserved states: `9001–9006`, `9010–9015`, `9020–9022`.

From the title screen, disable the mod. Cancel the three-choice dialog once.
Try **Disable without cleaning**, decline its second warning, then accept it;
confirm the save was untouched. Re-enable and choose **Clean saves & disable**.
Check that save slots in multiple worlds still load without the mod and backup
files were written beside affected saves and shared container files. A save
with an unfinished mod-managed prison sentence should block cleanup without
changing any save. If an uncleaned save crashes after direct folder deletion,
restore the mod and use the in-game cleanup choice.
