/**
 * Dump every OSRS item definition from the local game cache to JSON, using
 * our own cache reader (scripts/lib/osrs-cache.mjs). Run manually:
 *
 *   npm run dump:items              -> scripts/.cache-dump/item-definitions.json
 *   node scripts/dump-items.mjs --cache <dir> --out <file>
 *   node scripts/dump-items.mjs --openrs2   (no local cache needed: fetches
 *     the two item-config groups, ~0.7 MB, from the OpenRS2 archive)
 *
 * The output is a full, current item database (names, equipment wear
 * positions, tradeability, noted/placeholder links, params) for this and
 * future tools. It is gitignored by default; tools derive what they need.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readItemDefinitions, fetchOpenRS2ItemDefinitions, findLocalCacheDir, WEAR_POS_TO_SLOT } from './lib/osrs-cache.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argOf = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const outFile = argOf('--out') ?? path.join(ROOT, 'scripts', '.cache-dump', 'item-definitions.json');
const cacheDir = argOf('--cache') ?? findLocalCacheDir();
const useOpenRS2 = args.includes('--openrs2') || !cacheDir;

let items;
if (useOpenRS2) {
  console.log('Fetching item configs from the OpenRS2 archive...');
  items = await fetchOpenRS2ItemDefinitions({ userAgent: 'old-school-runescape-tools (github.com/HogChampTV/old-school-runescape-tools)' });
} else {
  console.log(`Reading cache: ${cacheDir}`);
  items = readItemDefinitions({ cacheDir });
}

const list = [...items.values()].map((d) => ({
  ...d,
  slot: d.wearPos1 === 3 && d.wearPos2 === 5 ? '2h' : WEAR_POS_TO_SLOT[d.wearPos1],
}));
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(list));

const named = list.filter((d) => d.name !== 'null');
const canonical = named.filter((d) => d.notedTemplate === -1 && d.placeholderTemplate === -1 && d.boughtTemplate === -1);
console.log(`Decoded ${list.length} item definitions (${named.length} named, ${canonical.length} canonical).`);
console.log(`Equipable (canonical): ${canonical.filter((d) => d.slot).length}`);
console.log(`Wrote ${path.relative(ROOT, outFile)}`);
