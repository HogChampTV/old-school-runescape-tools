/**
 * Registry of the tools on the site. The NavBar and the home page cards both
 * read from here, so adding a tool is one entry plus its route in App.jsx.
 * Tools sharing a `group` fold into one dropdown in the nav, shown where the
 * group's first tool sits.
 */
export const TOOLS = [
  {
    path: '/loadout-creator',
    name: 'Loadout Creator',
    blurb: 'Plan an equipment and inventory setup, then share it as a link. No bank PIN required.',
  },
  {
    path: '/boss-loot-simulator',
    name: 'Boss Loot',
    group: 'Loot simulators',
    blurb: 'Kill any boss in the game as many times as you like, at wiki drop rates. Roll until pet if you dare.',
  },
  {
    path: '/raid-loot-simulator',
    name: 'Raid Rewards',
    group: 'Loot simulators',
    blurb: 'Open the reward chest of all four raids with real drop rates. Go dry for free.',
  },
  {
    path: '/clue-casket-simulator',
    name: 'Clue Caskets',
    group: 'Loot simulators',
    blurb: 'Open reward caskets from beginner to master at wiki rates. Third age not guaranteed.',
  },
  {
    path: '/toa-supply-generator',
    name: 'ToA Supply Generator',
    blurb: 'See what the Helpful Spirit offers under every supply invocation, and roll your own offer.',
  },
  {
    path: '/tzhaar-name-generator',
    name: 'TzHaar Name Generator',
    blurb: 'Hatches volcanic creature names from TzHaar syllables. Has a slider you will regret.',
  },
];

/** TOOLS in nav order, with each group collapsed into one { group, tools } entry. */
export function navEntries() {
  const out = [];
  for (const tool of TOOLS) {
    if (!tool.group) { out.push({ tool }); continue; }
    const g = out.find((e) => e.group === tool.group);
    if (g) g.tools.push(tool);
    else out.push({ group: tool.group, tools: [tool] });
  }
  return out;
}
