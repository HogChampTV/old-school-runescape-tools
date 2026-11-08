/**
 * Clue scroll reward casket configs for the loot simulator. Same engine as
 * the raids (raid-loot-engine.js); everything tier-specific lives here.
 *
 * Rates follow the Old School RuneScape Wiki's Reward casket pages as of
 * November 2026. Unique tables keep every tier's headline items at their
 * exact relative rates; the long tails of same-rate cosmetics are condensed
 * into a few representatives that carry their family's combined weight, so
 * the casket's overall unique chance and the famous rates stay true.
 */

// A regular-table row: weight in parts-per-million per roll, uniform qty.
const row = (name, ppm, min = 1, max = min) => ({
  name,
  weight: ppm,
  qty: [min, max],
});

// A unique-table row: rate = the per-roll denominator (1/rate), count = how
// many same-rate items this representative stands in for.
const u = (name, rate, count = 1) => ({ name, weight: (1e6 / rate) * count });

// Caskets give a random number of reward rolls; a unique replaces one.
const casketRolls = (min, max) => (v, unique, rng) =>
  Math.max(0, min + Math.floor(rng() * (max - min + 1)) - (unique ? 1 : 0));

// Per-casket unique chance from a per-roll rate and the roll range.
const perCasket = (perRoll, min, max) => {
  let p = 0;
  for (let n = min; n <= max; n++) p += 1 - (1 - perRoll) ** n;
  return p / (max - min + 1);
};

// The per-roll unique rate is just the table's combined weight.
const pRoll = (table) => table.reduce((n, e) => n + e.weight, 0) / 1e6;

// Chase buttons: keep opening caskets until this prize shows up.
const chaseMaster = {
  label: 'Until a master',
  done: 'Master clue',
  test: (run) => run.loot.some((l) => l.name === 'Clue scroll (master)'),
};
const chase3rdAge = {
  label: 'Until a 3rd age',
  done: '3rd age',
  test: (run) => !!run.unique && run.unique.startsWith('3rd age'),
};
const chaseBloodhound = {
  label: 'Until a Bloodhound',
  done: 'Bloodhound',
  test: (run) => run.pet,
};

// What counts as legendary (the big gold banner).
const thirdAge = { item: (name) => name.startsWith('3rd age') };

export const CLUES = [
  {
    id: 'beginner',
    name: 'Beginner casket',
    short: 'Beginner',
    tagline: 'The training wheels of treasure. 1–3 rolls, and every unique is an even 1/360 per roll.',
    theme: { accent: '#b0a18c', accent2: '#8a7b64', glow: 'rgba(176, 161, 140, 0.35)' },
    emblem: '📜',
    emblemItem: 'Reward casket (beginner)',
    inputs: [],
    uniqueChance: () => perCasket(1 / 24, 1, 3),
    uniques: [
      u('Mole slippers', 360), u('Frog slippers', 360), u('Bear feet', 360), u('Demon feet', 360),
      u('Jester cape', 360), u('Shoulder parrot', 360),
      u("Monk's robe top (t)", 360), u("Monk's robe (t)", 360),
      u('Amulet of defence (t)', 360),
      u('Sandwich lady hat', 360), u('Sandwich lady top', 360), u('Sandwich lady bottom', 360),
      u('Rune scimitar ornament kit (guthix)', 360),
      u('Rune scimitar ornament kit (saradomin)', 360),
      u('Rune scimitar ornament kit (zamorak)', 360),
    ],
    regularWithUnique: true,
    regular: {
      rolls: casketRolls(1, 3),
      table: [
        row('Air rune', 22358, 15, 35), row('Mind rune', 22358, 15, 35),
        row('Chaos rune', 22358, 2, 7), row('Nature rune', 22358, 2, 7), row('Law rune', 22358, 2, 7),
        row('Bronze arrow', 22358, 15, 30), row('Iron arrow', 22358, 7, 15),
        row('Shrimps', 22358, 5, 14), row('Sardine', 22358, 5, 12), row('Herring', 22358, 5, 9),
        row('Staff of air', 22358), row('Steel platebody', 22358), row('Leather body', 22358),
        row('Black full helm', 22358),
        row('Cabbage', 41667, 5, 9),
      ],
    },
    summary: () => 'No deaths, no danger — Veos hands these out near lighthouses.',
  },
  {
    id: 'easy',
    name: 'Easy casket',
    short: 'Easy',
    tagline: 'Berets, god pages, and the occasional Ham joint. 2–4 rolls; the wiki puts a unique at 247/1080 per casket.',
    theme: { accent: '#7fbf6a', accent2: '#5a9949', glow: 'rgba(127, 191, 106, 0.35)' },
    emblem: '📗',
    emblemItem: 'Reward casket (easy)',
    inputs: [],
    uniqueChance: () => 247 / 1080,
    uniques: [
      // 1/360-per-roll pair.
      u('Willow comp bow', 360), u('Amulet of magic (t)', 360),
      // The big 1/1,404 tier (~96 items) — favourites named, the rest condensed.
      u('Ham joint', 1404), u('Rain bow', 1404), u('Staff of Bob the Cat', 1404),
      u('Highwayman mask', 1404), u('A powdered wig', 1404), u('Black cane', 1404),
      u('Flared trousers', 1404), u('Pantaloons', 1404), u('Sleeping cap', 1404),
      u('Imp mask', 1404), u('Goblin mask', 1404), u('Beanie', 1404),
      u('Black beret', 1404), u('Black wizard hat (g)', 1404),
      u('Black platebody (t)', 1404, 20), // heraldic + trimmed metal armours
      u('Studded body (g)', 1404, 12), // studded/leather/d'hide trims
      u('Saradomin robe top', 1404, 12), // god vestments
      u("Bob's black shirt", 1404, 5), // Bob's shirts
      u('Wooden shield (g)', 1404, 41), // everything else on the tier
      // 1/2,808 tier: golden chef kit + 12 coloured elegant pieces.
      u("Golden chef's hat", 2808), u('Golden apron', 2808),
      u('Red elegant shirt', 2808, 6), u('Blue elegant blouse', 2808, 6),
      // 1/5,616 capes.
      u('Team cape zero', 5616), u('Team cape i', 5616), u('Team cape x', 5616),
      u('Cape of skulls', 5616),
      // 1/14,040 monk trims.
      u("Monk's robe top (g)", 14040), u("Monk's robe (g)", 14040),
    ],
    regularWithUnique: true,
    regular: {
      rolls: casketRolls(2, 4),
      table: [
        row('Coins', 27778, 50, 200),
        row('Coins', 18519, 3000, 7000),
        row('Coins', 3241, 10000, 15000),
        row('Air rune', 27778, 30, 50), row('Chaos rune', 27778, 5, 10),
        row('Trout', 27778, 6, 10),
        row('Purple sweets', 27778, 2, 6),
        row('Black full helm', 27778), row('Staff of air', 27778),
        row('Red firelighter', 5556, 3, 5),
        row('Nardah teleport', 2210, 5, 15),
        row('Holy blessing', 463),
        row('Saradomin page 1', 1157),
        row('Master scroll book (empty)', 1263),
      ],
    },
    extras: (v, rng) => (rng() < 1 / 50 ? [{ name: 'Clue scroll (master)', qty: 1 }] : []),
    chases: [chaseMaster],
    summary: () => 'Also rolls a 1/50 shot at a master clue with every casket.',
  },
  {
    id: 'medium',
    name: 'Medium casket',
    short: 'Medium',
    tagline: 'Home of ranger boots. 3–5 rolls at 1/10 per roll for a unique — boots not included (1/1,133).',
    theme: { accent: '#5fb8b0', accent2: '#428f88', glow: 'rgba(95, 184, 176, 0.35)' },
    emblem: '📘',
    emblemItem: 'Reward casket (medium)',
    inputs: [],
    uniqueChance: () => perCasket(1 / 10, 3, 5),
    uniques: [
      // 1/341-per-roll trio.
      u('Gnomish firelighter', 341), u('Yew comp bow', 341), u('Strength amulet (t)', 341),
      // The 1/1,133 tier (~92 items) — the boots everyone hunts, named.
      u('Ranger boots', 1133), u('Wizard boots', 1133), u('Holy sandals', 1133),
      u('Spiked manacles', 1133), u('Climbing boots (g)', 1133),
      u('Cat mask', 1133), u('Penguin mask', 1133), u('Wolf mask', 1133),
      u('Leprechaun hat', 1133), u('Crier hat', 1133), u('Cabbage round shield', 1133),
      u('Adamant platebody (g)', 1133, 16), // adamant trims
      u('Mithril platebody (g)', 1133, 16), // mithril trims
      u("Green d'hide body (g)", 1133, 8), // green d'hide trims
      u('Saradomin mitre', 1133, 18), // god mitres, cloaks, stoles, croziers
      u('Black headband', 1133, 12), // headbands + boaters
      u('Red boater', 1133, 16), // the rest of the tier
      // 1/2,266 tier: unicorns + 20 dark/pale elegant pieces.
      u('Black unicorn mask', 2266), u('White unicorn mask', 2266),
      u('Black elegant shirt', 2266, 5), u('Black elegant legs', 2266, 5),
      u('White elegant blouse', 2266, 5), u('White elegant skirt', 2266, 5),
    ],
    regularWithUnique: true,
    regular: {
      rolls: casketRolls(3, 5),
      table: [
        row('Coins', 29326, 200, 1000),
        row('Coins', 10264, 10000, 15000),
        row('Air rune', 29326, 50, 100), row('Chaos rune', 29326, 10, 20),
        row('Lobster', 29326, 8, 12),
        row('Purple sweets', 29326, 5, 10),
        row('Adamant full helm', 29326), row('Adamant longsword', 29326),
        row('Fire battlestaff', 29326),
        row('Yew longbow', 26393), row('Amulet of power', 26393),
        row('Red firelighter', 5279, 4, 10),
        row('Nardah teleport', 2333, 5, 15),
        row('Master scroll book (empty)', 1333),
      ],
    },
    extras: (v, rng) => (rng() < 1 / 30 ? [{ name: 'Clue scroll (master)', qty: 1 }] : []),
    chases: [chaseMaster],
    summary: () => 'Also rolls a 1/30 shot at a master clue with every casket.',
  },
  {
    id: 'hard',
    name: 'Hard casket',
    short: 'Hard',
    tagline: "Gilded and 3rd age enter the pool. 4–6 rolls; the wiki says 34.1% of caskets hold a unique — 3rd age isn't one of them (1/211,250 a piece).",
    theme: { accent: '#b08ae0', accent2: '#8a63bd', glow: 'rgba(176, 138, 224, 0.35)' },
    emblem: '📕',
    emblemItem: 'Reward casket (hard)',
    inputs: [],
    // Main table 1/12.5 per roll + gilded (11 @ 1/35,750) + 3rd age (13 @ 1/211,250);
    // the chance is derived from the table below (see the loop at the bottom).
    rollRange: [4, 6],
    uniques: [
      u('Magic comp bow', 270.8),
      // The 1/1,625 tier (~122 items): headliners named, families condensed.
      u('Robin hood hat', 1625), u('Amulet of glory (t4)', 1625),
      u('Tan cavalier', 1625, 3), u('Enchanted top', 1625, 3),
      u("Saradomin d'hide body", 1625, 24), // god d'hide pieces
      u('Zamorak full helm', 1625, 30), // god rune armour
      u('Rune platebody (g)', 1625, 30), u('Rune platebody (t)', 1625, 30),
      u('Rune platebody (h1)', 8125, 5), // heraldic platebodies
      u("Saradomin d'hide shield", 9750, 6), // god d'hide shields
      // Gilded (11 pieces, 1/35,750 each).
      u('Gilded platebody', 35750, 4), u('Gilded full helm', 35750, 4), u('Gilded kiteshield', 35750, 3),
      // 3rd age (13 pieces, 1/211,250 each).
      u('3rd age platebody', 211250, 5), u('3rd age range top', 211250, 4),
      u('3rd age robe top', 211250, 3), u('3rd age amulet', 211250),
    ],
    regularWithUnique: true,
    regular: {
      rolls: casketRolls(4, 6),
      table: [
        row('Coins', 36900, 1000, 5000),
        row('Coins', 12920, 10000, 15000),
        row('Rune platebody', 36900), row('Rune longsword', 36900), row('Rune pickaxe', 36900),
        row("Black d'hide body", 36900), row('Magic shortbow', 36900),
        row('Magic longbow', 33223),
        row('Nature rune', 36900, 30, 50), row('Law rune', 36900, 30, 50), row('Blood rune', 36900, 20, 30),
        row('Shark', 36900, 12, 15),
        row('Purple sweets', 36900, 7, 15),
        row('Red firelighter', 7386, 9, 15),
        row('Nardah teleport', 2937, 5, 15),
        row('Master scroll book (empty)', 1678),
        row('Holy blessing', 1846),
        row('Saradomin page 1', 1538),
      ],
    },
    extras: (v, rng) => (rng() < 1 / 15 ? [{ name: 'Clue scroll (master)', qty: 1 }] : []),
    chases: [chaseMaster, chase3rdAge],
    legendary: thirdAge,
    summary: () => 'Also rolls a 1/15 shot at a master clue with every casket.',
  },
  {
    id: 'elite',
    name: 'Elite casket',
    short: 'Elite',
    tagline: 'Rangers, royals, and the ring of nature. 4–6 rolls at 1/26 per roll for a unique; every casket is 1/5 to hold a master clue.',
    theme: { accent: '#e8c04a', accent2: '#bd9631', glow: 'rgba(232, 192, 74, 0.35)' },
    emblem: '📒',
    emblemItem: 'Reward casket (elite)',
    inputs: [],
    // Mains 1/26 (tuxedos included) + gilded + mega-rares + 3rd age.
    rollRange: [4, 6],
    uniques: [
      // The 1/1,275 tier (48 items).
      u("Rangers' tunic", 1275), u('Ranger gloves', 1275), u("Rangers' tights", 1275),
      u('Holy wraps', 1275), u('Katana', 1275), u('Fremennik kilt', 1275),
      u('Top hat', 1275), u('Dragon cane', 1275),
      u('Royal crown', 1275), u('Royal sceptre', 1275), u('Royal gown top', 1275, 6),
      u('Musketeer hat', 1275), u('Musketeer tabard', 1275, 6),
      u('Red dragon mask', 1275, 6), u('Dragon full helm ornament kit', 1275, 6),
      u("Black d'hide body (g)", 1275, 7), u("Saradomin d'hide boots", 1275, 6),
      // Tuxedos (10 pieces, 1/12,750 each).
      u('Dark tuxedo jacket', 12750, 5), u('Light tuxedo jacket', 12750, 5),
      // Mega-rares.
      u('Ring of nature', 14662.5), u('Lava dragon mask', 14662.5), u('Crystal key', 14662.5),
      // Gilded (11 armours @ 1/32,257.5; tools/d'hide @ 1/14,662.5).
      u('Gilded platebody', 32257.5, 4), u('Gilded full helm', 32257.5, 4), u('Gilded kiteshield', 32257.5, 3),
      u('Gilded scimitar', 14662.5, 2), u('Gilded boots', 14662.5, 2),
      u('Gilded pickaxe', 14662.5, 3), u('Gilded spade', 14662.5, 3),
      // 3rd age (17 pieces, 1/249,262.5 each).
      u('3rd age platebody', 249262.5, 5), u('3rd age range top', 249262.5, 4),
      u('3rd age robe top', 249262.5, 4), u('3rd age longsword', 249262.5, 3),
      u('3rd age amulet', 249262.5),
    ],
    regularWithUnique: true,
    regular: {
      rolls: casketRolls(4, 6),
      table: [
        row('Coins', 30960, 20000, 30000),
        row('Coins', 10834, 10000, 15000),
        row('Rune platebody', 30960), row('Rune crossbow', 30960), row('Dragon longsword', 30960),
        row('Onyx bolt tips', 30960, 8, 12),
        row('Law rune', 30960, 50, 75), row('Death rune', 30960, 50, 75),
        row('Blood rune', 30960, 50, 75), row('Soul rune', 30960, 50, 75),
        row('Purple sweets', 30960, 9, 23),
        row('Tooth half of key', 15480), row('Loop half of key', 15480),
        row('Yew seed', 10320), row('Magic seed', 10320),
        row('Red firelighter', 6192, 9, 15),
        row('Nardah teleport', 4926, 5, 15),
        row('Holy blessing', 1549),
        row('Saradomin page 1', 1290),
      ],
    },
    extras: (v, rng) => (rng() < 1 / 5 ? [{ name: 'Clue scroll (master)', qty: 1 }] : []),
    chases: [chaseMaster, chase3rdAge],
    legendary: thirdAge,
    summary: () => 'Also rolls a 1/5 shot at a master clue with every casket.',
  },
  {
    id: 'master',
    name: 'Master casket',
    short: 'Master',
    tagline: 'The end of the trail: 5–7 rolls, 3rd age druidic at 1/313,168 a piece, and the Bloodhound at 1/1,000 caskets.',
    theme: { accent: '#e0655f', accent2: '#b5443f', glow: 'rgba(224, 101, 95, 0.4)' },
    emblem: '📙',
    emblemItem: 'Reward casket (master)',
    inputs: [],
    // 30 @ 1/851 + godsword kits + ankou/mummy + kite kit + mega-rare table.
    rollRange: [5, 7],
    uniques: [
      // The 1/851 tier (30 items).
      u('Occult ornament kit', 851), u('Torture ornament kit', 851), u('Anguish ornament kit', 851),
      u('Tormented ornament kit', 851), u('Dragon defender ornament kit', 851),
      u('Obsidian cape (r)', 851), u('Fancy tiara', 851), u('Half moon spectacles', 851),
      u('Ale of the gods', 851), u('Bowl wig', 851), u('Left eye patch', 851),
      u('Old demon mask', 851), u('Samurai kasa', 851),
      u('Samurai shirt', 851, 4), u('Lesser demon mask', 851, 3), u('Arceuus hood', 851, 10),
      // Godsword ornament kits (1/3,404 each).
      u('Armadyl godsword ornament kit', 3404), u('Bandos godsword ornament kit', 3404),
      u('Saradomin godsword ornament kit', 3404), u('Zamorak godsword ornament kit', 3404),
      // 1/12,765 tier.
      u('Dragon platebody ornament kit', 12765), u('Ankou mask', 12765, 5), u("Mummy's head", 12765, 5),
      u('Dragon kiteshield ornament kit', 25530),
      // Mega-rare table (16/13,616 combined): bucket helm, ring, gilded, 3rd age.
      u('Bucket helm (g)', 13616), u('Ring of coins', 13616),
      // 10/13,616 of any gilded, spread over three representatives.
      u('Gilded platebody', 13616, 10 / 3), u('Gilded full helm', 13616, 10 / 3),
      u('Gilded scimitar', 13616, 10 / 3),
      // 3rd age (23 pieces, 1/313,168 each) — druidic named exactly.
      u('3rd age druidic robe top', 313168), u('3rd age druidic robe bottoms', 313168),
      u('3rd age druidic cloak', 313168), u('3rd age druidic staff', 313168),
      u('3rd age bow', 313168), u('3rd age longsword', 313168), u('3rd age wand', 313168),
      u('3rd age cloak', 313168),
      u('3rd age platebody', 313168, 5), u('3rd age range top', 313168, 5), u('3rd age robe top', 313168, 5),
    ],
    regularWithUnique: true,
    regular: {
      rolls: casketRolls(5, 7),
      table: [
        row('Coins', 33003, 20000, 35000),
        row('Coins', 11547, 10000, 15000),
        row('Dragon scimitar', 33003), row('Dragon halberd', 33003),
        row('Death rune', 33003, 100, 200), row('Blood rune', 33003, 100, 200), row('Soul rune', 33003, 100, 200),
        row('Onyx bolts (e)', 33003, 15, 25),
        row('Manta ray', 33003, 15, 25),
        row('Wine of zamorak', 33003, 35, 50),
        row('Grimy ranarr weed', 33003, 5, 10), row('Grimy snapdragon', 33003, 5, 10),
        row('Runite ore', 33003, 5, 8),
        row('Black dragonhide', 33003, 5, 25),
        row('Purple sweets', 33003, 14, 33),
        row('Tooth half of key', 16502),
        row('Magic seed', 10989, 1, 2),
        row('Red firelighter', 6596, 20, 38),
        row('Nardah teleport', 5247, 5, 15),
        row('Master scroll book (empty)', 2999),
        row('Saradomin page 1', 1423),
      ],
    },
    pet: { name: 'Bloodhound', chance: () => 1 / 1000 },
    chases: [chase3rdAge, chaseBloodhound],
    legendary: { ...thirdAge, pet: true },
    summary: () => 'The Bloodhound is rolled with every casket, unique or not.',
  },
];

// Tiers without an explicit chance derive it from their own unique table,
// so condensing cosmetics can never drift the casket's overall odds.
for (const tier of CLUES) {
  if (tier.uniqueChance) continue;
  const p = pRoll(tier.uniques);
  const [lo, hi] = tier.rollRange;
  tier.uniqueChance = () => perCasket(p, lo, hi);
}
