/**
 * Registry of the tools on the site. The NavBar and the home page cards both
 * read from here, so adding a tool is one entry plus its route in App.jsx.
 */
export const TOOLS = [
  {
    path: '/loadout-creator',
    name: 'Loadout Creator',
    blurb: 'Plan an equipment and inventory setup, then share it as a link. No bank PIN required.',
  },
  {
    path: '/raid-loot-simulator',
    name: 'Raid Loot Simulator',
    blurb: 'Open the reward chest of all four raids with real drop rates. Go dry for free.',
  },
  {
    path: '/clue-casket-simulator',
    name: 'Clue Casket Simulator',
    blurb: 'Open reward caskets from beginner to master at wiki rates. Third age not guaranteed.',
  },
  {
    path: '/tzhaar-name-generator',
    name: 'TzHaar Name Generator',
    blurb: 'Hatches volcanic creature names from TzHaar syllables. Has a slider you will regret.',
  },
];
