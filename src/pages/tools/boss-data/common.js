/**
 * Building blocks most bosses share: the slayer-task toggles and the
 * tertiary drops they unlock, and clue scrolls with the ring of wealth (i)
 * boost. Boss files spread these into their inputs and tertiary lists.
 */
export { per } from '../boss-loot-engine.js';

// ----- toggles -----

export const KONAR = {
  key: 'konar',
  label: 'On a Konar task',
  type: 'check',
  default: false,
  hint: 'Brimstone keys only drop on a Konar quo Maten slayer task.',
};

export const KRYSTILIA = {
  key: 'krystilia',
  label: 'On a Krystilia task',
  type: 'check',
  default: false,
  hint: "Wilderness slayer tasks add Larran's keys and the slayer's enchantment.",
};

export const ROW_I = {
  key: 'rowi',
  label: 'Ring of wealth (i)',
  type: 'check',
  default: false,
  hint: 'Doubles the clue scroll drop rate in the Wilderness.',
};

// ----- tertiaries -----

/** Brimstone key: on a Konar task only, at the boss's wiki rate (1/n). */
export const brimstoneKey = (n) => ({ name: 'Brimstone key', p: (v) => (v.konar ? 1 / n : 0) });

/** A clue scroll at 1/n; withRowI doubles it when the ring of wealth (i) toggle is on. */
export const clue = (tier, n, { withRowI = false } = {}) => ({
  name: `Clue scroll (${tier})`,
  p: (v) => (withRowI && v.rowi ? 2 / n : 1 / n),
});

/** Wilderness slayer (Krystilia) tertiaries: Larran's key at 1/n, enchantment 1/30. */
export const krystiliaDrops = (larranN) => [
  { name: "Larran's key", p: (v) => (v.krystilia ? 1 / larranN : 0) },
  { name: "Slayer's enchantment", p: (v) => (v.krystilia ? 1 / 30 : 0) },
];
