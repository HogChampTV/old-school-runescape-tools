/**
 * Drop sub-tables shared between bosses, referenced from a boss table as
 * { table: '<key>', p }. Entries use the same shape as a boss's tables: p is
 * the chance per pick of this table, and whatever is left over is "nothing".
 * Rates follow the Old School RuneScape Wiki (pages "Rare drop table", "Gem
 * drop table", "Seed drop tables", and the talisman and herb drop table
 * templates). Ring of wealth effects are not modelled.
 */
// Kept local: the engine imports this file, so importing back would cycle.
const per = (a, b) => a / b;

// The mega-rare drop table: 113/128 of the time it gives nothing.
const megaRare = [
  { name: 'Rune spear', p: per(8, 128) },
  { name: 'Shield left half', p: per(4, 128) },
  { name: 'Dragon spear', p: per(3, 128) },
];

// The gem drop table: 63/128 of the time it gives nothing. Its 3/128
// talisman slot is a chaos talisman underground and a nature talisman above
// ground; not knowing where you are, it's split evenly.
const gem = [
  { name: 'Uncut sapphire', p: per(32, 128) },
  { name: 'Uncut emerald', p: per(16, 128) },
  { name: 'Uncut ruby', p: per(8, 128) },
  { name: 'Chaos talisman', p: per(1.5, 128) },
  { name: 'Nature talisman', p: per(1.5, 128) },
  { name: 'Uncut diamond', p: per(2, 128) },
  { name: 'Rune javelin', p: per(1, 128), qty: 5 },
  { name: 'Loop half of key', p: per(1, 128) },
  { name: 'Tooth half of key', p: per(1, 128) },
  { table: megaRare, p: per(1, 128) },
];

// The rare drop table: a full 128/128, including the gem table at 20/128.
const rdt = [
  { name: 'Nature rune', p: per(3, 128), qty: 67 },
  { name: 'Adamant javelin', p: per(2, 128), qty: 20 },
  { name: 'Death rune', p: per(2, 128), qty: 45 },
  { name: 'Law rune', p: per(2, 128), qty: 45 },
  { name: 'Rune arrow', p: per(2, 128), qty: 42 },
  { name: 'Steel arrow', p: per(2, 128), qty: 150 },
  { name: 'Rune 2h sword', p: per(3, 128) },
  { name: 'Rune battleaxe', p: per(3, 128) },
  { name: 'Rune sq shield', p: per(2, 128) },
  { name: 'Dragon med helm', p: per(1, 128) },
  { name: 'Rune kiteshield', p: per(1, 128) },
  { name: 'Coins', p: per(21, 128), qty: 3000 },
  { name: 'Loop half of key', p: per(20, 128) },
  { name: 'Tooth half of key', p: per(20, 128) },
  { name: 'Runite bar', p: per(5, 128) },
  { name: 'Dragonstone', p: per(2, 128) },
  { name: 'Silver ore', p: per(2, 128), qty: 100 },
  { table: megaRare, p: per(15, 128) },
  { table: gem, p: per(20, 128) },
];

// The tree-herb seed drop table: a full 250/250. Bosses that drop double
// seeds use qtyMult (watermelon seeds come 15 at a time).
const treeHerbSeed = [
  { name: 'Ranarr seed', p: per(30, 250) },
  { name: 'Snapdragon seed', p: per(28, 250) },
  { name: 'Torstol seed', p: per(22, 250) },
  { name: 'Watermelon seed', p: per(21, 250), qty: 15 },
  { name: 'Willow seed', p: per(20, 250) },
  { name: 'Mahogany seed', p: per(18, 250) },
  { name: 'Maple seed', p: per(18, 250) },
  { name: 'Teak seed', p: per(18, 250) },
  { name: 'Yew seed', p: per(18, 250) },
  { name: 'Papaya tree seed', p: per(14, 250) },
  { name: 'Magic seed', p: per(11, 250) },
  { name: 'Palm tree seed', p: per(10, 250) },
  { name: 'Spirit seed', p: per(8, 250) },
  { name: 'Dragonfruit tree seed', p: per(6, 250) },
  { name: 'Celastrus seed', p: per(4, 250) },
  { name: 'Redwood tree seed', p: per(4, 250) },
];

// The talisman drop table: a full 70/70.
const talisman = [
  { name: 'Air talisman', p: per(10, 70) },
  { name: 'Body talisman', p: per(10, 70) },
  { name: 'Earth talisman', p: per(10, 70) },
  { name: 'Fire talisman', p: per(10, 70) },
  { name: 'Mind talisman', p: per(10, 70) },
  { name: 'Water talisman', p: per(10, 70) },
  { name: 'Cosmic talisman', p: per(4, 70) },
  { name: 'Chaos talisman', p: per(3, 70) },
  { name: 'Nature talisman', p: per(3, 70) },
];

// The allotment seed drop table: a full 128/128.
const allotmentSeed = [
  { name: 'Potato seed', p: per(64, 128), qty: [1, 4] },
  { name: 'Onion seed', p: per(32, 128), qty: [1, 3] },
  { name: 'Cabbage seed', p: per(16, 128), qty: [1, 3] },
  { name: 'Tomato seed', p: per(8, 128), qty: [1, 2] },
  { name: 'Sweetcorn seed', p: per(4, 128), qty: [1, 2] },
  { name: 'Strawberry seed', p: per(2, 128) },
  { name: 'Watermelon seed', p: per(1, 128) },
  { name: 'Snape grass seed', p: per(1, 128) },
];

// The same table without potato, onion and cabbage seeds: a full 16/16.
const allotmentSeedNoLow = [
  { name: 'Tomato seed', p: per(8, 16), qty: [1, 2] },
  { name: 'Sweetcorn seed', p: per(4, 16), qty: [1, 2] },
  { name: 'Strawberry seed', p: per(2, 16) },
  { name: 'Watermelon seed', p: per(1, 16) },
  { name: 'Snape grass seed', p: per(1, 16) },
];

// The herb drop table: a full 128/128.
const herb = [
  { name: 'Grimy guam leaf', p: per(32, 128) },
  { name: 'Grimy marrentill', p: per(24, 128) },
  { name: 'Grimy tarromin', p: per(18, 128) },
  { name: 'Grimy harralander', p: per(14, 128) },
  { name: 'Grimy ranarr weed', p: per(11, 128) },
  { name: 'Grimy irit leaf', p: per(8, 128) },
  { name: 'Grimy avantoe', p: per(6, 128) },
  { name: 'Grimy kwuarm', p: per(5, 128) },
  { name: 'Grimy cadantine', p: per(4, 128) },
  { name: 'Grimy lantadyme', p: per(3, 128) },
  { name: 'Grimy dwarf weed', p: per(3, 128) },
];

// The combat herb drop table (the herb table's high-level end): a full 16/16.
const combatHerb = [
  { name: 'Grimy kwuarm', p: per(5, 16) },
  { name: 'Grimy cadantine', p: per(4, 16) },
  { name: 'Grimy lantadyme', p: per(3, 16) },
  { name: 'Grimy dwarf weed', p: per(4, 16) },
];

// The useful herb drop table: a full 16/16.
const usefulHerb = [
  { name: 'Grimy avantoe', p: per(5, 16) },
  { name: 'Grimy snapdragon', p: per(4, 16) },
  { name: 'Grimy ranarr weed', p: per(4, 16) },
  { name: 'Grimy torstol', p: per(3, 16) },
];

// The rare seed drop table: a full 1090/1090, as Template:RareSeedDropLines
// writes it (the "Drop table" page swaps avantoe and poison ivy). Snape grass
// seeds come three at a time; bosses that drop more use qtyMult.
const rareSeed = [
  { name: 'Toadflax seed', p: per(216, 1090) },
  { name: 'Irit seed', p: per(148, 1090) },
  { name: 'Belladonna seed', p: per(143, 1090) },
  { name: 'Poison ivy seed', p: per(103, 1090) },
  { name: 'Avantoe seed', p: per(101, 1090) },
  { name: 'Cactus seed', p: per(96, 1090) },
  { name: 'Potato cactus seed', p: per(70, 1090) },
  { name: 'Kwuarm seed', p: per(69, 1090) },
  { name: 'Snapdragon seed', p: per(46, 1090) },
  { name: 'Cadantine seed', p: per(32, 1090) },
  { name: 'Lantadyme seed', p: per(23, 1090) },
  { name: 'Snape grass seed', p: per(20, 1090), qty: 3 },
  { name: 'Dwarf weed seed', p: per(14, 1090) },
  { name: 'Torstol seed', p: per(9, 1090) },
];

// The uncommon seed drop table: a full 1048/1048.
const uncommonSeed = [
  { name: 'Limpwurt seed', p: per(137, 1048) },
  { name: 'Strawberry seed', p: per(131, 1048) },
  { name: 'Marrentill seed', p: per(125, 1048) },
  { name: 'Jangerberry seed', p: per(92, 1048) },
  { name: 'Tarromin seed', p: per(85, 1048) },
  { name: 'Wildblood seed', p: per(83, 1048) },
  { name: 'Watermelon seed', p: per(63, 1048) },
  { name: 'Harralander seed', p: per(56, 1048) },
  { name: 'Snape grass seed', p: per(40, 1048) },
  { name: 'Ranarr seed', p: per(39, 1048) },
  { name: 'Whiteberry seed', p: per(34, 1048) },
  { name: 'Mushroom spore', p: per(29, 1048) },
  { name: 'Toadflax seed', p: per(27, 1048) },
  { name: 'Belladonna seed', p: per(18, 1048) },
  { name: 'Irit seed', p: per(18, 1048) },
  { name: 'Poison ivy seed', p: per(13, 1048) },
  { name: 'Avantoe seed', p: per(12, 1048) },
  { name: 'Cactus seed', p: per(12, 1048) },
  { name: 'Kwuarm seed', p: per(9, 1048) },
  { name: 'Potato cactus seed', p: per(8, 1048) },
  { name: 'Snapdragon seed', p: per(5, 1048) },
  { name: 'Cadantine seed', p: per(4, 1048) },
  { name: 'Lantadyme seed', p: per(3, 1048) },
  { name: 'Dwarf weed seed', p: per(2, 1048) },
  { name: 'Torstol seed', p: per(1, 1048) },
];

// The God Wars Dungeon variants (page "God Wars Dungeon-variant rare drop
// table"): every empty slot pays 19,500-20,000 coins instead, the runite bar
// becomes a rune shortsword, the talisman is always chaos, and a ring of
// wealth does nothing. Each is a full 128/128.
const GWD_COINS = [19500, 20000];

const gwdMegaRare = [
  { name: 'Coins', p: per(113, 128), qty: GWD_COINS },
  { name: 'Rune spear', p: per(8, 128) },
  { name: 'Shield left half', p: per(4, 128) },
  { name: 'Dragon spear', p: per(3, 128) },
];

const gwdGem = [
  { name: 'Coins', p: per(63, 128), qty: GWD_COINS },
  { name: 'Uncut sapphire', p: per(32, 128) },
  { name: 'Uncut emerald', p: per(16, 128) },
  { name: 'Uncut ruby', p: per(8, 128) },
  { name: 'Chaos talisman', p: per(3, 128) },
  { name: 'Uncut diamond', p: per(2, 128) },
  { name: 'Rune javelin', p: per(1, 128), qty: 5 },
  { name: 'Loop half of key', p: per(1, 128) },
  { name: 'Tooth half of key', p: per(1, 128) },
  { table: gwdMegaRare, p: per(1, 128) },
];

const gwdRdt = [
  { name: 'Loop half of key', p: per(21, 128) },
  { name: 'Tooth half of key', p: per(20, 128) },
  { name: 'Coins', p: per(20, 128), qty: GWD_COINS },
  { table: gwdGem, p: per(20, 128) },
  { name: 'Nature rune', p: per(3, 128), qty: [62, 67] },
  { name: 'Law rune', p: per(2, 128), qty: [40, 45] },
  { name: 'Death rune', p: per(2, 128), qty: [40, 45] },
  { name: 'Steel arrow', p: per(2, 128), qty: [145, 150] },
  { name: 'Rune arrow', p: per(2, 128), qty: [38, 43] },
  { name: 'Adamant javelin', p: per(2, 128), qty: [15, 20] },
  { name: 'Rune 2h sword', p: per(3, 128) },
  { name: 'Rune battleaxe', p: per(3, 128) },
  { name: 'Rune sq shield', p: per(2, 128) },
  { name: 'Rune kiteshield', p: per(1, 128) },
  { name: 'Dragon med helm', p: per(1, 128) },
  { name: 'Rune shortsword', p: per(5, 128) },
  { name: 'Dragonstone', p: per(2, 128) },
  { name: 'Silver ore', p: per(2, 128), qty: 100 },
  { table: gwdMegaRare, p: per(15, 128) },
];

export const SHARED_TABLES = {
  rdt, gem, megaRare, treeHerbSeed, talisman, allotmentSeed, allotmentSeedNoLow, herb, combatHerb,
  usefulHerb, rareSeed, uncommonSeed, gwdRdt, gwdGem, gwdMegaRare,
};
