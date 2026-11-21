/**
 * The site's menu: the NavBar dropdowns and the home page both read from
 * here, so adding a tool is one entry plus its route in App.jsx.
 *
 * Each top-level entry is a dropdown of tools: { path, name, blurb }, plus
 * featured (shown larger) or compact (one line, coloured by accent).
 */
const tool = (path, name, blurb, extra = {}) => ({ path, name, blurb, ...extra });

/**
 * Each raid has a landing page listing its tools. The raid's loot simulator
 * is added there automatically; `tools` are the raid's own extras.
 */
export const RAID_HUBS = [
  { id: 'cox', slug: 'chambers-of-xeric', name: 'Chambers of Xeric', accent: '#6fcf6f', tools: [] },
  { id: 'tob', slug: 'theatre-of-blood', name: 'Theatre of Blood', accent: '#d14545', tools: [] },
  {
    id: 'toa',
    slug: 'tombs-of-amascut',
    name: 'Tombs of Amascut',
    accent: '#e0b35c',
    tools: [
      tool('/helpful-spirit-supply-viewer', 'Helpful Spirit Supply Viewer', 'See what the Helpful Spirit offers under every supply invocation, and roll your own offer.'),
    ],
  },
  { id: 'tfa', slug: 'the-fractured-archive', name: 'The Fractured Archive', accent: '#4ecdc4', tools: [] },
];

export const raidHubPath = (hub) => `/raids/${hub.slug}`;

export const NAV = [
  {
    label: 'Loot Simulators',
    items: [
      tool('/boss-loot-simulator', 'Boss Loot', 'Kill any boss in the game as many times as you like, at wiki drop rates. Roll until pet if you dare.'),
      tool('/raid-loot-simulator', 'Raid Rewards', 'Open the reward chest of all four raids with real drop rates. Go dry for free.'),
      tool('/clue-casket-simulator', 'Clue Caskets', 'Open reward caskets from beginner to master at wiki rates. Third age not guaranteed.'),
    ],
  },
  {
    label: 'Utilities',
    items: [
      tool('/loadout-creator', 'Loadout Creator', 'Plan an equipment and inventory setup, then share it as a link. No bank PIN required.', { featured: true }),
      ...RAID_HUBS.map((h) => tool(
        raidHubPath(h),
        h.name,
        `Raid tools: loot simulator${h.tools.map((t) => `, ${t.name}`).join('')}.`,
        { compact: true, accent: h.accent },
      )),
    ],
  },
  {
    label: 'Fun',
    items: [
      tool('/tzhaar-name-generator', 'TzHaar Name Generator', 'Hatches volcanic creature names from TzHaar syllables. Has a slider you will regret.'),
    ],
  },
];
