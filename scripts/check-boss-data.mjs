#!/usr/bin/env node
/**
 * Sanity-checks the Boss Loot Simulator's data. Run by hand after editing a
 * boss file:
 *
 *   node scripts/check-boss-data.mjs              every boss on the site
 *   node scripts/check-boss-data.mjs cerberus     one boss (by id), more detail
 *   node scripts/check-boss-data.mjs --file src/pages/tools/boss-data/wilderness.js
 *                                                 a data file not wired in yet
 *
 * Fails (exit 1) when a main or shared table's chances add up past 100%, an
 * item has no icon in public/loadout/items.json, a rate is not a number, or
 * a simulation strays from the computed unique chance.
 */
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { BOSSES: SITE_BOSSES, BOSS_CATEGORIES } = await import('../src/pages/tools/boss-data/index.js');
const { SHARED_TABLES } = await import('../src/pages/tools/boss-shared-tables.js');
const { runRaid } = await import('../src/pages/tools/raid-loot-engine.js');
const { bossConfig } = await import('../src/pages/tools/boss-loot-engine.js');

const items = JSON.parse(readFileSync(join(root, 'public/loadout/items.json'), 'utf8'));
const exact = new Set(items.items.map((i) => i[1]));
const known = new Set(items.items.map((i) => i[1].toLowerCase()));
// Icons are looked up case-insensitively, but a casing slip means a wrong name.
const iconProblem = (name) => {
  if (exact.has(name)) return null;
  if (known.has(name.toLowerCase())) return `"${name}" differs in capitalisation from the game's item name`;
  return `no icon for "${name}"`;
};

const args = process.argv.slice(2);
const fileIx = args.indexOf('--file');
let BOSSES = SITE_BOSSES;
if (fileIx !== -1) {
  // Every exported array of boss descriptions in that file.
  const mod = await import(pathToFileURL(resolve(args[fileIx + 1])).href);
  const cats = new Map(BOSS_CATEGORIES.map((c) => [c.id, c]));
  BOSSES = Object.values(mod).filter(Array.isArray).flat().map((b) => bossConfig(b, cats.get(b.category)));
  args.splice(fileIx, 2);
}
const ids = new Set();
for (const b of BOSSES) {
  if (ids.has(b.id)) console.log(`  ✗ duplicate boss id "${b.id}"`);
  ids.add(b.id);
}

const only = args[0];
let failed = false;
const fail = (msg) => { failed = true; console.log(`  ✗ ${msg}`); };

// Seeded RNG so runs are repeatable.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

for (const [key, table] of Object.entries(SHARED_TABLES)) {
  const sum = table.reduce((n, e) => n + (typeof e.p === 'function' ? e.p({}) : e.p), 0);
  if (!(sum <= 1 + 1e-9)) fail(`shared table "${key}" adds up to ${(sum * 100).toFixed(2)}%`);
}

const KILLS = only ? 100000 : 20000;
for (const boss of BOSSES.filter((b) => !only || b.id === only)) {
  console.log(`${boss.id} — ${boss.name}`);
  const values = Object.fromEntries(boss.inputs.map((i) => [i.key, i.default]));
  const problems = new Set();
  const checkName = (name) => { const p = iconProblem(name); if (p) problems.add(p); };
  if (boss.emblemItem) checkName(boss.emblemItem);
  if (boss.pet) checkName(boss.pet.name);
  boss.chaseItems.forEach(checkName);

  const rng = mulberry32(12345);
  let uniqueKills = 0;
  let pets = 0;
  for (let i = 0; i < KILLS; i++) {
    const run = runRaid(boss, values, rng);
    if (run.uniques.length) uniqueKills++;
    if (run.pet) pets++;
    for (const l of run.loot) {
      if (!Number.isFinite(l.qty) || l.qty < 1) fail(`${l.name} rolled quantity ${l.qty}`);
      checkName(l.name);
    }
  }
  // Toggled-off drops (Konar keys, Krystilia keys…) need icons too: also kill
  // with every checkbox on and every select option, without scoring the odds.
  const variants = [Object.fromEntries(boss.inputs.map((i) => [i.key, i.type === 'check' ? true : i.default]))];
  for (const input of boss.inputs.filter((i) => i.type === 'select')) {
    for (const o of input.options) variants.push({ ...variants[0], [input.key]: o.value });
  }
  for (const v of variants) {
    for (let i = 0; i < KILLS / 4; i++) {
      for (const l of runRaid(boss, v, rng).loot) checkName(l.name);
    }
  }
  for (const p of problems) fail(p);

  const p = boss.uniqueChance(values);
  if (!Number.isFinite(p) || p < 0 || p > 1) fail(`unique chance is ${p}`);
  const seen = uniqueKills / KILLS;
  // Allow 4 standard deviations of sampling noise.
  const sd = Math.sqrt((p * (1 - p)) / KILLS);
  if (Math.abs(seen - p) > 4 * sd + 1e-4) fail(`simulated unique rate ${(seen * 100).toFixed(3)}% vs computed ${(p * 100).toFixed(3)}%`);
  const petP = boss.pet ? boss.pet.chance(values) : 0;
  console.log(`  unique/kill ${(p * 100).toFixed(3)}% (1 in ${p > 0 ? Math.round(1 / p) : '∞'}), sim ${(seen * 100).toFixed(3)}%` +
    `${boss.pet ? ` · pet 1/${Math.round(1 / petP)} (sim ${pets}/${KILLS})` : ''} · ${boss.chaseItems.length} uniques`);
}

if (failed) {
  console.log('\nFAILED');
  process.exit(1);
}
console.log('\nAll good.');
