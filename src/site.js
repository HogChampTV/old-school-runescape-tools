/**
 * The site's menu: the NavBar dropdowns, the home page and each group's
 * landing page all read from here, so adding a tool is one entry plus its
 * route in App.jsx.
 *
 * Each top-level group is { label, path, intro, items } and gets a landing
 * page at its path. Items are tools: { path, name, blurb, icon }, plus
 * featured (shown larger) or compact (one line in the menu, coloured by
 * accent). icon is an in-game item name.
 */
const tool = (path, name, blurb, extra = {}) => ({ path, name, blurb, ...extra });

/**
 * Each raid has a landing page listing its tools. The raid's loot simulator
 * is added there automatically; `tools` are the raid's own extras.
 */
export const RAID_HUBS = [
  { id: 'cox', slug: 'chambers-of-xeric', name: 'Chambers of Xeric', accent: '#6fcf6f', icon: 'Olmlet', tools: [] },
  { id: 'tob', slug: 'theatre-of-blood', name: 'Theatre of Blood', accent: '#d14545', icon: "Lil' Zik", tools: [] },
  {
    id: 'toa',
    slug: 'tombs-of-amascut',
    name: 'Tombs of Amascut',
    accent: '#e0b35c',
    icon: "Tumeken's guardian",
    tools: [
      tool('/helpful-spirit-supply-viewer', 'Helpful Spirit Supply Viewer', 'See what the Helpful Spirit offers under every supply invocation, and roll your own offer.'),
    ],
  },
  { id: 'tfa', slug: 'the-fractured-archive', name: 'The Fractured Archive', accent: '#4ecdc4', icon: 'Orion', tools: [] },
];

export const raidHubPath = (hub) => `/raids/${hub.slug}`;

export const NAV = [
  {
    label: 'Loot Simulators',
    path: '/loot-simulators',
    intro: 'Open reward chests and kill bosses as often as you like, at the wiki\'s drop rates. Track your luck, chase a pet, or watch a dry streak grow.',
    items: [
      tool('/boss-loot-simulator', 'Boss Loot', 'Kill any boss in the game as many times as you like, at wiki drop rates. Roll until pet if you dare.', { icon: 'Vorki' }),
      tool('/raid-loot-simulator', 'Raid Rewards', 'Open the reward chest of all four raids with real drop rates. Go dry for free.', { icon: 'Olmlet' }),
      tool('/clue-casket-simulator', 'Clue Caskets', 'Open reward caskets from beginner to master at wiki rates. Third age not guaranteed.', { icon: 'Reward casket (master)' }),
    ],
  },
  {
    label: 'Utilities',
    path: '/utilities',
    compactLabel: 'Raids', // heading over the compact items on the landing page
    intro: 'Tools for planning your trips: build and share a gear setup, or dig into each raid\'s mechanics.',
    items: [
      tool('/loadout-creator', 'Loadout Creator', 'Plan an equipment and inventory setup with its full stats, then share it as a link.', { featured: true, icon: 'Dragon full helm' }),
      ...RAID_HUBS.map((h) => tool(
        raidHubPath(h),
        h.name,
        `Raid tools: loot simulator${h.tools.map((t) => `, ${t.name}`).join('')}.`,
        { compact: true, accent: h.accent, icon: h.icon },
      )),
    ],
  },
  {
    label: 'Fun',
    path: '/fun',
    intro: 'Nothing here will make you rich. Everything here might make you laugh.',
    items: [
      tool('/tzhaar-name-generator', 'TzHaar Name Generator', 'Hatches volcanic creature names from TzHaar syllables. Has a slider you will regret.', { icon: 'TzRek-Jad' }),
    ],
  },
];
