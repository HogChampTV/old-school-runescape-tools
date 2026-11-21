/**
 * Modern, minigame and skilling bosses: the Desert Treasure II four, the
 * Varlamore bosses and activities, the minigame reward chests, the skilling
 * bosses' reward carts and pools, and the newer world bosses. Drop tables
 * follow each Old School RuneScape Wiki page line by line (weights as the
 * wiki writes them, e.g. per(5, 58)); see boss-loot-engine.js for the shape.
 *
 * "Roll until success" chains (DT2, Yama, Wintertodt) are pre-rolls in chain
 * order, each at its effective rate (its own odds times the chance nothing
 * earlier hit). Content whose rewards depend on how far you got (Colosseum
 * waves, Doom delve levels, Moons defeated) rolls itself in `special`.
 * Conditional drops (quest-only keys, clue-step "Always" drops, first-time
 * capes, MVP-only items behind a toggle) are left out or gated.
 */
import { KONAR, brimstoneKey, clue, per } from './common.js';

// ----- helpers -----

const val = (v) => (typeof v === 'function' ? v : () => v);
const rand = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

/** Contribution input (percent of the damage / points), 1–100. */
const CONTRIB = {
  key: 'contrib',
  label: 'Your contribution (%)',
  type: 'range',
  min: 1,
  max: 100,
  step: 1,
  default: 100,
  hint: 'Your share of the damage. 100 is a solo kill.',
};
const share = (v) => Math.min(100, Math.max(1, Number(v.contrib) || 1)) / 100;

/** A quantity scaled linearly by contribution: [min, max] at a solo kill. */
const scaled = (min, max = min) => (v, rng) => Math.max(1, Math.round(rand(rng, min, max) * share(v)));

/** Local roller for `special`: one pick of a table, handing items to add(). */
function qtyIn(qty, v, rng) {
  if (qty == null) return 1;
  if (typeof qty === 'function') return Math.max(1, Math.round(qty(v, rng)));
  if (Array.isArray(qty)) return rand(rng, qty[0], qty[1]);
  return qty;
}
function pickIn(table, v, rng) {
  let r = rng();
  for (const e of table) {
    r -= val(e.p)(v);
    if (r < 0) return e;
  }
  return null;
}
function giveIn(e, v, rng, add, qtyMap = (q) => q) {
  if (e.table) {
    for (let i = 0; i < (e.rolls ?? 1); i++) {
      const sub = pickIn(e.table, v, rng);
      if (sub) giveIn(sub, v, rng, add, qtyMap);
    }
  } else if (e.items) {
    for (const it of e.items) add(it.name, qtyMap(qtyIn(it.qty, v, rng)), !!(e.unique || it.unique));
  } else {
    add(e.name, qtyMap(qtyIn(e.qty, v, rng)), !!e.unique);
  }
}

/** A set piece you don't hold yet (resets once complete), for `special`. */
const SPECIAL_SETS = new Map();
function setPiece(set, rng) {
  const held = SPECIAL_SETS.get(set) ?? new Set();
  const missing = set.filter((n) => !held.has(n));
  const name = missing[Math.floor(rng() * missing.length)];
  held.add(name);
  SPECIAL_SETS.set(set, held.size === set.length ? new Set() : held);
  return name;
}

// ===================================================================
// Desert Treasure II
// ===================================================================

const AWAKENED = {
  key: 'awakened',
  label: 'Awakened',
  type: 'check',
  default: false,
  hint: "Fought with an awakener's orb: three times the unique table chance.",
};
const PERFECT = {
  key: 'perfect',
  label: 'Perfect kill',
  type: 'check',
  default: false,
  hint: 'No avoidable damage taken: 50% more from the standard table.',
};

/**
 * One DT2 boss. The kill walks: unique table, awakener's orb, tablet,
 * quartz, supplies; if none hit, one roll on the standard table.
 */
function dt2Boss({ id, name, short, unique, orb, tablet, quartz, vestige, item, supplies, standard, pet, petP, brimstone, tagline }) {
  const u = (v) => (v.awakened ? 3 : 1) / unique;
  const reachOrb = (v) => 1 - u(v);
  const reachTablet = (v) => reachOrb(v) * (1 - 1 / orb);
  const reachQuartz = (v) => reachTablet(v) * (24 / 25);
  const reachSupply = (v) => reachQuartz(v) * (199 / 200);
  return {
    id,
    name,
    short,
    category: 'dt2',
    wiki: name,
    tagline,
    inputs: [AWAKENED, PERFECT, KONAR],
    preroll: [
      {
        table: [
          // 1/8 Virtus (then 1/3 which piece)
          { name: 'Virtus mask', p: per(1, 24), unique: true },
          { name: 'Virtus robe top', p: per(1, 24), unique: true },
          { name: 'Virtus robe bottom', p: per(1, 24), unique: true },
          // 3/8 a vestige roll: the third such roll gives the vestige, the
          // first two a gold ring and two gold rings.
          {
            table: [
              { name: vestige, p: per(1, 3), unique: true },
              { name: 'Gold ring', p: per(1, 3) },
              { name: 'Gold ring', p: per(1, 3), qty: 2 },
            ],
            p: per(3, 8),
          },
          { name: 'Chromium ingot', p: per(3, 8), unique: true },
          { name: item, p: per(1, 8), unique: true },
        ],
        p: u,
      },
      { name: "Awakener's orb", p: (v) => reachOrb(v) / orb },
      { name: tablet, p: (v) => reachTablet(v) / 25 },
      { name: quartz, p: (v) => reachQuartz(v) / 200 },
      { items: supplies, p: (v) => reachSupply(v) / 5 },
    ],
    // Listed out of 100; the wiki's lines add up to 78/100.
    main: standard.map(([n, a, b, w]) => ({ name: n, p: per(w, 100), qty: (v) => (v.perfect ? b : a) })),
    tertiary: [
      { ...brimstoneKey(brimstone), p: (v) => (v.konar && !v.awakened ? 1 / brimstone : 0) },
      clue('easy', 160),
      clue('medium', 160),
      clue('hard', 160),
      clue('elite', 160),
    ],
    pet: { name: pet, p: per(1, petP) },
    summary: () =>
      'The standard table\'s lines add up to 78/100 on the wiki; the rest is left as nothing. ' +
      `The ${vestige} needs three hits on its slot (the first two give gold rings), shown here as a 1/3 chance per hit. ` +
      `The ${tablet} is rolled at a flat 1/25 (it becomes more common with kill count and stops after your first) and the ${quartz} at 1/200 (it rises to 1/50 over your first 300 kills until you get one). ` +
      'The ancient blood ornament kit (last of the four, awakened) and quest-only keys are left out.',
  };
}

const dukeSucellus = dt2Boss({
  id: 'duke-sucellus',
  name: 'Duke Sucellus',
  short: 'Duke',
  unique: 90,
  orb: 48,
  tablet: 'Frozen tablet',
  quartz: 'Ice quartz',
  vestige: 'Magus vestige',
  item: 'Eye of the Duke',
  supplies: [{ name: 'Pineapple pizza', qty: [3, 4] }, { name: 'Prayer potion(3)' }, { name: 'Super combat potion(2)' }],
  standard: [
    // Weapons and armour
    ['Bronze chainbody', 11, 17, 1],
    ['Mithril chainbody', 5, 7, 1],
    ['Adamant chainbody', 6, 10, 1],
    ['Dragon platelegs', 5, 7, 1],
    // Resources
    ['Pure essence', 200, 300, 1],
    ['Iron ore', 63, 95, 1],
    ['Coal', 216, 325, 8],
    ['Mithril ore', 33, 50, 1],
    ['Adamantite ore', 75, 112, 8],
    ['Runite ore', 30, 45, 2],
    ['Sapphire', 28, 42, 1],
    ['Emerald', 28, 42, 1],
    ['Ruby', 28, 42, 1],
    ['Uncut ruby', 41, 62, 5],
    ['Uncut diamond', 41, 62, 5],
    ['Bronze bar', 63, 95, 1],
    ['Dragon arrowtips', 166, 250, 2],
    ['Rune javelin tips', 60, 90, 8],
    ['Dragon javelin tips', 60, 90, 8],
    ['Raw sea turtle', 200, 300, 1],
    // Runes and ammunition
    ['Air rune', 200, 300, 1],
    ['Mist rune', 100, 150, 8],
    ['Chaos rune', 100, 150, 9],
    ['Soul rune', 666, 1000, 2],
  ],
  pet: 'Baron',
  petP: 2500,
  brimstone: 50,
  tagline: 'A 1/90 unique table (1/30 awakened) with Virtus, the Magus vestige and the Eye of the Duke, and a 1/2500 Baron.',
});

const theLeviathan = dt2Boss({
  id: 'the-leviathan',
  name: 'The Leviathan',
  short: 'Leviathan',
  unique: 96,
  orb: 53,
  tablet: 'Scarred tablet',
  quartz: 'Smoke quartz',
  vestige: 'Venator vestige',
  item: "Leviathan's lure",
  supplies: [{ name: 'Prayer potion(3)' }, { name: 'Ranging potion(2)' }, { name: 'Sea turtle', qty: [3, 4] }],
  standard: [
    // Resources
    ['Aether catalyst', 1500, 2250, 1],
    ['Iron ore', 57, 85, 1],
    ['Silver ore', 57, 85, 1],
    ['Coal', 195, 292, 8],
    ['Gold ore', 67, 101, 8],
    ['Adamantite ore', 57, 85, 1],
    ['Runite ore', 27, 40, 2],
    ['Sapphire', 25, 38, 1],
    ['Emerald', 25, 38, 1],
    ['Ruby', 25, 38, 1],
    ['Uncut ruby', 37, 56, 5],
    ['Uncut diamond', 37, 56, 5],
    ['Dragon javelin tips', 54, 81, 8],
    ['Dragon bolts (unf)', 150, 225, 2],
    ['Onyx bolt tips', 90, 135, 1],
    ['Raw manta ray', 180, 270, 1],
    ['Anglerfish', 4, 6, 8],
    // Runes and ammunition
    ['Bronze arrow', 63, 94, 1],
    ['Mithril arrow', 63, 94, 1],
    ['Adamant arrow', 63, 94, 1],
    ['Rune arrow', 54, 81, 8],
    ['Body rune', 180, 270, 1],
    ['Earth rune', 180, 270, 1],
    ['Smoke rune', 300, 450, 8],
    ['Soul rune', 600, 900, 2],
  ],
  pet: "Lil'viathan",
  petP: 2500,
  brimstone: 50,
  tagline: "A 1/96 unique table (3/96 awakened) with Virtus, the Venator vestige and the Leviathan's lure, and a 1/2500 Lil'viathan.",
});

const vardorvis = dt2Boss({
  id: 'vardorvis',
  name: 'Vardorvis',
  short: 'Vardorvis',
  unique: 136,
  orb: 80,
  tablet: 'Strangled tablet',
  quartz: 'Blood quartz',
  vestige: 'Ultor vestige',
  item: "Executioner's axe head",
  supplies: [{ name: 'Tuna potato', qty: [3, 4] }, { name: 'Prayer potion(3)' }, { name: 'Super combat potion(2)' }],
  standard: [
    // Resources
    ['Pure essence', 120, 180, 1],
    ['Iron ore', 38, 57, 1],
    ['Silver ore', 38, 57, 1],
    ['Coal', 130, 195, 8],
    ['Mithril ore', 38, 57, 1],
    ['Adamantite ore', 45, 67, 8],
    ['Runite ore', 18, 27, 2],
    ['Sapphire', 17, 25, 1],
    ['Emerald', 17, 25, 1],
    ['Ruby', 17, 25, 1],
    ['Uncut ruby', 25, 37, 5],
    ['Uncut diamond', 25, 37, 5],
    ['Rune javelin tips', 36, 54, 8],
    ['Dragon javelin tips', 36, 54, 8],
    ['Dragon dart tip', 100, 150, 2],
    ['Raw shark', 200, 300, 1],
    // Runes and ammunition
    ['Bronze javelin', 42, 63, 1],
    ['Mithril javelin', 42, 63, 1],
    ['Adamant javelin', 42, 63, 1],
    ['Onyx bolts (e)', 60, 90, 1],
    ['Mind rune', 120, 180, 1],
    ['Fire rune', 120, 180, 1],
    ['Lava rune', 200, 300, 8],
    ['Blood rune', 200, 300, 8],
    ['Soul rune', 400, 600, 2],
  ],
  pet: 'Butch',
  petP: 3000,
  brimstone: 50,
  tagline: "A 1/136 unique table (3/136 awakened) with Virtus, the Ultor vestige and the Executioner's axe head, and a 1/3000 Butch.",
});

const theWhisperer = dt2Boss({
  id: 'the-whisperer',
  name: 'The Whisperer',
  short: 'Whisperer',
  unique: 64,
  orb: 34,
  tablet: 'Sirenic tablet',
  quartz: 'Shadow quartz',
  vestige: 'Bellator vestige',
  item: "Siren's staff",
  supplies: [{ name: 'Ancient brew(2)' }, { name: 'Prayer potion(3)' }, { name: 'Manta ray', qty: [3, 4] }],
  standard: [
    // Weapons and armour
    ['Bronze longsword', 16, 24, 1],
    ['Mithril longsword', 7, 10, 1],
    ['Adamant longsword', 9, 14, 1],
    ['Battlestaff', 70, 105, 2],
    ['Dragon plateskirt', 7, 10, 1],
    // Resources
    ['Pure essence', 280, 420, 1],
    ['Iron ore', 88, 133, 1],
    ['Coal', 303, 455, 8],
    ['Gold ore', 88, 133, 1],
    ['Mithril ore', 88, 133, 1],
    ['Adamantite ore', 105, 157, 8],
    ['Runite ore', 42, 63, 2],
    ['Sapphire', 39, 59, 1],
    ['Emerald', 39, 59, 1],
    ['Ruby', 39, 59, 1],
    ['Uncut ruby', 58, 87, 5],
    ['Uncut diamond', 58, 87, 5],
    ['Dragon javelin tips', 84, 126, 8],
    ['Runite bolts (unf)', 84, 126, 8],
    ['Raw monkfish', 700, 1050, 1],
    // Runes and ammunition
    ['Water rune', 280, 420, 1],
    ['Steam rune', 466, 700, 8],
    ['Chaos rune', 140, 210, 1],
    ['Death rune', 466, 700, 8],
    ['Soul rune', 933, 1400, 2],
  ],
  pet: 'Wisp',
  petP: 2000,
  brimstone: 50,
  tagline: "A 1/64 unique table (3/64 awakened) with Virtus, the Bellator vestige and the Siren's staff, and a 1/2000 Wisp.",
});

// ===================================================================
// Varlamore
// ===================================================================

// ----- Amoxliatl -----

const amoxliatl = {
  id: 'amoxliatl',
  name: 'Amoxliatl',
  short: 'Amoxliatl',
  category: 'varlamore',
  wiki: 'Amoxliatl',
  tagline: 'Two rolls plus frozen tears, a 1/25 Pendant of Ates, a 1/100 Glacial temotli and a 1/3000 Moxi.',
  inputs: [KONAR],
  rolls: 2,
  main: [
    // Weapons and armour
    { name: 'Rune mace', p: per(2, 58) },
    { name: 'Rune pickaxe', p: per(2, 58) },
    { name: 'Rune platebody', p: per(1, 58) },
    { name: 'Rune platelegs', p: per(1, 58) },
    // Runes and ammunition
    { name: 'Water rune', p: per(5, 58), qty: [200, 400] },
    { name: 'Chaos rune', p: per(4, 58), qty: [30, 60] },
    { name: 'Death rune', p: per(4, 58), qty: [20, 40] },
    { name: 'Blood rune', p: per(4, 58), qty: [15, 30] },
    { name: 'Soul rune', p: per(4, 58), qty: [30, 45] },
    { name: 'Nature rune', p: per(4, 58), qty: [30, 60] },
    // Other
    { name: 'Coal', p: per(5, 58), qty: [20, 30] },
    { name: 'Gold ore', p: per(5, 58), qty: [20, 30] },
    { name: 'Adamantite ore', p: per(4, 58), qty: [5, 10] },
    { name: 'Prayer potion(3)', p: per(2, 58) },
    { name: 'Runite ore', p: per(2, 58) },
    { name: 'Blessed bone shards', p: per(2, 58), qty: [60, 100] },
    { name: 'Water orb', p: per(2, 58), qty: [10, 20] },
    { name: 'Water talisman', p: per(2, 58) },
    { name: 'Huasca seed', p: per(1, 58) },
    // Gem drop table
    { table: 'gem', p: per(2, 58) },
  ],
  // One roll for frozen tears every kill.
  extra: [
    [
      { name: 'Frozen tear', p: per(6, 10), qty: [2, 4] },
      { name: 'Frozen tear', p: per(3, 10), qty: [5, 10] },
      { name: 'Frozen tear', p: per(1, 10), qty: [10, 20] },
    ],
  ],
  tertiary: [
    { name: 'Pendant of Ates (inert)', p: per(1, 25), unique: true },
    { name: 'Glacial temotli', p: per(1, 100), unique: true },
    { name: 'Tooth half of key', p: per(1, 125) },
    clue('elite', 200),
    brimstoneKey(54),
  ],
  pet: { name: 'Moxi', p: per(1, 3000) },
  summary: () =>
    'The tooth half of key is the moon key half. The guaranteed elite clue and casket from the frost nagua clue step are left out.',
};

// ----- The Hueycoatl -----

const HUEY_PENALTY = (v) => (v.skipped ? 0.05 : 1);
// Solo quantities are the wiki's maximum; your share scales them, and
// skipping the body phase cuts them to 5%.
const huey = (max) => (v) => Math.max(1, Math.round(max * share(v) * HUEY_PENALTY(v)));

const theHueycoatl = {
  id: 'the-hueycoatl',
  name: 'The Hueycoatl',
  short: 'Hueycoatl',
  category: 'varlamore',
  wiki: 'The Hueycoatl',
  tagline: 'A 1/18 unique roll on top of the loot (Dragon hunter wand 1/105, hides, Tome of Earth), and a 1/400 Huberte.',
  inputs: [
    CONTRIB,
    { key: 'mvp', label: 'MVP', type: 'check', default: true, hint: 'The top damage dealer also gets big bones.' },
    {
      key: 'skipped',
      label: 'Skipped the body phase',
      type: 'check',
      default: false,
      hint: 'Under 25 damage to the body: quantities and the pet chance drop to 5%.',
    },
  ],
  main: [
    // Weapons and armour
    { name: 'Rune mace', p: per(3, 68), qty: huey(26) },
    { name: 'Rune scimitar', p: per(3, 68), qty: huey(20) },
    { name: 'Rune plateskirt', p: per(2, 68), qty: huey(20) },
    { name: 'Adamant platebody', p: per(3, 68), qty: huey(30) },
    // Runes and ammunition
    { name: 'Death rune', p: per(3, 68), qty: huey(450) },
    { name: 'Earth rune', p: per(2, 68), qty: huey(3000) },
    { name: 'Cosmic rune', p: per(2, 68), qty: huey(400) },
    { name: 'Nature rune', p: per(2, 68), qty: huey(400) },
    // Seeds
    { name: 'Lantadyme seed', p: per(2, 68), qty: huey(60) },
    { name: 'Huasca seed', p: per(2, 68), qty: huey(20) },
    { name: 'Toadflax seed', p: per(2, 68), qty: huey(40) },
    { name: 'Torstol seed', p: per(2, 68), qty: huey(20) },
    { name: 'Ranarr seed', p: per(2, 68), qty: huey(20) },
    { name: 'Avantoe seed', p: per(3, 68), qty: huey(20) },
    { name: 'Kwuarm seed', p: per(3, 68), qty: huey(20) },
    // Other
    { name: 'Soiled page', p: per(5, 68), qty: huey(80) },
    { name: 'Adamant bolts(unf)', p: per(3, 68), qty: huey(300) },
    { name: 'Air orb', p: per(3, 68), qty: huey(80) },
    { name: 'Raw shark', p: per(3, 68), qty: huey(180) },
    { name: 'Sunfire splinters', p: per(3, 68), qty: huey(350) },
    { name: 'Sun-kissed bones', p: per(3, 68), qty: huey(100) },
    { name: 'Dragon bones', p: per(3, 68), qty: huey(40) },
    { name: 'Adamantite ore', p: per(2, 68), qty: huey(120) },
    { name: 'Steel cannonball', p: per(3, 68), qty: huey(1200) },
    { name: 'Rune dart tip', p: per(2, 68), qty: huey(120) },
    { name: 'Limpwurt root', p: per(2, 68), qty: huey(200) },
  ],
  // The unique table: 1/18 scaled by your share, rolled alongside the loot.
  extra: [
    [
      {
        table: [
          { name: 'Dragon hunter wand', p: per(6, 35), unique: true },
          { name: 'Hueycoatl hide', p: per(22, 35), qty: 3, unique: true },
          { name: 'Tome of Earth (empty)', p: per(7, 35), unique: true },
        ],
        p: (v) => share(v) / 18,
      },
    ],
  ],
  tertiary: [
    { name: 'Big bones', p: (v) => (v.mvp ? 1 : 0) },
    { name: 'Tooth half of key', p: per(1, 75) },
    clue('hard', 50),
  ],
  pet: { name: 'Huberte', p: (v) => (share(v) * HUEY_PENALTY(v)) / 400 },
  summary: () =>
    'Quantities are the wiki\'s solo maximum scaled by your share; the wiki doesn\'t say how many main rolls a kill gets, so it\'s one. ' +
    'The tooth half of key is the moon key half.',
};

// ----- Moons of Peril -----

const MOONS = [
  { key: 'blood', label: 'Blood Moon', set: ['Blood Moon helm', 'Blood Moon chestplate', 'Blood Moon tassets', 'Dual macuahuitl'] },
  { key: 'blue', label: 'Blue Moon', set: ['Blue Moon helm', 'Blue Moon chestplate', 'Blue Moon tassets', 'Blue Moon spear'] },
  { key: 'eclipse', label: 'Eclipse Moon', set: ['Eclipse Moon helm', 'Eclipse Moon chestplate', 'Eclipse Moon tassets', 'Eclipse atlatl'] },
];
const LUNAR_STANDARD = [
  { name: 'Atlatl dart', p: per(5, 30), qty: [72, 120] },
  { name: 'Blessed bone shards', p: per(2, 30), qty: [160, 179] },
  { name: 'Wyrmling bones', p: per(1, 30), qty: [42, 54] },
  { name: 'Sun-kissed bones', p: per(3, 30), qty: [6, 12] },
  { name: 'Swamp tar', p: per(4, 30), qty: [79, 119] },
  { name: 'Water orb', p: per(2, 30), qty: [30, 45] },
  { name: 'Supercompost', p: per(3, 30), qty: [6, 12] },
  { name: 'Soft clay', p: per(3, 30), qty: [15, 25] },
  { name: 'Grimy harralander', p: per(3, 30), qty: [12, 18] },
  { name: 'Grimy irit leaf', p: per(1, 30), qty: [12, 18] },
  { name: 'Maple seed', p: per(2, 30), qty: [1, 2] },
  { name: 'Yew seed', p: per(1, 30) },
];
const moonsDown = (v) => MOONS.filter((m) => v[m.key]);
const LUNAR_ROLLS = [0, 1, 3, 6];

const moonsOfPeril = {
  id: 'moons-of-peril',
  emblemItem: "Blood Moon helm",
  name: 'Moons of Peril',
  short: 'Moons',
  category: 'varlamore',
  wiki: 'Lunar Chest',
  tagline: 'Each Moon defeated gives a 1/56 roll at its own armour set in the Lunar Chest; otherwise 1, 3 or 6 standard rolls.',
  inputs: MOONS.map((m) => ({ key: m.key, label: `${m.label} defeated`, type: 'check', default: true })),
  rolls: 0,
  special: (v, rng, add) => {
    const moons = moonsDown(v);
    let gotUnique = false;
    for (const m of moons) {
      if (rng() < 1 / 56) {
        add(setPiece(m.set, rng), 1, true);
        gotUnique = true;
      }
    }
    if (gotUnique) return;
    for (let i = 0; i < LUNAR_ROLLS[moons.length]; i++) {
      const e = pickIn(LUNAR_STANDARD, v, rng);
      if (e) giveIn(e, v, rng, add);
    }
  },
  specialUniques: (v) => moonsDown(v).flatMap((m) => m.set.map((n) => [n, 1 / 56 / 4])),
  summary: (v) =>
    (moonsDown(v).length === 0 ? 'Defeat at least one Moon to open the chest. ' : '') +
    'Armour never repeats until you hold the whole set. Any unique replaces every standard roll for that chest. The Moons have no pet.',
};

// ----- Fortis Colosseum -----

const COL_TIER = [
  // tier 1
  [['Rune platebody', 1], ['Death rune', 150], ['Chaos rune', 150], ['Sunfire splinters', 150], ['Steel cannonball', 80], ['Rune kiteshield', 4], ['Rune chainbody', 1]],
  // tier 2
  [['Onyx bolts', 30], ['Snapdragon seed', 1], ['Dragon platelegs', 1], ['Sunfire splinters', 500], ['Earth orb', 80], ['Rune 2h sword', 2], ['Gold ore', 150]],
  // tier 3
  [['Dragon bolts (unf)', 200], ['Ranarr seed', 4], ['Sunfire splinters', 1100], ['Dragon arrowtips', 150], ['Adamantite ore', 100], ['Death rune', 250]],
  // tier 4
  [['Onyx bolts', 50], ['Dragon platelegs', 2], ['Sunfire splinters', 1750], ['Rune kiteshield', 5], ['Runite ore', 12], ['Death rune', 300]],
  // tier 5
  [['Onyx bolts', 75], ['Sunfire splinters', 2500], ['Dragon platelegs', 3], ['Death rune', 300], ['Rune warhammer', 5]],
  // tier 6
  [['Onyx bolts', 100], ['Rune warhammer', 8], ['Dragon platelegs', 3], ['Sunfire splinters', 3500], ['Dragon arrowtips', 250]],
  // tier 7
  [['Steel cannonball', 2000], ['Dragon plateskirt', 5], ['Dragon arrowtips', 350], ['Onyx bolts', 150]],
  // tier 8
  [['Uncut onyx', 1], ['Dragon plateskirt', 5], ['Rune 2h sword', 9], ['Runite ore', 35]],
];
const SUNFIRE = ['Sunfire fanatic helm', 'Sunfire fanatic cuirass', 'Sunfire fanatic chausses'];

// Each wave's reward table: [[tier, weight each], …], then the unique
// weights (echo crystal ×1, ×2-3, each armour piece, Tonalztics), out of den.
const COL_WAVES = {
  2: { tiers: [[0, 1]], den: 7 },
  3: { tiers: [[0, 9], [1, 1]], den: 70 },
  4: { tiers: [[0, 5535], [1, 615]], u: [126, 14, 70, 0], den: 43400 },
  5: { tiers: [[1, 2725]], u: [63, 7, 35, 0], den: 19250 },
  6: { tiers: [[1, 2375]], u: [63, 7, 35, 0], den: 16800 },
  7: { tiers: [[1, 5832], [2, 756]], u: [189, 21, 105, 35], den: 45920 },
  8: { tiers: [[1, 14472], [3, 1876]], u: [567, 63, 315, 105], den: 114240 },
  9: { tiers: [[2, 3180], [4, 424]], u: [135, 15, 75, 25], den: 21600 },
  10: { tiers: [[3, 2340], [5, 312]], u: [135, 15, 75, 25], den: 16000 },
  11: { tiers: [[4, 360], [6, 50]], u: [27, 3, 15, 5], den: 2080 },
  12: { tiers: [[5, 792], [7, 110]], u: [135, 15, 75, 25], den: 4800 },
};
const wavesCleared = (v) => Math.min(12, Math.max(0, Math.floor(Number(v.wave) || 0)));

function colosseumWave(w, rng, add) {
  if (w === 1) {
    add('Sunfire splinters', 80);
    return;
  }
  const { tiers, u = [0, 0, 0, 0], den } = COL_WAVES[w];
  let r = rng() * den;
  for (const [tier, weight] of tiers) {
    for (const [name, qty] of COL_TIER[tier]) {
      r -= weight;
      if (r < 0) return add(name, qty);
    }
  }
  const [echo1, echo23, armour, tonal] = u;
  if ((r -= echo1) < 0) return add('Echo crystal', 1, true);
  if ((r -= echo23) < 0) return add('Echo crystal', rand(rng, 2, 3), true);
  if ((r -= armour * 3) < 0) return add(setPiece(SUNFIRE, rng), 1, true);
  if ((r -= tonal) < 0) add('Tonalztics of Ralos (uncharged)', 1, true);
}

const fortisColosseum = {
  id: 'fortis-colosseum',
  name: 'Fortis Colosseum',
  short: 'Colosseum',
  category: 'varlamore',
  wiki: 'Rewards Chest (Fortis Colosseum)',
  tagline: 'One reward per wave cleared, uniques from wave 4 (1/124) to wave 12 (1/12), a guaranteed quiver and a 1/200 Smol Heredit.',
  inputs: [
    { key: 'wave', label: 'Waves cleared', type: 'range', min: 1, max: 12, step: 1, default: 12, hint: 'Clearing wave 12 means beating Sol Heredit.' },
    {
      key: 'trade',
      label: 'Trade the quiver for a pet roll',
      type: 'check',
      default: false,
      hint: 'Minimus offers another 1/200 at Smol Heredit for Dizana\'s quiver.',
    },
  ],
  rolls: 0,
  special: (v, rng, add) => {
    const n = wavesCleared(v);
    for (let w = 1; w <= n; w++) colosseumWave(w, rng, add);
    if (n === 12 && !v.trade) add("Dizana's quiver (uncharged)", 1);
  },
  specialUniques: (v) => {
    const out = [];
    for (let w = 4; w <= wavesCleared(v); w++) {
      const { u, den } = COL_WAVES[w];
      out.push(['Echo crystal', (u[0] + u[1]) / den]);
      for (const n of SUNFIRE) out.push([n, u[2] / den]);
      if (u[3]) out.push(['Tonalztics of Ralos (uncharged)', u[3] / den]);
    }
    return out;
  },
  pet: {
    name: 'Smol Heredit',
    p: (v) => (wavesCleared(v) < 12 ? 0 : v.trade ? 1 - (199 / 200) ** 2 : per(1, 200)),
  },
  summary: () =>
    'Every cleared wave adds its own reward to the chest. Sunfire fanatic pieces never repeat until you hold the set. ' +
    "Dizana's quiver is guaranteed on a full run but doesn't count as a unique here; trading it in swaps it for a second Smol Heredit roll. The Varlamore token from wave 3 is left out.",
};

// ----- Royal Titans -----

const TITAN = (v) => (v.titan === 1 ? 'eldric' : 'branda');
const TITAN_LOOT = (v) => v.mode === 0;
const titanQty = (min, max = min) => scaled(min, max);

const TITAN_COMMON = [
  // Runes and ammunition
  { name: 'Chaos rune', w: 2, qty: titanQty(200, 400) },
  { name: 'Death rune', w: 2, qty: titanQty(150, 300) },
  { name: 'Nature rune', w: 2, qty: titanQty(100, 150) },
  { name: 'Law rune', w: 2, qty: titanQty(100, 150) },
  { name: 'Soul rune', w: 2, qty: titanQty(100, 150) },
  { name: 'Blood rune', w: 2, qty: titanQty(100, 150) },
  { name: 'Rune arrow', w: 2, qty: titanQty(100, 300) },
  // Materials
  { name: 'Coal', w: 2, qty: titanQty(280, 320) },
  { name: 'Gold ore', w: 2, qty: titanQty(60, 100) },
  // Tree seeds
  { name: 'Maple seed', w: 1, qty: titanQty(4, 6) },
  { name: 'Palm tree seed', w: 1, qty: titanQty(2) },
  { name: 'Yew seed', w: 1, qty: titanQty(2) },
  // Other
  { name: 'Coins', w: 2, qty: titanQty(10000, 30000) },
  { name: 'Prayer potion(4)', w: 2, qty: titanQty(2, 4) },
  { name: 'Desiccated page', w: 2, qty: titanQty(6, 24) },
];
const BRANDA_MAIN = [
  { name: 'Mystic fire staff', w: 2, qty: titanQty(4) },
  { name: 'Fire battlestaff', w: 2, qty: titanQty(6) },
  { name: 'Rune plateskirt', w: 2, qty: titanQty(2) },
  { name: 'Rune scimitar', w: 2, qty: titanQty(2) },
  { name: 'Rune pickaxe', w: 2, qty: titanQty(2) },
  { name: 'Fire rune', w: 2, qty: titanQty(1500, 3000) },
  { name: 'Fire orb', w: 2, qty: titanQty(20, 40) },
  // Herbs
  ...['Grimy avantoe', 'Grimy cadantine', 'Grimy dwarf weed', 'Grimy irit leaf', 'Grimy kwuarm', 'Grimy lantadyme', 'Grimy ranarr weed'].map(
    (name) => ({ name, w: 2, qty: titanQty(6, 8) }),
  ),
  ...TITAN_COMMON,
].map(({ name, w, qty }) => ({ name, p: per(w, 55), qty }));
const ELDRIC_MAIN = [
  { name: 'Mystic water staff', w: 2, qty: titanQty(4) },
  { name: 'Water battlestaff', w: 2, qty: titanQty(6) },
  { name: 'Rune platelegs', w: 2, qty: titanQty(2) },
  { name: 'Rune sq shield', w: 2, qty: titanQty(2) },
  { name: 'Rune axe', w: 2, qty: titanQty(2) },
  { name: 'Rune pickaxe', w: 1, qty: titanQty(2) },
  { name: 'Water rune', w: 2, qty: titanQty(1500, 3000) },
  { name: 'Water orb', w: 2, qty: titanQty(20, 40) },
  // Herb seeds
  { name: 'Avantoe seed', w: 2, qty: titanQty(4) },
  { name: 'Cadantine seed', w: 2, qty: titanQty(4) },
  { name: 'Dwarf weed seed', w: 2, qty: titanQty(3) },
  { name: 'Irit seed', w: 2, qty: titanQty(4) },
  { name: 'Kwuarm seed', w: 2, qty: titanQty(4) },
  { name: 'Lantadyme seed', w: 2, qty: titanQty(4) },
  { name: 'Ranarr seed', w: 2, qty: titanQty(4) },
  ...TITAN_COMMON,
].map(({ name, w, qty }) => ({ name, p: per(w, 56), qty }));

const royalTitans = {
  id: 'royal-titans',
  name: 'Royal Titans',
  short: 'Royal Titans',
  category: 'other',
  wiki: 'Royal Titans',
  tagline: 'Staff crowns and prayer scrolls at 1/75, a 1/16 Giantsoul amulet, and a 1/3000 Bran (1/1500 if you sacrifice the loot).',
  inputs: [
    {
      key: 'titan',
      label: 'Loot',
      type: 'select',
      default: 0,
      options: [
        { value: 0, label: 'Branda the Fire Queen' },
        { value: 1, label: 'Eldric the Ice King' },
      ],
    },
    {
      key: 'mode',
      label: 'Looting option',
      type: 'select',
      default: 0,
      options: [
        { value: 0, label: 'Loot' },
        { value: 1, label: 'Sacrifice (no loot, double pet)' },
        { value: 2, label: 'Take pages' },
      ],
    },
    CONTRIB,
    {
      key: 'scrollRead',
      label: 'Prayer scroll already read',
      type: 'check',
      default: false,
      hint: "Once you've read the titan's prayer scroll it no longer drops.",
    },
  ],
  rolls: (v) => (TITAN_LOOT(v) ? 1 : 0),
  // A unique takes the place of both standard rolls.
  preroll: [
    { name: 'Fire element staff crown', p: (v) => (TITAN(v) === 'branda' ? share(v) / 75 : 0), unique: true },
    { name: 'Ice element staff crown', p: (v) => (TITAN(v) === 'eldric' ? share(v) / 75 : 0), unique: true },
    { name: 'Mystic vigour prayer scroll', p: (v) => (TITAN(v) === 'branda' && !v.scrollRead ? share(v) / 75 : 0), unique: true },
    { name: 'Deadeye prayer scroll', p: (v) => (TITAN(v) === 'eldric' && !v.scrollRead ? share(v) / 75 : 0), unique: true },
    { name: 'Giantsoul amulet', p: (v) => share(v) / 16 },
  ],
  main: [
    { table: BRANDA_MAIN, rolls: 2, p: (v) => (TITAN(v) === 'branda' ? 1 : 0) },
    { table: ELDRIC_MAIN, rolls: 2, p: (v) => (TITAN(v) === 'eldric' ? 1 : 0) },
  ],
  tertiary: [
    { name: 'Desiccated page', p: (v) => (v.mode === 2 ? 1 : 0), qty: scaled(10, 19) },
    clue('hard', 25),
    clue('elite', 100),
  ],
  pet: { name: 'Bran', p: (v) => (v.mode === 1 ? per(1, 1500) : per(1, 3000)) },
  summary: (v) =>
    (v.mode === 1 ? 'Sacrificing gives no loot, only the clues and Bran at 1/1500. ' : '') +
    (v.mode === 2 ? 'Taking pages gives only 10-19 desiccated pages (scaled by your share), the clues and the pet. ' : '') +
    'Your share scales the unique chances and quantities; the pet and clues are fixed. The wiki doesn\'t give the order the pre-roll items are checked in, so each is taken at its listed rate. ' +
    'The Giantsoul amulet (1/16) isn\'t counted as a unique.',
};

// ----- Yama -----

const YAMA_JUNK = (v) => share(v) < 0.15;
const CONTRACT = (v) => v.contract ?? 0;
// Contracts other than Familiar Acquisition skip the standard table.
const YAMA_STANDARD = (v) => !YAMA_JUNK(v) && (CONTRACT(v) === 0 || CONTRACT(v) === 1);
const yamaReach = {
  dossier: (v) => 1 - share(v) / 120,
  lockbox: (v) => (1 - share(v) / 120) * (1 - share(v) / 12),
  shards: (v) => (1 - share(v) / 120) * (1 - share(v) / 12) * (29 / 30),
  main: (v) => (1 - share(v) / 120) * (1 - share(v) / 12) * (29 / 30) * (14 / 15),
};
const yamaStd = (w) => (v) => (YAMA_STANDARD(v) ? per(w, 78) : 0);
const yamaJunk = (w) => (v) => (YAMA_JUNK(v) ? per(w, 11) : 0);
const yamaQty = (n) => (v) => Math.max(1, Math.round(n * share(v)));

const YAMA_CONTRACTS = [
  { value: 0, label: 'No contract' },
  { value: 1, label: 'Familiar Acquisition (Yami 1/100)' },
  { value: 2, label: 'Catalyst Acquisition' },
  { value: 3, label: 'Worm Acquisition' },
  { value: 4, label: 'Shard Acquisition' },
  { value: 5, label: 'Oathplate Acquisition' },
  { value: 6, label: 'Harmony Acquisition' },
];
const contractReward = (c, entry) => ({ ...entry, p: (v) => (CONTRACT(v) === c && !YAMA_JUNK(v) ? 1 : 0) });

const yama = {
  id: 'yama',
  name: 'Yama',
  short: 'Yama',
  category: 'other',
  wiki: 'Yama',
  tagline: 'A 1/120 unique (Oathplate pieces and the Soulflame horn), a 1/12 dossier, a 1/30 lockbox and a 1/2500 Yami.',
  inputs: [
    CONTRIB,
    {
      key: 'contract',
      label: 'Contract',
      type: 'select',
      default: 0,
      options: YAMA_CONTRACTS,
      hint: 'Acquisition contracts give a guaranteed reward instead of the standard table.',
    },
  ],
  preroll: [
    {
      table: [
        { name: 'Soulflame horn', p: per(2, 5), unique: true },
        { name: 'Oathplate helm', p: per(1, 5), unique: true },
        { name: 'Oathplate chest', p: per(1, 5), unique: true },
        { name: 'Oathplate legs', p: per(1, 5), unique: true },
      ],
      p: (v) => (YAMA_JUNK(v) ? 0 : share(v) / 120),
    },
    { name: 'Dossier', p: (v) => (YAMA_JUNK(v) ? 0 : (yamaReach.dossier(v) * share(v)) / 12), unique: true },
    { name: 'Forgotten lockbox', p: (v) => (YAMA_JUNK(v) ? 0 : yamaReach.lockbox(v) / 30), unique: true },
    { name: 'Oathplate shards', p: (v) => (YAMA_JUNK(v) ? 0 : yamaReach.shards(v) / 15), qty: yamaQty(12) },
  ],
  main: [
    // Supplies (15/78): one of each pair
    ...['Pineapple pizza', 'Wild pie'].flatMap((food) =>
      ['Prayer potion(3)', 'Super restore mix(2)'].flatMap((restore) =>
        ['Super combat potion(1)', 'Zamorak mix(2)'].map((boost) => ({
          items: [{ name: food, qty: [3, 4] }, { name: restore, qty: 2 }, { name: boost }],
          p: yamaStd(15 / 8),
        })),
      ),
    ),
    // Weapons and armour
    { name: 'Rune chainbody', p: yamaStd(5), qty: yamaQty(8) },
    { name: 'Battlestaff', p: yamaStd(4), qty: yamaQty(40) },
    { name: 'Rune platebody', p: yamaStd(3), qty: yamaQty(8) },
    { name: 'Dragon plateskirt', p: yamaStd(2) },
    { name: 'Dragon platelegs', p: yamaStd(2) },
    // Runes
    { name: 'Blood rune', p: yamaStd(3), qty: yamaQty(400) },
    { name: 'Law rune', p: yamaStd(3), qty: yamaQty(150) },
    { name: 'Smoke rune', p: yamaStd(2), qty: yamaQty(350) },
    { name: 'Soul rune', p: yamaStd(2), qty: yamaQty(500) },
    { name: 'Soul rune', p: yamaStd(2), qty: yamaQty(1000) },
    { name: 'Fire rune', p: yamaStd(1), qty: yamaQty(40000) },
    { name: 'Wrath rune', p: yamaStd(1), qty: yamaQty(800) },
    // Other
    { name: 'Aether catalyst', p: yamaStd(7), qty: yamaQty(850) },
    { name: 'Diabolic worms', p: yamaStd(7), qty: yamaQty(90) },
    { name: 'Barrel of demonic tallow (full)', p: yamaStd(5) },
    { name: 'Chasm teleport scroll', p: yamaStd(4), qty: yamaQty(6) },
    { name: 'Emerald', p: yamaStd(3), qty: yamaQty(40) },
    { name: 'Ruby', p: yamaStd(3), qty: yamaQty(40) },
    { name: 'Diamond', p: yamaStd(3), qty: yamaQty(40) },
    { name: 'Onyx bolt tips', p: yamaStd(1), qty: yamaQty(150) },
    // Junk: under 15% contribution this is all you get
    { name: 'Cabbage', p: yamaJunk(3) },
    { name: 'Black bead', p: yamaJunk(3) },
    { name: 'Spinach roll', p: yamaJunk(3) },
    { name: 'Demon dung', p: yamaJunk(2) },
  ],
  tertiary: [
    contractReward(2, { name: 'Aether catalyst', qty: 2000 }),
    contractReward(3, { name: 'Diabolic worms', qty: 250 }),
    contractReward(4, { name: 'Oathplate shards', qty: 45 }),
    contractReward(5, { set: ['Oathplate helm', 'Oathplate chest', 'Oathplate legs'], unique: true }),
    contractReward(6, { name: 'Soulflame horn', unique: true }),
    { ...clue('elite', 30), p: (v) => (YAMA_JUNK(v) ? 0 : per(1, 30)) },
  ],
  pet: { name: 'Yami', p: (v) => (YAMA_JUNK(v) ? 0 : CONTRACT(v) === 1 ? per(1, 100) : per(1, 2500)) },
  summary: (v) =>
    (YAMA_JUNK(v) ? 'Under 15% contribution you only roll the junk table. ' : '') +
    'Each duo partner rolls their own loot, with the unique and dossier chances and most quantities scaled by their share. ' +
    'The Oathplate Acquisition contract lets you choose the piece; here it gives one you don\'t hold yet. Combat contracts (purifying sigil pieces) aren\'t modelled.',
};

// ----- Doom of Mokhaiotl -----

// Main table quantities as at delve level 3.
const DOOM_MAIN = [
  // Weapons and armour
  { name: 'Dragon med helm', p: per(5, 104) },
  { name: 'Dragon platelegs', p: per(1, 104), qty: [2, 4] },
  { name: 'Mystic earth staff', p: per(5, 104) },
  { name: 'Rune pickaxe', p: per(5, 104), qty: [1, 3] },
  // Runes and ammunition
  { name: 'Death rune', p: per(5, 104), qty: [50, 70] },
  { name: 'Chaos rune', p: per(5, 104), qty: [50, 70] },
  { name: 'Earth rune', p: per(5, 104), qty: [500, 1000] },
  { name: 'Fire rune', p: per(5, 104), qty: [500, 1000] },
  { name: 'Steel cannonball', p: per(5, 104), qty: [200, 600] },
  { name: 'Onyx bolts', p: per(5, 104), qty: [5, 15] },
  // Ores
  { name: 'Coal', p: per(5, 104), qty: [15, 50] },
  { name: 'Gold ore', p: per(5, 104), qty: [20, 60] },
  { name: 'Runite ore', p: per(5, 104), qty: [3, 6] },
  // Seeds
  { name: 'Celastrus seed', p: per(3, 104) },
  { name: 'Ranarr seed', p: per(2, 104), qty: [1, 3] },
  { name: 'Spirit seed', p: per(3, 104) },
  // Resources
  { name: 'Aether catalyst', p: per(5, 104), qty: [151, 400] },
  { name: 'Dragon dart tip', p: per(5, 104), qty: [30, 90] },
  { name: 'Raw shark', p: per(10, 312), qty: [20, 35] },
  { name: 'Shark lure', p: per(5, 312), qty: [40, 70] },
  { name: 'Sun-kissed bones', p: per(5, 104), qty: [18, 75] },
  // Other
  { name: 'Tooth half of key', p: per(1, 104) },
  { name: 'Demon tear', p: per(7, 104), qty: [100, 300] },
  { name: 'Mokhaiotl waystone', p: per(7, 104), qty: [1, 2] },
];
const DOOM_MULT = [-0.5, -0.35, 0, 0.05, 0.1, 0.12, 0.14, 0.17]; // levels 1-8, then 0.2
const doomMult = (level) => DOOM_MULT[level - 1] ?? 0.2;
// Each eligible unique's chance at a level, and which ones are eligible.
const DOOM_UNIQUE_RATE = [0, 1 / 2500, 1 / 2000, 1 / 1350, 1 / 810, 1 / 765, 1 / 720, 1 / 630]; // levels 1-8, then 1/540
const doomUniqueRate = (level) => DOOM_UNIQUE_RATE[level - 1] ?? 1 / 540;
const doomEligible = (level) =>
  ['Mokhaiotl cloth', 'Eye of Ayak (uncharged)', 'Avernic treads'].slice(0, Math.max(0, Math.min(3, level - 1)));
const DOOM_DOM = { 6: 1 / 1000, 7: 1 / 750, 8: 1 / 500 }; // 1/250 from level 9
const doomDom = (level) => (level < 6 ? 0 : DOOM_DOM[level] ?? 1 / 250);
const delves = (v) => Math.max(1, Math.floor(Number(v.level) || 1));

const doomOfMokhaiotl = {
  id: 'doom-of-mokhaiotl',
  name: 'Doom of Mokhaiotl',
  short: 'Doom',
  category: 'varlamore',
  wiki: 'Doom of Mokhaiotl',
  tagline: 'One roll per delve level; uniques unlock from level 2 and reach 1/540 each by level 9, with Dom up to 1/250.',
  inputs: [
    { key: 'level', label: 'Delve levels completed', type: 'range', min: 1, max: 20, step: 1, default: 8, hint: 'Loot from every level you clear before claiming.' },
  ],
  rolls: 0,
  special: (v, rng, add) => {
    for (let level = 1; level <= delves(v); level++) {
      const e = pickIn(DOOM_MAIN, v, rng);
      if (e) giveIn(e, v, rng, add, (q3) => q3 + Math.trunc(q3 * doomMult(level)));
      if (level >= 3) add('Demon tear', Math.min(100, 50 + 10 * (level - 3)));
      const eligible = doomEligible(level);
      if (rng() < eligible.length * doomUniqueRate(level)) add(eligible[Math.floor(rng() * eligible.length)], 1, true);
      if (rng() < (level <= 2 ? 1 / 75 : 1 / 50)) add('Clue scroll (elite)', 1);
    }
  },
  specialUniques: (v) => {
    const out = [];
    for (let level = 2; level <= delves(v); level++) {
      for (const n of doomEligible(level)) out.push([n, doomUniqueRate(level)]);
    }
    return out;
  },
  pet: {
    name: 'Dom',
    p: (v) => {
      let none = 1;
      for (let level = 6; level <= delves(v); level++) none *= 1 - doomDom(level);
      return 1 - none;
    },
  },
  summary: () =>
    'Each level rolls the main table once with its quantity multiplier (×0.5 at level 1 up to ×1.2 from level 9) and, from level 3, guaranteed demon tears (50, rising by 10 a level to 100). ' +
    'Levels past 9 use level 9\'s unique rates. Dom is rolled per level from level 6, shown here as one roll per run.',
};

// ===================================================================
// Minigames and skilling bosses
// ===================================================================

// ----- The Gauntlet -----

const CORRUPTED = (v) => v.mode === 1;
const GAUNTLET_REGULAR = [
  // Weapons and armour
  { name: 'Battlestaff', p: per(1, 24), qty: [4, 8] },
  { name: 'Rune full helm', p: per(1, 24), qty: [2, 4] },
  { name: 'Rune chainbody', p: per(1, 24), qty: [1, 2] },
  { name: 'Rune platebody', p: per(1, 24), qty: [1, 2] },
  { name: 'Rune platelegs', p: per(1, 24), qty: [1, 2] },
  { name: 'Rune plateskirt', p: per(1, 24), qty: [1, 2] },
  { name: 'Rune halberd', p: per(1, 24), qty: [1, 2] },
  { name: 'Rune pickaxe', p: per(1, 24), qty: [1, 2] },
  { name: 'Dragon halberd', p: per(1, 24) },
  // Runes and ammunition
  { name: 'Cosmic rune', p: per(1, 24), qty: [160, 240] },
  { name: 'Nature rune', p: per(1, 24), qty: [100, 140] },
  { name: 'Law rune', p: per(1, 24), qty: [80, 140] },
  { name: 'Chaos rune', p: per(1, 24), qty: [180, 300] },
  { name: 'Death rune', p: per(1, 24), qty: [100, 160] },
  { name: 'Blood rune', p: per(1, 24), qty: [80, 140] },
  { name: 'Mithril arrow', p: per(1, 24), qty: [800, 1200] },
  { name: 'Adamant arrow', p: per(1, 24), qty: [400, 600] },
  { name: 'Rune arrow', p: per(1, 24), qty: [200, 300] },
  { name: 'Dragon arrow', p: per(1, 24), qty: [30, 85] },
  // Gems
  { name: 'Uncut sapphire', p: per(1, 24), qty: [20, 60] },
  { name: 'Uncut emerald', p: per(1, 24), qty: [10, 50] },
  { name: 'Uncut ruby', p: per(1, 24), qty: [5, 30] },
  { name: 'Uncut diamond', p: per(1, 24), qty: [3, 7] },
  // Other
  { name: 'Coins', p: per(1, 24), qty: [20000, 80000] },
];
const GAUNTLET_CORRUPTED = [
  // Weapons and armour
  { name: 'Battlestaff', p: per(1, 24), qty: [8, 12] },
  { name: 'Rune full helm', p: per(1, 24), qty: [3, 5] },
  { name: 'Rune chainbody', p: per(1, 24), qty: [2, 3] },
  { name: 'Rune platebody', p: per(1, 24), qty: 2 },
  { name: 'Rune platelegs', p: per(1, 24), qty: [2, 3] },
  { name: 'Rune plateskirt', p: per(1, 24), qty: [2, 3] },
  { name: 'Rune halberd', p: per(1, 24), qty: [2, 3] },
  { name: 'Rune pickaxe', p: per(1, 24), qty: [2, 3] },
  { name: 'Dragon halberd', p: per(0.5, 24), qty: [1, 2] },
  // Runes and ammunition
  { name: 'Cosmic rune', p: per(1, 24), qty: [175, 250] },
  { name: 'Nature rune', p: per(1, 24), qty: [125, 150] },
  { name: 'Law rune', p: per(1, 24), qty: [100, 150] },
  { name: 'Chaos rune', p: per(1, 24), qty: [200, 350] },
  { name: 'Death rune', p: per(1, 24), qty: [125, 175] },
  { name: 'Blood rune', p: per(1, 24), qty: [100, 150] },
  { name: 'Mithril arrow', p: per(1, 24), qty: [1000, 1500] },
  { name: 'Adamant arrow', p: per(1, 24), qty: [500, 750] },
  { name: 'Rune arrow', p: per(1, 24), qty: [250, 450] },
  { name: 'Dragon arrow', p: per(1, 24), qty: [50, 100] },
  // Gems
  { name: 'Uncut sapphire', p: per(1, 24), qty: [25, 65] },
  { name: 'Uncut emerald', p: per(1, 24), qty: [15, 60] },
  { name: 'Uncut ruby', p: per(1, 24), qty: [10, 40] },
  { name: 'Uncut diamond', p: per(1, 24), qty: [5, 15] },
  // Other
  { name: 'Coins', p: per(1.5, 24), qty: [75000, 150000] },
];
const byGauntlet = (regular, corrupted) => (v) => (CORRUPTED(v) ? per(1, corrupted) : per(1, regular));

const theGauntlet = {
  id: 'the-gauntlet',
  name: 'The Gauntlet',
  short: 'Gauntlet',
  category: 'minigame',
  wiki: 'Reward Chest (The Gauntlet)',
  tagline: 'Crystal seeds at 1/120 (1/50 corrupted), an enhanced seed at 1/2000 (1/400), and a 1/2000 Youngllef (1/800 corrupted).',
  inputs: [
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      default: 1,
      options: [
        { value: 0, label: 'The Gauntlet (Crystalline Hunllef)' },
        { value: 1, label: 'The Corrupted Gauntlet' },
      ],
    },
  ],
  always: [{ name: 'Crystal shard', p: 1, qty: (v, rng) => (CORRUPTED(v) ? rand(rng, 7, 12) : rand(rng, 5, 9)) }],
  rolls: (v) => (CORRUPTED(v) ? 3 : 2),
  main: [
    { table: GAUNTLET_REGULAR, p: (v) => (CORRUPTED(v) ? 0 : 1) },
    { table: GAUNTLET_CORRUPTED, p: (v) => (CORRUPTED(v) ? 1 : 0) },
  ],
  tertiary: [
    { name: 'Crystal weapon seed', p: byGauntlet(120, 50), unique: true },
    { name: 'Crystal armour seed', p: byGauntlet(120, 50), unique: true },
    { name: 'Enhanced crystal weapon seed', p: byGauntlet(2000, 400), unique: true },
    { ...clue('elite', 25), p: byGauntlet(25, 20) },
  ],
  pet: { name: 'Youngllef', p: byGauntlet(2000, 800) },
  summary: () =>
    'A completed run: crystal shards plus two (three in the Corrupted Gauntlet) rolls, and the seeds rolled on their own so one chest can hold several. ' +
    'The Gauntlet cape (your first corrupted completion only) and the loot from failed runs aren\'t modelled.',
};

// ----- TzTok-Jad and TzKal-Zuk -----

const ON_TASK = { key: 'task', label: 'On a TzHaar slayer task', type: 'check', default: false };
const DIARY = {
  key: 'diary',
  label: 'Elite Karamja Diary',
  type: 'check',
  default: false,
  hint: 'Doubles the Tokkul reward.',
};

const tztokJad = {
  id: 'tztok-jad',
  name: 'TzTok-Jad',
  short: 'Jad',
  category: 'minigame',
  wiki: 'TzTok-Jad',
  tagline: 'A fire cape every completion and a 1/200 TzRek-Jad (1/100 on a slayer task).',
  inputs: [
    ON_TASK,
    DIARY,
    {
      key: 'trade',
      label: 'Trade the cape for a pet roll',
      type: 'check',
      default: false,
      hint: 'TzHaar-Mej-Jal gives another 1/200 at the pet for a fire cape.',
    },
  ],
  always: [{ name: 'Tokkul', p: 1, qty: (v) => (v.diary ? 16064 : 8032) }],
  rolls: 0,
  tertiary: [{ name: 'Fire cape', p: (v) => (v.trade ? 0 : 1) }],
  pet: {
    name: 'TzRek-Jad',
    p: (v) => 1 - (1 - (v.task ? per(1, 100) : per(1, 200))) * (v.trade ? 199 / 200 : 1),
  },
  summary: () => 'A full Fight Cave completion. The fire cape is guaranteed, so it isn\'t counted as a unique.',
};

const tzkalZuk = {
  id: 'tzkal-zuk',
  name: 'TzKal-Zuk',
  short: 'Zuk',
  category: 'minigame',
  wiki: 'TzKal-Zuk',
  tagline: 'An infernal cape every completion and a 1/100 Jal-Nib-Rek (1/75 on a slayer task).',
  inputs: [
    ON_TASK,
    DIARY,
    {
      key: 'trade',
      label: 'Trade the cape for a pet roll',
      type: 'check',
      default: false,
      hint: 'TzHaar-Ket-Keh gives another 1/100 at the pet for an infernal cape.',
    },
  ],
  always: [{ name: 'Tokkul', p: 1, qty: (v) => (v.diary ? 32880 : 16440) }],
  rolls: 0,
  tertiary: [{ name: 'Infernal cape', p: (v) => (v.trade ? 0 : 1) }],
  pet: {
    name: 'Jal-Nib-Rek',
    p: (v) => 1 - (1 - (v.task ? per(1, 75) : per(1, 100))) * (v.trade ? 99 / 100 : 1),
  },
  summary: () => 'A full Inferno completion. The infernal cape is guaranteed, so it isn\'t counted as a unique.',
};

// ----- Zalcano -----

// Quantities scale with your points; the top of each wiki range is taken as a full share.
const zal = (max) => (v) => {
  const q = Math.max(1, Math.round(max * share(v)));
  return v.mvp ? Math.ceil(q * 1.1) : q;
};

const zalcano = {
  id: 'zalcano',
  name: 'Zalcano',
  short: 'Zalcano',
  category: 'minigame',
  wiki: 'Zalcano',
  tagline: 'A 1/200 crystal tool seed roll each kill, a Zalcano shard at up to 1/750, and a 1/2250 Smolcano.',
  inputs: [
    CONTRIB,
    { key: 'mvp', label: 'MVP', type: 'check', default: true, hint: 'The top damage dealer gets infernal ashes and 10% more loot.' },
  ],
  always: [{ name: 'Crystal shard', p: 1, qty: (v) => (v.mvp ? 3 : 2) }],
  main: [
    // Runes
    { name: 'Blood rune', p: per(1, 36), qty: zal(480) },
    { name: 'Cosmic rune', p: per(1, 36), qty: zal(926) },
    { name: 'Death rune', p: per(1, 36), qty: zal(1046) },
    { name: 'Law rune', p: per(1, 36), qty: zal(790) },
    { name: 'Soul rune', p: per(1, 36), qty: zal(392) },
    { name: 'Nature rune', p: per(1, 36), qty: zal(937) },
    // Materials
    { name: 'Silver ore', p: per(3, 36), qty: zal(800) },
    { name: 'Coal', p: per(1, 36), qty: zal(1052) },
    { name: 'Mithril ore', p: per(2, 36), qty: zal(469) },
    { name: 'Adamantite ore', p: per(2, 36), qty: zal(343) },
    { name: 'Runite ore', p: per(2, 36), qty: zal(31) },
    { name: 'Gold ore', p: per(3, 36), qty: zal(756) },
    { name: 'Steel bar', p: per(3, 36), qty: zal(699) },
    { name: 'Mithril bar', p: per(3, 36), qty: zal(501) },
    { name: 'Adamantite bar', p: per(2, 36), qty: zal(111) },
    { name: 'Runite bar', p: per(2, 36), qty: zal(27) },
    { name: 'Uncut diamond', p: per(2, 36), qty: zal(21) },
    { name: 'Uncut dragonstone', p: per(2, 36), qty: zal(12) },
    { name: 'Onyx bolt tips', p: per(2, 36), qty: zal(45) },
    { name: 'Pure essence', p: per(1, 36), qty: zal(5500) },
  ],
  tertiary: [
    { name: 'Infernal ashes', p: (v) => (v.mvp ? 1 : 0) },
    // 1/200 per kill, given to one player weighted by points.
    {
      table: [
        { name: 'Uncut onyx', p: per(1, 40), unique: true },
        { name: 'Crystal tool seed', p: per(39, 40), unique: true },
      ],
      p: (v) => share(v) / 200,
    },
    // Between 1/1500 and 1/750 depending on contribution.
    { name: 'Zalcano shard', p: (v) => 1 / 1500 + (1 / 750 - 1 / 1500) * share(v), unique: true },
  ],
  pet: { name: 'Smolcano', p: per(1, 2250) },
  summary: () =>
    'Quantities are the top of each wiki range scaled by your share (soloing can give a little more). The tool seed roll happens once per kill and goes to one player weighted by points, shown here as your share of 1/200. ' +
    'The Zalcano shard rate is spread linearly between 1/1500 and 1/750 by your share.',
};

// ----- Tempoross -----

const TEMPOROSS_FISH = [
  ['Raw herring', 'Raw mackerel', 'Raw pike', 'Raw salmon', 'Raw tuna'],
  ['Raw mackerel', 'Raw pike', 'Raw salmon', 'Raw tuna', 'Raw lobster'],
  ['Raw pike', 'Raw salmon', 'Raw tuna', 'Raw lobster', 'Raw bass'],
  ['Raw salmon', 'Raw tuna', 'Raw lobster', 'Raw bass', 'Raw swordfish'],
  ['Raw tuna', 'Raw lobster', 'Raw bass', 'Raw swordfish', 'Raw shark'],
  ['Raw lobster', 'Raw bass', 'Raw swordfish', 'Raw shark', 'Raw sea turtle'],
  ['Raw bass', 'Raw swordfish', 'Raw shark', 'Raw sea turtle', 'Raw manta ray'],
];
const FISH_W = [900, 810, 720, 630, 540];
const FISH_QTY = [[30, 40], [20, 30], [10, 20], [7, 12], [5, 10]];
const fishBracket = (v) => Math.min(6, Math.max(0, v.fishing ?? 6));
const FISH_TABLE = FISH_W.map((w, i) => ({
  // The name depends on your Fishing level, so each slot picks it at roll time.
  table: TEMPOROSS_FISH.map((names, b) => ({ name: names[i], p: (v) => (fishBracket(v) === b ? 1 : 0), qty: FISH_QTY[i] })),
  p: per(w, 3600),
}));
const TEMPOROSS_UNIQUE = [
  { pet: true, p: per(1, 8000) },
  { name: 'Spirit flakes', p: per(1, 4), qty: [32, 64] },
  { name: 'Casket', p: per(1, 20) },
  { name: 'Soaked page', p: per(149, 8000), qty: [5, 9] },
  { name: 'Fish barrel', p: per(1, 400), unique: true },
  { name: 'Tackle box', p: per(1, 400), unique: true },
  { name: 'Big harpoonfish', p: per(1, 1600), unique: true },
  { name: 'Tome of Water (empty)', p: per(1, 1600), unique: true },
  { name: 'Dragon harpoon', p: per(1, 8000), unique: true },
];
const TEMPOROSS_OTHER = [
  { name: 'Plank', p: per(7, 160), qty: [20, 30] },
  { name: 'Oak plank', p: per(1, 32), qty: [15, 25] },
  { name: 'Seaweed', p: per(1, 40), qty: [20, 60] },
  { name: 'Steel nails', p: per(1, 80), qty: [300, 500] },
  { name: 'Feather', p: per(1, 80), qty: [800, 1600] },
  { name: 'Fishing bait', p: per(1, 80), qty: [800, 1600] },
];
// The fish fill what the other two leave (the wiki's "about 45/80").
const fishShare = 1 - [...TEMPOROSS_UNIQUE, ...TEMPOROSS_OTHER].reduce((n, e) => n + e.p, 0);
const PERMIT = [...TEMPOROSS_UNIQUE, ...TEMPOROSS_OTHER, { table: FISH_TABLE, p: fishShare }];

const temporossPoints = (v) => Math.max(0, Number(v.points) || 0);
const permits = (v) => (temporossPoints(v) < 2000 ? 0 : 1 + Math.floor((temporossPoints(v) - 2000) / 700));
const permitChance = (v) => (temporossPoints(v) < 2000 ? 0 : ((temporossPoints(v) - 2000) % 700) / 700);

const tempoross = {
  id: 'tempoross',
  name: 'Tempoross',
  short: 'Tempoross',
  category: 'minigame',
  wiki: 'Reward pool',
  tagline: 'One reward pool search per permit: a 1/400 fish barrel or tackle box, a 1/1600 Tome of Water and a 1/8000 Tiny tempor.',
  inputs: [
    {
      key: 'points',
      label: 'Points',
      type: 'range',
      min: 0,
      max: 16000,
      step: 100,
      default: 4100,
      hint: '2,000 points earn a permit, and every 700 more another; points in between give a chance at one more.',
    },
    {
      key: 'fishing',
      label: 'Fishing level',
      type: 'select',
      default: 6,
      options: ['35–39', '40–45', '46–49', '50–75', '76–78', '79–80', '81+'].map((label, value) => ({ value, label })),
      hint: 'Your base level when searching the pool decides which fish you get.',
    },
  ],
  rolls: permits,
  main: PERMIT,
  // Points past the last threshold give a scaled chance at one more permit.
  extra: [[{ table: PERMIT, p: permitChance }]],
  pet: { name: 'Tiny tempor', p: (v) => 1 - (1 - 1 / 8000) ** (permits(v) + permitChance(v)), inTable: true },
  summary: () =>
    'Each permit is one search of the reward pool. The wiki\'s rates add up to a little over 100%, so the fish take what the other rewards leave (about 54% instead of 56%). ' +
    'Caskets stay unopened, duplicate fish barrels and tackle boxes aren\'t turned into soaked pages, and the spirit angler outfit (no published rate) is left out.',
};

// ----- Wintertodt -----

// Material sub-tables, from the wiki's reward calculator (Module:Wintertodt
// supply crate): walked in order, each item's chance interpolated from its
// low and high roll by your skill level.
const WT_SKILL_ITEMS = {
  logs: [
    ['Magic logs', [10, 20], -60, 60],
    ['Yew logs', [10, 20], -50, 90],
    ['Mahogany logs', [10, 20], -40, 130],
    ['Maple logs', [10, 20], 0, 160],
    ['Teak logs', [10, 20], 30, 200],
    ['Willow logs', [10, 20], 120, 100],
    ['Oak logs', [10, 20], 255, 255],
  ],
  gems: [
    ['Uncut diamond', [1, 3], 10, 120],
    ['Uncut ruby', [2, 4], 50, 140],
    ['Uncut emerald', [1, 3], 90, 160],
    ['Uncut sapphire', [1, 3], 255, 255],
  ],
  ores: [
    ['Runite ore', [1, 2], -60, 40],
    ['Adamantite ore', [2, 3], -50, 80],
    ['Mithril ore', [3, 5], -20, 140],
    ['Gold ore', [8, 11], 0, 160],
    ['Coal', [10, 14], 0, 180],
    ['Pure essence', [20, 70], 40, 190],
    ['Silver ore', [10, 12], 140, 10],
    ['Limestone', [2, 7], 200, -20],
    ['Iron ore', [5, 15], 255, 255],
  ],
  herbs: [
    ['Grimy torstol', [1, 3], -70, 40],
    ['Grimy dwarf weed', [2, 4], -50, 50],
    ['Grimy lantadyme', [2, 4], -30, 60],
    ['Grimy cadantine', [2, 4], -10, 70],
    ['Grimy kwuarm', [2, 4], 10, 85],
    ['Grimy avantoe', [3, 5], 20, 100],
    ['Grimy irit leaf', [3, 5], 30, 115],
    ['Grimy ranarr weed', [1, 3], 10, 170],
    ['Grimy tarromin', [3, 6], 70, -20],
    ['Grimy marrentill', [3, 6], 100, -30],
    ['Grimy guam leaf', [3, 6], 170, -40],
    ['Grimy harralander', [3, 6], 255, 255],
  ],
  seeds: [
    ['Spirit seed', [1, 1], -20, 5],
    ['Dwarf weed seed', [1, 3], -60, 25],
    ['Lantadyme seed', [1, 3], -60, 30],
    ['Cadantine seed', [1, 3], -40, 40],
    ['Snapdragon seed', [1, 3], -15, 60],
    ['Yew seed', [1, 2], -10, 70],
    ['Snape grass seed', [3, 7], -8, 78],
    ['Kwuarm seed', [1, 3], -10, 80],
    ['Ranarr seed', [1, 3], 0, 110],
    ['Avantoe seed', [1, 3], 0, 130],
    ['Watermelon seed', [3, 7], -10, 180],
    ['Irit seed', [1, 3], 0, 170],
    ['Teak seed', [1, 2], 10, 160],
    ['Maple seed', [1, 2], 15, 190],
    ['Mahogany seed', [1, 2], 20, 190],
    ['Toadflax seed', [1, 3], 20, 190],
    ['Banana tree seed', [1, 2], 30, 180],
    ['Willow seed', [1, 2], 60, 120],
    ['Harralander seed', [1, 3], 80, -150],
    ['Tarromin seed', [1, 3], 150, -150],
    ['Acorn', [1, 1], 255, 255],
  ],
  fish: [
    ['Raw shark', [6, 11], -60, 80],
    ['Raw swordfish', [6, 11], -50, 100],
    ['Raw lobster', [6, 11], -20, 130],
    ['Raw tuna', [6, 11], 10, 160],
    ['Raw salmon', [6, 11], 40, 180],
    ['Raw anchovies', [6, 11], 160, 0],
    ['Raw trout', [6, 11], 255, 255],
  ],
};
const wtLevel = (v) => Math.min(99, Math.max(1, Math.floor(Number(v.level) || 1)));
const wtInterp = (level, low, high) =>
  Math.min(Math.max(Math.floor(low + ((high - low) * (level - 1)) / 98) + 1, 0), 256);
const WT_CHAIN_CACHE = new Map();
function wtChances(skill, level) {
  const key = `${skill}:${level}`;
  if (!WT_CHAIN_CACHE.has(key)) {
    let remaining = 1;
    WT_CHAIN_CACHE.set(
      key,
      WT_SKILL_ITEMS[skill].map(([, , low, high]) => {
        const c = remaining * (wtInterp(level, low, high) / 256);
        remaining -= c;
        return c;
      }),
    );
  }
  return WT_CHAIN_CACHE.get(key);
}
const wtSkillTable = (skill) =>
  WT_SKILL_ITEMS[skill].map(([name, qty], i) => ({ name, qty, p: (v) => wtChances(skill, wtLevel(v))[i] }));

// A search walks these in order and stops at the first success.
const WT_STEPS = [
  { pet: true, base: per(1, 5000) },
  { name: 'Dragon axe', base: per(1, 10000), unique: true },
  { name: 'Tome of Fire (empty)', base: per(1, 1000), unique: true },
  { name: 'Warm gloves', base: per(1, 150), unique: true },
  { name: 'Bruma torch', base: per(1, 150), unique: true },
  { set: ['Pyromancer garb', 'Pyromancer hood', 'Pyromancer robe', 'Pyromancer boots'], ordered: true, base: per(1, 150), unique: true },
  { name: 'Burnt page', base: per(1, 45), qty: [7, 29] },
];
let wtReach = 1;
const WT_CHAIN = WT_STEPS.map(({ base, ...e }) => {
  const entry = { ...e, p: wtReach * base };
  wtReach *= 1 - base;
  return entry;
});
const WT_REST = wtReach;
const CART = [
  ...WT_CHAIN,
  { table: wtSkillTable('logs'), p: WT_REST * per(3, 25) },
  { table: wtSkillTable('gems'), p: WT_REST * per(3, 25) },
  { table: wtSkillTable('ores'), p: WT_REST * per(3, 25) },
  { table: wtSkillTable('herbs'), p: WT_REST * per(3, 25) },
  { table: wtSkillTable('seeds'), p: WT_REST * per(3, 25) },
  { table: wtSkillTable('fish'), p: WT_REST * per(3, 25) },
  { name: 'Coins', p: WT_REST * per(5, 25), qty: [2000, 4999] },
  { name: 'Saltpetre', p: WT_REST * per(1, 25), qty: [3, 5] },
  { name: 'Dynamite', p: WT_REST * per(1, 25), qty: [3, 5] },
];

const wtPoints = (v) => Math.max(0, Number(v.points) || 0);
const cartRolls = (v) => (wtPoints(v) < 500 ? 0 : 1 + Math.floor(wtPoints(v) / 500));
const cartChance = (v) => (wtPoints(v) < 500 ? 0 : (wtPoints(v) % 500) / 500);

const wintertodt = {
  id: 'wintertodt',
  name: 'Wintertodt',
  short: 'Wintertodt',
  category: 'minigame',
  wiki: 'Reward Cart',
  tagline: 'Reward cart searches by points: 1/150 warm gloves, bruma torch and pyromancer pieces, a 1/1000 Tome of Fire and a 1/5000 Phoenix.',
  inputs: [
    {
      key: 'points',
      label: 'Points',
      type: 'range',
      min: 0,
      max: 5000,
      step: 5,
      default: 1000,
      hint: '500 points give two rewards and every 500 more another; points in between give a chance at one more.',
    },
    {
      key: 'level',
      label: 'Skill levels',
      type: 'range',
      min: 1,
      max: 99,
      step: 1,
      default: 99,
      hint: 'Your Woodcutting, Crafting, Mining, Herblore, Farming and Fishing levels when searching (higher gives better materials).',
    },
  ],
  rolls: cartRolls,
  main: CART,
  extra: [[{ table: CART, p: cartChance }]],
  pet: { name: 'Phoenix', p: (v) => 1 - (1 - 1 / 5000) ** (cartRolls(v) + cartChance(v)), inTable: true },
  summary: () =>
    'Every search checks the phoenix, dragon axe, tome, gloves, torch, pyromancer piece and burnt pages in turn, then the material tables. ' +
    'All six skills use the one level here. Pyromancer pieces come in the order garb, hood, robe, boots (the piece you have fewest of). ' +
    'Gloves and torches past your third (which turn into magic or torstol seeds) aren\'t modelled.',
};

// ===================================================================
// World bosses
// ===================================================================

// ----- Brutus -----

const MEMBERS = { key: 'members', label: 'Members world', type: 'check', default: true, hint: 'Seeds, steaks and the rarer uniques are members-only.' };
const mem = (w) => (v) => (v.members ? per(w, 81) : 0);
const f2p = (w) => (v) => (v.members ? 0 : per(w, 81));

const brutus = {
  id: 'brutus',
  name: 'Brutus',
  short: 'Brutus',
  category: 'other',
  wiki: 'Brutus',
  tagline: 'A 1/30 Mooleta, a 2/75 bottomless milk bucket, 1/150 cow slippers and a 1/1000 Beef.',
  inputs: [MEMBERS],
  always: [
    { name: 'Bull bones', p: 1 },
    { name: 'Raw t-bone steak', p: 1 },
  ],
  preroll: [
    { name: 'Mooleta', p: per(5, 150), unique: true },
    { name: 'Bottomless milk bucket (empty)', p: (v) => (v.members ? per(4, 150) : 0), unique: true },
    { name: 'Cow slippers', p: (v) => (v.members ? per(1, 150) : 0), unique: true },
  ],
  main: [
    // Armour
    { name: 'Iron full helm', p: per(2, 81) },
    { name: 'Iron platebody', p: per(2, 81) },
    { name: 'Iron platelegs', p: per(1, 81) },
    { name: 'Iron plateskirt', p: per(1, 81) },
    // Runes and ammunition
    { name: 'Iron arrow', p: per(10, 81), qty: 14 },
    { name: 'Air rune', p: per(10, 81), qty: 29 },
    { name: 'Mind rune', p: per(8, 81), qty: 18 },
    { name: 'Chaos rune', p: per(2, 81), qty: 12 },
    // Seeds (members)
    { name: 'Potato seed', p: mem(10), qty: 3 },
    { name: 'Acorn', p: mem(5), qty: 2 },
    // Resources
    { name: 'Raw t-bone steak', p: mem(10), qty: 3 },
    { name: 'Cowhide', p: per(10, 81) },
    { name: 'Oak logs', p: per(5, 81), qty: 2 },
    { name: 'Logs', p: per(5, 81), qty: 2 },
    // Other (free-to-play, in place of the seeds and steaks)
    { name: 'Coins', p: f2p(15), qty: [60, 80] },
    { name: 'Coins', p: f2p(5), qty: [80, 100] },
    { name: 'Coins', p: f2p(5), qty: [100, 120] },
  ],
  tertiary: [clue('beginner', 15), clue('easy', 40)],
  pet: { name: 'Beef', p: (v) => (v.members ? per(1, 1000) : 0) },
  summary: () => 'On free-to-play worlds the seeds and noted steaks become coins, and the milk bucket, slippers and Beef can\'t drop. Cow bones (Rag and Bone Man III only) are left out.',
};

const demonicBrutus = {
  id: 'demonic-brutus',
  name: 'Demonic Brutus',
  short: 'Demonic Brutus',
  category: 'other',
  wiki: 'Demonic Brutus',
  tagline: 'Brutus slippers every kill and Beef at about 1/400.',
  inputs: [],
  always: [{ name: 'Brutus slippers', p: 1 }],
  rolls: 0,
  pet: { name: 'Beef', p: per(1, 400) },
  summary: () => 'The wiki lists only the slippers and an approximate 1/400 Beef for the harder fight.',
};

// ----- Mad Angel -----

const madAngel = {
  id: 'mad-angel',
  name: 'Mad Angel',
  short: 'Mad Angel',
  category: 'other',
  wiki: 'Mad Angel',
  tagline: 'A 1/127 Hallowfell, a 1/1000 Jar of Light and a 1/2000 Aggy.',
  inputs: [],
  always: [{ name: 'Granite dust', p: 1, qty: [25, 35] }],
  preroll: [
    { name: 'Ardeaglais teleport', p: per(1, 25), qty: 2 },
    { name: 'Hallowfell', p: per(1, 127), unique: true },
    { name: 'Jar of Light', p: per(1, 1000), unique: true },
  ],
  main: [
    // Weapons and armour
    { name: 'Rune kiteshield', p: per(12, 150) },
    { name: 'Rune full helm', p: per(12, 150) },
    { name: 'Adamant longsword', p: per(6, 150) },
    { name: 'Dragon med helm', p: per(2, 150) },
    { name: 'Dragon battleaxe', p: per(2, 150) },
    // Runes and ammunition
    { name: 'Steel cannonball', p: per(16, 150), qty: [90, 100] },
    { name: 'Law rune', p: per(12, 150), qty: [28, 30] },
    { name: 'Nature rune', p: per(8, 150), qty: [20, 25] },
    { name: 'Death rune', p: per(8, 150), qty: [40, 50] },
    { name: 'Air rune', p: per(4, 150), qty: [110, 120] },
    // Supply batch: sharks or yellowfins with a prayer potion and a super combat
    { items: [{ name: 'Shark', qty: 2 }, { name: 'Prayer potion(2)' }, { name: 'Super combat potion(1)' }], p: per(8, 150) },
    { items: [{ name: 'Yellowfin', qty: 2 }, { name: 'Prayer potion(2)' }, { name: 'Super combat potion(1)' }], p: per(8, 150) },
    // Other
    { name: 'Prayer potion(4)', p: per(12, 150) },
    { name: 'Super combat potion(3)', p: per(8, 150), qty: [2, 3] },
    { name: 'Coins', p: per(8, 150), qty: [8000, 10000] },
    { name: 'Raw monkfish', p: per(8, 150), qty: [18, 22] },
    { name: 'Emerald', p: per(6, 150), qty: [7, 8] },
    { name: 'Sapphire', p: per(6, 150), qty: [7, 8] },
    { name: 'Cupronickel bar', p: per(1, 150) },
    { name: 'Papyrus', p: per(1, 150) },
    // Rare drop table
    { table: 'rdt', p: per(2, 150) },
  ],
  tertiary: [clue('medium', 25)],
  pet: { name: 'Aggy', p: per(1, 2000) },
  summary: () => 'The sunstone crystal (only until you build the bank chest) is left out.',
};

// ----- Maggot King -----

const EGGS = (v) => v.mode === 1;
// Popping each kind of egg rolls the pet at its own odds.
const EGG_PET = (300 / 1500) * (1 / 3000) + (150 / 1500) * (1 / 2500) + (33 / 1500) * (1 / 1250) +
  (6 / 1500) * (1 / 500) + (3 / 1500) * (1 / 10) + (1 / 1500) * (1 / 2);

const maggotKing = {
  id: 'maggot-king',
  name: 'Maggot King',
  short: 'Maggot King',
  category: 'other',
  wiki: 'Maggot King',
  tagline: 'A 1/340 Elder venator fang, a 1/520 Crimson kisten and a 1/3500 Maggot marquess (better odds if you take the eggs).',
  inputs: [
    KONAR,
    {
      key: 'mode',
      label: 'Loot option',
      type: 'select',
      default: 0,
      options: [
        { value: 0, label: 'Open-stomach (loot)' },
        { value: 1, label: 'Take-eggs (pet chance only)' },
      ],
    },
  ],
  rolls: (v) => (EGGS(v) ? 0 : 1),
  preroll: [
    { name: 'Elder venator fang', p: per(1, 340), unique: true },
    { name: 'Crimson kisten', p: per(1, 520), unique: true },
  ],
  main: [
    // Supplies: dropped together
    { items: [{ name: 'Stymphike tartare', qty: [2, 4] }, { name: 'Dull ancient medal' }], p: per(41, 159) },
    // Resources
    { name: 'Uncut ruby', p: per(15, 159), qty: [10, 13] },
    { name: 'Stymphike feather', p: per(10, 159), qty: [51, 74] },
    { name: 'Mort myre fungus', p: per(10, 159), qty: [50, 76] },
    { name: 'Letvek', p: per(10, 159), qty: [23, 34] },
    { name: 'Runite ore', p: per(5, 159), qty: [12, 15] },
    { name: 'Blood sac', p: per(5, 159), qty: [8, 11] },
    { name: 'Gold ore', p: per(5, 159), qty: [24, 32] },
    { name: 'Mithril ore', p: per(5, 159), qty: [36, 41] },
    { name: 'Adamantite ore', p: per(10, 159), qty: [30, 40] },
    { name: 'Orikalkum gravel', p: per(4, 159), qty: [4, 5] },
    { name: 'Venator fang', p: per(2, 159), qty: [112, 179] },
    { name: 'Venator tooth', p: per(2, 159), qty: [178, 219] },
    // Tarnished items
    { name: 'Tarnished spear', p: per(12, 159) },
    { name: 'Tarnished ring', p: per(6, 159) },
    { name: 'Tarnished bracelet', p: per(3, 159) },
    { name: 'Tarnished necklace', p: per(3, 159) },
    { name: 'Tarnished amulet', p: per(3, 159) },
    { name: 'Tarnished battleaxe', p: per(2, 159) },
    { name: 'Tarnished longsword', p: per(2, 159) },
    { name: 'Tarnished halberd', p: per(2, 159) },
    { name: 'Tarnished 2h sword', p: per(2, 159) },
  ],
  tertiary: [
    // Taking eggs: one of six kinds of maggot egg (493/1500), popped for the pet.
    { name: 'Maggot egg', p: (v) => (EGGS(v) ? per(493, 1500) : 0) },
    { ...brimstoneKey(50), p: (v) => (v.konar && !EGGS(v) ? per(1, 50) : 0) },
    clue('elite', 40),
  ],
  pet: { name: 'Maggot marquess', p: (v) => (EGGS(v) ? EGG_PET : per(1, 3500)) },
  summary: (v) =>
    (EGGS(v)
      ? 'Taking eggs gives no loot: an egg 493/1500 of the time (its kind sets the pet chance when popped), the elite clue, and otherwise nothing or a supply drop (no published rate, left out). '
      : '') + 'Open-stomach rolls the unique pre-roll and then the main table.',
};

export const MODERN_BOSSES = [
  dukeSucellus,
  theLeviathan,
  vardorvis,
  theWhisperer,
  amoxliatl,
  theHueycoatl,
  moonsOfPeril,
  fortisColosseum,
  royalTitans,
  yama,
  doomOfMokhaiotl,
  theGauntlet,
  tztokJad,
  tzkalZuk,
  zalcano,
  tempoross,
  wintertodt,
  brutus,
  demonicBrutus,
  madAngel,
  maggotKing,
];
