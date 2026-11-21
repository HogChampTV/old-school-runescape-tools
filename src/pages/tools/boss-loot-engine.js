/**
 * Reusable loot model for every boss in the game, turned into configs the
 * shared LootSimulator (RaidLootSimulatorPage.jsx) can run.
 *
 * A boss is described the way the wiki lists its drops. A kill rolls, in
 * order:
 *
 *   always    every entry, every kill (bones, ashes, hides…)
 *   preroll   one pick checked before the main table; a hit REPLACES one
 *             main roll. prerollEach: check it before every main roll
 *             instead of once per kill. prerollKeepsMain: a hit replaces
 *             nothing. With rolls = 0 there's no pre-roll either.
 *   main      `rolls` picks (default 1)
 *   extra     further tables, each picked once per kill in addition to the
 *             main drop (Wilderness supply rolls, Chaos Elemental's minor drop)
 *   tertiary  every entry rolled independently once per kill
 *   pet       { name, p } rolled once per kill — or { name, p, inTable: true }
 *             when the pet is an entry inside a table (p is then only the
 *             per-kill odds shown to the player)
 *   special   (values, rng, add) => void for anything else, with
 *             specialUniques(values) => [[name, perKillChance]] for its odds
 *
 * Tables are arrays of entries; one pick walks them in order with each
 * entry's p as its chance, and whatever is left over is "nothing".
 *
 *   entry = { name, p, qty, unique? }                 one item
 *         | { items: [{ name, qty }], p, unique? }    one slot, several items
 *         | { table: 'rdt' | [entries], p, rolls?, qtyMult? }
 *                                                     roll a sub-table
 *         | { set: [names], p, unique, ordered? }     a piece you don't
 *                                                     already hold this set
 *                                                     (in order if ordered)
 *         | { pet: true, p }                          the pet, from a table
 *     any entry may add then: [entries] — a follow-up pick when it hits
 *     (the Sire's Unsired → Font of Consumption)
 *     p   = number or (values) => number; per(3, 128) reads like the wiki
 *     qty = n | [min, max] | (values, rng) => n
 *
 * Sub-tables shared between bosses (rare drop table, gem table, …) live in
 * SHARED_TABLES and are referenced by key.
 */
import { SHARED_TABLES } from './boss-shared-tables.js';

/** Wiki-style rarity: per(3, 128) is "3/128". */
export const per = (a, b) => a / b;

const resolve = (v, values) => (typeof v === 'function' ? v(values) : v);

function qtyOf(qty, values, rng) {
  if (qty == null) return 1;
  if (typeof qty === 'function') return Math.max(1, Math.round(qty(values, rng)));
  if (Array.isArray(qty)) return qty[0] + Math.floor(rng() * (qty[1] - qty[0] + 1));
  return qty;
}

function tableOf(ref) {
  if (Array.isArray(ref)) return ref;
  const t = SHARED_TABLES[ref];
  if (!t) throw new Error(`Unknown shared drop table "${ref}"`);
  return t;
}

/** Pick one entry from a table; null = nothing. */
function pick(table, values, rng) {
  let r = rng();
  for (const e of table) {
    r -= resolve(e.p, values);
    if (r < 0) return e;
  }
  return null;
}

/**
 * Roll one kill. `state` carries set progress (bludgeon pieces etc.) across
 * kills. Returns { loot: [{ name, qty, unique }], uniques: [name], pet }.
 */
export function killBoss(boss, values, rng = Math.random, state = { sets: new Map() }) {
  const loot = new Map(); // name -> { name, qty, unique }
  const uniques = [];
  let pet = false;
  const add = (name, qty, unique) => {
    const prev = loot.get(name);
    if (prev) prev.qty += qty;
    else loot.set(name, { name, qty, unique: !!unique });
    if (unique) uniques.push(name);
  };
  const take = (e, mult = 1) => {
    if (e.pet) {
      pet = true;
    } else if (e.table) {
      for (let i = 0; i < (e.rolls ?? 1); i++) {
        const sub = pick(tableOf(e.table), values, rng);
        if (sub) take(sub, mult * (e.qtyMult ?? 1));
      }
    } else if (e.items) {
      for (const it of e.items) add(it.name, qtyOf(it.qty, values, rng) * mult, e.unique || it.unique);
    } else if (e.set) {
      const held = state.sets.get(e.set) ?? new Set();
      const missing = e.set.filter((n) => !held.has(n));
      const name = e.ordered ? missing[0] : missing[Math.floor(rng() * missing.length)];
      held.add(name);
      state.sets.set(e.set, held.size === e.set.length ? new Set() : held);
      add(name, 1, e.unique);
    } else {
      add(e.name, qtyOf(e.qty, values, rng) * mult, e.unique);
    }
    if (e.then) {
      const next = pick(e.then, values, rng);
      if (next) take(next);
    }
  };

  for (const e of boss.always ?? []) take(e);
  const rolls = resolve(boss.rolls ?? 1, values);
  let replaced = 0;
  if (boss.preroll && !boss.prerollEach && rolls > 0) {
    const pre = pick(boss.preroll, values, rng);
    if (pre) {
      take(pre);
      if (!boss.prerollKeepsMain) replaced = 1;
    }
  }
  for (let i = replaced; i < rolls; i++) {
    if (boss.prerollEach) {
      const pre = pick(boss.preroll, values, rng);
      if (pre) {
        take(pre);
        if (!boss.prerollKeepsMain) continue;
      }
    }
    const e = pick(boss.main ?? [], values, rng);
    if (e) take(e);
  }
  for (const t of boss.extra ?? []) {
    const e = pick(t, values, rng);
    if (e) take(e);
  }
  for (const e of boss.tertiary ?? []) {
    if (rng() < resolve(e.p, values)) take(e.table ? { ...e, p: 1 } : e);
  }
  boss.special?.(values, rng, (name, qty = 1, unique = false) => add(name, qty, unique));
  if (boss.pet && !boss.pet.inTable && rng() < resolve(boss.pet.p, values)) pet = true;

  // Uniques first, so they lead the loot grid.
  const list = [...loot.values()].sort((a, b) => Number(b.unique) - Number(a.unique));
  return { loot: list, uniques, pet };
}

// ----- odds -----

const sumP = (table, values) => table.reduce((n, e) => n + resolve(e.p, values), 0);

// Chance that taking this entry yields at least one unique.
function entryUnique(e, values) {
  let none = e.unique || e.items?.some((i) => i.unique) ? 0 : 1;
  if (none && e.table) none = (1 - uniquePerPick(tableOf(e.table), values)) ** (e.rolls ?? 1);
  if (e.then) none *= 1 - uniquePerPick(e.then, values);
  return 1 - none;
}

// Chance that one pick of a table yields at least one unique.
function uniquePerPick(table, values) {
  return table.reduce((n, e) => n + resolve(e.p, values) * entryUnique(e, values), 0);
}

/** Exact chance a kill drops at least one unique. */
export function bossUniqueChance(boss, values) {
  const rolls = resolve(boss.rolls ?? 1, values);
  const mainNone = 1 - uniquePerPick(boss.main ?? [], values);
  let none;
  if (!boss.preroll || rolls === 0) {
    none = mainNone ** rolls;
  } else {
    const preHit = sumP(boss.preroll, values);
    const preU = uniquePerPick(boss.preroll, values);
    const preQuiet = preHit - preU; // a pre-roll hit with no unique
    const keep = boss.prerollKeepsMain;
    if (boss.prerollEach) {
      none = (preQuiet * (keep ? mainNone : 1) + (1 - preHit) * mainNone) ** rolls;
    } else {
      none = preQuiet * mainNone ** (keep ? rolls : rolls - 1) + (1 - preHit) * mainNone ** rolls;
    }
  }
  for (const t of boss.extra ?? []) none *= 1 - uniquePerPick(t, values);
  for (const e of boss.tertiary ?? []) none *= 1 - resolve(e.p, values) * entryUnique(e, values);
  for (const [, p] of boss.specialUniques?.(values) ?? []) none *= 1 - p;
  return 1 - none;
}

/**
 * Every unique a boss can give, with its approximate chance per kill (used
 * to list "Until <item>" choices and spot legendary-rare drops).
 */
export function bossUniques(boss, values) {
  const out = new Map();
  const put = (name, p) => out.set(name, (out.get(name) ?? 0) + p);
  const rolls = resolve(boss.rolls ?? 1, values);
  const preHit = boss.preroll && rolls > 0 ? sumP(boss.preroll, values) : 0;
  const walk = (table, scale, perKill) => {
    for (const e of table) {
      const pe = resolve(e.p, values) * scale;
      if (e.pet) continue;
      if (e.table) walk(tableOf(e.table), pe * (e.rolls ?? 1), perKill);
      else if (e.items) for (const it of e.items) { if (e.unique || it.unique) put(it.name, perKill(pe)); }
      else if (e.set) { if (e.unique) for (const n of e.set) put(n, perKill(pe / e.set.length)); }
      else if (e.unique) put(e.name, perKill(pe));
      if (e.then) walk(e.then, pe, perKill);
    }
  };
  const preKill = boss.prerollEach ? (p) => 1 - (1 - p) ** rolls : (p) => p;
  walk(boss.preroll ?? [], rolls > 0 ? 1 : 0, preKill);
  const mainRolls = boss.prerollEach || boss.prerollKeepsMain ? rolls : rolls - preHit;
  const mainScale = boss.prerollEach && !boss.prerollKeepsMain ? 1 - preHit : 1;
  walk(boss.main ?? [], mainScale, (p) => 1 - (1 - p) ** Math.max(0, mainRolls));
  for (const t of boss.extra ?? []) walk(t, 1, (p) => p);
  for (const e of boss.tertiary ?? []) walk([e], 1, (p) => p);
  for (const [name, p] of boss.specialUniques?.(values) ?? []) put(name, p);
  return out;
}

// Rarer than this per kill (or the pet) earns the gold "Legendary loot" banner.
const LEGENDARY_PER_KILL = 1 / 3000;

/** Turn a boss description into a LootSimulator config. */
export function bossConfig(boss, category) {
  const defaults = Object.fromEntries((boss.inputs ?? []).map((i) => [i.key, i.default]));
  const uniques = bossUniques(boss, defaults);
  const legendaryNames = new Set([...uniques].filter(([, p]) => p <= LEGENDARY_PER_KILL).map(([n]) => n));
  const state = { sets: new Map() }; // set pieces held, for this browser session
  return {
    id: boss.id,
    name: boss.name,
    short: boss.short ?? boss.name,
    tagline: boss.tagline,
    category: boss.category ?? category?.id,
    theme: boss.theme ?? category?.theme,
    emblem: '☠',
    emblemItem: boss.emblemItem ?? boss.pet?.name,
    inputs: boss.inputs ?? [],
    teamKey: boss.teamKey,
    uniqueChance: (v) => bossUniqueChance(boss, v),
    kill: (v, rng) => killBoss(boss, v, rng, state),
    pet: boss.pet && { name: boss.pet.name, chance: (v) => resolve(boss.pet.p, v) },
    chases: boss.pet ? [{ label: 'Until pet', done: boss.pet.name, test: (run) => run.pet }] : [],
    chaseItems: [...uniques.keys()],
    legendary: { item: (name) => legendaryNames.has(name), pet: !!boss.pet },
    summary: boss.summary,
    wiki: boss.wiki,
  };
}
