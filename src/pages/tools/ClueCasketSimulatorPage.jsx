import { LootSimulator } from './RaidLootSimulatorPage.jsx';
import { CLUES } from './clue-loot-data.js';

// Clue caskets speak their own dialect of the simulator.
const CLUE_STRINGS = {
  noun: 'casket',
  nouns: 'caskets',
  unique: 'rare',
  uniques: 'rares',
  Unique: 'Rare',
  Uniques: 'Rares',
  open: 'Open casket',
  until: 'Until a rare',
  idle: 'The casket awaits.',
  reset: 'Reset this tier',
  dry: 'Watson weeps for you.',
  setup: 'Casket setup',
  // No chance read-out — just open the casket.
};

export default function ClueCasketSimulatorPage() {
  return (
    <LootSimulator
      title="Clue Casket Simulator"
      intro="Open reward caskets from beginner to master at the wiki's real rates — no steps, no puzzle boxes. Your tally is saved in this browser."
      contents={CLUES}
      storageKey="clue-loot-stats"
      strings={CLUE_STRINGS}
    />
  );
}
