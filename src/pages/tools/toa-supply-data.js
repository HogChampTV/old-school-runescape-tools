/**
 * Tombs of Amascut: what the Helpful Spirit offers under each supply
 * invocation. Bundle contents and reduction percentages follow the Old School
 * RuneScape Wiki (Helpful Spirit and Tombs of Amascut pages, November 2026).
 *
 * The wiki publishes ranges, not odds. Where the generator has to pick a
 * number it assumes: an even roll across each range, a 1 in 10 chance for
 * Chaos's "rare" ambrosia and adrenaline, and that a reduction rounds a
 * fractional amount up with probability equal to the fraction (which is what
 * makes the wiki's "may or may not occur" example come out: 2 salts at 66%
 * become 1 or 2).
 */

export const SUPPLY_ITEMS = {
  nectar: { name: 'Nectar (4)', short: 'Nectar', heals: true },
  tears: { name: 'Tears of Elidinis (4)', short: 'Tears' },
  dressing: { name: 'Silk dressing (2)', short: 'Dressing' },
  scarab: { name: 'Blessed crystal scarab (2)', short: 'Scarab' },
  ambrosia: { name: 'Ambrosia (2)', short: 'Ambrosia', heals: true },
  salts: { name: 'Smelling salts (2)', short: 'Salts' },
  adrenaline: { name: 'Liquid adrenaline (2)', short: 'Adrenaline' },
};

// The supply-reduction invocations; only one can be active.
export const HELP_LEVELS = [
  { id: 'none', invo: null, label: 'Full help', pct: 1, rl: 0 },
  { id: 'some', invo: 'Need Some Help?', label: 'Need Some Help?', pct: 0.66, rl: 15 },
  { id: 'less', invo: 'Need Less Help?', label: 'Need Less Help?', pct: 0.33, rl: 25 },
  { id: 'none-needed', invo: 'No Help Needed', label: 'No Help Needed', pct: 0.1, rl: 40 },
];

export const RESTORATION = [
  { id: 'diet', invo: 'On a Diet', rl: 15, desc: 'No food. The spirit stops offering silk dressings, and a wipe gives no honey locusts.' },
  { id: 'dehydration', invo: 'Dehydration', rl: 30, desc: 'No health-restoring potions: nectar and ambrosia are still offered but can’t be drunk.' },
];

export const RARE_CHANCE = 0.1;

// [min, max] per item, before any invocation.
const BASE = {
  life: { nectar: [5, 5], tears: [5, 5], dressing: [1, 3], scarab: [1, 3], ambrosia: [1, 2] },
  chaos: { nectar: [1, 8], tears: [0, 6], salts: [0, 2], ambrosia: [0, 1], adrenaline: [0, 1] },
  power: { salts: [2, 2], adrenaline: [1, 1] },
};
const RARE = { chaos: new Set(['ambrosia', 'adrenaline']) };

export const BUNDLES = [
  { id: 'life', name: 'Life', blurb: 'Survival' },
  { id: 'chaos', name: 'Chaos', blurb: 'A mixed subset' },
  { id: 'power', name: 'Power', blurb: 'Pure damage' },
];

// On a Diet takes the dressings out of Life. The wiki: with no reduction
// active they are "replaced with two scarabs and ambrosia", read here as +2
// scarabs and +1 ambrosia. It doesn't say what happens under a reduction.
const DIET_SWAP = new Set(['scarab', 'ambrosia']);
function baseFor(bundleId, pct, diet) {
  const base = { ...BASE[bundleId] };
  if (diet && bundleId === 'life') {
    delete base.dressing;
    if (pct === 1) {
      base.scarab = [base.scarab[0] + 2, base.scarab[1] + 2];
      base.ambrosia = [base.ambrosia[0] + 1, base.ambrosia[1] + 1];
    }
  }
  return base;
}

/**
 * The bundle's contents for a help level and On a Diet setting:
 * [{ key, range: [min, max], rare, assumed }].
 */
export function bundleContents(bundleId, pct, diet) {
  const swapped = diet && bundleId === 'life' && pct === 1;
  return Object.entries(baseFor(bundleId, pct, diet)).map(([key, [lo, hi]]) => ({
    key,
    range: [reduceLow(lo, pct), reduceHigh(hi, pct)],
    rare: !!RARE[bundleId]?.has(key),
    assumed: swapped && DIET_SWAP.has(key),
  }));
}

// A reduction keeps at least one of anything that was offered.
const reduceLow = (n, pct) => (n === 0 ? 0 : Math.max(1, Math.floor(n * pct + 1e-9)));
const reduceHigh = (n, pct) => (n === 0 ? 0 : Math.max(1, Math.ceil(n * pct - 1e-9)));

/** Roll one concrete offer of a bundle: [{ key, qty }] (zero quantities dropped). */
export function rollBundle(bundleId, pct, diet, rng = Math.random) {
  const out = [];
  for (const [key, [lo, hi]] of Object.entries(baseFor(bundleId, pct, diet))) {
    let n = RARE[bundleId]?.has(key)
      ? (rng() < RARE_CHANCE ? hi : lo)
      : lo + Math.floor(rng() * (hi - lo + 1));
    if (n > 0 && pct < 1) {
      const x = n * pct;
      n = Math.max(1, Math.floor(x) + (rng() < x - Math.floor(x) ? 1 : 0));
    }
    if (n > 0) out.push({ key, qty: n });
  }
  return out;
}

/**
 * Exact odds of each quantity of one item in a bundle, under the generator's
 * assumptions: [[qty, probability], …] sorted by qty, zero included.
 */
export function qtyOdds(bundleId, key, pct, diet) {
  const [lo, hi] = baseFor(bundleId, pct, diet)[key];
  const pre = RARE[bundleId]?.has(key)
    ? [[lo, 1 - RARE_CHANCE], [hi, RARE_CHANCE]]
    : Array.from({ length: hi - lo + 1 }, (_, i) => [lo + i, 1 / (hi - lo + 1)]);
  const odds = new Map();
  const add = (k, p) => odds.set(k, (odds.get(k) ?? 0) + p);
  for (const [n, p] of pre) {
    if (n === 0 || pct === 1) { add(n, p); continue; }
    const x = n * pct;
    const f = Math.floor(x);
    const frac = x - f;
    add(Math.max(1, f), p * (1 - frac));
    if (frac > 1e-9) add(Math.max(1, f + 1), p * frac);
  }
  return [...odds.entries()].sort((a, b) => a[0] - b[0]);
}
