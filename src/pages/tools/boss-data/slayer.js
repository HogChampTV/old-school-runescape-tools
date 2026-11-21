/**
 * Slayer bosses: the eight bosses only fought on a Slayer task. Drop tables
 * follow each boss's Old School RuneScape Wiki page line by line (weights as
 * the wiki writes them, e.g. per(6, 139)); see boss-loot-engine.js for the
 * shape. Clue-step-only "Always" drops and Araxxor's coagulated venom (a
 * guaranteed speed reward) are left out.
 */
import { KONAR, brimstoneKey, clue, per } from './common.js';
import { SHARED_TABLES } from '../boss-shared-tables.js';

// ----- Abyssal Sire -----

// What an unsired gives at the Font of Consumption (out of 128, before the
// orphan is owned). Bludgeon pieces never repeat until a full set is held.
const FONT = [
  { set: ['Bludgeon claw', 'Bludgeon spine', 'Bludgeon axon'], p: per(62, 128), unique: true },
  { name: 'Abyssal dagger', p: per(26, 128), unique: true },
  { name: 'Jar of Miasma', p: per(13, 128), unique: true },
  { name: 'Abyssal whip', p: per(12, 128), unique: true },
  { name: 'Abyssal head', p: per(10, 128), unique: true },
  { pet: true, p: per(5, 128) },
];

const abyssalSire = {
  id: 'abyssal-sire',
  name: 'Abyssal Sire',
  short: 'Abyssal Sire',
  category: 'slayer',
  wiki: 'Abyssal Sire',
  tagline: 'A 1/100 Unsired, offered at the Font for bludgeon pieces, whips, daggers and a 5/128 orphan.',
  inputs: [KONAR],
  always: [{ name: 'Abyssal ashes', p: 1 }],
  preroll: [{ name: 'Unsired', p: per(1, 100), unique: true, then: FONT }],
  main: [
    // Weapons and armour
    { name: 'Battlestaff', p: per(6, 139), qty: 10 },
    { name: 'Rune full helm', p: per(4, 139), qty: 3 },
    { name: 'Mystic lava staff', p: per(4, 139), qty: 2 },
    { name: 'Rune shortsword', p: per(4, 139), qty: 3 },
    { name: 'Rune platebody', p: per(4, 139), qty: 2 },
    { name: 'Rune kiteshield', p: per(3, 139), qty: 2 },
    { name: 'Mystic air staff', p: per(2, 139), qty: 2 },
    { name: 'Air battlestaff', p: per(2, 139), qty: 6 },
    // Runes and ammunition
    { name: 'Blood rune', p: per(5, 139), qty: [190, 210] },
    { name: 'Death rune', p: per(5, 139), qty: [330, 370] },
    { name: 'Law rune', p: per(5, 139), qty: 250 },
    { name: 'Soul rune', p: per(5, 139), qty: [225, 275] },
    { name: 'Cosmic rune', p: per(4, 139), qty: 350 },
    { name: 'Steel cannonball', p: per(4, 139), qty: 300 },
    // Herbs: 5/139, split 5:4:4:3
    {
      table: [
        { name: 'Grimy kwuarm', p: per(5, 16), qty: 25 },
        { name: 'Grimy dwarf weed', p: per(4, 16), qty: 25 },
        { name: 'Grimy cadantine', p: per(4, 16), qty: 25 },
        { name: 'Grimy lantadyme', p: per(3, 16), qty: 25 },
      ],
      p: per(5, 139),
    },
    // Seeds: double quantity
    { table: 'treeHerbSeed', p: per(5, 139), qtyMult: 2 },
    // Materials
    { name: 'Earth orb', p: per(5, 139), qty: [47, 53] },
    { name: 'Pure essence', p: per(5, 139), qty: 600 },
    { name: 'Magic logs', p: per(5, 139), qty: [50, 70] },
    { name: 'Uncut diamond', p: per(5, 139), qty: 15 },
    { name: 'Coal', p: per(4, 139), qty: [380, 420] },
    { name: 'Runite ore', p: per(4, 139), qty: 6 },
    { name: 'Onyx bolt tips', p: per(3, 139), qty: 10 },
    { name: 'Runite bar', p: per(2, 139), qty: 5 },
    { name: 'Aether catalyst', p: per(2, 139), qty: [220, 270] },
    // Talismans
    { table: 'talisman', p: per(3, 139) },
    // Other
    { name: 'Coins', p: per(11, 139), qty: [48000, 52000] },
    { name: 'Chilli potato', p: per(7, 139), qty: 10 },
    { name: 'Super restore(4)', p: per(5, 139), qty: 4 },
    { name: 'Binding necklace', p: per(4, 139), qty: 25 },
    { name: 'Saradomin brew(3)', p: per(2, 139), qty: 6 },
    { name: 'Jug of water', p: per(2, 139), qty: [250, 350] },
    // Rare drop table: double quantity
    { table: 'rdt', p: per(3, 139), qtyMult: 2 },
  ],
  tertiary: [brimstoneKey(40), clue('elite', 180)],
  pet: { name: 'Abyssal orphan', p: (1 / 100) * (5 / 128), inTable: true },
  summary: () =>
    'Each unsired is offered at the Font as soon as it drops, using the before-pet table (out of 128). Once you own the orphan the real Font rolls out of 123 instead. The rare drop table\'s talisman is split evenly between chaos and nature.',
};

// ----- Alchemical Hydra -----

// The first roll walks these in order; each is the wiki's effective rate
// (the chance of reaching it times its own odds).
const HYDRA_REACH = {
  knife: 1999 / 2000,
  claw: (1999 / 2000) ** 2,
  tail: (1999 / 2000) ** 2 * (999 / 1000),
  leather: (1999 / 2000) ** 2 * (999 / 1000) * (511 / 512),
  ring: (1999 / 2000) ** 2 * (999 / 1000) * (511 / 512) ** 2,
};

// Hydra's seeds come 2-3 times over (watermelon seeds 30-45).
const HYDRA_SEEDS = SHARED_TABLES.treeHerbSeed.map((e) => ({
  ...e,
  qty: e.name === 'Watermelon seed' ? [30, 45] : [2, 3],
}));

const alchemicalHydra = {
  id: 'alchemical-hydra',
  name: 'Alchemical Hydra',
  short: 'Hydra',
  category: 'slayer',
  wiki: 'Alchemical Hydra',
  tagline: 'Two rolls, the first with a 1/87.6 shot at a unique, and a 1/3000 Ikkle Hydra.',
  inputs: [KONAR],
  always: [{ name: 'Hydra bones', p: 1, qty: 2 }],
  rolls: 2,
  preroll: [
    { name: 'Dragon thrownaxe', p: per(1, 2000), qty: [500, 1000], unique: true },
    { name: 'Dragon knife', p: per(1, 2000) * HYDRA_REACH.knife, qty: [500, 1000], unique: true },
    { name: "Hydra's claw", p: per(1, 1000) * HYDRA_REACH.claw, unique: true },
    { name: 'Hydra tail', p: per(1, 512) * HYDRA_REACH.tail, unique: true },
    { name: 'Hydra leather', p: per(1, 512) * HYDRA_REACH.leather, unique: true },
    {
      set: ["Hydra's eye", "Hydra's fang", "Hydra's heart"],
      ordered: true,
      p: per(1, 180) * HYDRA_REACH.ring,
      unique: true,
    },
  ],
  main: [
    // Weapons and armour
    { items: [{ name: 'Mystic fire staff' }, { name: 'Mystic water staff' }], p: per(8, 101) },
    { name: 'Battlestaff', p: per(5, 101), qty: [8, 12] },
    { name: "Black d'hide body", p: per(5, 101) },
    { name: 'Dragon longsword', p: per(3, 101) },
    { name: 'Dragon med helm', p: per(3, 101) },
    { items: [{ name: 'Rune platebody' }, { name: 'Rune platelegs' }], p: per(1.5, 101) },
    { items: [{ name: 'Rune platebody' }, { name: 'Rune plateskirt' }], p: per(1.5, 101) },
    { name: 'Dragon battleaxe', p: per(2, 101) },
    { items: [{ name: 'Mystic robe top (light)' }, { name: 'Mystic robe bottom (light)' }], p: per(1, 101) },
    // Runes and ammunition
    { name: 'Chaos rune', p: per(6, 101), qty: [150, 300] },
    { name: 'Death rune', p: per(6, 101), qty: [150, 300] },
    { name: 'Blood rune', p: per(6, 101), qty: [150, 300] },
    { name: 'Astral rune', p: per(6, 101), qty: [150, 300] },
    { name: 'Dragonstone bolts (e)', p: per(2, 101), qty: [100, 120] },
    { name: 'Onyx bolts (e)', p: per(1, 101), qty: [35, 50] },
    // Herbs: 10/101, split out of 32
    {
      table: [
        { name: 'Grimy avantoe', p: per(5, 32), qty: [10, 15] },
        { name: 'Grimy kwuarm', p: per(5, 32), qty: [25, 30] },
        { name: 'Grimy ranarr weed', p: per(4, 32), qty: [10, 15] },
        { name: 'Grimy snapdragon', p: per(4, 32), qty: [10, 15] },
        { name: 'Grimy cadantine', p: per(4, 32), qty: [25, 30] },
        { name: 'Grimy dwarf weed', p: per(4, 32), qty: [25, 30] },
        { name: 'Grimy lantadyme', p: per(3, 32), qty: [25, 30] },
        { name: 'Grimy torstol', p: per(3, 32), qty: [10, 15] },
      ],
      p: per(10, 101),
    },
    // Seeds
    { table: HYDRA_SEEDS, p: per(2, 101) },
    // Other
    { name: 'Coins', p: per(0.5, 101), qty: [5550, 25550] },
    { name: 'Coins', p: per(9.5, 101), qty: [40000, 60000] },
    { name: 'Shark', p: per(7, 101), qty: [2, 4] },
    { items: [{ name: 'Ranging potion(3)' }, { name: 'Super restore(3)', qty: 2 }], p: per(7, 101) },
    { name: 'Dragon bones', p: per(6, 101), qty: 30 },
    { name: 'Crystal key', p: per(1, 101) },
    // Rare drop table: two rolls on it
    { table: 'rdt', p: per(1, 101), rolls: 2 },
  ],
  tertiary: [
    brimstoneKey(40),
    clue('hard', 100),
    { name: 'Alchemical hydra heads', p: per(1, 256), unique: true },
    clue('elite', 256),
    { name: 'Jar of Chemicals', p: per(1, 2000), unique: true },
  ],
  pet: { name: 'Ikkle Hydra', p: per(1, 3000) },
  summary: () =>
    "Only the first of the two rolls can give a unique. Brimstone ring pieces come in the order the wiki gives (eye, then fang, then heart) and never repeat within a ring.",
};

// ----- Araxxor -----

const DESTROY = (v) => v.mode === 1;

const araxxor = {
  id: 'araxxor',
  name: 'Araxxor',
  short: 'Araxxor',
  category: 'slayer',
  wiki: 'Araxxor',
  tagline: 'Noxious halberd pieces at 1/200, an Araxyte fang at 1/600, and Nid at 1/3000 (1/1500 if you destroy the corpse).',
  inputs: [
    KONAR,
    {
      key: 'mode',
      label: 'After the kill',
      type: 'select',
      default: 0,
      options: [
        { value: 0, label: 'Harvest (loot)' },
        { value: 1, label: 'Destroy (no loot, double pet)' },
      ],
    },
  ],
  rolls: (v) => (DESTROY(v) ? 0 : 1),
  // The unique table, hit 1/150 of the time.
  preroll: [
    { set: ['Noxious point', 'Noxious blade', 'Noxious pommel'], p: per(1, 200), unique: true },
    { name: 'Araxyte fang', p: per(1, 600), unique: true },
  ],
  main: [
    // Supplies: a prayer potion with a venom sac or a super combat, and pies or sharks
    {
      name: 'Prayer potion(4)',
      p: per(15, 115),
      then: [
        { items: [{ name: 'Araxyte venom sac' }, { name: 'Shark', qty: [2, 3] }], p: per(1, 4) },
        { items: [{ name: 'Araxyte venom sac' }, { name: 'Wild pie', qty: [2, 3] }], p: per(1, 4) },
        { items: [{ name: 'Super combat potion(1)' }, { name: 'Shark', qty: [2, 3] }], p: per(1, 4) },
        { items: [{ name: 'Super combat potion(1)' }, { name: 'Wild pie', qty: [2, 3] }], p: per(1, 4) },
      ],
    },
    // Weapons and armour
    { name: 'Rune kiteshield', p: per(8, 115), qty: 2 },
    { name: 'Rune platelegs', p: per(8, 115), qty: 2 },
    { name: 'Dragon mace', p: per(6, 115), qty: 2 },
    { name: 'Rune 2h sword', p: per(1, 115), qty: 5 },
    { name: 'Dragon platelegs', p: per(1, 115), qty: 2 },
    // Runes and ammunition
    { name: 'Death rune', p: per(5, 115), qty: 250 },
    { name: 'Nature rune', p: per(2, 115), qty: 80 },
    { name: 'Mud rune', p: per(1, 115), qty: 100 },
    { name: 'Blood rune', p: per(1, 115), qty: 180 },
    // Seeds
    { name: 'Yew seed', p: per(4, 115) },
    { name: 'Toadflax seed', p: per(3, 115), qty: 4 },
    { name: 'Ranarr seed', p: per(1, 115), qty: 3 },
    { name: 'Snapdragon seed', p: per(1, 115), qty: 3 },
    { name: 'Magic seed', p: per(1, 115), qty: 2 },
    { table: 'treeHerbSeed', p: per(1, 115) },
    // Resources
    { name: 'Coal', p: per(4, 115), qty: 120 },
    { name: 'Adamantite ore', p: per(4, 115), qty: 85 },
    { name: 'Raw shark', p: per(4, 115), qty: 21 },
    { name: 'Yew logs', p: per(3, 115), qty: 70 },
    { name: 'Runite ore', p: per(2, 115), qty: 12 },
    { name: 'Raw shark', p: per(1, 115), qty: 100 },
    { name: 'Raw monkfish', p: per(1, 115), qty: 120 },
    { name: 'Pure essence', p: per(1, 115), qty: 1200 },
    // Other
    { name: 'Spider cave teleport', p: per(8, 115), qty: 3 },
    { name: 'Earth orb', p: per(6, 115), qty: 45 },
    { name: 'Araxyte venom sac', p: per(5, 115), qty: 6 },
    { name: 'Mort myre fungus', p: per(4, 115), qty: 24 },
    { name: 'Antidote++(3)', p: per(4, 115), qty: 6 },
    { name: 'Wine of Zamorak', p: per(3, 115), qty: 8 },
    { name: "Red spiders' eggs", p: per(2, 115), qty: 40 },
    { name: 'Araxyte venom sac', p: per(2, 115), qty: 12 },
    { name: 'Bark', p: per(1, 115), qty: 15 },
    // Rare drop table
    { table: 'rdt', p: per(1, 115) },
  ],
  tertiary: [
    { name: 'Araxyte head', p: (v) => (DESTROY(v) ? 0 : per(1, 250)), unique: true },
    { name: 'Jar of Venom', p: (v) => (DESTROY(v) ? 0 : per(1, 1500)), unique: true },
    brimstoneKey(40),
    clue('elite', 50),
  ],
  pet: { name: 'Nid', p: (v) => (DESTROY(v) ? per(1, 1500) : per(1, 3000)) },
  summary: (v) =>
    (DESTROY(v)
      ? 'Destroying the corpse gives no loot: only the elite clue, the brimstone key and Nid (at 1/1500) can still drop. '
      : '') +
    'The wiki marks every rate here as approximate. The supply drop fills the 15/115 its table leaves free; the head and jar are rolled on their own. Coagulated venom (for killing him in under 1:15) is left out.',
};

// ----- Cerberus -----

const cerberus = {
  id: 'cerberus',
  name: 'Cerberus',
  short: 'Cerberus',
  category: 'slayer',
  wiki: 'Cerberus',
  tagline: 'Four crystals at 1/520 each, and a 1/3000 Hellpuppy.',
  inputs: [KONAR],
  always: [{ name: 'Infernal ashes', p: 1 }],
  main: [
    // Uniques: 1/130, split four ways
    { name: 'Primordial crystal', p: per(1, 520), unique: true },
    { name: 'Pegasian crystal', p: per(1, 520), unique: true },
    { name: 'Eternal crystal', p: per(1, 520), unique: true },
    { name: 'Smouldering stone', p: per(1, 520), unique: true },
    // Weapons and armour
    { name: 'Rune platebody', p: per(5, 130) },
    { name: 'Rune chainbody', p: per(4, 130) },
    { name: 'Rune 2h sword', p: per(4, 130) },
    { name: "Black d'hide body", p: per(3, 130) },
    { name: 'Rune axe', p: per(3, 130) },
    { name: 'Rune pickaxe', p: per(3, 130) },
    { name: 'Battlestaff', p: per(3, 130), qty: 6 },
    { name: 'Rune full helm', p: per(3, 130) },
    { name: 'Lava battlestaff', p: per(2, 130) },
    { name: 'Rune halberd', p: per(2, 130) },
    // Runes and ammunition
    { name: 'Fire rune', p: per(6, 130), qty: 300 },
    { name: 'Soul rune', p: per(6, 130), qty: 100 },
    { name: 'Pure essence', p: per(5, 130), qty: 300 },
    { name: 'Blood rune', p: per(4, 130), qty: 60 },
    { name: 'Steel cannonball', p: per(4, 130), qty: 50 },
    { name: 'Runite bolts (unf)', p: per(4, 130), qty: 40 },
    { name: 'Death rune', p: per(3, 130), qty: 100 },
    // Other
    { name: 'Coal', p: per(6, 130), qty: 120 },
    { name: 'Super restore(4)', p: per(6, 130), qty: 2 },
    { name: 'Summer pie', p: per(6, 130), qty: 3 },
    { name: 'Coins', p: per(5, 130), qty: [10000, 20000] },
    { name: 'Dragon bones', p: per(5, 130), qty: 20 },
    { name: 'Unholy symbol', p: per(5, 130) },
    { name: 'Wine of Zamorak', p: per(5, 130), qty: 15 },
    { name: 'Ashes', p: per(4, 130), qty: 50 },
    { name: 'Fire orb', p: per(4, 130), qty: 20 },
    { name: 'Grimy torstol', p: per(4, 130), qty: 6 },
    { name: 'Runite ore', p: per(3, 130), qty: 5 },
    { name: 'Uncut diamond', p: per(3, 130), qty: 5 },
    { name: 'Torstol seed', p: per(2, 130), qty: 3 },
    { name: 'Ranarr seed', p: per(2, 130), qty: 2 },
    { name: 'Key master teleport', p: per(2, 130), qty: 7 },
    // Rare drop table
    { table: 'rdt', p: per(3, 130) },
  ],
  tertiary: [
    { name: 'Ensouled hellhound head', p: per(1, 15) },
    brimstoneKey(45),
    clue('elite', 100),
    { name: 'Jar of Souls', p: per(1, 2000), unique: true },
  ],
  pet: { name: 'Hellpuppy', p: per(1, 3000) },
};

// ----- Grotesque Guardians -----

const grotesqueGuardians = {
  id: 'grotesque-guardians',
  name: 'Grotesque Guardians',
  short: 'Guardians',
  category: 'slayer',
  wiki: 'Grotesque Guardians',
  tagline: 'Two rolls, each with granite uniques and a 1/1000 black tourmaline core, plus a 1/3000 Noon.',
  inputs: [KONAR],
  always: [{ name: 'Granite dust', p: 1, qty: [50, 100] }],
  rolls: 2,
  // Checked before each of the two rolls.
  prerollEach: true,
  preroll: [
    { name: 'Granite maul', p: per(1, 250), unique: true },
    { name: 'Granite gloves', p: per(1, 500), unique: true },
    { name: 'Granite ring', p: per(1, 500), unique: true },
    { name: 'Granite hammer', p: per(1, 750), unique: true },
    { name: 'Black tourmaline core', p: per(1, 1000), unique: true },
  ],
  main: [
    // Weapons and armour
    { name: 'Rune pickaxe', p: per(6, 142) },
    { name: 'Rune full helm', p: per(5, 142) },
    { name: 'Rune platelegs', p: per(5, 142) },
    { name: 'Rune 2h sword', p: per(4, 142) },
    { name: 'Rune battleaxe', p: per(3, 142) },
    { name: 'Dragon longsword', p: per(1, 142) },
    { name: 'Adamant boots', p: per(1, 142) },
    { name: 'Dragon med helm', p: per(1, 142) },
    // Supplies
    { name: 'Mushroom potato', p: per(10, 142), qty: [4, 6] },
    { name: 'Saradomin brew(4)', p: per(8, 142), qty: 2 },
    {
      items: [{ name: 'Magic potion(2)' }, { name: 'Ranging potion(2)' }, { name: 'Super combat potion(2)' }],
      p: per(6, 142),
    },
    { name: 'Prayer potion(4)', p: per(4, 142), qty: [1, 2] },
    // Resources
    { name: 'Gold ore', p: per(7, 142), qty: [40, 50] },
    { name: 'Adamantite bar', p: per(6, 142), qty: [25, 40] },
    { name: 'Gold bar', p: per(6, 142), qty: [35, 50] },
    { name: 'Mithril bar', p: per(6, 142), qty: [35, 45] },
    { name: 'Coal', p: per(5, 142), qty: [180, 250] },
    { name: 'Runite ore', p: per(4, 142), qty: [3, 6] },
    { name: 'Runite bar', p: per(3, 142), qty: [3, 5] },
    // Shark drop table
    { name: 'Raw shark', p: per(1.5, 142), qty: 20 },
    { name: 'Shark lure', p: per(1.5, 142), qty: 40 },
    { name: 'Raw sea turtle', p: per(1, 142), qty: 20 },
    // Other
    { name: 'Coins', p: per(10, 142), qty: [10000, 20000] },
    { name: 'Chaos rune', p: per(8, 142), qty: [100, 150] },
    { name: 'Coins', p: per(5, 142), qty: 25000 },
    { name: 'Crystal key', p: per(5, 142) },
    { name: 'Death rune', p: per(5, 142), qty: [90, 130] },
    { name: 'Dragon dart tip', p: per(5, 142), qty: [15, 25] },
    { name: 'Diamond bolt tips', p: per(3, 142), qty: [100, 150] },
    { name: 'Dragonstone bolt tips', p: per(2, 142), qty: [20, 40] },
    { name: 'Onyx bolt tips', p: per(2, 142), qty: [10, 15] },
    { name: 'Dragon arrowtips', p: per(1, 142), qty: [50, 150] },
    { name: 'Soul rune', p: per(1, 142), qty: [20, 40] },
  ],
  tertiary: [
    brimstoneKey(44),
    clue('elite', 230),
    { name: 'Jar of Stone', p: per(1, 5000), unique: true },
  ],
  pet: { name: 'Noon', p: per(1, 3000) },
  summary: () => 'The wiki doesn\'t give the order the five uniques are checked in, so each is taken at its listed per-roll rate.',
};

// ----- Kraken -----

const kraken = {
  id: 'kraken',
  name: 'Kraken',
  short: 'Kraken',
  category: 'slayer',
  wiki: 'Kraken',
  tagline: 'A 1/400 Kraken tentacle, a 1/512 Trident of the Seas, and a 1/3000 Pet Kraken.',
  inputs: [KONAR],
  main: [
    // Weapons and armour
    { name: 'Mystic water staff', p: per(3, 128) },
    { name: 'Rune warhammer', p: per(2, 128) },
    { name: 'Rune longsword', p: per(2, 128) },
    { name: 'Mystic robe top', p: per(1, 128) },
    { name: 'Mystic robe bottom', p: per(1, 128) },
    { name: 'Trident of the Seas (full)', p: per(1, 512), unique: true },
    // Runes
    { name: 'Water rune', p: per(10, 128), qty: 400 },
    { name: 'Mist rune', p: per(4, 128), qty: 100 },
    { name: 'Chaos rune', p: per(10, 128), qty: 200 },
    { name: 'Death rune', p: per(10, 128), qty: 150 },
    { name: 'Blood rune', p: per(10, 128), qty: 60 },
    { name: 'Soul rune', p: per(7, 128), qty: 50 },
    // Seeds
    { name: 'Watermelon seed', p: per(3, 128), qty: 24 },
    { name: 'Torstol seed', p: per(1, 128), qty: 2 },
    { name: 'Magic seed', p: per(1, 128) },
    // Materials
    { name: 'Seaweed', p: per(3, 128), qty: 125 },
    { name: 'Battlestaff', p: per(4, 128), qty: 10 },
    { name: 'Unpowered orb', p: per(2, 128), qty: 50 },
    { name: 'Diamond', p: per(1, 128), qty: 8 },
    { name: 'Oak plank', p: per(3, 128), qty: 60 },
    { name: 'Runite bar', p: per(1, 128), qty: 2 },
    { name: 'Raw shark', p: per(2, 128), qty: 50 },
    { name: 'Raw monkfish', p: per(2, 128), qty: 100 },
    { name: 'Grimy snapdragon', p: per(2, 128), qty: 6 },
    // Other
    { name: 'Coins', p: per(15, 128), qty: [10000, 19999] },
    { name: 'Shark', p: per(7, 128), qty: 5 },
    { name: 'Pirate boots', p: per(4, 128) },
    { name: 'Sanfew serum(4)', p: per(4, 128), qty: 2 },
    { name: 'Edible seaweed', p: per(3, 128), qty: 5 },
    { name: 'Harpoon', p: per(1, 128) },
    { name: 'Bucket', p: per(1, 128) },
    { name: 'Crystal key', p: per(1, 128) },
    { name: 'Rusty sword', p: per(1.75, 128) },
    { name: 'Antidote++(4)', p: per(2, 128), qty: 2 },
    { name: 'Dragonstone ring', p: per(1, 128) },
    // Gem drop table
    { table: 'gem', p: per(2, 128) },
  ],
  tertiary: [
    brimstoneKey(49),
    clue('elite', 500),
    { name: 'Kraken tentacle', p: per(1, 400), unique: true },
    { name: 'Jar of Dirt', p: per(1, 1000), unique: true },
  ],
  pet: { name: 'Pet Kraken', p: per(1, 3000) },
  summary: () =>
    "The wiki's 1/400 Kraken tentacle doesn't fit inside the 128-weight table, so it's rolled on its own. These rates come from the wiki's community drop-rate data.",
};

// ----- Thermonuclear smoke devil -----

const thermonuclearSmokeDevil = {
  id: 'thermonuclear-smoke-devil',
  name: 'Thermonuclear smoke devil',
  short: 'Thermy',
  category: 'slayer',
  wiki: 'Thermonuclear smoke devil',
  tagline: 'A 1/350 Occult necklace, a 1/512 Smoke battlestaff and a 1/2000 Dragon chainbody.',
  inputs: [KONAR],
  always: [{ name: 'Ashes', p: 1 }],
  preroll: [
    { name: 'Occult necklace', p: per(1, 350), unique: true },
    { name: 'Smoke battlestaff', p: per(1, 512), unique: true },
    { name: 'Dragon chainbody', p: per(1, 2000), unique: true },
  ],
  main: [
    // Weapons and armour
    { name: 'Rune dagger', p: per(5, 107) },
    { name: 'Rune chainbody', p: per(4, 107) },
    { name: "Red d'hide body", p: per(3, 107) },
    { name: 'Rune battleaxe', p: per(3, 107) },
    { name: 'Mystic air staff', p: per(3, 107) },
    { name: 'Mystic fire staff', p: per(3, 107) },
    { name: 'Rune scimitar', p: per(2, 107) },
    { name: 'Rune knife(p++)', p: per(1, 107), qty: 50 },
    { name: 'Dragon scimitar', p: per(1, 107) },
    { name: 'Ancient staff', p: per(1, 107) },
    // Runes and ammunition
    { name: 'Smoke rune', p: per(10, 107), qty: 100 },
    { name: 'Air rune', p: per(8, 107), qty: 300 },
    { name: 'Soul rune', p: per(8, 107), qty: 100 },
    { name: 'Rune arrow', p: per(2, 107), qty: 100 },
    // Consumables
    { name: 'Ugthanki kebab', p: per(1, 107), qty: 3 },
    { name: 'Tuna potato', p: per(3, 107), qty: 3 },
    { name: 'Sanfew serum(4)', p: per(3, 107), qty: 2 },
    { name: 'Prayer potion(4)', p: per(1, 107), qty: 2 },
    // Resources
    { name: 'Pure essence', p: per(2, 107), qty: 300 },
    { name: 'Molten glass', p: per(2, 107), qty: 100 },
    { name: 'Mithril bar', p: per(2, 107), qty: 20 },
    { name: 'Magic logs', p: per(2, 107), qty: 20 },
    { name: 'Gold ore', p: per(2, 107), qty: 200 },
    { name: 'Diamond', p: per(1, 107), qty: 10 },
    { name: 'Raw shark', p: per(5, 856), qty: 30 },
    { name: 'Shark lure', p: per(3, 856), qty: 60 },
    // Other
    { name: 'Coins', p: per(15, 107), qty: [10000, 19999] },
    { name: 'Tinderbox', p: per(1, 107) },
    { name: 'Fire talisman', p: per(1, 107) },
    { name: 'Goat horn', p: per(2, 107), qty: 50 },
    { name: 'Grimy toadflax', p: per(2, 107), qty: 15 },
    { name: 'Onyx bolt tips', p: per(2, 107), qty: 12 },
    { name: 'Snapdragon seed', p: per(2, 107), qty: 2 },
    { name: 'Ranarr seed', p: per(2, 107), qty: 2 },
    { name: 'Grapes', p: per(1, 107), qty: 100 },
    { name: 'Magic seed', p: per(1, 107) },
    { name: 'Dragonstone ring', p: per(1, 107) },
    { name: 'Crystal key', p: per(1, 107) },
    // Gem drop table
    { table: 'gem', p: per(2, 107) },
  ],
  tertiary: [
    brimstoneKey(48),
    clue('hard', 96),
    clue('elite', 500),
    { name: 'Jar of Smoke', p: per(1, 2000), unique: true },
  ],
  pet: { name: 'Pet Smoke Devil', p: per(1, 3000) },
};

// ----- Shellbane gryphon -----

const shellbaneGryphon = {
  id: 'shellbane-gryphon',
  name: 'Shellbane gryphon',
  short: 'Shellbane',
  category: 'slayer',
  wiki: 'Shellbane gryphon',
  tagline: "A 1/75 tarnished Belle's folly, two rolls on its table, and a 1/3000 Gull.",
  inputs: [KONAR],
  always: [
    { name: 'Big bones', p: 1 },
    { name: 'Gryphon feather', p: 1, qty: [7, 10] },
  ],
  preroll: [{ name: "Belle's folly (tarnished)", p: per(1, 75), unique: true }],
  rolls: 2,
  main: [
    // Weapons
    { name: 'Rune claws', p: per(10, 128) },
    { name: 'Rune scimitar', p: per(8, 128) },
    { name: 'Adamant cannonball', p: per(8, 128), qty: [35, 50] },
    { name: 'Rune cannonball', p: per(6, 128), qty: [20, 30] },
    // Foods
    { name: 'Raw swordfish', p: per(14, 128) },
    { name: 'Sweetcorn', p: per(10, 128) },
    { name: 'Watermelon', p: per(10, 128) },
    { name: 'Raw sea turtle', p: per(4, 128) },
    // Seeds and frags
    { table: 'allotmentSeed', p: per(15, 128) },
    { table: 'allotmentSeedNoLow', p: per(5, 128) },
    { name: 'Elkhorn frag', p: per(1, 128) },
    { name: 'Pillar frag', p: per(1, 128) },
    // Herbs
    { table: 'herb', p: per(6, 128) },
    { table: 'combatHerb', p: per(5, 128) },
    // Other
    { name: 'Gryphon feather', p: per(11, 128), qty: [35, 50] },
    { name: 'Shark lure', p: per(10, 128), qty: [3, 5] },
    { name: 'Basket', p: per(3, 128) },
    // Gem drop table
    { table: 'gem', p: per(1, 128) },
  ],
  tertiary: [
    brimstoneKey(58),
    clue('elite', 200),
    // The curved bone is only rolled when the long bone isn't given.
    {
      table: [
        { name: 'Long bone', p: per(1, 400) },
        { name: 'Curved bone', p: (399 / 400) * per(1, 5000) },
      ],
      p: 1,
    },
    { name: 'Jar of Feathers', p: per(1, 2000), unique: true },
  ],
  pet: { name: 'Gull', p: per(1, 3000) },
  summary: () =>
    "A Belle's folly takes the place of one of the two main rolls. The elite clue step that lets you fight it off-task (with its guaranteed clue and casket) isn't modelled.",
};

export const SLAYER_BOSSES = [
  abyssalSire,
  alchemicalHydra,
  araxxor,
  cerberus,
  grotesqueGuardians,
  kraken,
  thermonuclearSmokeDevil,
  shellbaneGryphon,
];
