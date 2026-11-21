/**
 * Classic bosses: the God Wars Dungeon generals and Nex, and the world bosses
 * that are neither slayer-only nor in the Wilderness. Drop tables follow each
 * boss's Old School RuneScape Wiki page line by line (weights as the wiki
 * writes them, e.g. per(8, 127)); see boss-loot-engine.js for the shape.
 * Quest-only and clue-step-only "Always" drops, first-time-only items and
 * kill-count guarantees are left out.
 */
import { KONAR, brimstoneKey, clue, per } from './common.js';
import { SHARED_TABLES } from '../boss-shared-tables.js';

// ----- shared helpers -----

// The curved bone is only rolled when the long bone isn't given.
const bones = (p = 1) => ({
  table: [
    { name: 'Long bone', p: per(1, 400) },
    { name: 'Curved bone', p: (399 / 400) * per(1, 5000) },
  ],
  p,
});

// A shark drop table: raw sharks and twice as many shark lures 3/8 each,
// another fish 2/8. `n` is the raw shark quantity (lures are always even).
const sharkTable = (n, fish = 'Manta ray') => {
  const lures = Array.isArray(n) ? (v, rng) => 2 * (n[0] + Math.floor(rng() * (n[1] - n[0] + 1))) : n * 2;
  return [
    { name: 'Raw shark', p: per(3, 8), qty: n },
    { name: 'Shark lure', p: per(3, 8), qty: lures },
    { name: fish, p: per(2, 8), qty: n },
  ];
};

// For special(): roll a table the same way the engine does.
const resolveP = (p, v) => (typeof p === 'function' ? p(v) : p);
function qtyRoll(qty, v, rng) {
  if (qty == null) return 1;
  if (typeof qty === 'function') return Math.max(1, Math.round(qty(v, rng)));
  if (Array.isArray(qty)) return qty[0] + Math.floor(rng() * (qty[1] - qty[0] + 1));
  return qty;
}
function rollInto(table, v, rng, add, mult = 1) {
  const t = typeof table === 'string' ? SHARED_TABLES[table] : table;
  let r = rng();
  for (const e of t) {
    r -= resolveP(e.p, v);
    if (r < 0) {
      if (e.table) {
        for (let i = 0; i < (e.rolls ?? 1); i++) rollInto(e.table, v, rng, add, mult * (e.qtyMult ?? 1));
      } else if (e.items) {
        for (const it of e.items) add(it.name, qtyRoll(it.qty, v, rng) * mult, !!(e.unique || it.unique));
      } else {
        add(e.name, qtyRoll(e.qty, v, rng) * mult, !!e.unique);
      }
      return;
    }
  }
}

// ----- God Wars Dungeon -----

// Each general has a 127-slot table. Armour is one slot split evenly; the
// hilt and godsword shard slots pay coins when they miss. The direct coin
// weight is what's left of the 127 (the wiki's coin line also counts coins
// from these slots and the GWD rare and gem tables).
const SHARDS = (coins) => ({
  table: [
    { name: 'Godsword shard 1', p: per(1, 6), unique: true },
    { name: 'Godsword shard 2', p: per(1, 6), unique: true },
    { name: 'Godsword shard 3', p: per(1, 6), unique: true },
    { name: 'Coins', p: per(1, 2), qty: coins },
  ],
  p: per(1, 127),
});
const GWD_RARE = [
  { table: 'gwdRdt', p: per(8, 127) },
  { table: 'gwdGem', p: per(2, 127) },
];
const GWD_COINS = [19500, 20000];
const three = (a, b) => ({ items: [{ name: a, qty: 3 }, { name: b, qty: 3 }] });

const generalGraardor = {
  id: 'general-graardor',
  name: 'General Graardor',
  short: 'Graardor',
  category: 'gwd',
  wiki: 'General Graardor',
  tagline: 'Bandos armour at 1/381 a piece, a 1/508 hilt, and a 1/5000 pet.',
  inputs: [KONAR],
  always: [{ name: 'Big bones', p: 1 }],
  main: [
    // Uniques
    {
      table: [
        { name: 'Bandos chestplate', p: per(1, 3), unique: true },
        { name: 'Bandos tassets', p: per(1, 3), unique: true },
        { name: 'Bandos boots', p: per(1, 3), unique: true },
      ],
      p: per(1, 127),
    },
    {
      table: [
        { name: 'Bandos hilt', p: per(1, 4), unique: true },
        { name: 'Coins', p: per(3, 4), qty: [20100, 20600] },
      ],
      p: per(1, 127),
    },
    SHARDS([20100, 20600]),
    // Weapons and armour
    { name: 'Rune longsword', p: per(8, 127) },
    { name: 'Rune 2h sword', p: per(8, 127) },
    { name: 'Rune platebody', p: per(8, 127) },
    { name: 'Rune pickaxe', p: per(6, 127) },
    // Other
    { name: 'Coins', p: per(28, 127), qty: GWD_COINS },
    { name: 'Grimy snapdragon', p: per(8, 127), qty: 3 },
    { name: 'Snapdragon seed', p: per(8, 127) },
    { name: 'Super restore(4)', p: per(8, 127), qty: 3 },
    { name: 'Adamantite ore', p: per(8, 127), qty: [15, 20] },
    { name: 'Coal', p: per(8, 127), qty: [115, 120] },
    { name: 'Magic logs', p: per(8, 127), qty: [15, 20] },
    { name: 'Nature rune', p: per(8, 127), qty: [65, 70] },
    ...GWD_RARE,
  ],
  tertiary: [brimstoneKey(50), clue('elite', 250), bones()],
  pet: { name: 'Pet General Graardor', p: per(1, 5000) },
  summary: () =>
    "The God Wars rare and gem tables aren't changed by a ring of wealth. Graardor's 28/127 direct coin slot is what's left of the table; the wiki's 31.7/127 also counts coins from the hilt, shard, rare and gem tables.",
};

const krilTsutsaroth = {
  id: 'kril-tsutsaroth',
  name: "K'ril Tsutsaroth",
  short: "K'ril",
  category: 'gwd',
  wiki: "K'ril Tsutsaroth",
  tagline: 'A 1/127 Steam battlestaff or Zamorakian spear, a 1/508 Staff of the Dead or hilt, and a 1/5000 pet.',
  inputs: [KONAR],
  always: [{ name: 'Infernal ashes', p: 1 }],
  main: [
    // Uniques
    { name: 'Steam battlestaff', p: per(1, 127), unique: true },
    { name: 'Zamorakian spear', p: per(1, 127), unique: true },
    {
      table: [
        { name: 'Staff of the Dead', p: per(1, 4), unique: true },
        { name: 'Zamorak hilt', p: per(1, 4), unique: true },
        { name: 'Coins', p: per(1, 2), qty: GWD_COINS },
      ],
      p: per(1, 127),
    },
    SHARDS(GWD_COINS),
    // Weapons and armour
    { name: 'Adamant arrow(p++)', p: per(8, 127), qty: [295, 300] },
    { name: 'Rune scimitar', p: per(8, 127) },
    { name: 'Adamant platebody', p: per(8, 127) },
    { name: 'Rune platelegs', p: per(7, 127) },
    { name: 'Dragon dagger(p++)', p: per(2, 127) },
    // Potions: always dropped in pairs
    { ...three('Super attack(3)', 'Super strength(3)'), p: per(8, 127) },
    { ...three('Super restore(3)', 'Zamorak brew(3)'), p: per(8, 127) },
    // Other
    { name: 'Coins', p: per(32, 127), qty: GWD_COINS },
    { name: 'Grimy lantadyme', p: per(8, 127), qty: 10 },
    { name: 'Lantadyme seed', p: per(8, 127), qty: 3 },
    { name: 'Death rune', p: per(8, 127), qty: [120, 125] },
    { name: 'Blood rune', p: per(8, 127), qty: [80, 85] },
    ...GWD_RARE,
  ],
  tertiary: [brimstoneKey(50), clue('elite', 250)],
  pet: { name: "Pet K'ril Tsutsaroth", p: per(1, 5000) },
  summary: () =>
    "The Staff of the Dead and Zamorak hilt share one 1/127 slot that pays coins half the time. The God Wars rare and gem tables aren't changed by a ring of wealth.",
};

const kreeArra = {
  id: 'kree-arra',
  name: "Kree'arra",
  short: "Kree'arra",
  category: 'gwd',
  wiki: "Kree'arra",
  tagline: 'Armadyl armour at 1/381 a piece, a 1/508 hilt, and a 1/5000 pet.',
  inputs: [KONAR],
  always: [
    { name: 'Big bones', p: 1 },
    { name: 'Feather', p: 1, qty: [1, 16] },
  ],
  main: [
    // Uniques
    {
      table: [
        { name: 'Armadyl helmet', p: per(1, 3), unique: true },
        { name: 'Armadyl chestplate', p: per(1, 3), unique: true },
        { name: 'Armadyl chainskirt', p: per(1, 3), unique: true },
      ],
      p: per(1, 127),
    },
    {
      table: [
        { name: 'Armadyl hilt', p: per(1, 4), unique: true },
        { name: 'Coins', p: per(3, 4), qty: [20500, 21000] },
      ],
      p: per(1, 127),
    },
    SHARDS([20500, 21000]),
    // Weapons and armour
    { name: "Black d'hide body", p: per(8, 127) },
    { name: 'Rune crossbow', p: per(8, 127) },
    // Runes and ammunition
    { name: 'Mind rune', p: per(8, 127), qty: [586, 601] },
    { name: 'Rune arrow', p: per(8, 127), qty: [100, 105] },
    { name: 'Runite bolts', p: per(8, 127), qty: [20, 25] },
    { name: 'Dragonstone bolts (e)', p: per(8, 127), qty: [5, 10] },
    // Other
    { name: 'Coins', p: per(40, 127), qty: GWD_COINS },
    { ...three('Ranging potion(3)', 'Super defence(3)'), p: per(8, 127) },
    { name: 'Grimy dwarf weed', p: per(8, 127), qty: [8, 13] },
    { name: 'Dwarf weed seed', p: per(8, 127), qty: 2 },
    { name: 'Crystal key', p: per(1, 127) },
    { name: 'Yew seed', p: per(1, 127) },
    ...GWD_RARE,
  ],
  tertiary: [brimstoneKey(50), clue('elite', 250), bones()],
  pet: { name: "Pet Kree'arra", p: per(1, 5000) },
  summary: () =>
    "In the game the mind rune drop is the feather count plus 585; here the two are rolled separately. The God Wars rare and gem tables aren't changed by a ring of wealth.",
};

const commanderZilyana = {
  id: 'commander-zilyana',
  name: 'Commander Zilyana',
  short: 'Zilyana',
  category: 'gwd',
  wiki: 'Commander Zilyana',
  tagline: "A 1/127 Saradomin sword, a 1/254 Saradomin's light, a 1/508 Armadyl crossbow or hilt, and a 1/5000 pet.",
  inputs: [KONAR],
  always: [{ name: 'Bones', p: 1 }],
  main: [
    // Uniques
    { name: 'Saradomin sword', p: per(1, 127), unique: true },
    {
      table: [
        { name: "Saradomin's light", p: per(1, 2), unique: true },
        { name: 'Armadyl crossbow', p: per(1, 4), unique: true },
        { name: 'Saradomin hilt', p: per(1, 4), unique: true },
      ],
      p: per(1, 127),
    },
    SHARDS(GWD_COINS),
    // Weapons and armour
    { name: 'Adamant platebody', p: per(8, 127) },
    { name: 'Rune dart', p: per(8, 127), qty: [35, 40] },
    { name: 'Rune kiteshield', p: per(8, 127) },
    { name: 'Rune plateskirt', p: per(8, 127) },
    // Potions
    { name: 'Prayer potion(4)', p: per(8, 127), qty: 3 },
    { ...three('Saradomin brew(3)', 'Super restore(4)'), p: per(6, 127) },
    { ...three('Super defence(3)', 'Magic potion(3)'), p: per(8, 127) },
    // Other
    { name: 'Coins', p: per(27, 127), qty: GWD_COINS },
    { name: 'Diamond', p: per(8, 127), qty: 6 },
    { name: 'Law rune', p: per(8, 127), qty: [95, 100] },
    { name: 'Grimy ranarr weed', p: per(8, 127), qty: 5 },
    { name: 'Ranarr seed', p: per(8, 127), qty: 2 },
    { name: 'Magic seed', p: per(1, 127) },
    ...GWD_RARE,
  ],
  tertiary: [brimstoneKey(50), clue('elite', 250)],
  pet: { name: 'Pet Zilyana', p: per(1, 5000) },
  summary: () => "The God Wars rare and gem tables aren't changed by a ring of wealth.",
};

// ----- Nex -----

// Your share of the damage (solo is always 100%).
const nexShare = (v) => (v.team <= 1 ? 1 : Math.min(100, Math.max(1, v.share)) / 100);
// The unique table: 1/43 split by contribution, +10% for the MVP.
const nexUnique = (v) => (nexShare(v) / 43) * (v.mvp ? 1.1 : 1);
// The MVP gets 10% more common loot.
const nexQty = ([a, b]) => (v, rng) => (a + Math.floor(rng() * (b - a + 1))) * (v.mvp ? 1.1 : 1);

// The wiki only says "Common" or "Uncommon" for most of Nex's commons: they
// share what the four exact rates leave, a common twice an uncommon's chance.
const NEX_LEFT = 1 - (per(6, 82) + per(9, 209));
const NEX_C = (NEX_LEFT * 2) / 31;
const NEX_U = NEX_LEFT / 31;

const nex = {
  id: 'nex',
  name: 'Nex',
  short: 'Nex',
  category: 'gwd',
  wiki: 'Nex',
  tagline: 'A 1/43 unique table split by contribution (Torva, Nihil horn, Zaryte vambraces, Ancient hilt) and a 1/500 Nexling.',
  inputs: [
    { key: 'team', label: 'Team size', type: 'range', default: 1, min: 1, max: 20, step: 1 },
    {
      key: 'share',
      label: 'Your contribution (%)',
      type: 'range',
      default: 100,
      min: 1,
      max: 100,
      step: 1,
      hint: 'Your share of the damage in a team; 100 ÷ team size for an even split. Solo is always 100%.',
    },
    { key: 'mvp', label: 'MVP', type: 'check', default: true, hint: 'The MVP gets big bones, +10% common loot and +10% unique chance.' },
  ],
  rolls: 2,
  main: [
    // Runes and ammunition
    { name: 'Air rune', p: NEX_U, qty: nexQty([123, 10000]) },
    { name: 'Fire rune', p: NEX_U, qty: nexQty([1, 10000]) },
    { name: 'Blood rune', p: NEX_C, qty: nexQty([84, 876]) },
    { name: 'Death rune', p: NEX_C, qty: nexQty([85, 986]) },
    { name: 'Water rune', p: NEX_U, qty: nexQty([193, 10000]) },
    { name: 'Soul rune', p: NEX_C, qty: nexQty([86, 592]) },
    { name: 'Dragon bolts (unf)', p: NEX_C, qty: nexQty([12, 283]) },
    { name: 'Onyx bolts (e)', p: NEX_U, qty: nexQty([11, 29]) },
    { name: 'Steel cannonball', p: NEX_C, qty: nexQty([42, 2252]) },
    // Resources
    { name: 'Air orb', p: NEX_C, qty: nexQty([6, 100]) },
    { name: 'Coal', p: NEX_U, qty: nexQty([23, 2354]) },
    { name: 'Runite ore', p: NEX_U, qty: nexQty([2, 30]) },
    { name: 'Uncut ruby', p: NEX_C, qty: nexQty([3, 80]) },
    { name: 'Uncut diamond', p: NEX_C, qty: nexQty([3, 64]) },
    { name: 'Wine of Zamorak', p: NEX_C, qty: nexQty([4, 64]) },
    // Consumables: dropped in pairs
    { items: [{ name: 'Shark', qty: 10 }, { name: 'Prayer potion(4)', qty: 3 }], p: NEX_C },
    { items: [{ name: 'Saradomin brew(4)', qty: [1, 10] }, { name: 'Super restore(4)', qty: [1, 5] }], p: NEX_C },
    // Other
    { name: 'Blood essence', p: per(1, 82), qty: [1, 2] },
    { name: 'Coins', p: NEX_U, qty: nexQty([8539, 26748]) },
    { name: 'Rune shortsword', p: per(1, 209) },
    { name: 'Ecumenical key shard', p: NEX_C, qty: nexQty([6, 39]) },
    { name: 'Nihil shard', p: per(5, 82), qty: [80, 85] },
    { name: 'Nihil shard', p: per(8, 209), qty: [85, 95] },
  ],
  extra: [
    [
      { name: 'Torva full helm (damaged)', p: (v) => nexUnique(v) * per(2, 12), unique: true },
      { name: 'Torva platebody (damaged)', p: (v) => nexUnique(v) * per(2, 12), unique: true },
      { name: 'Torva platelegs (damaged)', p: (v) => nexUnique(v) * per(2, 12), unique: true },
      { name: 'Nihil horn', p: (v) => nexUnique(v) * per(2, 12), unique: true },
      { name: 'Zaryte vambraces', p: (v) => nexUnique(v) * per(3, 12), unique: true },
      { name: 'Ancient hilt', p: (v) => nexUnique(v) * per(1, 12), unique: true },
    ],
  ],
  tertiary: [
    { name: 'Big bones', p: (v) => (v.mvp ? 1 : 0) },
    clue('elite', 48),
  ],
  pet: { name: 'Nexling', p: per(1, 500) },
  summary: (v) =>
    `Your unique chance is ${Math.round((100 * nexShare(v)))}% of 1/43${v.mvp ? ', +10% as MVP' : ''} (1 in ${Math.round(1 / nexUnique(v))}). ` +
    "The wiki gives most commons only as \"Common\" or \"Uncommon\", so they share what the exact rates leave, a common twice as likely as an uncommon. Quantities use the wiki's full ranges, which really depend on team size and contribution. Two commons drop per kill.",
};

// ----- Corporeal Beast -----

const corporealBeast = {
  id: 'corporeal-beast',
  name: 'Corporeal Beast',
  short: 'Corp',
  category: 'other',
  wiki: 'Corporeal Beast',
  tagline: 'A 1/585 sigil (Elysian 1/4095), a 1/64 spirit shield, and a 1/5000 Pet dark core.',
  // Sigils: 1/585, then Elysian 1/7, Spectral 3/7, Arcane 3/7.
  preroll: [
    { name: 'Spectral sigil', p: per(3, 7 * 585), unique: true },
    { name: 'Arcane sigil', p: per(3, 7 * 585), unique: true },
    { name: 'Elysian sigil', p: per(1, 7 * 585), unique: true },
  ],
  main: [
    // Weapons and armour
    { name: 'Mystic robe top', p: per(18, 512) },
    { name: 'Mystic robe bottom', p: per(18, 512) },
    { name: 'Mystic air staff', p: per(12, 512) },
    { name: 'Mystic water staff', p: per(12, 512) },
    { name: 'Mystic earth staff', p: per(12, 512) },
    { name: 'Mystic fire staff', p: per(12, 512) },
    { name: 'Spirit shield', p: per(8, 512), unique: true },
    // Runes and ammunition
    { name: 'Soul rune', p: per(32, 512), qty: 250 },
    { name: 'Runite bolts', p: per(24, 512), qty: 250 },
    { name: 'Death rune', p: per(22, 512), qty: 300 },
    { name: 'Onyx bolts (e)', p: per(20, 512), qty: 175 },
    { name: 'Steel cannonball', p: per(17, 512), qty: 2000 },
    { name: 'Adamant arrow', p: per(17, 512), qty: 750 },
    { name: 'Law rune', p: per(17, 512), qty: 250 },
    { name: 'Cosmic rune', p: per(17, 512), qty: 500 },
    // Resources
    { name: 'Raw shark', p: per(21, 512), qty: 70 },
    { name: 'Pure essence', p: per(21, 512), qty: 2500 },
    { name: 'Adamantite bar', p: per(18, 512), qty: 35 },
    { name: 'Green dragonhide', p: per(18, 512), qty: 100 },
    { name: 'Adamantite ore', p: per(17, 512), qty: 125 },
    { name: 'Runite ore', p: per(12, 512), qty: 20 },
    { name: 'Teak plank', p: per(12, 512), qty: 100 },
    { name: 'Mahogany logs', p: per(12, 512), qty: 150 },
    { name: 'Magic logs', p: per(12, 512), qty: 75 },
    // Other
    { name: 'Tuna potato', p: per(20, 512), qty: 30 },
    { name: 'White berries', p: per(17, 512), qty: 120 },
    { name: 'Goat horn', p: per(17, 512), qty: 120 },
    { name: 'Watermelon seed', p: per(15, 512), qty: 24 },
    { name: 'Coins', p: per(12, 512), qty: [20000, 50000] },
    { name: 'Antidote++(4)', p: per(10, 512), qty: 40 },
    { name: 'Ranarr seed', p: per(5, 512), qty: 10 },
    { name: 'Holy elixir', p: per(3, 512), unique: true },
    // Gem drop table: rolled ten times
    { table: 'gem', p: per(12, 512), rolls: 10 },
  ],
  tertiary: [clue('elite', 200), { name: 'Jar of Spirits', p: per(1, 1000), unique: true }],
  pet: { name: 'Pet dark core', p: per(1, 5000) },
  summary: () =>
    'Only the player who deals the most damage gets loot, so this is a solo kill. A sigil takes the place of the main drop. The gem table rolls ten times when hit.',
};

// ----- Dagannoth Kings -----

const DK_TERTIARY = [
  { name: 'Ensouled dagannoth head', p: per(1, 20) },
  clue('hard', 42),
  brimstoneKey(60),
  clue('elite', 750),
];
const DK_ALWAYS = [
  { name: 'Dagannoth bones', p: 1 },
  { name: 'Dagannoth hide', p: 1 },
];
const DK_RARE = [
  { table: 'talisman', p: per(1, 128) },
  { table: 'rdt', p: per(8, 128) },
  { table: 'gem', p: per(10, 128) },
];
const DK_SUMMARY = () =>
  'Dagannoth bones come noted with the elite Fremennik Diary. The gem table\'s talisman is split evenly between chaos and nature.';

const dagannothRex = {
  id: 'dagannoth-rex',
  name: 'Dagannoth Rex',
  short: 'Rex',
  category: 'other',
  wiki: 'Dagannoth Rex',
  tagline: 'A 1/128 Berserker ring, Warrior ring or Dragon axe, and a 1/5000 pet.',
  inputs: [KONAR],
  always: DK_ALWAYS,
  main: [
    // Weapons and armour
    { name: 'Steel kiteshield', p: per(17, 128) },
    { name: 'Mithril warhammer', p: per(11, 128) },
    { name: 'Adamant axe', p: per(7, 128) },
    { name: 'Steel platebody', p: per(4, 128) },
    { name: 'Mithril pickaxe', p: per(3, 128) },
    { name: 'Adamant platebody', p: per(2, 128) },
    { name: 'Fremennik blade', p: per(2, 128) },
    { name: 'Dragon axe', p: per(1, 128), unique: true },
    { name: 'Rune axe', p: per(1, 128) },
    { name: 'Fremennik shield', p: per(1, 128) },
    { name: 'Fremennik helm', p: per(1, 128) },
    { name: 'Mithril 2h sword', p: per(1, 128) },
    { name: 'Ring of life', p: per(1, 128) },
    { name: 'Rock-shell plate', p: per(1, 128) },
    { name: 'Rock-shell legs', p: per(1, 128) },
    { name: 'Berserker ring', p: per(1, 128), unique: true },
    { name: 'Warrior ring', p: per(1, 128), unique: true },
    // Potions
    { name: 'Antifire potion(2)', p: per(1, 128) },
    { name: 'Prayer potion(2)', p: per(1, 128) },
    { name: 'Restore potion(2)', p: per(1, 128) },
    { name: 'Super attack(2)', p: per(1, 128) },
    { name: 'Super strength(2)', p: per(1, 128) },
    { name: 'Super defence(2)', p: per(1, 128) },
    { name: 'Zamorak brew(2)', p: per(1, 128) },
    // Ores and bars
    { name: 'Mithril ore', p: per(10, 128), qty: 25 },
    { name: 'Adamantite bar', p: per(3, 128) },
    { name: 'Coal', p: per(2, 128), qty: 100 },
    { name: 'Iron ore', p: per(1, 128), qty: 150 },
    { name: 'Steel bar', p: per(1, 128), qty: [15, 30] },
    // Other
    { name: 'Coins', p: per(10, 128), qty: [100, 1209] },
    { name: 'Grimy ranarr weed', p: per(7, 128) },
    { name: 'Bass', p: per(7, 128), qty: 5 },
    { name: 'Swordfish', p: per(4, 128), qty: 5 },
    { name: 'Shark', p: per(1, 128), qty: 5 },
    ...DK_RARE,
  ],
  tertiary: DK_TERTIARY,
  pet: { name: 'Pet Dagannoth Rex', p: per(1, 5000) },
  summary: DK_SUMMARY,
};

const dagannothPrime = {
  id: 'dagannoth-prime',
  name: 'Dagannoth Prime',
  short: 'Prime',
  category: 'other',
  wiki: 'Dagannoth Prime',
  tagline: 'A 1/128 Seers ring, Mud battlestaff or Dragon axe, and a 1/5000 pet.',
  inputs: [KONAR],
  always: DK_ALWAYS,
  main: [
    // Weapons and armour
    { name: 'Earth battlestaff', p: per(10, 128) },
    { name: 'Water battlestaff', p: per(5, 128) },
    { name: 'Air battlestaff', p: per(4, 128) },
    { name: 'Battlestaff', p: per(1, 128), qty: [1, 10] },
    { name: 'Fremennik blade', p: per(1, 128) },
    { name: 'Fremennik shield', p: per(1, 128) },
    { name: 'Fremennik helm', p: per(1, 128) },
    { name: 'Mud battlestaff', p: per(1, 128), unique: true },
    { name: 'Dragon axe', p: per(1, 128), unique: true },
    { name: 'Farseer helm', p: per(1, 128) },
    { name: 'Skeletal top', p: per(1, 128) },
    { name: 'Skeletal bottoms', p: per(1, 128) },
    { name: 'Seers ring', p: per(1, 128), unique: true },
    // Runes
    { name: 'Air rune', p: per(6, 128), qty: [100, 200] },
    { name: 'Earth rune', p: per(5, 128), qty: [50, 100] },
    { name: 'Blood rune', p: per(2, 128), qty: [25, 75] },
    { name: 'Law rune', p: per(2, 128), qty: [10, 75] },
    { name: 'Nature rune', p: per(2, 128), qty: [25, 75] },
    { name: 'Mud rune', p: per(2, 128), qty: [25, 75] },
    { name: 'Death rune', p: per(2, 128), qty: [25, 85] },
    // Seeds
    { table: 'rareSeed', p: per(7, 128) },
    // Talismans (noted)
    { name: 'Earth talisman', p: per(10, 128), qty: [25, 75] },
    { name: 'Air talisman', p: per(7, 128), qty: [25, 75] },
    { name: 'Water talisman', p: per(7, 128), qty: [1, 76] },
    // Other
    { name: 'Shark', p: per(10, 128), qty: 5 },
    { name: 'Coins', p: per(3, 128), qty: [500, 1109] },
    { name: 'Oyster pearls', p: per(5, 128) },
    { name: 'Pure essence', p: per(5, 128), qty: 150 },
    { name: 'Grimy ranarr weed', p: per(5, 128) },
    ...DK_RARE,
  ],
  tertiary: DK_TERTIARY,
  pet: { name: 'Pet Dagannoth Prime', p: per(1, 5000) },
  summary: DK_SUMMARY,
};

const dagannothSupreme = {
  id: 'dagannoth-supreme',
  name: 'Dagannoth Supreme',
  short: 'Supreme',
  category: 'other',
  wiki: 'Dagannoth Supreme',
  tagline: 'A 1/128 Archers ring, Seercull or Dragon axe, and a 1/5000 pet.',
  inputs: [KONAR],
  always: DK_ALWAYS,
  main: [
    // Weapons and armour
    { name: 'Mithril knife', p: per(10, 128), qty: [25, 50] },
    { name: "Red d'hide vambraces", p: per(7, 128) },
    { name: 'Rune thrownaxe', p: per(5, 128), qty: [5, 10] },
    { name: 'Adamant dart', p: per(5, 128), qty: [10, 25] },
    { name: 'Iron knife', p: per(5, 128), qty: [200, 500] },
    { name: 'Steel knife', p: per(5, 128), qty: [50, 150] },
    { name: 'Fremennik blade', p: per(1, 128) },
    { name: 'Fremennik shield', p: per(1, 128) },
    { name: 'Fremennik helm', p: per(1, 128) },
    { name: 'Seercull', p: per(1, 128), unique: true },
    { name: 'Dragon axe', p: per(1, 128), unique: true },
    { name: 'Archer helm', p: per(1, 128) },
    { name: 'Spined body', p: per(1, 128) },
    { name: 'Spined chaps', p: per(1, 128) },
    { name: 'Archers ring', p: per(1, 128), unique: true },
    // Ammunition
    { name: 'Steel arrow', p: per(5, 128), qty: [50, 250] },
    { name: 'Runite bolts', p: per(5, 128), qty: [2, 12] },
    { name: 'Iron arrow', p: per(4, 128), qty: [200, 700] },
    // Seeds
    { table: 'rareSeed', p: per(7, 128) },
    // Other
    { name: 'Coins', p: per(10, 128), qty: [500, 1110] },
    { name: 'Oyster pearls', p: per(6, 128) },
    { name: 'Opal bolt tips', p: per(5, 128), qty: [10, 30] },
    { name: 'Shark', p: per(5, 128), qty: 5 },
    { name: 'Yew logs', p: per(5, 128), qty: [50, 150] },
    { name: 'Grimy ranarr weed', p: per(5, 128) },
    { name: 'Maple logs', p: per(3, 128), qty: [15, 65] },
    { name: 'Runite limbs', p: per(2, 128) },
    { name: 'Feather', p: per(1, 128), qty: [250, 500] },
    ...DK_RARE,
  ],
  tertiary: DK_TERTIARY,
  pet: { name: 'Pet Dagannoth Supreme', p: per(1, 5000) },
  summary: DK_SUMMARY,
};

// ----- Kalphite Queen -----

const kalphiteQueen = {
  id: 'kalphite-queen',
  name: 'Kalphite Queen',
  short: 'KQ',
  category: 'other',
  wiki: 'Kalphite Queen',
  tagline: 'A 1/128 Kq head or Dragon chainbody, a 1/400 Dragon pickaxe, and a 1/3000 Kalphite Princess.',
  inputs: [KONAR],
  main: [
    // Weapons and armour
    { name: 'Battlestaff', p: per(5, 126), qty: 10 },
    { name: 'Rune chainbody', p: per(4, 126) },
    { name: "Red d'hide body", p: per(4, 126) },
    { name: 'Rune knife(p++)', p: per(4, 126), qty: 25 },
    { name: 'Lava battlestaff', p: per(2, 126) },
    // Runes and ammunition
    { name: 'Death rune', p: per(6, 126), qty: 150 },
    { name: 'Blood rune', p: per(6, 126), qty: 100 },
    { name: 'Mithril arrow', p: per(5, 126), qty: 500 },
    { name: 'Rune arrow', p: per(3, 126), qty: 250 },
    // Herbs
    { name: 'Grimy toadflax', p: per(2, 126), qty: 25 },
    { name: 'Grimy ranarr weed', p: per(2, 126), qty: 25 },
    { name: 'Grimy snapdragon', p: per(2, 126), qty: 25 },
    { name: 'Grimy torstol', p: per(2, 126), qty: 25 },
    // Seeds
    { name: 'Torstol seed', p: per(4, 126), qty: 2 },
    { name: 'Watermelon seed', p: per(3, 126), qty: 25 },
    { name: 'Papaya tree seed', p: per(3, 126), qty: 2 },
    { name: 'Palm tree seed', p: per(3, 126), qty: 2 },
    { name: 'Magic seed', p: per(3, 126), qty: 2 },
    // Resources
    { name: 'Runite bar', p: per(5, 126), qty: 3 },
    { name: 'Bucket of sand', p: per(4, 126), qty: 100 },
    { name: 'Gold ore', p: per(4, 126), qty: 250 },
    { name: 'Magic logs', p: per(4, 126), qty: 60 },
    { name: 'Uncut emerald', p: per(3, 126), qty: 25 },
    { name: 'Uncut ruby', p: per(3, 126), qty: 25 },
    { name: 'Uncut diamond', p: per(3, 126), qty: 25 },
    // Other
    { name: 'Wine of Zamorak', p: per(10, 126), qty: 60 },
    { name: 'Potato cactus', p: per(8, 126), qty: 100 },
    { name: 'Coins', p: per(5, 126), qty: [15000, 20000] },
    { name: 'Grapes', p: per(5, 126), qty: 100 },
    { name: 'Weapon poison(++)', p: per(5, 126), qty: 5 },
    { name: 'Cactus spine', p: per(3, 126), qty: 10 },
    // Rare drop table
    { table: 'rdt', p: per(1, 126) },
  ],
  // A second, separate roll on the consumables table every kill.
  extra: [
    [
      { name: 'Monkfish', p: per(1, 9), qty: 3 },
      { name: 'Shark', p: per(1, 9), qty: 2 },
      { name: 'Dark crab', p: per(1, 9), qty: 2 },
      { name: 'Saradomin brew(4)', p: per(1, 9) },
      { name: 'Prayer potion(4)', p: per(1, 9), qty: 2 },
      { name: 'Super restore(4)', p: per(1, 9) },
      { name: 'Super combat potion(2)', p: per(1, 9) },
      { name: 'Ranging potion(3)', p: per(1, 9) },
      { name: 'Superantipoison(2)', p: per(1, 9) },
    ],
  ],
  tertiary: [
    { name: 'Ensouled kalphite head', p: per(1, 20) },
    brimstoneKey(54),
    clue('elite', 100),
    { name: 'Kq head', p: per(1, 128), unique: true },
    { name: 'Dragon chainbody', p: per(1, 128), unique: true },
    { name: 'Dragon 2h sword', p: per(1, 256), unique: true },
    { name: 'Dragon pickaxe', p: per(1, 400), unique: true },
    { name: 'Jar of Sand', p: per(1, 2000), unique: true },
  ],
  pet: { name: 'Kalphite Princess', p: per(1, 3000) },
  summary: () =>
    'Every kill gives one main drop and one consumable. The tattered Kq head guaranteed on your 256th kill isn\'t modelled.',
};

// ----- Giant Mole -----

const giantMole = {
  id: 'giant-mole',
  name: 'Giant Mole',
  short: 'Giant Mole',
  category: 'other',
  wiki: 'Giant Mole',
  tagline: 'A guaranteed mole claw and skin, a 1/50 Immaculate mole skin, and a 1/3000 Baby Mole.',
  inputs: [KONAR],
  always: [
    { name: 'Big bones', p: 1 },
    { name: 'Mole claw', p: 1 },
    { name: 'Mole skin', p: 1, qty: [1, 3] },
  ],
  main: [
    // Weapons and armour
    { name: 'Adamant longsword', p: per(10, 131) },
    { name: 'Mithril platebody', p: per(9, 131) },
    { name: 'Amulet of strength', p: per(7, 131) },
    { name: 'Mithril axe', p: per(2, 131) },
    { name: 'Mithril battleaxe', p: per(1, 131) },
    { name: 'Rune med helm', p: per(1, 131) },
    // Runes and ammunition
    { name: 'Air rune', p: per(20, 131), qty: 105 },
    { name: 'Blood rune', p: per(19, 131), qty: 15 },
    { name: 'Fire rune', p: per(11, 131), qty: 105 },
    { name: 'Iron arrow', p: per(10, 131), qty: 690 },
    { name: 'Law rune', p: per(5, 131), qty: 15 },
    { name: 'Death rune', p: per(3, 131), qty: 50 },
    // Other
    { name: 'Yew logs', p: per(10, 131), qty: 100 },
    { name: 'Shark', p: per(4, 131), qty: 4 },
    { name: 'Mithril bar', p: per(3, 131) },
    { name: 'Ranarr seed', p: per(3, 131) },
    { name: 'Iron ore', p: per(2, 131), qty: 100 },
    { name: 'Oyster pearls', p: per(1, 131) },
    // Rare and gem drop tables
    { table: 'rdt', p: per(4, 131) },
    { table: 'gem', p: per(6, 131) },
  ],
  tertiary: [
    { name: 'Immaculate mole skin', p: per(1, 50), unique: true },
    brimstoneKey(74),
    bones(),
    clue('elite', 500),
  ],
  pet: { name: 'Baby Mole', p: per(1, 3000) },
  summary: () => 'Mole claws and skins come noted with the hard Falador Diary.',
};

// ----- Sarachnis -----

const sarachnis = {
  id: 'sarachnis',
  name: 'Sarachnis',
  short: 'Sarachnis',
  category: 'other',
  wiki: 'Sarachnis',
  tagline: 'A 1/384 Sarachnis cudgel, a 1/20 egg sac, a 1/50 pristine spider silk, and a 1/3000 Sraracha.',
  inputs: [KONAR],
  preroll: [
    { name: 'Dragon med helm', p: per(2, 384) },
    { name: 'Sarachnis cudgel', p: per(1, 384), unique: true },
  ],
  main: [
    // Weapons and armour
    { name: 'Battlestaff', p: per(2, 100), qty: [8, 10] },
    { name: 'Rune platebody', p: per(2, 100) },
    { name: 'Rune med helm', p: per(2, 100) },
    { name: 'Rune 2h sword', p: per(2, 100) },
    // Runes and ammunition
    { name: 'Blood rune', p: per(5, 100), qty: [80, 100] },
    { name: 'Chaos rune', p: per(5, 100), qty: [175, 200] },
    { name: 'Cosmic rune', p: per(5, 100), qty: [125, 150] },
    { name: 'Death rune', p: per(5, 100), qty: [80, 100] },
    { name: 'Soul rune', p: per(5, 100), qty: [80, 100] },
    { name: 'Mithril arrow', p: per(2, 100), qty: [450, 600] },
    { name: 'Mithril bolts', p: per(2, 100), qty: [175, 225] },
    // Seeds: the rare seed table three at a time
    { name: 'Maple seed', p: per(1, 100), qty: 2 },
    { name: 'Papaya tree seed', p: per(1, 100), qty: 2 },
    { name: 'Yew seed', p: per(1, 100) },
    { table: 'rareSeed', p: per(2, 100), qtyMult: 3 },
    // Herbs: the combat herb table 6/100, the useful herb table 4/100
    {
      table: [
        { name: 'Grimy kwuarm', p: per(5, 16), qty: [10, 15] },
        { name: 'Grimy dwarf weed', p: per(4, 16), qty: [10, 15] },
        { name: 'Grimy cadantine', p: per(4, 16), qty: [10, 15] },
        { name: 'Grimy lantadyme', p: per(3, 16), qty: [10, 15] },
      ],
      p: per(6, 100),
    },
    {
      table: [
        { name: 'Grimy avantoe', p: per(5, 16), qty: [5, 10] },
        { name: 'Grimy snapdragon', p: per(4, 16), qty: [5, 10] },
        { name: 'Grimy ranarr weed', p: per(4, 16), qty: [5, 10] },
        { name: 'Grimy torstol', p: per(3, 16), qty: [5, 10] },
      ],
      p: per(4, 100),
    },
    // Materials
    { name: 'Mithril ore', p: per(6, 100), qty: [60, 90] },
    { name: 'Red dragonhide', p: per(5, 100), qty: [15, 25] },
    { name: 'Uncut sapphire', p: per(4, 100), qty: [20, 30] },
    { name: 'Adamantite ore', p: per(3, 100), qty: [30, 40] },
    { name: 'Uncut emerald', p: per(3, 100), qty: [20, 30] },
    { name: 'Onyx bolt tips', p: per(2, 100), qty: [8, 10] },
    { name: 'Uncut ruby', p: per(2, 100), qty: [20, 30] },
    { name: 'Runite ore', p: per(1, 100), qty: [4, 6] },
    { name: 'Uncut diamond', p: per(1, 100), qty: [20, 30] },
    // Other
    { name: 'Coins', p: per(6, 100), qty: [17000, 25000] },
    { name: 'Dragon bones', p: per(5, 100), qty: [10, 15] },
    { name: 'Egg potato', p: per(5, 100), qty: [5, 8] },
    { name: 'Weapon poison(++)', p: per(2, 100), qty: [4, 6] },
    { name: 'Crystal key', p: per(1, 100) },
    { name: 'Spider carcass', p: per(1, 100), qty: 10 },
    // Gem drop table
    { table: 'gem', p: per(1, 100) },
  ],
  tertiary: [
    // The page you hold fewest of.
    { set: ['Tattered moon page', 'Tattered sun page', 'Tattered temple page'], p: per(1, 5) },
    { name: 'Giant egg sac(full)', p: per(1, 20), unique: true },
    { name: 'Grubby key', p: per(1, 15) },
    clue('hard', 40),
    brimstoneKey(57),
    { name: 'Pristine spider silk', p: per(1, 50), unique: true },
    clue('elite', 60),
    { name: 'Jar of Eyes', p: per(1, 2000), unique: true },
  ],
  pet: { name: 'Sraracha', p: per(1, 3000) },
  summary: () =>
    'The dragon med helm and cudgel are checked before the main table and take its place when they hit. Tattered pages come in whichever kind you hold fewest of.',
};

// ----- Zulrah -----

const zulrah = {
  id: 'zulrah',
  name: 'Zulrah',
  short: 'Zulrah',
  category: 'other',
  wiki: 'Zulrah',
  tagline: 'Two rolls, each with a 1/256 unique table (fangs, visage, onyx), mutagens at 1/6554, and a 1/4000 snakeling.',
  inputs: [KONAR],
  always: [{ name: "Zulrah's scales", p: 1, qty: [100, 299] }],
  rolls: 2,
  // The unique table, checked before each roll: 1/256, split four ways.
  prerollEach: true,
  preroll: [
    { name: 'Tanzanite fang', p: per(1, 1024), unique: true },
    { name: 'Magic fang', p: per(1, 1024), unique: true },
    { name: 'Serpentine visage', p: per(1, 1024), unique: true },
    { name: 'Uncut onyx', p: per(1, 1024), unique: true },
  ],
  main: [
    // Flax, which leads to the mutagens 20/5264 of the time
    {
      table: [
        { name: 'Flax', p: per(5244, 5264), qty: 1000 },
        { name: 'Tanzanite mutagen', p: per(10, 5264), unique: true },
        { name: 'Magma mutagen', p: per(10, 5264), unique: true },
      ],
      p: per(10, 249),
    },
    // Weapons and armour
    { name: 'Battlestaff', p: per(10, 249), qty: 10 },
    { name: 'Dragon med helm', p: per(2, 249) },
    { name: 'Dragon halberd', p: per(2, 249) },
    // Runes
    { name: 'Death rune', p: per(12, 249), qty: 250 },
    { name: 'Law rune', p: per(12, 249), qty: 200 },
    { name: 'Chaos rune', p: per(12, 249), qty: 400 },
    // Herbs
    { name: 'Snapdragon', p: per(2, 249), qty: 10 },
    { name: 'Dwarf weed', p: per(2, 249), qty: 30 },
    { name: 'Toadflax', p: per(2, 249), qty: 25 },
    { name: 'Torstol', p: per(2, 249), qty: 10 },
    // Seeds
    { name: 'Palm tree seed', p: per(6, 249) },
    { name: 'Papaya tree seed', p: per(6, 249), qty: 3 },
    { name: 'Calquat tree seed', p: per(6, 249), qty: 2 },
    { name: 'Magic seed', p: per(4, 249) },
    { name: 'Toadflax seed', p: per(2, 249), qty: 2 },
    { name: 'Snapdragon seed', p: per(2, 249) },
    { name: 'Dwarf weed seed', p: per(2, 249), qty: 2 },
    { name: 'Torstol seed', p: per(2, 249) },
    { name: 'Spirit seed', p: per(1, 249) },
    // Resources
    { name: 'Snakeskin', p: per(11, 249), qty: 35 },
    { name: 'Runite ore', p: per(11, 249), qty: 2 },
    { name: 'Pure essence', p: per(10, 249), qty: 1500 },
    { name: 'Yew logs', p: per(10, 249), qty: 35 },
    { name: 'Adamantite bar', p: per(8, 249), qty: 20 },
    { name: 'Coal', p: per(8, 249), qty: 200 },
    { name: 'Dragon bones', p: per(8, 249), qty: 12 },
    { name: 'Mahogany logs', p: per(8, 249), qty: 50 },
    // Shark drop table
    { table: sharkTable(35), p: per(12, 249) },
    // Other
    { name: 'Zul-andra teleport', p: per(15, 249), qty: 4 },
    { name: 'Antidote++(4)', p: per(9, 249), qty: 10 },
    { name: 'Dragonstone bolt tips', p: per(8, 249), qty: 12 },
    { name: 'Grapes', p: per(6, 249), qty: 250 },
    { name: 'Coconut', p: per(6, 249), qty: 20 },
    { name: 'Swamp tar', p: per(5, 249), qty: 1000 },
    { name: "Zulrah's scales", p: per(5, 249), qty: 500 },
    // Rare drop table
    { table: 'rdt', p: per(10, 249) },
  ],
  tertiary: [brimstoneKey(50), clue('elite', 75), { name: 'Jar of Swamp', p: per(1, 3000), unique: true }],
  pet: { name: 'Pet Snakeling', p: per(1, 4000) },
  summary: () =>
    'Each of the two rolls first checks the 1/256 unique table, which takes that roll\'s place when it hits. The wiki gives the main table\'s rates out of 249 without the pre-roll, and they\'re used as written.',
};

// ----- Vorkath -----

const vorkath = {
  id: 'vorkath',
  name: 'Vorkath',
  short: 'Vorkath',
  category: 'other',
  wiki: 'Vorkath',
  tagline: 'Two rolls, a 1/1000 Dragonbone necklace, visages at 1/5000, and a 1/3000 Vorki.',
  inputs: [KONAR],
  always: [
    { name: 'Superior dragon bones', p: 1, qty: 2 },
    { name: 'Blue dragonhide', p: 1, qty: 2 },
  ],
  rolls: 2,
  main: [
    // Weapons and armour
    { name: 'Rune longsword', p: per(5, 150), qty: [2, 3] },
    { name: 'Rune kiteshield', p: per(5, 150), qty: [2, 3] },
    { name: 'Battlestaff', p: per(4, 150), qty: [5, 15] },
    { name: 'Dragon battleaxe', p: per(2, 150) },
    { name: 'Dragon longsword', p: per(2, 150) },
    { name: 'Dragon platelegs', p: per(2, 150) },
    { name: 'Dragon plateskirt', p: per(2, 150) },
    // Runes
    { name: 'Chaos rune', p: per(6, 150), qty: [250, 350] },
    { name: 'Death rune', p: per(6, 150), qty: [200, 300] },
    { name: 'Wrath rune', p: per(3, 150), qty: [30, 60] },
    // Dragonhide
    { name: 'Blue dragonhide', p: per(8, 150), qty: [25, 30] },
    { name: 'Green dragonhide', p: per(7, 150), qty: [25, 30] },
    { name: 'Red dragonhide', p: per(7, 150), qty: [20, 25] },
    { name: 'Black dragonhide', p: per(7, 150), qty: [15, 25] },
    // Fletching materials
    { name: 'Dragon bolts (unf)', p: per(8, 150), qty: [50, 100] },
    { name: 'Dragonstone bolt tips', p: per(5, 150), qty: [11, 25] },
    { name: 'Onyx bolt tips', p: per(4, 150), qty: [5, 10] },
    { name: 'Rune dart tip', p: per(3, 150), qty: [75, 100] },
    { name: 'Dragon dart tip', p: per(6, 150), qty: [10, 50] },
    { name: 'Dragon arrowtips', p: per(3, 150), qty: [25, 50] },
    // Bolt tips: 5/150, split out of 91
    {
      table: [
        { name: 'Diamond bolt tips', p: per(25, 91), qty: [25, 30] },
        { name: 'Emerald bolt tips', p: per(20, 91), qty: [25, 30] },
        { name: 'Ruby bolt tips', p: per(20, 91), qty: [25, 30] },
        { name: 'Dragonstone bolt tips', p: per(14, 91), qty: [25, 30] },
        { name: 'Onyx bolt tips', p: per(7, 91), qty: [25, 30] },
        { name: 'Sapphire bolt tips', p: per(5, 91), qty: [25, 30] },
      ],
      p: per(5, 150),
    },
    // Seeds: the tree-herb seed table plus its own torstol and snapdragon slots
    { table: 'treeHerbSeed', p: per(3, 150) },
    { name: 'Torstol seed', p: per(1, 150) },
    { name: 'Snapdragon seed', p: per(1, 150) },
    // Shark drop table
    { table: sharkTable([35, 55]), p: per(4, 150) },
    // Other
    { name: 'Adamantite ore', p: per(7, 150), qty: [10, 30] },
    { name: 'Coins', p: per(5, 150), qty: [20000, 80000] },
    { name: 'Grapes', p: per(5, 150), qty: [250, 300] },
    { name: 'Magic logs', p: per(5, 150), qty: 50 },
    { name: 'Dragon bones', p: per(4, 150), qty: [15, 20] },
    { name: 'Diamond', p: per(4, 150), qty: [10, 20] },
    { name: 'Dragonstone', p: per(3, 150), qty: [2, 3] },
    { name: 'Wrath talisman', p: per(3, 150) },
    // Rare drop table
    { table: 'rdt', p: per(5, 150) },
  ],
  tertiary: [
    { name: 'Scaly blue dragonhide', p: per(1, 10) },
    { name: "Vorkath's head", p: per(1, 50), unique: true },
    brimstoneKey(50),
    clue('elite', 65),
    { name: 'Dragonbone necklace', p: per(1, 1000), unique: true },
    { name: 'Jar of Decay', p: per(1, 3000), unique: true },
    { name: 'Draconic visage', p: per(1, 5000), unique: true },
    { name: 'Skeletal visage', p: per(1, 5000), unique: true },
  ],
  pet: { name: 'Vorki', p: per(1, 3000) },
  summary: () =>
    "The post-quest Vorkath. Vorkath's head guaranteed on your 50th kill isn't modelled, only its 1/50 rate.",
};

// ----- The Nightmare -----

const NM_ARMOUR = [
  { name: 'Nightmare staff', p: per(1, 300) },
  { name: "Inquisitor's great helm", p: per(1, 420) },
  { name: "Inquisitor's hauberk", p: per(1, 420) },
  { name: "Inquisitor's plateskirt", p: per(1, 420) },
  { name: "Inquisitor's mace", p: per(1, 750) },
];
const NM_ORBS = [
  { name: 'Eldritch orb', p: per(1, 960) },
  { name: 'Harmonised orb', p: per(1, 960) },
  { name: 'Volatile orb', p: per(1, 960) },
];
// Chance both unique tables roll a second time: (party − 5)%, 0-75%.
const nmSecond = (v) => Math.min(75, Math.max(0, Math.min(v.party, 80) - 5)) / 100;
const nmShare = (v) => (v.party <= 1 ? 1 : Math.min(100, Math.max(1, v.share)) / 100);
const nmQty = ([a, b]) => (v, rng) => (a + Math.floor(rng() * (b - a + 1))) * (v.mvp ? 1.1 : 1);

const theNightmare = {
  id: 'the-nightmare',
  name: 'The Nightmare',
  short: 'Nightmare',
  category: 'other',
  wiki: 'The Nightmare',
  tagline: 'A 1/83 armour and staff table and a 1/320 orb table per kill, better in big parties, and a Little Nightmare from 1/800.',
  inputs: [
    { key: 'party', label: 'Party size', type: 'range', default: 1, min: 1, max: 80, step: 1 },
    {
      key: 'share',
      label: 'Your damage share (%)',
      type: 'range',
      default: 100,
      min: 1,
      max: 100,
      step: 1,
      hint: 'Uniques go to a player weighted by damage dealt. Solo is always 100%.',
    },
    { key: 'mvp', label: 'MVP', type: 'check', default: true, hint: 'Most damage: big bones, +10% common loot and +5% tertiaries.' },
  ],
  always: [{ name: 'Bones', p: 1 }],
  main: [
    // Runes and ammunition
    { name: 'Cosmic rune', p: per(4, 100), qty: nmQty([11, 242]) },
    { name: 'Nature rune', p: per(4, 100), qty: nmQty([8, 176]) },
    { name: 'Death rune', p: per(4, 100), qty: nmQty([7, 176]) },
    { name: 'Blood rune', p: per(4, 100), qty: nmQty([16, 440]) },
    { name: 'Soul rune', p: per(4, 100), qty: nmQty([8, 132]) },
    { name: 'Steel cannonball', p: per(4, 100), qty: nmQty([6, 220]) },
    { name: 'Rune arrow', p: per(3, 100), qty: nmQty([31, 547]) },
    // Resources
    { name: 'Mithril ore', p: per(4, 100), qty: nmQty([11, 176]) },
    { name: 'Coal', p: per(4, 100), qty: nmQty([15, 264]) },
    { name: 'Gold ore', p: per(4, 100), qty: nmQty([9, 176]) },
    { name: 'Adamantite ore', p: per(4, 100), qty: nmQty([40, 95]) },
    { name: 'Magic logs', p: per(4, 100), qty: nmQty([1, 55]) },
    { name: 'Grimy cadantine', p: per(4, 100), qty: nmQty([1, 16]) },
    { name: 'Grimy torstol', p: per(4, 100), qty: nmQty([1, 16]) },
    { name: 'Snapdragon seed', p: per(3, 100), qty: nmQty([1, 7]) },
    { name: 'Uncut emerald', p: per(3, 100), qty: nmQty([2, 44]) },
    { name: 'Uncut ruby', p: per(3, 100), qty: nmQty([27, 60]) },
    { name: 'Runite ore', p: per(2, 100), qty: nmQty([1, 16]) },
    // Consumables
    { name: 'Bass', p: per(6, 100), qty: nmQty([1, 18]) },
    { name: 'Shark', p: per(6, 100), qty: nmQty([1, 16]) },
    { name: 'Prayer potion(3)', p: per(5, 100), qty: nmQty([1, 10]) },
    { name: 'Sanfew serum(3)', p: per(5, 100), qty: nmQty([1, 8]) },
    { name: 'Saradomin brew(3)', p: per(5, 100), qty: nmQty([1, 10]) },
    { name: 'Zamorak brew(3)', p: per(5, 100), qty: nmQty([1, 10]) },
    // Coins
    { name: 'Coins', p: per(2, 100), qty: nmQty([2291, 43958]) },
  ],
  tertiary: [
    { name: 'Big bones', p: (v) => (v.mvp ? 1 : 0) },
    { name: 'Clue scroll (elite)', p: (v) => (v.mvp ? per(1, 190) : per(1, 200)) },
    { name: 'Jar of Dreams', p: (v) => (v.mvp ? per(1, 1900) : per(1, 2000)), unique: true },
  ],
  // The two unique tables are rolled once per kill (twice with the party
  // bonus) and each item goes to a player weighted by damage.
  special: (v, rng, add) => {
    const share = nmShare(v);
    const times = rng() < nmSecond(v) ? 2 : 1;
    for (let i = 0; i < times; i++) {
      for (const table of [NM_ARMOUR, NM_ORBS]) {
        let r = rng();
        for (const e of table) {
          r -= e.p;
          if (r < 0) {
            if (rng() < share) add(e.name, 1, true);
            break;
          }
        }
      }
    }
  },
  specialUniques: (v) => {
    const share = nmShare(v);
    const s = nmSecond(v);
    return [...NM_ARMOUR, ...NM_ORBS].map((e) => [e.name, 1 - (1 - e.p * share) * (1 - s * e.p * share)]);
  },
  pet: {
    name: 'Little Nightmare',
    p: (v) => {
      const team = Math.max(1, v.party);
      return per(1, 800 * Math.min(team, 5)) * (v.mvp && team >= 5 ? 1.05 : 1);
    },
  },
  summary: (v) =>
    `With ${v.party} in the party, both unique tables roll a second time ${Math.round(nmSecond(v) * 100)}% of the time. ` +
    "Each unique goes to you with your damage share. Common quantities use the wiki's full ranges, which in the game grow with the damage you deal.",
};

// ----- Phosani's Nightmare -----

const phosanisNightmare = {
  id: 'phosanis-nightmare',
  name: "Phosani's Nightmare",
  short: 'Phosani',
  category: 'other',
  wiki: "Phosani's Nightmare",
  tagline: 'A 1/140 armour and staff table, a 1/533 orb table, a 1/200 parasitic egg, and a 1/1400 Little Nightmare.',
  always: [{ name: 'Big bones', p: 1 }],
  // The wiki's weights add up to 101, so they're read out of 101.
  main: [
    // Runes and ammunition
    { name: 'Cosmic rune', p: per(4, 101), qty: [247, 420] },
    { name: 'Nature rune', p: per(4, 101), qty: [165, 305] },
    { name: 'Death rune', p: per(4, 101), qty: [165, 305] },
    { name: 'Blood rune', p: per(4, 101), qty: [343, 765] },
    { name: 'Soul rune', p: per(4, 101), qty: [110, 228] },
    { name: 'Steel cannonball', p: per(4, 101), qty: [137, 382] },
    { name: 'Rune arrow', p: per(3, 101), qty: [412, 957] },
    // Resources
    { name: 'Mithril ore', p: per(5, 101), qty: [165, 305] },
    { name: 'Coal', p: per(4, 101), qty: [220, 458] },
    { name: 'Gold ore', p: per(4, 101), qty: [165, 305] },
    { name: 'Adamantite ore', p: per(4, 101), qty: [40, 95] },
    { name: 'Magic logs', p: per(4, 101), qty: [40, 95] },
    { name: 'Grimy cadantine', p: per(4, 101), qty: [13, 26] },
    { name: 'Grimy torstol', p: per(4, 101), qty: [13, 26] },
    { name: 'Snapdragon seed', p: per(3, 101), qty: [5, 10] },
    { name: 'Uncut emerald', p: per(3, 101), qty: [33, 75] },
    { name: 'Uncut ruby', p: per(3, 101), qty: [27, 60] },
    { name: 'Runite ore', p: per(2, 101), qty: [11, 26] },
    // Consumables
    { name: 'Bass', p: per(6, 101), qty: [16, 29] },
    { name: 'Shark', p: per(6, 101), qty: [13, 26] },
    { name: 'Prayer potion(3)', p: per(5, 101), qty: [8, 15] },
    { name: 'Sanfew serum(3)', p: per(5, 101), qty: [6, 12] },
    { name: 'Saradomin brew(3)', p: per(5, 101), qty: [8, 15] },
    { name: 'Zamorak brew(3)', p: per(5, 101), qty: [8, 15] },
    // Coins
    { name: 'Coins', p: per(2, 101), qty: [41417, 74500] },
  ],
  extra: [
    // Armour and staff table, 1/140: mace 1/10, each armour piece 2/10,
    // staff 3/10 (8% of staffs turn into a mace).
    [
      { name: 'Nightmare staff', p: per(69, 35000), unique: true },
      { name: "Inquisitor's great helm", p: per(1, 700), unique: true },
      { name: "Inquisitor's hauberk", p: per(1, 700), unique: true },
      { name: "Inquisitor's plateskirt", p: per(1, 700), unique: true },
      { name: "Inquisitor's mace", p: per(31, 35000), unique: true },
    ],
    // Orb table, 3/1600.
    [
      { name: 'Eldritch orb', p: per(1, 1600), unique: true },
      { name: 'Harmonised orb', p: per(1, 1600), unique: true },
      { name: 'Volatile orb', p: per(1, 1600), unique: true },
    ],
  ],
  tertiary: [
    clue('elite', 35),
    { name: 'Slepey tablet', p: per(1, 25), unique: true },
    { name: 'Parasitic egg', p: per(1, 200), unique: true },
    { name: 'Jar of Dreams', p: per(1, 4000), unique: true },
  ],
  pet: { name: 'Little Nightmare', p: per(1, 1400) },
  summary: () =>
    "The wiki's common weights add up to 101 rather than 100, so they're read out of 101. The Slepey tablet guaranteed on your 25th kill isn't modelled.",
};

// ----- Phantom Muspah -----

const MUSPAH_UNIQUE = [
  { name: 'Ancient essence', p: per(60, 100), qty: [540, 599] },
  { name: 'Ancient essence', p: per(23, 100), qty: (v, rng) => 885 + 5 * Math.floor(rng() * 23) },
  { name: 'Ancient essence', p: per(10, 100), qty: (v, rng) => 1970 + 10 * Math.floor(rng() * 10) },
  { name: 'Frozen cache', p: per(4, 100) },
  { name: 'Ancient icon', p: per(2, 100), unique: true },
  { name: 'Venator shard', p: per(1, 100), unique: true },
];

const MUSPAH_SEEDS = SHARED_TABLES.treeHerbSeed.map((e) => ({
  ...e,
  qty: e.name === 'Watermelon seed' ? 49 : 3,
}));

const MUSPAH_MAIN = [
  // Weapons and armour
  { name: 'Rune kiteshield', p: per(10, 235), qty: 3 },
  { name: 'Dragon plateskirt', p: per(5, 235) },
  { name: 'Rune platelegs', p: per(5, 235), qty: 3 },
  { name: "Black d'hide body", p: per(5, 235) },
  { name: 'Dragon platelegs', p: per(4, 235), qty: 2 },
  { name: 'Rune shortsword', p: per(1, 235) },
  // Runes and ammunition
  { name: 'Law rune', p: per(10, 235), qty: 146 },
  { name: 'Soul rune', p: per(10, 235), qty: 380 },
  { name: 'Death rune', p: per(10, 235), qty: 428 },
  { name: 'Smoke rune', p: per(15, 235), qty: 314 },
  { name: 'Chaos rune', p: per(5, 235), qty: 480 },
  { name: 'Fire rune', p: per(5, 235), qty: 1964 },
  { name: 'Steel cannonball', p: per(5, 235), qty: 670 },
  // Herbs
  { name: 'Grimy toadflax', p: per(3, 235), qty: 40 },
  {
    table: [
      { name: 'Grimy kwuarm', p: per(5, 16), qty: 6 },
      { name: 'Grimy dwarf weed', p: per(4, 16), qty: 6 },
      { name: 'Grimy cadantine', p: per(4, 16), qty: 6 },
      { name: 'Grimy lantadyme', p: per(3, 16), qty: 6 },
    ],
    p: per(5, 235),
  },
  // Seeds
  { name: 'Yew seed', p: per(5, 235), qty: 2 },
  { name: 'Torstol seed', p: per(5, 235), qty: 2 },
  { name: 'Palm tree seed', p: per(5, 235), qty: 2 },
  { name: 'Ranarr seed', p: per(5, 235), qty: 3 },
  { name: 'Snapdragon seed', p: per(4, 235), qty: 5 },
  { name: 'Ranarr seed', p: per(3, 235), qty: 5 },
  { name: 'Spirit seed', p: per(2, 235) },
  { table: MUSPAH_SEEDS, p: per(5, 235) },
  // Resources
  { name: 'Adamantite ore', p: per(10, 235), qty: 22 },
  { name: 'Gold ore', p: per(10, 235), qty: 180 },
  { name: 'Teak plank', p: per(10, 235), qty: 22 },
  { name: 'Molten glass', p: per(15, 235), qty: 89 },
  { name: 'Pure essence', p: per(5, 235), qty: 2314 },
  { name: 'Coal', p: per(5, 235), qty: 163 },
  { name: 'Runite ore', p: per(3, 235), qty: 18 },
  { name: 'Silver ore', p: per(2, 235), qty: 101 },
  { name: 'Water orb', p: per(15, 235), qty: 21 },
  { name: 'Dragon bolts (unf)', p: per(10, 235), qty: 89 },
  { name: 'Limpwurt root', p: per(3, 235), qty: 21 },
  // Shark drop table
  { table: sharkTable(28), p: per(10, 235) },
  // Rare drop table
  { table: 'rdt', p: per(5, 235) },
];

// One of each pair, replacing one of the two main rolls.
const MUSPAH_SUPPLIES = [
  [{ name: 'Shark', qty: [4, 6] }, { name: 'Summer pie', qty: [4, 6] }],
  [{ name: 'Ancient brew(3)', qty: [1, 2] }, { name: 'Ranging potion(3)', qty: [1, 3] }],
  [{ name: 'Super restore(3)', qty: [2, 3] }, { name: 'Prayer potion(3)', qty: [2, 3] }],
];

const phantomMuspah = {
  id: 'phantom-muspah',
  name: 'Phantom Muspah',
  short: 'Muspah',
  category: 'other',
  wiki: 'Phantom Muspah',
  tagline: 'A 1/100 Venator shard, a 1/50 Ancient icon, ancient essence every kill, and a 1/2500 Muphin.',
  inputs: [KONAR],
  rolls: 0,
  // The unique roll, then (unless it's a Venator shard) two main rolls, one
  // of which turns into three supply drops 2/9 of the time.
  special: (v, rng, add) => {
    let r = rng();
    let hit = null;
    for (const e of MUSPAH_UNIQUE) {
      r -= e.p;
      if (r < 0) { hit = e; break; }
    }
    if (hit) add(hit.name, qtyRoll(hit.qty, v, rng), !!hit.unique);
    if (hit?.name === 'Venator shard') return;
    let rolls = 2;
    if (rng() < per(2, 9)) {
      rolls = 1;
      for (const pair of MUSPAH_SUPPLIES) {
        const it = pair[rng() < 0.5 ? 0 : 1];
        add(it.name, qtyRoll(it.qty, v, rng), false);
      }
    }
    for (let i = 0; i < rolls; i++) rollInto(MUSPAH_MAIN, v, rng, add);
  },
  specialUniques: () => [
    ['Ancient icon', per(2, 100)],
    ['Venator shard', per(1, 100)],
  ],
  tertiary: [brimstoneKey(50), clue('hard', 30), clue('elite', 45)],
  pet: { name: 'Muphin', p: per(1, 2500) },
  summary: () =>
    'A Venator shard replaces all the other loot. Charged ice, a reward for kills under three minutes, is left out.',
};

// ----- Scurrius -----

const MVP = (v) => v.mvp;
const scurrius = {
  id: 'scurrius',
  name: 'Scurrius',
  short: 'Scurrius',
  category: 'other',
  wiki: 'Scurrius',
  tagline: "A 1/33 Scurrius' spine and a 1/3000 Scurry for the top damage dealer.",
  inputs: [
    {
      key: 'mvp',
      label: 'Most damage (MVP or solo)',
      type: 'check',
      default: true,
      hint: 'Only the top damage dealer rolls the full table, the pet and the clue.',
    },
  ],
  always: [{ name: 'Big bones', p: 1 }],
  main: [
    {
      table: [
        // Weapons and armour
        { name: 'Adamant platebody', p: per(6, 100) },
        { name: 'Rune med helm', p: per(6, 100) },
        { name: 'Rune full helm', p: per(6, 100) },
        { name: 'Rune sq shield', p: per(6, 100) },
        { name: 'Rune chainbody', p: per(6, 100) },
        { name: 'Rune battleaxe', p: per(6, 100) },
        // Runes and ammunition
        { name: 'Adamant arrow', p: per(6, 100), qty: [20, 50] },
        { name: 'Rune arrow', p: per(6, 100), qty: [20, 50] },
        { name: 'Chaos rune', p: per(6, 100), qty: [70, 125] },
        { name: 'Death rune', p: per(3, 100), qty: [40, 90] },
        { name: 'Law rune', p: per(3, 100), qty: [10, 30] },
        // Consumables
        { name: 'Trout', p: per(6, 100), qty: [1, 3] },
        { name: 'Tuna', p: per(6, 100), qty: [1, 3] },
        { name: 'Shark', p: per(3, 100) },
        { name: 'Lobster', p: per(6, 100), qty: [1, 3] },
        { name: 'Ranging potion(1)', p: per(3, 100) },
        { name: 'Super strength(1)', p: per(3, 100) },
        { name: 'Cheese', p: per(1, 100) },
        { name: 'Prayer potion(4)', p: per(6, 100) },
        // Other
        { name: 'Coins', p: per(6, 100), qty: [1000, 9000] },
      ],
      p: (v) => (MVP(v) ? 1 : 0),
    },
    {
      // The wiki's non-MVP table adds up to 32/33.
      table: [
        { name: 'Adamant arrow', p: per(3, 33), qty: [20, 35] },
        { name: 'Rune arrow', p: per(3, 33), qty: [20, 35] },
        { name: 'Chaos rune', p: per(3, 33), qty: [40, 70] },
        { name: 'Death rune', p: per(3, 33), qty: [30, 50] },
        { name: 'Law rune', p: per(3, 33), qty: [5, 15] },
        { name: 'Trout', p: per(3, 33), qty: [1, 3] },
        { name: 'Tuna', p: per(3, 33), qty: [1, 3] },
        { name: 'Lobster', p: per(3, 33), qty: [1, 3] },
        { name: 'Shark', p: per(1, 33) },
        { name: 'Ranging potion(1)', p: per(3, 33) },
        { name: 'Super strength(1)', p: per(3, 33) },
        { name: 'Cheese', p: per(1, 33) },
      ],
      p: (v) => (MVP(v) ? 0 : 1),
    },
  ],
  tertiary: [
    { name: 'Raw rat meat', p: (v) => (MVP(v) ? 1 : 0) },
    { name: 'Clue scroll (medium)', p: (v) => (MVP(v) ? per(1, 25) : 0) },
    { name: "Scurrius' spine", p: per(1, 33), unique: true },
    bones((v) => (MVP(v) ? 1 : 0)),
  ],
  pet: { name: 'Scurry', p: (v) => (MVP(v) ? per(1, 3000) : 0) },
  summary: (v) =>
    (v.mvp ? '' : "Without the most damage there's no pet, clue or bones beyond the big bones. ") +
    'Only one player can get the spine per kill; this shows your own roll.',
};

// ----- Obor -----

// Obor rolls the general seed table at combat level 106: a number from 0 to
// 1,059 picks one of six seed tables.
const OBOR_SEEDS = [
  {
    table: [
      { name: 'Potato seed', p: per(368, 1008), qty: 4 },
      { name: 'Onion seed', p: per(276, 1008), qty: 4 },
      { name: 'Cabbage seed', p: per(184, 1008), qty: 4 },
      { name: 'Tomato seed', p: per(92, 1008), qty: 3 },
      { name: 'Sweetcorn seed', p: per(46, 1008), qty: 3 },
      { name: 'Strawberry seed', p: per(23, 1008), qty: 2 },
      { name: 'Watermelon seed', p: per(11, 1008), qty: 2 },
      { name: 'Snape grass seed', p: per(8, 1008), qty: 2 },
    ],
    p: per(485, 1060),
  },
  {
    table: [
      { name: 'Barley seed', p: per(229, 1000), qty: 4 },
      { name: 'Hammerstone seed', p: per(228, 1000), qty: 3 },
      { name: 'Asgarnian seed', p: per(172, 1000), qty: 3 },
      { name: 'Jute seed', p: per(171, 1000), qty: 2 },
      { name: 'Yanillian seed', p: per(114, 1000), qty: 2 },
      { name: 'Krandorian seed', p: per(57, 1000), qty: 2 },
      { name: 'Wildblood seed', p: per(29, 1000) },
    ],
    p: per(243, 1060),
  },
  {
    table: [
      { name: 'Marigold seed', p: per(376, 1000) },
      { name: 'Nasturtium seed', p: per(249, 1000) },
      { name: 'Rosemary seed', p: per(161, 1000) },
      { name: 'Woad seed', p: per(119, 1000) },
      { name: 'Limpwurt seed', p: per(95, 1000) },
    ],
    p: per(122, 1060),
  },
  {
    table: [
      { name: 'Redberry seed', p: per(400, 1000) },
      { name: 'Cadavaberry seed', p: per(280, 1000) },
      { name: 'Dwellberry seed', p: per(200, 1000) },
      { name: 'Jangerberry seed', p: per(80, 1000) },
      { name: 'Whiteberry seed', p: per(29, 1000) },
      { name: 'Poison ivy seed', p: per(11, 1000) },
    ],
    p: per(97, 1060),
  },
  {
    table: [
      { name: 'Guam seed', p: per(320, 1000) },
      { name: 'Marrentill seed', p: per(218, 1000) },
      { name: 'Tarromin seed', p: per(149, 1000) },
      { name: 'Harralander seed', p: per(101, 1000) },
      { name: 'Ranarr seed', p: per(69, 1000) },
      { name: 'Toadflax seed', p: per(47, 1000) },
      { name: 'Irit seed', p: per(32, 1000) },
      { name: 'Avantoe seed', p: per(22, 1000) },
      { name: 'Kwuarm seed', p: per(15, 1000) },
      { name: 'Snapdragon seed', p: per(10, 1000) },
      { name: 'Cadantine seed', p: per(7, 1000) },
      { name: 'Lantadyme seed', p: per(5, 1000) },
      { name: 'Dwarf weed seed', p: per(3, 1000) },
      { name: 'Torstol seed', p: per(2, 1000) },
    ],
    p: per(48, 1060),
  },
  {
    table: [
      { name: 'Mushroom spore', p: per(500, 1100) },
      { name: 'Belladonna seed', p: per(300, 1100) },
      { name: 'Cactus seed', p: per(200, 1100) },
      { name: 'Potato cactus seed', p: per(100, 1100) },
    ],
    p: per(65, 1060),
  },
];

const OBOR_CHEST = [
  // Uniques
  { name: 'Hill giant club', p: per(1, 118), unique: true },
  // Weapons and armour
  { name: 'Rune kiteshield', p: per(3, 118) },
  { name: 'Rune full helm', p: per(5, 118) },
  { name: 'Rune med helm', p: per(6, 118) },
  { name: 'Rune chainbody', p: per(3, 118) },
  { name: 'Rune platelegs', p: per(3, 118) },
  { name: 'Rune plateskirt', p: per(3, 118) },
  { name: 'Rune battleaxe', p: per(4, 118) },
  { name: 'Rune longsword', p: per(5, 118) },
  { name: 'Rune 2h sword', p: per(3, 118) },
  // Runes
  { name: 'Law rune', p: per(12, 118), qty: [50, 99] },
  { name: 'Cosmic rune', p: per(12, 118), qty: [60, 119] },
  { name: 'Chaos rune', p: per(10, 118), qty: [100, 199] },
  { name: 'Death rune', p: per(10, 118), qty: [40, 79] },
  { name: 'Nature rune', p: per(7, 118), qty: [40, 79] },
  // Other
  { name: 'Coins', p: per(6, 118), qty: [10000, 15000] },
  { name: 'Coins', p: per(4, 118), qty: [12000, 20000] },
  { name: 'Limpwurt root', p: per(8, 118), qty: 20 },
  { name: 'Big bones', p: per(8, 118), qty: 50 },
  { items: [{ name: 'Uncut ruby', qty: 5 }, { name: 'Uncut diamond', qty: 5 }], p: per(5, 118) },
];

const CHEST = (v) => v.chest;

const obor = {
  id: 'obor',
  emblemItem: "Hill giant club",
  name: 'Obor',
  short: 'Obor',
  category: 'other',
  wiki: 'Obor',
  tagline: "The hill giant boss: open his chest with a giant key for a 1/118 Hill giant club.",
  inputs: [
    { key: 'chest', label: 'Open the chest', type: 'check', default: true, hint: 'Use a giant key on the chest after the kill.' },
  ],
  always: [{ name: 'Giant bones', p: 1 }],
  main: [
    // Weapons and armour
    { name: 'Iron full helm', p: per(5, 135) },
    { name: 'Iron dagger', p: per(4, 135) },
    { name: 'Iron kiteshield', p: per(3, 135) },
    { name: 'Steel longsword', p: per(2, 135) },
    // Runes and ammunition
    { name: 'Iron arrow', p: per(6, 135), qty: 3 },
    { name: 'Fire rune', p: per(3, 135), qty: 15 },
    { name: 'Water rune', p: per(3, 135), qty: 7 },
    { name: 'Law rune', p: per(3, 135), qty: 2 },
    { name: 'Steel arrow', p: per(2, 135), qty: 10 },
    { name: 'Mind rune', p: per(2, 135), qty: 3 },
    { name: 'Cosmic rune', p: per(2, 135), qty: 2 },
    { name: 'Nature rune', p: per(2, 135), qty: 6 },
    { name: 'Chaos rune', p: per(1, 135), qty: 2 },
    { name: 'Death rune', p: per(1, 135), qty: 2 },
    // Herbs and seeds
    { table: 'herb', p: per(7, 135) },
    { table: OBOR_SEEDS, p: per(18, 135) },
    // Coins
    { name: 'Coins', p: per(14, 135), qty: 38 },
    { name: 'Coins', p: per(10, 135), qty: 52 },
    { name: 'Coins', p: per(8, 135), qty: 15 },
    { name: 'Coins', p: per(6, 135), qty: 8 },
    { name: 'Coins', p: per(2, 135), qty: 88 },
    // Other
    { name: 'Limpwurt root', p: per(11, 135) },
    { name: 'Beer', p: per(6, 135) },
    { name: 'Body talisman', p: per(2, 135) },
    // Gem drop table
    { table: 'gem', p: per(3, 135) },
  ],
  // The chest, opened once after the kill with a giant key.
  extra: [[{ table: OBOR_CHEST, p: (v) => (CHEST(v) ? 1 : 0) }]],
  tertiary: [
    { name: 'Giant key', p: per(1, 16) },
    { name: 'Ensouled giant head', p: per(1, 25) },
    clue('beginner', 50),
    bones(),
    { name: 'Giant champion scroll', p: per(1, 5000) },
    // From the chest
    { name: 'Clue scroll (beginner)', p: (v) => (CHEST(v) ? 1 : 0) },
    { name: 'Ensouled giant head', p: (v) => (CHEST(v) ? 1 : 0) },
    { name: 'Giant key', p: (v) => (CHEST(v) ? per(1, 16) : 0) },
  ],
  summary: (v) =>
    (v.chest ? 'One kill here is Obor plus his chest. ' : '') +
    "The members' world tables. Obor's own table adds up to 127/135 on the wiki; the rest is nothing.",
};

// ----- Bryophyta -----

const BRYOPHYTA_CHEST = [
  // Weapons and armour
  { name: 'Rune longsword', p: per(6, 118) },
  { name: 'Rune med helm', p: per(6, 118), qty: 2 },
  { name: 'Rune chainbody', p: per(6, 118) },
  { name: 'Rune plateskirt', p: per(6, 118) },
  { name: 'Rune platelegs', p: per(6, 118) },
  { name: 'Rune sq shield', p: per(6, 118) },
  { name: 'Rune shortsword', p: per(5, 118), qty: 2 },
  { name: 'Adamant platebody', p: per(3, 118), qty: 5 },
  { name: 'Battlestaff', p: per(3, 118), qty: 3 },
  { name: 'Adamant kiteshield', p: per(1, 118), qty: 3 },
  // Runes and ammunition
  { name: 'Nature rune', p: per(8, 118), qty: 100 },
  { name: 'Cosmic rune', p: per(6, 118), qty: 100 },
  { name: 'Law rune', p: per(6, 118), qty: 100 },
  { name: 'Death rune', p: per(5, 118), qty: 100 },
  { name: 'Chaos rune', p: per(6, 118), qty: 200 },
  { name: 'Chaos rune', p: per(5, 118), qty: 100 },
  { name: 'Blood rune', p: per(1, 118), qty: 100 },
  { name: 'Adamant arrow', p: per(1, 118), qty: 100 },
  // Herbs and seeds
  { table: 'herb', p: per(5, 118) },
  { table: 'uncommonSeed', p: per(6, 118) },
  // Materials
  { name: 'Runite bar', p: per(6, 118), qty: 2 },
  { items: [{ name: 'Uncut ruby', qty: 5 }, { name: 'Uncut diamond', qty: 5 }], p: per(4, 118) },
  { name: 'Steel bar', p: per(3, 118), qty: 25 },
  // Other
  { name: 'Coins', p: per(5, 118), qty: 10000 },
  { name: 'Coins', p: per(2, 118), qty: 8000 },
  { name: "Bryophyta's essence", p: per(1, 118), unique: true },
];

const bryophyta = {
  id: 'bryophyta',
  emblemItem: "Bryophyta's essence",
  name: 'Bryophyta',
  short: 'Bryophyta',
  category: 'other',
  wiki: 'Bryophyta',
  tagline: "The moss giant boss: open her chest with a mossy key for a 1/118 Bryophyta's essence.",
  inputs: [
    { key: 'chest', label: 'Open the chest', type: 'check', default: true, hint: 'Use a mossy key on the chest after the kill.' },
  ],
  always: [{ name: 'Giant bones', p: 1 }],
  main: [
    // Weapons and armour
    { name: 'Black sq shield', p: per(5, 128) },
    { name: 'Magic staff', p: per(2, 128) },
    { name: 'Steel med helm', p: per(2, 128) },
    { name: 'Mithril shortsword', p: per(2, 128) },
    { name: 'Mithril spear', p: per(2, 128) },
    { name: 'Steel kiteshield', p: per(1, 128) },
    // Runes and ammunition
    { name: 'Law rune', p: per(4, 128), qty: 3 },
    { name: 'Air rune', p: per(3, 128), qty: 18 },
    { name: 'Earth rune', p: per(3, 128), qty: 27 },
    { name: 'Chaos rune', p: per(3, 128), qty: 7 },
    { name: 'Nature rune', p: per(3, 128), qty: 6 },
    { name: 'Cosmic rune', p: per(2, 128), qty: 3 },
    { name: 'Iron arrow', p: per(2, 128), qty: 15 },
    { name: 'Steel arrow', p: per(1, 128), qty: 30 },
    { name: 'Death rune', p: per(1, 128), qty: 3 },
    { name: 'Blood rune', p: per(1, 128) },
    // Herbs and seeds
    { table: 'herb', p: per(5, 128) },
    { table: 'uncommonSeed', p: per(35, 128) },
    // Coins
    { name: 'Coins', p: per(19, 128), qty: 37 },
    { name: 'Coins', p: per(8, 128), qty: 2 },
    { name: 'Coins', p: per(10, 128), qty: 119 },
    { name: 'Coins', p: per(2, 128), qty: 300 },
    // Other
    { name: 'Steel bar', p: per(6, 128) },
    { name: 'Coal', p: per(1, 128) },
    { name: 'Spinach roll', p: per(1, 128) },
    // Gem drop table
    { table: 'gem', p: per(4, 128) },
  ],
  extra: [[{ table: BRYOPHYTA_CHEST, p: (v) => (CHEST(v) ? 1 : 0) }]],
  tertiary: [
    { name: 'Ensouled giant head', p: per(1, 24) },
    clue('beginner', 45),
    { name: 'Mossy key', p: per(1, 16) },
    bones(),
    { name: 'Giant champion scroll', p: per(1, 5000) },
    // From the chest
    { name: 'Clue scroll (beginner)', p: (v) => (CHEST(v) ? 1 : 0) },
    { name: 'Mossy key', p: (v) => (CHEST(v) ? per(1, 16) : 0) },
  ],
  summary: (v) =>
    (v.chest ? 'One kill here is Bryophyta plus her chest. ' : '') +
    "The members' world tables. The mossy key is 1/8 instead of 1/16 on a moss giant slayer task; that isn't modelled.",
};

// ----- Skotizo -----

const skotizo = {
  id: 'skotizo',
  name: 'Skotizo',
  short: 'Skotizo',
  category: 'other',
  wiki: 'Skotizo',
  tagline: 'A 1/25 Dark claw, a 1/65 Skotos, a 1/200 Jar of Darkness, and a 1/1000 Uncut onyx.',
  inputs: [KONAR],
  always: [
    { name: 'Infernal ashes', p: 1 },
    { name: 'Clue scroll (hard)', p: 1 },
  ],
  main: [
    // Gemstones: 1/100, split 9:1
    {
      table: [
        { name: 'Uncut dragonstone', p: per(9, 10), qty: 10 },
        { name: 'Uncut onyx', p: per(1, 10), unique: true },
      ],
      p: per(1, 100),
    },
    // Armour
    { name: 'Rune platebody', p: per(7, 100), qty: 3 },
    { name: 'Rune platelegs', p: per(7, 100), qty: 3 },
    { name: 'Rune plateskirt', p: per(7, 100), qty: 3 },
    // Runes
    { name: 'Death rune', p: per(7, 100), qty: 500 },
    { name: 'Soul rune', p: per(7, 100), qty: 450 },
    { name: 'Blood rune', p: per(7, 100), qty: 450 },
    // Resources
    { name: 'Adamantite ore', p: per(7, 100), qty: 75 },
    { name: 'Grimy snapdragon', p: per(7, 100), qty: 20 },
    { name: 'Grimy torstol', p: per(7, 100), qty: 20 },
    { name: 'Raw anglerfish', p: per(7, 100), qty: 60 },
    { name: 'Runite bar', p: per(7, 100), qty: 20 },
    // Other
    { name: 'Mahogany plank', p: per(7, 100), qty: 150 },
    { name: 'Battlestaff', p: per(7, 100), qty: 25 },
    { name: 'Onyx bolt tips', p: per(7, 100), qty: 40 },
    { name: 'Shield left half', p: per(1, 100) },
  ],
  // Ancient shards: always 1 to 5.
  extra: [
    [
      { name: 'Ancient shard', p: per(75, 100) },
      { name: 'Ancient shard', p: per(15, 100), qty: 2 },
      { name: 'Ancient shard', p: per(5, 100), qty: 3 },
      { name: 'Ancient shard', p: per(4, 100), qty: 4 },
      { name: 'Ancient shard', p: per(1, 100), qty: 5 },
    ],
  ],
  tertiary: [
    clue('elite', 5),
    { name: 'Ensouled demon head', p: per(1, 10) },
    { name: 'Dark claw', p: per(1, 25), unique: true },
    brimstoneKey(56),
    // Dark totems: a whole one 1/4, otherwise the piece you hold fewest of.
    {
      table: [
        { name: 'Dark totem', p: per(1, 4), unique: true },
        { set: ['Dark totem base', 'Dark totem middle', 'Dark totem top'], ordered: true, p: per(3, 4) },
      ],
      p: per(4, 128),
    },
    { name: 'Jar of Darkness', p: per(1, 200), unique: true },
  ],
  pet: { name: 'Skotos', p: per(1, 65) },
  summary: () =>
    'Totem pieces come in whichever you hold fewest of (base, then middle, then top on ties). The guaranteed hard clue is included.',
};

// ----- Hespori -----

const hespori = {
  id: 'hespori',
  name: 'Hespori',
  short: 'Hespori',
  category: 'other',
  wiki: 'Hespori',
  tagline: 'An anima seed every kill, a 1/35 Bottomless compost bucket, and a Tangleroot from 1/5375.',
  inputs: [
    { key: 'farming', label: 'Farming level', type: 'range', default: 99, min: 65, max: 99, step: 1, hint: 'Tangleroot is 1/(7000 − 25 × level).' },
  ],
  preroll: [{ name: 'Bottomless compost bucket', p: per(1, 35), unique: true }],
  main: [
    // Allotment seeds
    { name: 'Watermelon seed', p: per(2, 80), qty: [10, 20] },
    { name: 'Snape grass seed', p: per(2, 80), qty: [6, 16] },
    // Flower seeds
    { name: 'White lily seed', p: per(5, 80), qty: [8, 18] },
    { name: 'Limpwurt seed', p: per(2, 80), qty: [6, 14] },
    // Hop seeds
    { name: 'Wildblood seed', p: per(2, 80), qty: [10, 20] },
    // Bush seeds
    { name: 'Whiteberry seed', p: per(2, 80), qty: [10, 16] },
    { name: 'Poison ivy seed', p: per(2, 80), qty: [8, 16] },
    // Herb seeds
    { name: 'Irit seed', p: per(3, 80), qty: [2, 8] },
    { name: 'Avantoe seed', p: per(3, 80), qty: [2, 5] },
    { name: 'Kwuarm seed', p: per(3, 80), qty: [2, 5] },
    { name: 'Toadflax seed', p: per(3, 80), qty: [2, 5] },
    { name: 'Cadantine seed', p: per(3, 80), qty: [2, 5] },
    { name: 'Lantadyme seed', p: per(3, 80), qty: [2, 5] },
    { name: 'Dwarf weed seed', p: per(3, 80), qty: [2, 5] },
    { name: 'Ranarr seed', p: per(2, 80), qty: [1, 2] },
    { name: 'Snapdragon seed', p: per(2, 80) },
    { name: 'Torstol seed', p: per(2, 80) },
    // Tree seeds
    { name: 'Maple seed', p: per(4, 80), qty: [2, 4] },
    { name: 'Willow seed', p: per(3, 80), qty: [2, 5] },
    { name: 'Yew seed', p: per(2, 80) },
    { name: 'Magic seed', p: per(1, 80) },
    // Fruit tree seeds
    { name: 'Pineapple seed', p: per(3, 80), qty: [3, 6] },
    { name: 'Papaya tree seed', p: per(3, 80), qty: [1, 3] },
    { name: 'Palm tree seed', p: per(3, 80), qty: [1, 3] },
    { name: 'Dragonfruit tree seed', p: per(2, 80) },
    // Special seeds
    { name: 'Teak seed', p: per(4, 80), qty: [2, 5] },
    { name: 'Mahogany seed', p: per(3, 80), qty: [1, 3] },
    { name: 'Cactus seed', p: per(2, 80), qty: [4, 14] },
    { name: 'Potato cactus seed', p: per(2, 80), qty: [4, 14] },
    { name: 'Celastrus seed', p: per(2, 80) },
    { name: 'Spirit seed', p: per(1, 80) },
    { name: 'Redwood tree seed', p: per(1, 80) },
  ],
  // One anima seed every kill.
  extra: [
    [
      { name: 'Attas seed', p: per(1, 3), qty: [1, 2] },
      { name: 'Iasor seed', p: per(1, 3), qty: [1, 2] },
      { name: 'Kronos seed', p: per(1, 3), qty: [1, 2] },
    ],
  ],
  pet: { name: 'Tangleroot', p: (v) => 1 / (7000 - 25 * Math.min(99, Math.max(1, v.farming))) },
  summary: () =>
    'The bucket is checked before the seed table and takes its place. Anima seeds drop every kill, so they don\'t count as uniques here.',
};

// ----- The Mimic -----

// Elite: 1/250 for a 3rd age item (1/264 after a failed attempt), five
// attempts; master: 1/228 (1/240), six. The ring is six times as likely.
const MIMIC = {
  elite: { first: 250, later: 264, attempts: 5 },
  master: { first: 228, later: 240, attempts: 6 },
};
const mimicTier = (v) => (v.tier === 'master' ? MIMIC.master : MIMIC.elite);
const mimicAttempt = (v) => Math.min(Math.max(1, v.attempt), mimicTier(v).attempts);
const mimicDenom = (v) => (mimicAttempt(v) === 1 ? mimicTier(v).first : mimicTier(v).later);
// Each failure takes 1/attempts of the maximum quantity away.
const mimicQty = (max) => (v) => {
  const t = mimicTier(v);
  return Math.floor((max * (t.attempts - mimicAttempt(v) + 1)) / t.attempts);
};
const THIRD_AGE = [
  '3rd Age full helmet', '3rd Age platebody', '3rd Age platelegs', '3rd Age plateskirt', '3rd Age kiteshield',
  '3rd Age range coif', '3rd Age range top', '3rd Age range legs', '3rd Age vambraces',
  '3rd Age mage hat', '3rd Age robe top', '3rd Age robe', '3rd Age amulet',
  '3rd Age longsword', '3rd Age bow', '3rd Age wand', '3rd Age cloak',
  '3rd Age druidic robe top', '3rd Age druidic robe bottoms', '3rd Age druidic cloak', '3rd Age druidic staff',
  '3rd Age pickaxe', '3rd Age axe',
];

const theMimic = {
  id: 'the-mimic',
  emblemItem: "Reward casket (master)",
  name: 'The Mimic',
  short: 'Mimic',
  category: 'other',
  wiki: 'The Mimic',
  tagline: 'Bonus loot from an elite or master casket: a 3rd age item at 1/250 or 1/228, the ring six times as often.',
  inputs: [
    {
      key: 'tier',
      label: 'Casket',
      type: 'select',
      default: 'elite',
      options: [
        { value: 'elite', label: 'Elite' },
        { value: 'master', label: 'Master' },
      ],
    },
    { key: 'attempt', label: 'Killed on attempt', type: 'range', default: 1, min: 1, max: 6, step: 1, hint: 'Elite caskets allow five attempts, master six. Each failure lowers the rates and quantities.' },
  ],
  always: [{ name: 'Mahogany plank', p: 1 }],
  preroll: [
    { name: 'Ring of 3rd Age', p: (v) => 6 / mimicDenom(v), unique: true },
    ...THIRD_AGE.map((name) => ({ name, p: (v) => 1 / (23 * mimicDenom(v)), unique: true })),
  ],
  // One of five when the pre-roll misses: the wiki's 243/1250 (elite) and
  // 221/1140 (master) are these fifths after the pre-roll.
  main: [
    { name: 'Death rune', p: per(1, 5), qty: mimicQty(600) },
    { name: 'Blood rune', p: per(1, 5), qty: mimicQty(500) },
    { name: 'Grimy ranarr weed', p: per(1, 5), qty: mimicQty(25) },
    { name: 'Wine of Zamorak', p: per(1, 5), qty: mimicQty(25) },
    { name: 'Raw manta ray', p: per(1, 5), qty: mimicQty(15) },
  ],
  summary: (v) =>
    `The Mimic's bonus loot only, not the casket's own rewards. A 3rd age item is 1/${mimicDenom(v)}, split evenly over 23 pieces.`,
};

// ----- Barrows -----

const BROTHERS = [
  { name: 'Ahrim', level: 98, items: ["Ahrim's hood", "Ahrim's robetop", "Ahrim's robeskirt", "Ahrim's staff"] },
  { name: 'Dharok', level: 115, items: ["Dharok's helm", "Dharok's platebody", "Dharok's platelegs", "Dharok's greataxe"] },
  { name: 'Guthan', level: 115, items: ["Guthan's helm", "Guthan's platebody", "Guthan's chainskirt", "Guthan's warspear"] },
  { name: 'Karil', level: 98, items: ["Karil's coif", "Karil's leathertop", "Karil's leatherskirt", "Karil's crossbow"] },
  { name: 'Torag', level: 115, items: ["Torag's helm", "Torag's platebody", "Torag's platelegs", "Torag's hammers"] },
  { name: 'Verac', level: 115, items: ["Verac's helm", "Verac's brassard", "Verac's plateskirt", "Verac's flail"] },
];
// Reward potential bands: a roll r from 1 to R lands in one; quantity is
// floor(r / divisor) (Module:Barrows calculator on the wiki).
const BARROWS_BANDS = [
  { name: 'Coins', high: 380, div: 0.5 },
  { name: 'Mind rune', high: 505, div: 1.5, rune: true },
  { name: 'Chaos rune', high: 630, div: 4.5, rune: true },
  { name: 'Death rune', high: 755, div: 9, rune: true },
  { name: 'Blood rune', high: 880, div: 20, rune: true },
  { name: 'Bolt rack', high: 1005, div: 25 },
  { name: 'Loop half of key', high: 1008, div: 1000 },
  { name: 'Tooth half of key', high: 1011, div: 1000 },
  { name: 'Dragon med helm', high: 1012, div: 1000 },
];
const brothersOf = (v) => BROTHERS.slice(0, Math.min(6, Math.max(1, v.brothers)));
const barrowsPotential = (v) => {
  const killed = brothersOf(v);
  const levels = v.crypt ? 1000 : killed.reduce((n, b) => n + b.level, 0);
  return Math.min(1000, levels) + 2 * killed.length;
};
const barrowsPieceChance = (v) => 1 / (450 - 58 * brothersOf(v).length);

const barrows = {
  id: 'barrows',
  emblemItem: "Dharok's helm",
  name: 'Barrows',
  short: 'Barrows',
  category: 'other',
  wiki: 'Chest (Barrows)',
  tagline: 'Up to seven rolls a chest, each a 1/102 shot at a Barrows piece with all six brothers down.',
  inputs: [
    { key: 'brothers', label: 'Brothers killed', type: 'range', default: 6, min: 1, max: 6, step: 1, hint: 'Each adds a roll and its four pieces. Taken in order: Ahrim, Dharok, Guthan, Karil, Torag, Verac.' },
    { key: 'crypt', label: 'Max reward potential', type: 'check', default: true, hint: 'Kill enough crypt monsters to reach the 1,000-level cap.' },
    { key: 'morytania', label: 'Hard Morytania Diary', type: 'check', default: false, hint: '50% more runes.' },
  ],
  rolls: 0,
  special: (v, rng, add) => {
    const killed = brothersOf(v);
    const left = killed.flatMap((b) => b.items);
    const R = barrowsPotential(v);
    const pieceChance = barrowsPieceChance(v);
    for (let i = 0; i <= killed.length; i++) {
      if (rng() < pieceChance && left.length) {
        add(left.splice(Math.floor(rng() * left.length), 1)[0], 1, true);
      } else {
        const r = 1 + Math.floor(rng() * R);
        const band = BARROWS_BANDS.find((b) => r <= b.high);
        let qty = Math.max(1, Math.floor(r / band.div));
        if (band.rune && v.morytania) qty = Math.floor(qty * 1.5);
        add(band.name, qty, false);
      }
      if (rng() < per(1, 200)) add('Clue scroll (elite)', 1, false);
    }
  },
  // Each roll picks a new piece, so a given piece is (rolls × chance) / pieces
  // per chest; the exponent form keeps the "any piece" chance exact.
  specialUniques: (v) => {
    const killed = brothersOf(v);
    const rolls = killed.length + 1;
    const pieces = killed.length * 4;
    const each = 1 - (1 - barrowsPieceChance(v)) ** (rolls / pieces);
    return killed.flatMap((b) => b.items.map((name) => [name, each]));
  },
  summary: (v) =>
    `${brothersOf(v).length + 1} rolls, each a 1/${450 - 58 * brothersOf(v).length} chance at one of the ${brothersOf(v).length * 4} pieces you can get (never the same piece twice in a chest). ` +
    `Reward potential ${barrowsPotential(v)} of 1,012. The elite clue is 1/200 per roll.`,
};

// ----- Deranged archaeologist -----

const derangedArchaeologist = {
  id: 'deranged-archaeologist',
  emblemItem: "Steel ring",
  name: 'Deranged archaeologist',
  short: 'Deranged',
  category: 'other',
  wiki: 'Deranged archaeologist',
  tagline: "Fossil Island's mad archaeologist, with a 3/131 Steel ring.",
  inputs: [KONAR],
  always: [{ name: 'Bones', p: 1 }],
  main: [
    // Unique
    { name: 'Steel ring', p: per(3, 131), unique: true },
    // Weapons and armour
    { name: "Black d'hide body", p: per(6, 131) },
    { name: 'Rune 2h sword', p: per(3, 131) },
    { name: 'Rune shortsword', p: per(4, 131) },
    // Runes and ammunition
    { name: 'Water rune', p: per(6, 131), qty: 100 },
    { name: 'Mud rune', p: per(6, 131), qty: 40 },
    { name: 'Rune knife', p: per(6, 131), qty: 25 },
    { name: 'Dragon arrow', p: per(1, 131), qty: 60 },
    { name: 'Steel cannonball', p: per(4, 131), qty: 80 },
    // Seeds
    { table: 'treeHerbSeed', p: per(1, 131) },
    // Materials
    { name: 'Grimy dwarf weed', p: per(8, 131), qty: 4 },
    { name: 'White berries', p: per(7, 131), qty: 10 },
    { name: 'Runite limbs', p: per(5, 131) },
    { name: 'Black dragonhide', p: per(5, 131), qty: 8 },
    { name: 'Gold ore', p: per(6, 131), qty: 10 },
    { name: 'Uncut diamond', p: per(5, 131), qty: 5 },
    { name: 'Onyx bolt tips', p: per(6, 131), qty: 6 },
    // Consumables
    { name: 'Anchovy pizza', p: per(4, 131), qty: 2 },
    { name: 'Prayer potion(3)', p: per(8, 131) },
    { name: 'Potato with cheese', p: per(8, 131), qty: 3 },
    { name: 'Shark', p: per(8, 131), qty: 2 },
    // Other
    { name: 'Crystal key', p: per(7, 131) },
    { name: 'Long bone', p: per(2, 131) },
    // Rare and gem drop tables
    { table: 'rdt', p: per(6, 131) },
    { table: 'gem', p: per(6, 131) },
  ],
  tertiary: [
    { name: 'Numulite', p: per(108, 175), qty: [5, 32] },
    { name: 'Unidentified small fossil', p: per(12, 350) },
    { name: 'Unidentified medium fossil', p: per(12, 700) },
    { name: 'Unidentified large fossil', p: per(12, 875) },
    { name: 'Unidentified rare fossil', p: per(12, 3500) },
    brimstoneKey(65),
    clue('elite', 200),
  ],
  summary: () => 'The wiki lists the numulite and fossils as separate tertiary drops, so each is rolled on its own.',
};

export const CLASSIC_BOSSES = [
  generalGraardor,
  krilTsutsaroth,
  kreeArra,
  commanderZilyana,
  nex,
  corporealBeast,
  dagannothRex,
  dagannothPrime,
  dagannothSupreme,
  kalphiteQueen,
  giantMole,
  sarachnis,
  zulrah,
  vorkath,
  theNightmare,
  phosanisNightmare,
  phantomMuspah,
  scurrius,
  obor,
  bryophyta,
  skotizo,
  hespori,
  theMimic,
  barrows,
  derangedArchaeologist,
];
