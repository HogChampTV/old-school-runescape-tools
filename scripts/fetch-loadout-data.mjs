/**
 * One-time data build for the Loadout Creator tool.
 *
 * This script is NEVER run by `npm run dev` / `npm run build` / deploys.
 * Run it manually with `npm run fetch:loadout-data` after a game update,
 * then commit the regenerated files. Visitors to the site never hit any of
 * these sources; everything is served statically from this repo.
 *
 * Sources:
 *  - Item definitions (names, equipment slots, 2h detection, GE tradeability):
 *    decoded straight from the OSRS game cache on this machine by our own
 *    cache reader (scripts/lib/osrs-cache.mjs). Zero network requests, and
 *    exactly as current as the game build RuneLite last launched with.
 *    Without a local cache it falls back to fetching the two needed cache
 *    groups (~0.7 MB) from the OpenRS2 archive.
 *  - 36x32 item icons, fetched per id from RuneLite's static CDN and cached
 *    in scripts/.icon-cache so re-runs only download new items:
 *      https://static.runelite.net/cache/item/icon/<id>.png
 *
 * Outputs (committed to the repo):
 *  - public/loadout/items.json  - item list; array index = spritesheet tile
 *  - public/loadout/icons.png   - spritesheet of all item icons
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { readItemDefinitions, fetchOpenRS2ItemDefinitions, findLocalCacheDir, WEAR_POS_TO_SLOT } from './lib/osrs-cache.mjs';
import { PRAYERS, SPELLBOOKS } from '../src/pages/tools/loadout-combat.js';
import { TOA_INVOCATIONS } from '../src/pages/tools/raid-loot-data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'scripts', '.icon-cache');
const UI_CACHE_DIR = path.join(ROOT, 'scripts', '.icon-cache', 'ui');
const OUT_DATA = path.join(ROOT, 'public', 'loadout', 'items.json');
const OUT_SHEET = path.join(ROOT, 'public', 'loadout', 'icons.png');
const OUT_UI_DATA = path.join(ROOT, 'public', 'loadout', 'ui.json');
const OUT_UI_SHEET = path.join(ROOT, 'public', 'loadout', 'ui-icons.png');
const OVERRIDES_FILE = path.join(ROOT, 'scripts', 'loadout-overrides.json');

const UA = 'old-school-runescape-tools data fetcher (github.com/HogChampTV/old-school-runescape-tools)';

// Slot codes used in loadout-items.json and by the page.
// -1 = not equipable. 11 = two-handed (occupies weapon, blocks shield).
const SLOTS = ['head', 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];
const SLOT_CODE = Object.fromEntries(SLOTS.map((s, i) => [s, i]));
SLOT_CODE['2h'] = 11;

// Obvious noise that only clutters search results.
const NAME_BLOCKLIST = /\((Last Man Standing|Deadman|beta)\)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Equipment stats live in the item's cache params (Jagex ships them since 2023).
// param id -> position in the stats tuple:
//   attack stab/slash/crush/magic/ranged (0-4), defence stab/slash/crush/magic/ranged (5-9),
//   melee strength (10), ranged strength (12), magic damage in tenths of a % (299),
//   prayer (11), attack speed in ticks (14)
const STAT_PARAMS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 299, 11, 14];

// stats tuple = the 15 values above + the weapon category (for attack styles),
// with trailing zeros trimmed. null when the item has nothing to report.
function statsOf(def, slot) {
  if (slot < 0) return null;
  const p = def.params ?? {};
  const stats = STAT_PARAMS.map((k) => p[k] | 0);
  const isWeapon = slot === SLOT_CODE.weapon || slot === SLOT_CODE['2h'];
  stats.push(isWeapon ? def.category | 0 : 0);
  while (stats.length && stats[stats.length - 1] === 0) stats.pop();
  return stats.length ? stats : null;
}

function slotNameOf(def) {
  if (def.wearPos1 === 3 && def.wearPos2 === 5) return '2h';
  return WEAR_POS_TO_SLOT[def.wearPos1];
}

/**
 * Prayer and spell icons for the combat setup panels, fetched once from the
 * Old School RuneScape Wiki (file names match the names in loadout-combat.js)
 * and cached in scripts/.icon-cache/ui so re-runs download nothing.
 * Output order: all prayers, then every spellbook's spells flattened in
 * SPELLBOOKS order — the page derives sheet indexes from the same module.
 * ui.json carries no date on purpose: byte-identical output on every run
 * keeps the weekly CI job from committing when nothing changed.
 */
async function buildUiIcons() {
  const entries = [
    ...PRAYERS.map((p) => ({ name: p.name, file: p.icon ?? p.name })),
    ...SPELLBOOKS.flatMap((b) => b.spells.map((s) => ({ name: s.name, file: s.icon ?? s.name }))),
    ...TOA_INVOCATIONS.flatMap((g) => g.options.map(([name, , icon]) => ({ name, file: icon ?? g.icon }))),
  ];
  fs.mkdirSync(UI_CACHE_DIR, { recursive: true });
  let fetched = 0;
  for (const e of entries) {
    const wikiName = `${e.file.replaceAll(' ', '_')}.png`;
    e.path = path.join(UI_CACHE_DIR, wikiName);
    if (fs.existsSync(e.path)) continue;
    const urls = [
      `https://oldschool.runescape.wiki/images/${encodeURIComponent(wikiName)}`,
      `https://oldschool.runescape.wiki/w/Special:FilePath/${encodeURIComponent(wikiName)}`,
    ];
    let buf = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (res.ok) { buf = Buffer.from(await res.arrayBuffer()); break; }
      } catch { /* try the next url */ }
    }
    if (!buf) {
      console.warn(`  ui icon failed: ${e.name} (${wikiName})`);
      e.missing = true;
      continue;
    }
    fs.writeFileSync(e.path, buf);
    fetched++;
    await sleep(80);
  }
  console.log(`UI icons: ${entries.length - fetched} cached, ${fetched} downloaded.`);

  const pngs = entries.map((e) => (e.missing ? null : PNG.sync.read(fs.readFileSync(e.path))));
  const MAX_TILE = 40; // icons are ~20-35px; clip anything unexpectedly large
  const tw = Math.min(MAX_TILE, Math.max(...pngs.filter(Boolean).map((p) => p.width)));
  const th = Math.min(MAX_TILE, Math.max(...pngs.filter(Boolean).map((p) => p.height)));
  const COLS = 16;
  const rows = Math.ceil(entries.length / COLS);
  const sheet = new PNG({ width: COLS * tw, height: rows * th });
  pngs.forEach((png, i) => {
    if (!png) return;
    const w = Math.min(png.width, tw);
    const h = Math.min(png.height, th);
    const sx = Math.floor((png.width - w) / 2);
    const sy = Math.floor((png.height - h) / 2);
    const dx = (i % COLS) * tw + Math.floor((tw - w) / 2);
    const dy = Math.floor(i / COLS) * th + Math.floor((th - h) / 2);
    for (let y = 0; y < h; y++) {
      png.data.copy(sheet.data, ((dy + y) * sheet.width + dx) * 4, ((sy + y) * png.width + sx) * 4, ((sy + y) * png.width + sx + w) * 4);
    }
  });
  fs.writeFileSync(OUT_UI_SHEET, PNG.sync.write(sheet));
  fs.writeFileSync(
    OUT_UI_DATA,
    JSON.stringify({
      v: 1,
      tile: { w: tw, h: th },
      cols: COLS,
      prayers: PRAYERS.length,
      spells: SPELLBOOKS.reduce((n, b) => n + b.spells.length, 0),
      invocations: TOA_INVOCATIONS.reduce((n, g) => n + g.options.length, 0),
    }),
  );
  console.log(`Wrote ${path.relative(ROOT, OUT_UI_SHEET)} (${sheet.width}x${sheet.height}, tile ${tw}x${th})`);
}

async function main() {
  const overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
  const overrideSlot = (name) => {
    const s = overrides.slotByName[name] ?? overrides.slotByName[name.toLowerCase()];
    return s === undefined ? undefined : SLOT_CODE[s];
  };

  const localCache = process.argv.includes('--openrs2') ? null : findLocalCacheDir();
  console.log(localCache
    ? `Decoding item definitions from the local game cache (${localCache})...`
    : 'Fetching the item configs from the OpenRS2 archive...');
  const defs = localCache ? readItemDefinitions({ cacheDir: localCache }) : await fetchOpenRS2ItemDefinitions({ userAgent: UA });
  console.log(`  ${defs.size} definitions decoded.`);

  // Keep one item per name (lowest id): everything tradeable on the GE,
  // everything equipable (untradeables included), plus hand-picked
  // untradeable inventory staples from the overrides file.
  const include = new Set(overrides.includeByName.map((n) => n.toLowerCase()));
  const excluded = new Set(overrides.excludeIds);
  const byName = new Map(); // lowercase name -> {id, name, slot}
  for (const def of defs.values()) {
    if (def.name === 'null' || !def.name) continue;
    if (def.notedTemplate !== -1 || def.placeholderTemplate !== -1 || def.boughtTemplate !== -1) continue;
    if (NAME_BLOCKLIST.test(def.name) || excluded.has(def.id)) continue;
    const key = def.name.toLowerCase();
    const slot = overrideSlot(def.name) ?? SLOT_CODE[slotNameOf(def)] ?? -1;
    if (!def.geTradeable && slot < 0 && !include.has(key)) continue;
    const prev = byName.get(key);
    if (!prev || def.id < prev.id) byName.set(key, { id: def.id, name: def.name, slot, stats: statsOf(def, slot) });
  }
  for (const wanted of overrides.includeByName) {
    if (!byName.has(wanted.toLowerCase())) console.warn(`  include not found in game data: "${wanted}"`);
  }

  const items = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
  console.log(`Item list: ${items.length} items (${items.filter((i) => i.slot >= 0).length} equipable).`);

  // Icons: fetch any not already cached, politely.
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const need = items.filter((it) => !fs.existsSync(path.join(CACHE_DIR, `${it.id}.png`)));
  console.log(`Icons: ${items.length - need.length} cached, ${need.length} to download...`);
  let done = 0;
  const failed = new Set();
  const CONCURRENCY = 6;
  const queue = [...need];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const it = queue.shift();
        try {
          const res = await fetch(`https://static.runelite.net/cache/item/icon/${it.id}.png`, {
            headers: { 'User-Agent': UA },
          });
          if (!res.ok) throw new Error(String(res.status));
          const buf = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(path.join(CACHE_DIR, `${it.id}.png`), buf);
        } catch (e) {
          failed.add(it.id);
          console.warn(`  icon failed for ${it.id} ${it.name}: ${e.message}`);
        }
        if (++done % 250 === 0) console.log(`  ${done}/${need.length}`);
        await sleep(40);
      }
    }),
  );
  if (failed.size) console.warn(`Dropping ${failed.size} items with no icon.`);
  const finalItems = items.filter((it) => !failed.has(it.id));

  // Spritesheet: tile index = item index in the array.
  console.log('Building spritesheet...');
  const TILE_W = 36;
  const TILE_H = 32;
  const COLS = 64;
  const rows = Math.ceil(finalItems.length / COLS);
  const sheet = new PNG({ width: COLS * TILE_W, height: rows * TILE_H });
  finalItems.forEach((it, i) => {
    const png = PNG.sync.read(fs.readFileSync(path.join(CACHE_DIR, `${it.id}.png`)));
    const dx = (i % COLS) * TILE_W;
    const dy = Math.floor(i / COLS) * TILE_H;
    const w = Math.min(png.width, TILE_W);
    const h = Math.min(png.height, TILE_H);
    for (let y = 0; y < h; y++) {
      png.data.copy(sheet.data, ((dy + y) * sheet.width + dx) * 4, y * png.width * 4, y * png.width * 4 + w * 4);
    }
  });

  // Keep the previous `updated` date when nothing changed, so a re-run on
  // the same game build produces byte-identical output (and CI commits nothing).
  const outItems = finalItems.map((it) => (it.stats ? [it.id, it.name, it.slot, it.stats] : [it.id, it.name, it.slot]));
  let updated = new Date().toISOString().slice(0, 10);
  try {
    const prev = JSON.parse(fs.readFileSync(OUT_DATA, 'utf8'));
    if (JSON.stringify(prev.items) === JSON.stringify(outItems)) updated = prev.updated;
  } catch { /* first run */ }

  fs.mkdirSync(path.dirname(OUT_SHEET), { recursive: true });
  fs.writeFileSync(OUT_SHEET, PNG.sync.write(sheet));
  fs.mkdirSync(path.dirname(OUT_DATA), { recursive: true });
  fs.writeFileSync(
    OUT_DATA,
    JSON.stringify({
      v: 2,
      updated,
      tile: { w: TILE_W, h: TILE_H },
      cols: COLS,
      slots: SLOTS,
      items: outItems,
    }),
  );
  console.log(`Wrote ${path.relative(ROOT, OUT_DATA)} (${finalItems.length} items)`);
  console.log(`Wrote ${path.relative(ROOT, OUT_SHEET)} (${sheet.width}x${sheet.height})`);

  await buildUiIcons();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
