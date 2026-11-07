/**
 * Static combat data for the Loadout Creator: weapon attack styles, prayers
 * and spellbooks. These are game-rule facts that change rarely (unlike item
 * data, which is regenerated from the game cache), so they live in code.
 */

// ----- item stats tuple (items.json, 4th element) -----
// Positions written by scripts/fetch-loadout-data.mjs; trailing zeros trimmed.
export const ST = {
  A_STAB: 0, A_SLASH: 1, A_CRUSH: 2, A_MAGIC: 3, A_RANGE: 4,
  D_STAB: 5, D_SLASH: 6, D_CRUSH: 7, D_MAGIC: 8, D_RANGE: 9,
  STR: 10, RSTR: 11, MDMG: 12, PRAYER: 13, SPEED: 14, CATEGORY: 15,
};
export const statOf = (stats, i) => stats?.[i] ?? 0;

// ----- attack styles -----

const style = (n, t, c) => ({ name: n, type: t, cls: c });
const RANGED_STYLES = [style('Accurate', 'Ranged', 'Accurate'), style('Rapid', 'Ranged', 'Rapid'), style('Longrange', 'Ranged', 'Longrange')];

const STYLE_SETS = {
  unarmed: { label: 'Unarmed', styles: [style('Punch', 'Crush', 'Accurate'), style('Kick', 'Crush', 'Aggressive'), style('Block', 'Crush', 'Defensive')] },
  axe: { label: 'Axe', styles: [style('Chop', 'Slash', 'Accurate'), style('Hack', 'Slash', 'Aggressive'), style('Smash', 'Crush', 'Aggressive'), style('Block', 'Slash', 'Defensive')] },
  blunt: { label: 'Blunt', styles: [style('Pound', 'Crush', 'Accurate'), style('Pummel', 'Crush', 'Aggressive'), style('Block', 'Crush', 'Defensive')] },
  bow: { label: 'Bow', styles: RANGED_STYLES },
  bulwark: { label: 'Bulwark', styles: [style('Pummel', 'Crush', 'Accurate'), style('Block', 'None', 'Defensive')] },
  chinchompa: { label: 'Chinchompa', styles: [style('Short fuse', 'Ranged', 'Accurate'), style('Medium fuse', 'Ranged', 'Rapid'), style('Long fuse', 'Ranged', 'Longrange')] },
  claw: { label: 'Claws', styles: [style('Chop', 'Slash', 'Accurate'), style('Slash', 'Slash', 'Aggressive'), style('Lunge', 'Stab', 'Controlled'), style('Block', 'Slash', 'Defensive')] },
  crossbow: { label: 'Crossbow', styles: RANGED_STYLES },
  partisan: { label: 'Partisan', styles: [style('Stab', 'Stab', 'Accurate'), style('Lunge', 'Stab', 'Aggressive'), style('Pound', 'Crush', 'Aggressive'), style('Block', 'Stab', 'Defensive')] },
  pickaxe: { label: 'Pickaxe', styles: [style('Spike', 'Stab', 'Accurate'), style('Impale', 'Stab', 'Aggressive'), style('Smash', 'Crush', 'Aggressive'), style('Block', 'Stab', 'Defensive')] },
  polearm: { label: 'Polearm', styles: [style('Jab', 'Stab', 'Controlled'), style('Swipe', 'Slash', 'Aggressive'), style('Fend', 'Stab', 'Defensive')] },
  salamander: { label: 'Salamander', styles: [style('Scorch', 'Slash', 'Aggressive'), style('Flare', 'Ranged', 'Accurate'), style('Blaze', 'Magic', 'Defensive')] },
  scythe: { label: 'Scythe', styles: [style('Reap', 'Slash', 'Accurate'), style('Chop', 'Slash', 'Aggressive'), style('Jab', 'Crush', 'Aggressive'), style('Block', 'Slash', 'Defensive')] },
  slashSword: { label: 'Slash sword', styles: [style('Chop', 'Slash', 'Accurate'), style('Slash', 'Slash', 'Aggressive'), style('Lunge', 'Stab', 'Controlled'), style('Block', 'Slash', 'Defensive')] },
  spear: { label: 'Spear', styles: [style('Lunge', 'Stab', 'Controlled'), style('Swipe', 'Slash', 'Controlled'), style('Pound', 'Crush', 'Controlled'), style('Block', 'Stab', 'Defensive')] },
  spiked: { label: 'Spiked', styles: [style('Pound', 'Crush', 'Accurate'), style('Pummel', 'Crush', 'Aggressive'), style('Spike', 'Stab', 'Controlled'), style('Block', 'Crush', 'Defensive')] },
  stabSword: { label: 'Stab sword', styles: [style('Stab', 'Stab', 'Accurate'), style('Lunge', 'Stab', 'Aggressive'), style('Slash', 'Slash', 'Aggressive'), style('Block', 'Stab', 'Defensive')] },
  staff: { label: 'Staff', styles: [style('Bash', 'Crush', 'Accurate'), style('Pound', 'Crush', 'Aggressive'), style('Focus', 'Crush', 'Defensive'), style('Spell', 'Magic', 'Autocast')] },
  thrown: { label: 'Thrown', styles: RANGED_STYLES },
  twoHanded: { label: 'Two-handed sword', styles: [style('Chop', 'Slash', 'Accurate'), style('Slash', 'Slash', 'Aggressive'), style('Smash', 'Crush', 'Aggressive'), style('Block', 'Slash', 'Defensive')] },
  whip: { label: 'Whip', styles: [style('Flick', 'Slash', 'Accurate'), style('Lash', 'Slash', 'Controlled'), style('Deflect', 'Slash', 'Defensive')] },
};

// Weapon category ids from the game cache -> style set. Derived by reading the
// category of a known weapon of each type (e.g. Abyssal whip = 150).
const CATEGORY_SET = {
  1: 'staff', 21: 'slashSword', 24: 'thrown', 25: 'stabSword', 26: 'blunt', 35: 'axe',
  36: 'spear', 37: 'crossbow', 39: 'spiked', 61: 'twoHanded', 64: 'bow', 65: 'claw',
  66: 'polearm', 67: 'pickaxe', 106: 'bow', 150: 'whip', 567: 'crossbow', 572: 'chinchompa',
  586: 'salamander', 1014: 'bulwark', 1193: 'scythe', 1588: 'partisan',
};

/** Style set for a weapon's stats tuple (null tuple = unarmed). */
export function weaponStyleSet(stats) {
  if (!stats) return STYLE_SETS.unarmed;
  const set = CATEGORY_SET[statOf(stats, ST.CATEGORY)];
  if (set) return STYLE_SETS[set];
  // Unknown category: guess from the weapon's attack bonuses.
  if (statOf(stats, ST.A_RANGE) > 0) return STYLE_SETS.bow;
  if (statOf(stats, ST.A_MAGIC) > 0) return STYLE_SETS.staff;
  return STYLE_SETS.slashSword;
}

// ----- prayers (standard book) -----
// tags: prayers sharing a tag can't be active together, like in game.
// a melee attack, s melee strength, d defence, r ranged, m magic, o overhead.
// icon: wiki image name when it differs from the prayer name.
const prayer = (name, level, tags, effect, icon) => ({ name, level, tags, effect, icon });
export const PRAYERS = [
  prayer('Thick Skin', 1, 'd', '+5% Defence'),
  prayer('Burst of Strength', 4, 's', '+5% Strength'),
  prayer('Clarity of Thought', 7, 'a', '+5% Attack'),
  prayer('Sharp Eye', 8, 'rasm', '+5% Ranged'),
  prayer('Mystic Will', 9, 'mars', '+5% Magic'),
  prayer('Rock Skin', 10, 'd', '+10% Defence'),
  prayer('Superhuman Strength', 13, 's', '+10% Strength'),
  prayer('Improved Reflexes', 16, 'a', '+10% Attack'),
  prayer('Rapid Restore', 19, '', 'Stats restore twice as fast'),
  prayer('Rapid Heal', 22, '', 'Hitpoints restore twice as fast'),
  prayer('Protect Item', 25, '', 'Keep one extra item on death'),
  prayer('Hawk Eye', 26, 'rasm', '+10% Ranged'),
  prayer('Mystic Lore', 27, 'mars', '+10% Magic'),
  prayer('Steel Skin', 28, 'd', '+15% Defence'),
  prayer('Ultimate Strength', 31, 's', '+15% Strength'),
  prayer('Incredible Reflexes', 34, 'a', '+15% Attack'),
  prayer('Protect from Magic', 37, 'o', 'Protection from magic attacks'),
  prayer('Protect from Missiles', 40, 'o', 'Protection from ranged attacks'),
  prayer('Protect from Melee', 43, 'o', 'Protection from melee attacks'),
  prayer('Eagle Eye', 44, 'rasm', '+15% Ranged'),
  prayer('Deadeye', 62, 'rasmd', '+18% Ranged attack and strength, +5% Defence'),
  prayer('Mystic Might', 45, 'mars', '+15% Magic'),
  prayer('Mystic Vigour', 63, 'marsd', '+18% Magic attack, +3% Magic damage, +5% Defence'),
  prayer('Retribution', 46, 'o', 'Deals damage on death'),
  prayer('Redemption', 49, 'o', 'Heals when below 10% Hitpoints'),
  prayer('Smite', 52, 'o', 'Drains opponent prayer with damage'),
  prayer('Preserve', 55, '', 'Boosted stats last longer'),
  prayer('Chivalry', 60, 'asdrm', '+15% Attack, +18% Strength, +20% Defence'),
  prayer('Piety', 70, 'asdrm', '+20% Attack, +23% Strength, +25% Defence'),
  prayer('Rigour', 74, 'rasmd', '+20% Ranged attack, +23% Ranged strength, +25% Defence'),
  prayer('Augury', 77, 'marsd', '+25% Magic attack, +4% Magic damage, +25% Defence'),
  // New prayers go at the end: the array index is what share links store.
  prayer('Zeal', 84, 'asdrm', '+25% Attack, +28% Strength, +25% Defence'),
];

export const prayersConflict = (a, b) => {
  for (const t of PRAYERS[a].tags) if (PRAYERS[b].tags.includes(t)) return true;
  return false;
};

// ----- spellbooks (combat spells only) -----

// icon: wiki image name when it differs from the spell name.
const spell = (name, level, icon) => ({ name, level, icon });
export const SPELLBOOKS = [
  {
    name: 'Standard',
    spells: [
      spell('Wind Strike', 1), spell('Confuse', 3), spell('Water Strike', 5), spell('Earth Strike', 9),
      spell('Weaken', 11), spell('Fire Strike', 13), spell('Wind Bolt', 17), spell('Curse', 19),
      spell('Bind', 20), spell('Water Bolt', 23), spell('Earth Bolt', 29), spell('Fire Bolt', 35),
      spell('Crumble Undead', 39), spell('Wind Blast', 41), spell('Water Blast', 47),
      spell('Iban Blast', 50), spell('Magic Dart', 50), spell('Snare', 50), spell('Earth Blast', 53),
      spell('Fire Blast', 59), spell('Saradomin Strike', 60), spell('Claws of Guthix', 60), spell('Flames of Zamorak', 60),
      spell('Wind Wave', 62), spell('Water Wave', 65), spell('Vulnerability', 66), spell('Earth Wave', 70),
      spell('Enfeeble', 73), spell('Fire Wave', 75), spell('Entangle', 79), spell('Charge', 80), spell('Stun', 80),
      spell('Wind Surge', 81), spell('Tele Block', 85), spell('Water Surge', 85),
      spell('Earth Surge', 90), spell('Fire Surge', 95),
    ],
  },
  {
    name: 'Ancient',
    spells: [
      spell('Smoke Rush', 50), spell('Shadow Rush', 52), spell('Blood Rush', 56), spell('Ice Rush', 58),
      spell('Smoke Burst', 62), spell('Shadow Burst', 64), spell('Blood Burst', 68), spell('Ice Burst', 70),
      spell('Smoke Blitz', 74), spell('Shadow Blitz', 76), spell('Blood Blitz', 80), spell('Ice Blitz', 82),
      spell('Smoke Barrage', 86), spell('Shadow Barrage', 88), spell('Blood Barrage', 92), spell('Ice Barrage', 94),
    ],
  },
  {
    name: 'Lunar',
    spells: [
      spell('Cure Other', 68), spell('Cure Me', 71), spell('Cure Group', 74), spell('Heal Other', 92),
      spell('Vengeance Other', 93), spell('Vengeance', 94), spell('Heal Group', 95), spell('Spellbook Swap', 96),
    ],
  },
  {
    name: 'Arceuus',
    spells: [
      spell('Ghostly Grasp', 35), spell('Resurrect Lesser Thrall', 38, 'Resurrect Lesser Ghost'),
      spell('Inferior Demonbane', 44), spell('Ward of Arceuus', 56), spell('Skeletal Grasp', 56),
      spell('Resurrect Superior Thrall', 57, 'Resurrect Superior Ghost'), spell('Mark of Darkness', 59),
      spell('Superior Demonbane', 62), spell('Resurrect Greater Thrall', 76, 'Resurrect Greater Ghost'),
      spell('Undead Grasp', 79), spell('Death Charge', 80), spell('Dark Demonbane', 82),
    ],
  },
];
