/**
 * Settings shared by every loot simulator (bosses, raids, clue caskets), and
 * the browser-storage keys their records live under.
 */
export const LOOT_SIM_KEYS = {
  boss: 'boss-loot-stats',
  raid: 'raid-loot-stats',
  clue: 'clue-loot-stats',
};

const PREFS_KEY = 'loot-sim-prefs';

// save: keep results in this browser between visits.
// confirm: ask before anything that clears results.
const DEFAULT_PREFS = { save: true, confirm: true };

export function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY)) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
}

/** Delete every loot simulator's saved results from this browser. */
export function forgetAllResults() {
  for (const key of Object.values(LOOT_SIM_KEYS)) {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  }
}
