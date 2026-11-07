/**
 * Content-agnostic loot simulation engine for the Raid Loot Simulator.
 * Each piece of content supplies a config; the engine just rolls dice.
 *
 * config = {
 *   id, name, short, tagline,
 *   theme: { accent, accent2, glow } — CSS colors for the bespoke skin,
 *   emblem — a character/glyph drawn large on the raid card,
 *   inputs: [{ key, label, type: 'number'|'range'|'select', min, max, step,
 *              default, options?, hint? }],
 *   uniqueChance(values) -> probability (0..1) that this completion rolls a unique,
 *   uniques(values) -> [{ name, weight, qty? }] — the unique table (may vary with inputs),
 *   regular: {
 *     rolls: n | (values) => n,
 *     table: [{ name, weight, qty: [min, max] | (values, rng) => n }],
 *   },
 *   regularWithUnique — whether regular rolls still happen on a unique (default false),
 *   pet: { name, chance(values, { unique }) -> probability per completion },
 *   extras?: (values, rng) => [{ name, qty }] — guaranteed/bonus drops,
 * }
 */

export function weightedPick(table, rng) {
  const total = table.reduce((n, e) => n + e.weight, 0);
  let roll = rng() * total;
  for (const e of table) {
    roll -= e.weight;
    if (roll < 0) return e;
  }
  return table[table.length - 1];
}

const qtyOf = (qty, values, rng) => {
  if (qty == null) return 1;
  if (typeof qty === 'function') return Math.max(1, Math.round(qty(values, rng)));
  const [min, max] = qty;
  return min + Math.floor(rng() * (max - min + 1));
};

/** Simulate one completion. Returns { unique, loot, pet }. */
export function runRaid(config, values, rng = Math.random) {
  const loot = [];
  let unique = null;

  let recipient = null;
  if (rng() < config.uniqueChance(values)) {
    const table = typeof config.uniques === 'function' ? config.uniques(values) : config.uniques;
    const pick = weightedPick(table, rng);
    unique = pick.name;
    loot.push({ name: pick.name, qty: qtyOf(pick.qty, values, rng), unique: true });
    // Team chests can say whose name is on the purple.
    if (config.recipient) recipient = config.recipient(values, rng);
  }

  if (!unique || config.regularWithUnique) {
    // rolls may depend on whether a unique hit (team chests: the recipient
    // forfeits their regular rolls in some raids).
    const rolls = typeof config.regular.rolls === 'function' ? config.regular.rolls(values, !!unique) : config.regular.rolls;
    const seen = new Set();
    for (let i = 0; i < rolls; i++) {
      let pick = weightedPick(config.regular.table, rng);
      if (config.regular.distinct) {
        // Some chests (Chambers of Xeric) never roll the same item twice.
        for (let tries = 0; seen.has(pick.name) && tries < 20; tries++) pick = weightedPick(config.regular.table, rng);
        seen.add(pick.name);
      }
      const qty = qtyOf(pick.qty, values, rng);
      const prev = loot.find((l) => !l.unique && l.name === pick.name);
      if (prev) prev.qty += qty;
      else loot.push({ name: pick.name, qty });
    }
  }

  if (config.extras) {
    for (const e of config.extras(values, rng)) loot.push({ name: e.name, qty: e.qty ?? 1 });
  }

  const pet = config.pet ? rng() < config.pet.chance(values, { unique }) : false;
  return { unique, loot, pet, recipient };
}

/** Simulate n completions, aggregating; returns totals plus the last single result. */
export function runMany(config, values, n, rng = Math.random) {
  const totals = new Map(); // name -> { qty, unique }
  const uniques = [];
  const recipients = new Map(); // label -> list of unique item names received
  let pets = 0;
  let last = null;
  for (let i = 0; i < n; i++) {
    last = runRaid(config, values, rng);
    // at = which completion of the batch (1-based) the purple landed on.
    if (last.unique) uniques.push({ name: last.unique, at: i + 1, recipient: last.recipient });
    if (last.recipient) recipients.set(last.recipient, [...(recipients.get(last.recipient) ?? []), last.unique]);
    if (last.pet) pets++;
    for (const l of last.loot) {
      const t = totals.get(l.name) ?? { qty: 0, unique: !!l.unique };
      t.qty += l.qty;
      totals.set(l.name, t);
    }
  }
  return { totals, uniques, recipients, pets, last };
}

/** Chance of at least one success in n trials at probability p. */
export const atLeastOnce = (p, n) => 1 - (1 - p) ** n;
