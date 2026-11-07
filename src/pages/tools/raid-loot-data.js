/**
 * Raid configs for the loot simulator. The engine (raid-loot-engine.js) is
 * content-agnostic; everything raid-specific lives here.
 *
 * Rates and tables follow the Old School RuneScape Wiki as of November 2026,
 * including the August 2026 Chambers of Xeric unique rebalance and the 2025
 * Tombs of Amascut scaling changes. Simplifications: unique recipients assume
 * an even-performing team, CoX herb rolls always arrive as herbs (in game a
 * third arrive as seeds), and death penalties are not modelled.
 */

// Uniform quantity range, with an optional bonus-multiplier chance
// (e.g. The Fractured Archive's 1/51 chance of 5x on a roll).
const row = (name, weight, min, max, bonus = null) => ({
  name,
  weight,
  qty: (values, rng) => {
    let q = min + Math.floor(rng() * (max - min + 1));
    if (bonus && rng() < bonus.chance) q *= bonus.mult;
    return q;
  },
});

// Chambers of Xeric: each death costs 40% of your personal points.
const coxPersonal = (v) => (v.points || 0) * 0.6 ** (v.deaths || 0);

// Quantity is linear in personal points; maxQty is the amount at the
// 131,071-point cap.
const coxRow = (name, maxQty) => ({
  name,
  weight: 1,
  qty: (values) => Math.max(1, Math.round(maxQty * Math.min(coxPersonal(values), 131071) / 131071)),
});

// Tombs of Amascut: quantity = points / divisor, boosted past raid level 300.
const toaRow = (name, divisor) => ({
  name,
  weight: 1,
  qty: (values) => {
    const level = toaRaidLevel(values.invos);
    const mult = level >= 300 ? 1.15 + 0.01 * ((level - 300) / 5) : 1;
    return Math.max(1, Math.round((toaPoints(values) / divisor) * mult));
  },
});

const x5 = { chance: 1 / 51, mult: 5 };

// ToA's unique chance: 1% per (10,500 − 20×RL) points, RL softened above 310.
function toaScaledLevel(raidLevel) {
  if (raidLevel <= 310) return raidLevel;
  if (raidLevel <= 430) return 310 + (raidLevel - 310) / 3;
  return 350 + (raidLevel - 430) / 6;
}

// Every ToA invocation with its raid level value, grouped as in game.
// (Kept above RAIDS: the config references these at module load.)
// Groups marked exclusive allow only one active invocation. `icon` is the
// wiki image used for the group's invocations, like the in-game interface's
// shared category art; an option's third element overrides it.
export const TOA_INVOCATIONS = [
  { label: 'Attempts', exclusive: true, icon: 'Invocations - attempts icon', options: [['Try Again', 5], ['Persistence', 10], ['Softcore Run', 15], ['Hardcore Run', 25]] },
  { label: 'Time limit', exclusive: true, icon: 'Invocations - time limit icon', options: [['Walk for It', 10], ['Jog for It', 15], ['Run for It', 20], ['Sprint for It', 25]] },
  { label: 'Helpful spirit', exclusive: true, icon: 'Invocations - helpful spirit icon', options: [['Need Some Help?', 15], ['Need Less Help?', 25], ['No Help Needed', 40]] },
  { label: 'Path level', exclusive: true, icon: 'Invocations - path level up icon', options: [['Pathseeker', 15], ['Pathfinder', 40], ['Pathmaster', 50]] },
  { label: 'Paths', icon: 'Invocations - Walk the Path icon', options: [['Walk the Path', 50]] },
  { label: 'Prayer', icon: 'Invocations - prayer effectiveness icon', options: [['Quiet Prayers', 20], ['Deadly Prayers', 20]] },
  {
    label: 'Restoration',
    icon: 'Invocations - On a Diet icon',
    options: [
      ['On a Diet', 15, 'Invocations - On a Diet icon'],
      ['Dehydration', 30, 'Invocations - Dehydration icon'],
      ['Overly Draining', 15, 'Invocations - Overly Draining icon'],
    ],
  },
  { label: 'Kephri', icon: 'Kephri icon', options: [['Lively Larvae', 5], ['More Overlords', 15], ['Blowing Mud', 10], ['Medic!', 15], ['Aerial Assault', 10]] },
  { label: 'Zebak', icon: 'Zebak icon', options: [['Not Just a Head', 15], ['Arterial Spray', 10], ['Blood Thinners', 5], ['Upset Stomach', 15]] },
  { label: 'Akkha', icon: 'Akkha icon', options: [['Double Trouble', 20], ['Keep Back', 10], ['Stay Vigilant', 15], ['Feeling Special?', 20]] },
  { label: 'Ba-Ba', icon: 'Ba-Ba icon', options: [['Mind the Gap!', 10], ['Gotta Have Faith', 10], ['Jungle Japes', 5], ['Shaking Things Up', 10], ['Boulderdash', 10]] },
  { label: 'The Wardens', icon: "Tumeken's Warden icon", options: [['Ancient Haste', 10], ['Acceleration', 10], ['Penetration', 10], ['Overclocked', 10], ['Overclocked 2', 10], ['Insanity', 50]] },
];

// What each invocation does, for tooltips (condensed from the wiki).
export const TOA_INVO_INFO = {
  'Try Again': 'Ten attempts to complete the raid.',
  'Persistence': 'Five attempts to complete the raid.',
  'Softcore Run': 'Three attempts to complete the raid.',
  'Hardcore Run': 'One attempt to complete the raid.',
  'Walk for It': '40 minutes to complete; failing lowers the raid level by 20.',
  'Jog for It': '35 minutes to complete; failing lowers the raid level by 30.',
  'Run for It': '30 minutes to complete; failing lowers the raid level by 40.',
  'Sprint for It': '25 minutes to complete; failing lowers the raid level by 50.',
  'Need Some Help?': 'Helpful Spirit supplies cut to 66%.',
  'Need Less Help?': 'Helpful Spirit supplies cut to 33%.',
  'No Help Needed': 'Helpful Spirit supplies cut to 10%.',
  'Pathseeker': 'All paths level up once on entry.',
  'Pathfinder': 'All paths level up twice on entry.',
  'Pathmaster': 'All paths level up three times on entry.',
  'Walk the Path': 'Completing a path levels up the remaining paths.',
  'Quiet Prayers': 'Protection prayers are 10% less effective.',
  'Deadly Prayers': 'Prayer points drain by 20% of damage taken.',
  'On a Diet': 'No eating food; potions still work.',
  'Dehydration': 'No health-restoring potions.',
  'Overly Draining': 'Special attacks cost 100% energy.',
  'Lively Larvae': "Kephri's Mass Incubation launches 4 eggs instead of 2.",
  'More Overlords': 'An extra scarab during Kephri\'s shield-healing phases.',
  'Blowing Mud': "Kephri's Dung Strike targets two players (no effect solo).",
  'Medic!': 'Kephri summons healing scarab swarms outside healing phases.',
  'Aerial Assault': "Kephri's auto-attack hits harder over a 3x3 area.",
  'Not Just a Head': 'Zebak sometimes casts Blood Blitz on all players.',
  'Arterial Spray': "Zebak's blood magic has more range and healing.",
  'Blood Thinners': 'Three Blood Clouds spawn instead of one.',
  'Upset Stomach': 'Acid pools spread 5x5; water jugs only cover 3x3.',
  'Double Trouble': 'Akkha performs two special attacks at once.',
  'Keep Back': 'Akkha uses melee alongside ranged and magic.',
  'Stay Vigilant': 'Akkha specials every 6 attacks and keeps his style.',
  'Feeling Special?': 'Akkha\'s specials are harder: X detonate, fast memory, extra orb.',
  'Mind the Gap!': "Ba-Ba's knockback drops you into the pit at 66% and 33%.",
  'Gotta Have Faith': 'Energy blasts hurt more the more prayer you have.',
  'Jungle Japes': 'Dead baboons drop stunning banana peels.',
  'Shaking Things Up': "Ba-Ba's slam shockwave grows from 3x3 to 5x5.",
  'Boulderdash': "Ba-Ba's boulders spawn twice as fast.",
  'Ancient Haste': 'P1: the Wardens charge their obelisk faster.',
  'Acceleration': 'P2: the Warden attacks and the obelisk charges faster.',
  'Penetration': 'P2: obelisk specials hit harder and pierce overheads.',
  'Overclocked': 'P3: slams are 1 tick faster.',
  'Overclocked 2': 'P3: slams are 2 ticks faster.',
  'Insanity': 'P3: 3-tick slams that resume where they left off.',
};

const TOA_RL = new Map(TOA_INVOCATIONS.flatMap((g) => g.options));
export const toaRaidLevel = (invos) => invos.reduce((n, name) => n + (TOA_RL.get(name) ?? 0), 0);

const ENTRY_150 = ['Softcore Run', 'Jog for It', 'Need Less Help?', 'Pathseeker', 'Walk the Path', 'Overly Draining', 'Arterial Spray', 'Blood Thinners'];
const EXPERT_300 = ['Hardcore Run', 'Sprint for It', 'No Help Needed', 'Pathfinder', 'Quiet Prayers', 'On a Diet', 'Overly Draining', 'Not Just a Head', 'Upset Stomach', 'Blood Thinners', 'Stay Vigilant', 'Double Trouble', 'Mind the Gap!', 'Gotta Have Faith', 'Ancient Haste', 'Acceleration', 'Penetration'];
const LEVEL_405 = [...EXPERT_300, 'Walk the Path', 'Overclocked', 'Overclocked 2', 'Boulderdash', 'Blowing Mud', 'Lively Larvae', 'Keep Back'];
const LEVEL_450 = [...LEVEL_405, 'Dehydration', 'Medic!'];
const LEVEL_600 = TOA_INVOCATIONS.flatMap((g) => (g.exclusive ? [g.options[g.options.length - 1][0]] : g.options.map((o) => o[0])));

// Monster HP (and so the damage you deal, and so your points) grows 2% per
// 5 raid levels. Calibrated to ~20k at the chest for a typical solo 300.
export const toaSuggestedPoints = (level) => Math.round((9091 * (1 + 0.004 * level)) / 100) * 100;

export const TOA_PRESETS = [
  { label: 'Entry (150)', invos: ENTRY_150 },
  { label: 'Expert (300)', invos: EXPERT_300 },
  { label: 'High invo (405)', invos: LEVEL_405 },
  { label: 'Pet hunter (450)', invos: LEVEL_450 },
  { label: 'Everything on (600)', invos: LEVEL_600 },
];

/**
 * ToA reward points: 1 damage = 1 point, but the Wardens pay 2x in P2 and
 * 2.5x in P3, while core damage pays nothing (it hits the Warden at 5x).
 * So the point-maxing strategies are about converting "free" damage into
 * damage you deal yourself at the Wardens multipliers:
 *  - 3-down core: stagger with minimal core damage so P2 runs a third cycle,
 *    leaving more Warden health to kill directly at 2x (~+2,800 points).
 *  - Skull skip: ignore the P3 skull mechanic so its damage never lands,
 *    and claim that health yourself at 2.5x (~+2,500 points).
 * Each death costs 20% of total points. Every raid starts with 5,000 points
 * that are deducted again at the chest, so a 25,000-point solo 300 works out
 * to 20,000/4,500 = 4.44% — the wiki's 1-in-22.5. Capped at the 64,000 max.
 */
function toaPoints(v) {
  let pts = v.points + (v.threeDown ? 2800 : 0) + (v.skullSkip ? 2500 : 0);
  pts *= 0.8 ** v.deaths;
  return Math.max(0, Math.min(Math.round(pts), 64000) - 5000);
}

export const RAIDS = [
  {
    id: 'cox',
    name: 'Chambers of Xeric',
    short: 'Chambers of Xeric',
    emblem: '🦎',
    teamKey: 'scale',
    tagline: 'Scale Mount Quidamortem and crack the Great Olm\'s vault. Every 8,676 points is another 1% at a purple.',
    theme: { accent: '#6fcf6f', accent2: '#3e7d4e', glow: 'rgba(111, 207, 111, 0.35)' },
    inputs: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        default: 0,
        options: [
          // Picking a mode also resets the points slider to that mode's
          // typical solo: CM enemies have +50% stats, plus a 5k time bonus.
          { value: 0, label: 'Normal', set: { points: 30000 } },
          { value: 1, label: 'Challenge Mode', set: { points: 50000 } },
        ],
        hint: 'Challenge Mode shifts the unique table toward ancestral and can award metamorphic dust and the twisted kit (speed runs only).',
      },
      {
        key: 'scale',
        label: 'Party size (scaling)',
        type: 'range',
        min: 1,
        max: 100,
        step: 1,
        default: 1,
        hint: 'Chambers scales to the party. The whole team\'s points set the purple chance; your own points set your share and loot size.',
      },
      {
        key: 'points',
        label: 'Your points',
        type: 'range',
        min: 5000,
        max: 150000,
        step: 1000,
        default: 30000,
        hint: 'A clean normal solo lands near 30k, a CM solo near 50k. Loot quantity caps at 131,071 personal points.',
      },
      {
        key: 'deaths',
        label: 'Your deaths',
        type: 'select',
        default: 0,
        options: [0, 1, 2, 3].map((n) => ({ value: n, label: n === 0 ? 'None (deathless)' : `${n} (−${Math.round((1 - 0.6 ** n) * 100)}% of your points)` })),
      },
    ],
    // Team purple chance is 1% per 8,676 TOTAL points (capped 65.7% at 570k);
    // your chance is the team's, weighted by your share of the points.
    // Teammates are assumed to match your base points, deathless.
    uniqueChance: (v) => {
      const scale = Math.max(1, v.scale || 1);
      const mine = coxPersonal(v);
      const total = mine + v.points * (scale - 1);
      return Math.min(total / 867600, 0.657) * (mine / total || 0);
    },
    teamUniqueChance: (v) => {
      const scale = Math.max(1, v.scale || 1);
      const total = coxPersonal(v) + v.points * (scale - 1);
      return Math.min(total / 867600, 0.657);
    },
    // Who receives a team purple: weighted by personal points.
    shareWeights: (v, n) => [coxPersonal(v), ...Array(n - 1).fill(v.points)],
    summary: (v) => {
      const scale = Math.max(1, v.scale || 1);
      const mine = Math.round(coxPersonal(v));
      const total = Math.round(mine + v.points * (scale - 1));
      const team = Math.min(total / 867600, 0.657);
      let s = `Your points: ${mine.toLocaleString()} · team ${total.toLocaleString()} → ${(team * 100).toFixed(1)}% team purple`;
      if (total >= 570000) s += ' (65.7% cap)';
      if (scale > 1 || v.deaths > 0) s += ` · your share ${(100 * (mine / total)).toFixed(0)}%`;
      return s;
    },
    // 12 August 2026 rebalance weights; Challenge Mode trims the prayer
    // scrolls further (total 56 vs normal's 60).
    uniques: (v) => [
      { name: 'Dexterous prayer scroll', weight: v.mode === 1 ? 12 : 14 },
      { name: 'Arcane prayer scroll', weight: v.mode === 1 ? 12 : 14 },
      { name: 'Twisted buckler', weight: 4 },
      { name: 'Dragon hunter crossbow', weight: 4 },
      { name: 'Ancestral hat', weight: 4 },
      { name: 'Ancestral robe top', weight: 4 },
      { name: 'Ancestral robe bottom', weight: 4 },
      { name: "Dinh's bulwark", weight: 3 },
      { name: 'Dragon claws', weight: 3 },
      { name: 'Elder maul', weight: 2 },
      { name: 'Kodai insignia', weight: 2 },
      { name: 'Twisted bow', weight: 2 },
    ],
    // Challenge Mode tertiaries (both need the raid beaten within the time
    // threshold; the simulator assumes you made it).
    extras: (v, rng) => {
      const out = [];
      if (v.mode === 1) {
        if (rng() < 1 / 400) out.push({ name: 'Metamorphic dust' });
        if (rng() < 1 / 75) out.push({ name: 'Twisted ancestral colour kit' });
      }
      return out;
    },
    regular: {
      rolls: 2,
      distinct: true,
      table: [
        coxRow('Death rune', 3640),
        coxRow('Blood rune', 4095),
        coxRow('Soul rune', 6553),
        coxRow('Rune arrow', 9362),
        coxRow('Dragon arrow', 648),
        coxRow('Grimy ranarr weed', 138),
        coxRow('Grimy toadflax', 210),
        coxRow('Grimy irit leaf', 675),
        coxRow('Grimy avantoe', 337),
        coxRow('Grimy kwuarm', 289),
        coxRow('Grimy snapdragon', 84),
        coxRow('Grimy cadantine', 330),
        coxRow('Grimy lantadyme', 442),
        coxRow('Grimy dwarf weed', 546),
        coxRow('Grimy torstol', 134),
        coxRow('Silver ore', 6553),
        coxRow('Coal', 6553),
        coxRow('Gold ore', 2978),
        coxRow('Mithril ore', 4095),
        coxRow('Adamantite ore', 789),
        coxRow('Runite ore', 65),
        coxRow('Uncut sapphire', 697),
        coxRow('Uncut emerald', 923),
        coxRow('Uncut ruby', 541),
        coxRow('Uncut diamond', 258),
        coxRow('Lizardman fang', 4681),
        coxRow('Pure essence', 65535),
        coxRow('Saltpetre', 4681),
        coxRow('Teak plank', 1365),
        coxRow('Mahogany plank', 550),
        coxRow('Dynamite', 2427),
      ],
    },
    // onUnique: the pet rides on the unique recipient's roll, so a whole-team
    // view must not multiply it by the team size.
    pet: { name: 'Olmlet', onUnique: true, chance: (v, { unique }) => (unique ? 1 / 53 : 0) },
  },

  {
    id: 'tob',
    name: 'Theatre of Blood',
    short: 'Theatre of Blood',
    emblem: '🦇',
    teamKey: 'team',
    tagline: 'Survive Ver Sinhaza\'s blood-soaked gauntlet. A deathless theatre pays one purple roughly every nine clears.',
    theme: { accent: '#d14545', accent2: '#7a1f1f', glow: 'rgba(209, 69, 69, 0.35)' },
    inputs: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        default: 0,
        options: [
          { value: 0, label: 'Normal' },
          { value: 1, label: 'Hard Mode' },
        ],
      },
      {
        key: 'team',
        label: 'Team size',
        type: 'select',
        default: 4,
        options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} player${n > 1 ? 's' : ''}` })),
        hint: 'The team rolls one chest; your share assumes equal performance.',
      },
      {
        key: 'deaths',
        label: 'Team deaths',
        type: 'select',
        default: 0,
        options: [0, 1, 2, 3, 4].map((n) => ({ value: n, label: n === 0 ? 'None (deathless)' : String(n) })),
        hint: 'Each death costs ~4 of the team\'s raid points (community model; the wiki publishes no exact figure).',
      },
    ],
    // Deathless team rate 1/9.1 (HM 1/7.7), scaled by raid score: ~18 points
    // per player + 14 MVP points, each death costing 4.
    uniqueChance: (v) => {
      const n = Math.max(1, v.team || 1);
      const max = 18 * n + 14;
      const mult = Math.max(0, (max - 4 * (v.deaths || 0)) / max);
      return ((v.mode === 1 ? 1 / 7.7 : 1 / 9.1) * mult) / n;
    },
    uniques: (v) => (v.mode === 1
      ? [
          { name: 'Avernic defender hilt', weight: 7 },
          { name: 'Ghrazi rapier', weight: 2 },
          { name: 'Sanguinesti staff (uncharged)', weight: 2 },
          { name: 'Justiciar faceguard', weight: 2 },
          { name: 'Justiciar chestguard', weight: 2 },
          { name: 'Justiciar legguards', weight: 2 },
          { name: 'Scythe of vitur (uncharged)', weight: 1 },
        ]
      : [
          { name: 'Avernic defender hilt', weight: 8 },
          { name: 'Ghrazi rapier', weight: 2 },
          { name: 'Sanguinesti staff (uncharged)', weight: 2 },
          { name: 'Justiciar faceguard', weight: 2 },
          { name: 'Justiciar chestguard', weight: 2 },
          { name: 'Justiciar legguards', weight: 2 },
          { name: 'Scythe of vitur (uncharged)', weight: 1 },
        ]),
    regular: {
      rolls: 3,
      table: [
        row('Vial of blood', 2, 45, 60),
        row('Death rune', 1, 500, 600),
        row('Blood rune', 1, 500, 600),
        row('Swamp tar', 1, 500, 600),
        row('Coal', 1, 500, 600),
        row('Gold ore', 1, 300, 360),
        row('Molten glass', 1, 200, 240),
        row('Adamantite ore', 1, 130, 156),
        row('Runite ore', 1, 60, 72),
        row('Wine of zamorak', 1, 50, 60),
        row('Potato cactus', 1, 50, 60),
        row('Grimy cadantine', 1, 50, 60),
        row('Grimy avantoe', 1, 40, 48),
        row('Grimy toadflax', 1, 37, 44),
        row('Grimy kwuarm', 1, 36, 43),
        row('Grimy irit leaf', 1, 34, 40),
        row('Grimy ranarr weed', 1, 30, 36),
        row('Grimy snapdragon', 1, 27, 32),
        row('Grimy lantadyme', 1, 26, 31),
        row('Grimy dwarf weed', 1, 24, 28),
        row('Grimy torstol', 1, 20, 24),
        row('Battlestaff', 1, 15, 18),
        row('Rune battleaxe', 1, 4, 4),
        row('Rune platebody', 1, 4, 4),
        row('Rune chainbody', 1, 4, 4),
        row('Palm tree seed', 1, 3, 3),
        row('Yew seed', 1, 3, 3),
        row('Magic seed', 1, 3, 3),
        row('Mahogany seed', 1, 10, 12),
      ],
    },
    pet: { name: "Lil' zik", chance: (v) => (v.mode === 1 ? 1 / 500 : 1 / 650) },
  },

  {
    id: 'toa',
    name: 'Tombs of Amascut',
    short: 'Tombs of Amascut',
    emblem: '🪲',
    teamKey: 'scale',
    tagline: 'Brave the tombs of the Jaltevas necropolis. Raise the invocations to raise the stakes — and the odds.',
    theme: { accent: '#e0b35c', accent2: '#8a6a2f', glow: 'rgba(224, 179, 92, 0.4)' },
    inputs: [
      {
        key: 'invos',
        label: 'Invocations',
        type: 'invocations',
        groups: TOA_INVOCATIONS,
        info: TOA_INVO_INFO,
        presets: TOA_PRESETS,
        default: EXPERT_300,
        hint: 'Masori and the shadow need raid level 150+.',
        // Harder raids mean beefier monsters, more damage dealt, more points:
        // changing invocations re-estimates the points slider.
        onSet: (invos) => ({ points: toaSuggestedPoints(toaRaidLevel(invos)) }),
      },
      {
        key: 'points',
        label: 'Points at the chest',
        type: 'range',
        min: 1500,
        max: 60000,
        step: 500,
        default: 20000,
        hint: 'The total the game shows when the raid ends. It re-estimates when you change invocations (beefier monsters = more damage = more points) — tweak it to match your own raids.',
      },
      {
        key: 'threeDown',
        label: '3-down core (P2)',
        type: 'check',
        default: false,
        hint: 'Adds ~2,800 points on top of your total. Leave off if your raids already 3-down.',
      },
      {
        key: 'skullSkip',
        label: 'Skull skip (P3)',
        type: 'check',
        default: false,
        hint: 'Adds ~2,500 points on top of your total. Leave off if your raids already skull skip.',
      },
      {
        key: 'deaths',
        label: 'Your deaths',
        type: 'select',
        default: 0,
        options: [0, 1, 2, 3].map((n) => ({ value: n, label: n === 0 ? 'None (deathless)' : `${n} (−${Math.round((1 - 0.8 ** n) * 100)}% points)` })),
      },
      {
        key: 'scale',
        label: 'Party size (scaling)',
        type: 'range',
        min: 1,
        max: 8,
        step: 1,
        default: 1,
        hint: 'One purple roll per raid: the team\'s combined points set the chance, and your share of them decides whose it is. Teammates are assumed to match you.',
      },
    ],
    summary: (v) => {
      const scale = Math.max(1, v.scale || 1);
      const each = toaPoints(v);
      const per1pc = 10500 - 20 * toaScaledLevel(toaRaidLevel(v.invos));
      const team = Math.min((each * scale) / (per1pc * 100), 0.55);
      let s = `Counts toward loot: ${each.toLocaleString()} each — the 5,000 head start never counts`;
      s += ` · team ${(team * 100).toFixed(1)}% purple`;
      if ((each * scale) / (per1pc * 100) >= 0.55) s += ' (55% cap)';
      if (scale > 1) s += ` · your share ≈ 1/${scale}`;
      return s;
    },
    uniqueChance: (v) => {
      const scale = Math.max(1, v.scale || 1);
      const per1pc = 10500 - 20 * toaScaledLevel(toaRaidLevel(v.invos));
      return Math.min((toaPoints(v) * scale) / (per1pc * 100), 0.55) / scale;
    },
    // Fang and Lightbearer drop at any level; the rest need raid level 150+
    // (in game, lower levels re-roll them away 49 times out of 50).
    uniques: (v) => [
      { name: "Osmumten's fang", weight: 7 },
      { name: 'Lightbearer', weight: 7 },
      ...(toaRaidLevel(v.invos) >= 150
        ? [
            { name: "Elidinis' ward", weight: 3 },
            { name: 'Masori mask', weight: 2 },
            { name: 'Masori body', weight: 2 },
            { name: 'Masori chaps', weight: 2 },
            { name: "Tumeken's shadow (uncharged)", weight: 1 },
          ]
        : []),
    ],
    regular: {
      rolls: 3,
      table: [
        toaRow('Coins', 1),
        toaRow('Death rune', 20),
        toaRow('Soul rune', 40),
        toaRow('Gold ore', 90),
        toaRow('Dragon dart tip', 100),
        toaRow('Mahogany logs', 180),
        toaRow('Sapphire', 200),
        toaRow('Emerald', 250),
        toaRow('Gold bar', 250),
        toaRow('Potato cactus', 250),
        toaRow('Raw shark', 250),
        toaRow('Ruby', 300),
        toaRow('Diamond', 400),
        toaRow('Raw manta ray', 450),
        toaRow('Cactus spine', 600),
        toaRow('Dragonstone', 600),
        toaRow('Battlestaff', 1100),
        toaRow('Coconut milk', 1100),
        toaRow('Lily of the sands', 1100),
        toaRow('Toadflax seed', 2000),
        toaRow('Ranarr seed', 2500),
        toaRow('Torstol seed', 3200),
        toaRow('Snapdragon seed', 3200),
        toaRow('Dragon med helm', 4000),
        toaRow('Magic seed', 6500),
        toaRow('Blood essence', 7500),
        { name: 'Cache of runes', weight: 1, qty: () => 1 },
      ],
    },
    pet: {
      name: "Tumeken's guardian",
      chance: (v) => {
        const level = toaRaidLevel(v.invos);
        const rl = level <= 400 ? level : level <= 550 ? 400 + (level - 400) / 3 : 450;
        return toaPoints(v) / ((350000 - 700 * rl) * 100);
      },
    },
  },

  {
    id: 'tfa',
    name: 'The Fractured Archive',
    short: 'Fractured Archive',
    emblem: '📜',
    teamKey: 'team',
    tagline: 'Descend into Guthix\'s sealed archive beneath the Chasm of Tears. Contribution decides whose purple it is.',
    theme: { accent: '#4ecdc4', accent2: '#2a6f6a', glow: 'rgba(78, 205, 196, 0.35)' },
    inputs: [
      {
        key: 'team',
        label: 'Team size',
        type: 'range',
        min: 1,
        max: 8,
        step: 1,
        default: 1,
        hint: 'The team rate rises 4% per player beyond two; your share assumes an even split.',
      },
      {
        key: 'deaths',
        label: 'Your deaths',
        type: 'select',
        default: 0,
        options: [0, 1, 2, 3].map((n) => ({ value: n, label: n === 0 ? 'None (deathless)' : `${n} (−${10 * n}% contribution)` })),
        hint: 'Each death costs 10% of your expected contribution, shrinking your share of the purple (and heavy deaths risk a Cabbage, which isn\'t modelled).',
      },
    ],
    // Team rate: 1/14, ×1.04 per player beyond the second. Your chance is the
    // (death-reduced) team rate weighted by your contribution share; each of
    // your deaths removes 10% of your expected contribution.
    uniqueChance: (v) => {
      const team = Math.max(1, v.team || 1);
      const base = (1 / 14) * (team >= 3 ? 1.04 ** (team - 2) : 1);
      const mine = Math.max(0, 1 - 0.1 * (v.deaths || 0));
      return (base * mine) / team;
    },
    teamUniqueChance: (v) => {
      const team = Math.max(1, v.team || 1);
      const base = (1 / 14) * (team >= 3 ? 1.04 ** (team - 2) : 1);
      const mine = Math.max(0, 1 - 0.1 * (v.deaths || 0));
      return (base * (mine + (team - 1))) / team;
    },
    // Who receives a team purple: weighted by contribution (deaths cost you 10% each).
    shareWeights: (v, n) => [Math.max(0, 1 - 0.1 * (v.deaths || 0)), ...Array(n - 1).fill(1)],
    uniques: [
      { name: 'Rondache', weight: 5 },
      { name: "Zorya's tome (uncharged)", weight: 4 },
      { name: 'Horn of Bran', weight: 3 },
      { name: 'Ascension crossbows', weight: 2 },
      { name: 'Obligator (uncharged)', weight: 1 },
    ],
    regular: {
      rolls: 3,
      table: [
        row('Ascension shards', 55, 75, 82, x5),
        row('Battlestaff', 11, 34, 37, x5),
        row('Dragon platelegs', 11, 1, 1, x5),
        row('Dragon plateskirt', 11, 1, 1, x5),
        row('Rune kiteshield', 11, 5, 7, x5),
        row('Nature rune', 11, 301, 385, x5),
        row('Astral rune', 11, 301, 385, x5),
        row('Blood rune', 11, 301, 385, x5),
        row('Soul rune', 11, 301, 380, x5),
        row('Earth rune', 11, 3009, 3662, x5),
        row('Sapphire', 11, 24, 27, x5),
        row('Emerald', 11, 24, 26, x5),
        row('Ruby', 11, 23, 27, x5),
        row('Diamond', 11, 24, 26, x5),
        row('Onyx bolt tips', 11, 50, 58, x5),
        row('Earth orb', 11, 68, 75, x5),
        row('Grimy harralander', 7, 60, 66, x5),
        row('Grimy ranarr weed', 7, 18, 20, x5),
        row('Grimy toadflax', 7, 24, 28, x5),
        row('Snapdragon seed', 7, 3, 4, x5),
        row('Kwuarm seed', 7, 7, 8, x5),
        row('Snape grass seed', 7, 7, 8, x5),
        row('Yew seed', 7, 4, 5, x5),
        row('Wine of zamorak', 7, 32, 36, x5),
        row('Iron ore', 6, 851, 915, x5),
        row('Adamantite ore', 6, 60, 72, x5),
        row('Runite ore', 6, 25, 26, x5),
        row('Desiccated page', 6, 30, 36, x5),
        row('Aether catalyst', 6, 180, 191, x5),
        row('Pure essence', 6, 1404, 1632, x5),
        row('Mahogany logs', 6, 140, 152, x5),
        row('Dragon arrowtips', 6, 350, 369, x5),
        row('Raw shark', 6, 80, 92, x5),
      ],
    },
    // Tertiary rolls: elite clue, elemental spell fragments, the folio.
    extras: (v, rng) => {
      const out = [];
      if (rng() < 1 / 10) out.push({ name: 'Clue scroll (elite)' });
      if (rng() < 4 / 80) {
        const frags = ['Fragment of whispering wind', 'Fragment of deep water', 'Fragment of living earth', 'Fragment of burning fire'];
        out.push({ name: frags[Math.floor(rng() * frags.length)] });
      }
      if (rng() < 1 / 15) out.push({ name: "Archivist's folio" });
      return out;
    },
    pet: { name: 'Orion', chance: () => 1 / 750 },
  },
];
