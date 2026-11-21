/**
 * Every boss the Boss Loot Simulator knows, grouped into the picker's
 * categories. Each data file exports plain boss descriptions (see
 * boss-loot-engine.js for the shape); bossConfig() turns them into configs
 * the shared LootSimulator runs.
 */
import { bossConfig } from '../boss-loot-engine.js';
import { SLAYER_BOSSES } from './slayer.js';
import { WILDERNESS_BOSSES } from './wilderness.js';

const theme = (accent, accent2, glow) => ({ accent, accent2, glow });

export const BOSS_CATEGORIES = [
  { id: 'slayer', name: 'Slayer', theme: theme('#8fc25a', '#64953a', 'rgba(143, 194, 90, 0.35)') },
  { id: 'wilderness', name: 'Wilderness', theme: theme('#e2574c', '#b23a31', 'rgba(226, 87, 76, 0.38)') },
  { id: 'gwd', name: 'God Wars', theme: theme('#e0b84a', '#b88a26', 'rgba(224, 184, 74, 0.35)') },
  { id: 'world', name: 'World bosses', theme: theme('#6fb5e0', '#4a8ab8', 'rgba(111, 181, 224, 0.35)') },
  { id: 'dt2', name: 'Desert Treasure II', theme: theme('#b98aff', '#8a5fd0', 'rgba(185, 138, 255, 0.38)') },
  { id: 'varlamore', name: 'Varlamore', theme: theme('#f08a4b', '#c4632b', 'rgba(240, 138, 75, 0.38)') },
  { id: 'minigame', name: 'Minigames & skilling', theme: theme('#5fc9b8', '#3e9a8b', 'rgba(95, 201, 184, 0.35)') },
];

const byId = new Map(BOSS_CATEGORIES.map((c) => [c.id, c]));

// Groups go live one at a time: add a data file's export here to ship it.
const GROUPS = [SLAYER_BOSSES, WILDERNESS_BOSSES];

export const BOSSES = GROUPS.flat().map((boss) => bossConfig(boss, byId.get(boss.category)));
