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
    path: '/tzhaar-name-generator',
    name: 'TzHaar Name Generator',
    blurb: 'Hatches volcanic creature names from TzHaar syllables. Has a slider you will regret.',
  },
];
