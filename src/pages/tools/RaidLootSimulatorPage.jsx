import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RAIDS } from './raid-loot-data.js';
import { runRaid, runMany, atLeastOnce, uniquesOf } from './raid-loot-engine.js';
import { useItemData, useNameIndex, useUiData, ItemIcon, UiIcon } from './loadout-items.jsx';
import { LOOT_SIM_KEYS, loadPrefs, savePrefs, forgetAllResults } from './loot-sim-prefs.js';
import './RaidLootSimulatorPage.css';

const UNTIL_CAP = 25000; // completions before "until purple" gives up
const BULK_MAX = 100000; // most completions one bulk open runs

// All the raid-flavoured wording in one place, so other content (clue
// caskets) can rent the page with its own vocabulary.
const RAID_STRINGS = {
  noun: 'raid',
  nouns: 'raids',
  unique: 'purple',
  uniques: 'purples',
  Unique: 'Purple',
  Uniques: 'Purples',
  open: 'Open chest',
  until: 'Until purple',
  idle: 'The chest awaits.',
  reset: 'Reset this raid',
  dry: 'The desert is cruel.',
  setup: 'Raid setup',
  chance: 'Unique chance:',
};

// Each raid keeps three separate records, one per way of raiding.
const PERSPECTIVES = [
  { id: 'solo', label: 'Solo', desc: 'You raid alone — team size is ignored.' },
  { id: 'share', label: 'You in a team', desc: 'Your own chest as one member of the team.' },
  { id: 'team', label: 'Whole team', desc: 'Everything the entire team pulls per raid.' },
];

// totals: every item received since the last reset, { name: { qty, unique } }.
// totalsFrom: the kc the tally started at (records saved before it existed
// start counting loot from where they are).
const emptyStats = () => ({ kc: 0, dry: 0, pets: 0, uniqueCount: 0, uniques: [], totals: {}, totalsFrom: 0 });

/** Add one result's loot ([{ name, qty, unique }]) into a running Map. */
function tally(map, loot) {
  for (const l of loot) {
    const t = map.get(l.name) ?? { qty: 0, unique: !!l.unique };
    t.qty += l.qty;
    map.set(l.name, t);
  }
  return map;
}

function loadStats(storageKey, migrate) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey));
    if (raw && typeof raw === 'object') {
      // Older raid saves were keyed by raid id alone; they were team-share records.
      if (migrate) {
        for (const k of Object.keys(raw)) {
          if (!k.includes(':')) {
            raw[`${k}:share`] = raw[k];
            delete raw[k];
          }
        }
      }
      return raw;
    }
  } catch { /* fresh start */ }
  return {};
}

/**
 * Adapt a raid config to the chosen perspective. 'share' is the config as
 * written; 'solo' runs it with a team of one (handled via the values);
 * 'team' rolls the whole team's chest: the full team unique rate, everyone's
 * regular loot (minus the recipient's forfeited rolls where the raid does
 * that), and everyone's tertiary rolls.
 */
function perspectiveConfig(raid, persp, n) {
  if (persp !== 'team' || n <= 1) return raid;
  return {
    ...raid,
    // Prefer an exact whole-team rate when the raid defines one (deaths make
    // "your chance × n" undercount the team's).
    uniqueChance: (v) => Math.min(raid.teamUniqueChance ? raid.teamUniqueChance(v) : raid.uniqueChance(v) * n, 1),
    regularWithUnique: true,
    regular: {
      ...raid.regular,
      distinct: false,
      rolls: (v, unique) => {
        const base = typeof raid.regular.rolls === 'function' ? raid.regular.rolls(v) : raid.regular.rolls;
        return base * n - (unique && !raid.regularWithUnique ? base : 0);
      },
    },
    pet: raid.pet && {
      ...raid.pet,
      chance: (v, ctx) => {
        const p = raid.pet.chance(v, ctx);
        return raid.pet.onUnique ? p : 1 - (1 - p) ** n;
      },
    },
    extras: raid.extras && ((v, rng) => Array.from({ length: n }, () => raid.extras(v, rng)).flat()),
    // Whose name is on a team purple: weighted by each player's share.
    recipient: (v, rng) => {
      const w = raid.shareWeights ? raid.shareWeights(v, n) : Array(n).fill(1);
      const total = w.reduce((a, b) => a + b, 0);
      let r = rng() * total;
      for (let i = 0; i < n; i++) {
        r -= w[i];
        if (r < 0) return i === 0 ? 'You' : `Player ${i + 1}`;
      }
      return 'You';
    },
  };
}

/** A card's emblem: an in-game item icon (boss pet, reward casket, …). */
function RaidEmblem({ raid, data, nameIndex, className = '' }) {
  const itemName = raid.emblemItem ?? raid.pet?.name;
  const ix = data && itemName ? nameIndex.get(itemName.toLowerCase()) : undefined;
  if (ix == null) return <span className={className}>{raid.emblem}</span>;
  return <span className={`${className} rl-emblem-item`}><ItemIcon data={data} index={ix} /></span>;
}

/** The wiki page for an item or page title ("Hydra's claw", "Theatre of Blood#Rewards"). */
function wikiUrl(title) {
  const [page, section] = title.split('#');
  const slug = (s) => encodeURIComponent(s.replace(/ /g, '_')).replace(/%2F/g, '/');
  return `https://oldschool.runescape.wiki/w/${slug(page)}${section ? `#${slug(section)}` : ''}`;
}

/** A chance as the wiki writes it: "1/520", "1/4.6"; tiny or zero chances read sensibly. */
function oneIn(p) {
  if (!(p > 0)) return 'never';
  if (p >= 1) return 'always';
  const n = 1 / p;
  return `1/${n < 100 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : Math.round(n).toLocaleString()}`;
}

/** The game's stack label: exact under 100K, then "123K" (white), then "45M" (green). */
function stackLabel(qty) {
  if (qty < 100000) return { text: qty.toLocaleString(), tier: '' };
  if (qty < 10000000) return { text: `${Math.floor(qty / 1000)}K`, tier: 'k' };
  return { text: `${Math.floor(qty / 1000000)}M`, tier: 'm' };
}

function LootItem({ data, nameIndex, name, qty, unique, style, compact = false }) {
  const ix = nameIndex.get(name.toLowerCase());
  const label = compact ? stackLabel(qty) : { text: qty.toLocaleString(), tier: '' };
  return (
    <div className={`rl-item ${unique ? 'unique' : ''}`} style={style} title={qty > 1 ? `${name} ×${qty.toLocaleString()}` : name}>
      <span className="rl-item-icon">
        {ix != null && data ? <ItemIcon data={data} index={ix} /> : <span className="rl-item-missing">?</span>}
        {qty > 1 && <span className={`rl-qty ${label.tier}`}>{label.text}</span>}
      </span>
      <span className="rl-item-name">{name}</span>
    </div>
  );
}

/** Invocation toggles with presets; the raid level is the sum of what's on. */
function InvocationPicker({ input, value, onChange, ui }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const level = useMemo(() => {
    const rl = new Map(input.groups.flatMap((g) => g.options));
    return value.reduce((n, name) => n + (rl.get(name) ?? 0), 0);
  }, [input, value]);
  // Position of each invocation in the ui-icons sheet (after prayers + spells).
  const iconIndex = useMemo(() => {
    if (!ui?.invocations) return null;
    const base = ui.prayers + ui.spells;
    const m = new Map();
    input.groups.flatMap((g) => g.options).forEach(([name], i) => m.set(name, base + i));
    return m;
  }, [input, ui]);
  const presetIx = input.presets.findIndex(
    (p) => p.invos.length === value.length && p.invos.every((n) => value.includes(n)),
  );
  const toggle = (name, group) => {
    if (value.includes(name)) onChange(value.filter((x) => x !== name));
    else if (group.exclusive) onChange([...value.filter((x) => !group.options.some(([n]) => n === x)), name]);
    else onChange([...value, name]);
  };
  return (
    <div className="rl-invo">
      <div className="rl-invo-head">
        <span>{input.label}</span>
        <b>Raid level {level}</b>
      </div>
      <select
        value={presetIx}
        onChange={(e) => {
          const p = input.presets[Number(e.target.value)];
          if (p) onChange([...p.invos]);
        }}
      >
        {presetIx === -1 && <option value={-1}>Custom ({level})</option>}
        {input.presets.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
      </select>
      <button type="button" className="rl-invo-open" onClick={() => setOpen(true)}>
        Pick invocations — {value.length} on
      </button>
      {open && (
        <div className="rl-invo-overlay" onClick={() => setOpen(false)}>
          <div
            className="rl-invo-modal"
            role="dialog"
            aria-label="Pick invocations"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rl-invo-modal-head">
              <b>Invocations</b>
              <span>Raid level {level}</span>
              <button type="button" onClick={() => setOpen(false)}>Done</button>
            </div>
            <div className="rl-invo-modal-body">
              {input.groups.map((g) => (
                <div key={g.label} className="rl-invo-group">
                  <h5>{g.label}{g.exclusive ? ' — pick one' : ''}</h5>
                  <div className="rl-invo-chips">
                    {g.options.map(([name, rl]) => (
                      <button
                        key={name}
                        type="button"
                        className={value.includes(name) ? 'picked' : ''}
                        title={`${name} (+${rl} raid level)${input.info?.[name] ? ` — ${input.info[name]}` : ''}`}
                        onClick={() => toggle(name, g)}
                      >
                        {iconIndex && (
                          <span className="rl-invo-icon"><UiIcon ui={ui} index={iconIndex.get(name)} /></span>
                        )}
                        <span className="rl-invo-name">{name}</span>
                        <i>+{rl}</i>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {input.hint && <small className="rl-invo-hint">{input.hint}</small>}
    </div>
  );
}

function RaidInput({ input, value, onChange, ui }) {
  if (input.type === 'invocations') {
    return <InvocationPicker input={input} value={value} onChange={(v) => onChange(v, input.onSet?.(v))} ui={ui} />;
  }
  if (input.type === 'check') {
    return (
      <label className="rl-input rl-check" title={input.hint}>
        <span className="rl-check-row">
          <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
          <span>{input.label}</span>
        </span>
        {input.hint && <small>{input.hint}</small>}
      </label>
    );
  }
  if (input.type === 'select') {
    return (
      <label className="rl-input">
        <span>{input.label}</span>
        <select
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            // An option may carry companion values (e.g. a mode's typical points).
            onChange(v, input.options.find((o) => o.value === v)?.set);
          }}
        >
          {input.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {input.hint && <small>{input.hint}</small>}
      </label>
    );
  }
  if (input.type === 'range') {
    return (
      <label className="rl-input">
        <span>{input.label}</span>
        <div className="rl-range-row">
          <input
            type="range"
            min={input.min}
            max={input.max}
            step={input.step ?? 1}
            value={Math.min(Math.max(value, input.min), input.max)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <NumberBox className="rl-range-num" value={value} min={input.min} max={input.max} onChange={onChange} />
        </div>
        {input.hint && <small>{input.hint}</small>}
      </label>
    );
  }
  return (
    <label className="rl-input">
      <span>{input.label}</span>
      <NumberBox value={value} min={input.min ?? 0} max={input.max ?? Infinity} onChange={onChange} />
      {input.hint && <small>{input.hint}</small>}
    </label>
  );
}

/**
 * A number box you can clear and retype. What you type is kept as text;
 * onChange gets each valid value (capped at max) as you go, and leaving
 * the box tidies it to the value in use.
 */
function NumberBox({ value, min, max, onChange, onEnter, className, ...rest }) {
  const [text, setText] = useState(String(value));
  // Follow outside changes (the slider, a preset) without fighting typing.
  useEffect(() => {
    setText((t) => (Number(t) === value && t !== '' ? t : String(value)));
  }, [value]);
  const settle = () => {
    const n = Math.floor(Number(text));
    // Below the minimum counts as the minimum; empty or nonsense keeps the old value.
    if (text !== '' && Number.isFinite(n) && n < min) onChange(min);
    setText(String(text !== '' && Number.isFinite(n) ? Math.min(Math.max(n, min), max) : value));
  };
  return (
    <input
      type="number"
      className={className}
      min={min}
      max={Number.isFinite(max) ? max : undefined}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Math.floor(Number(e.target.value));
        if (e.target.value !== '' && Number.isFinite(n) && n >= min) onChange(Math.min(n, max));
      }}
      onBlur={settle}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { settle(); onEnter?.(); }
      }}
      {...rest}
    />
  );
}

/** "Are you sure?" before clearing results, with a way to stop being asked. */
function ConfirmDialog({ title, body, label, onConfirm, onCancel }) {
  const [dontAsk, setDontAsk] = useState(false);
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="rl-dialog-overlay" onClick={onCancel}>
      <div
        className="rl-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rl-dialog-title"
        aria-describedby="rl-dialog-body"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="rl-dialog-title">{title}</h3>
        <p id="rl-dialog-body">{body}</p>
        <label className="rl-dialog-check">
          <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
          Don't ask me again
        </label>
        <div className="rl-dialog-actions">
          <button type="button" className="rl-btn" ref={cancelRef} onClick={onCancel}>Cancel</button>
          <button type="button" className="rl-btn rl-danger" onClick={() => onConfirm(dontAsk)}>{label}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * The simulator itself, content-agnostic: give it a list of configs
 * (raids, clue tiers, …), a storage key, and the right vocabulary.
 */
export function LootSimulator({
  title, intro, contents, storageKey, migrate = false, strings: s = RAID_STRINGS,
  picker: Picker, initialId,
}) {
  const { data } = useItemData();
  const nameIndex = useNameIndex(data);
  const ui = useUiData(); // icon sheet for the invocation picker
  const [raidId, setRaidId] = useState(() => (contents.some((c) => c.id === initialId) ? initialId : contents[0].id));
  const raid = contents.find((r) => r.id === raidId);
  const [chaseItem, setChaseItem] = useState(''); // the "Until <item>" pick
  const select = (id) => { setRaidId(id); setResult(null); setOpening(false); setChaseItem(''); };

  const defaultsFor = (r) => Object.fromEntries(r.inputs.map((i) => [i.key, i.default]));
  const [values, setValues] = useState(() => {
    const v = {};
    for (const r of contents) v[r.id] = defaultsFor(r);
    return v;
  });
  const [prefs, setPrefs] = useState(loadPrefs); // shared by every loot simulator
  // With saving off, a visit starts fresh and nothing is written back.
  const [stats, setStats] = useState(() => (prefs.save ? loadStats(storageKey, migrate) : {}));
  const [confirm, setConfirm] = useState(null); // { title, body, label, action } while asking
  const [result, setResult] = useState(null); // { kind:'one', run } | { kind:'many', n, totals, uniques, pets } | { kind:'until', run, tries }
  const [bulkN, setBulkN] = useState(100); // how many raids the bulk button opens
  const [perspBy, setPerspBy] = useState({}); // raid id -> 'solo' | 'share' | 'team'
  const [opening, setOpening] = useState(false);
  const flashKey = useRef(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!prefs.save) return;
    try { localStorage.setItem(storageKey, JSON.stringify(stats)); } catch { /* fine */ }
  }, [stats, storageKey, prefs.save]);
  useEffect(() => savePrefs(prefs), [prefs]);

  // Anything that clears results goes through here: it asks first unless
  // the player turned that off.
  const askThen = (c) => (prefs.confirm ? setConfirm(c) : c.action());
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const raidValues = values[raidId];
  // Content without a team-size input (clue caskets) is always one record.
  const hasTeam = !!raid.teamKey;
  const persp = hasTeam ? (perspBy[raidId] ?? 'share') : 'solo';
  const teamN = hasTeam ? Math.max(1, raidValues[raid.teamKey] || 1) : 1;
  // 'solo' ignores the team-size input; 'team' multiplies the whole config up.
  const effValues = persp === 'solo' && hasTeam ? { ...raidValues, [raid.teamKey]: 1 } : raidValues;
  const effRaid = useMemo(() => perspectiveConfig(raid, persp, teamN), [raid, persp, teamN]);
  const statsKey = `${raidId}:${persp}`;
  const raidStats = stats[statsKey] ?? emptyStats();
  const chance = effRaid.uniqueChance(effValues);
  // The "Until <item>" choices may depend on the setup (CoX Challenge Mode);
  // a pick the current setup can't roll is dropped.
  const chaseItems = (typeof raid.chaseItems === 'function' ? raid.chaseItems(effValues) : raid.chaseItems) ?? [];
  const pickedChase = chaseItems.includes(chaseItem) ? chaseItem : '';

  // Drop rates for the uniques and pet at the current setup and view.
  const rates = raid.uniqueRates ? raid.uniqueRates(effValues, effRaid) : null;
  const rateOf = new Map(rates ?? []);
  let petRate = null;
  if (rates && effRaid.pet) {
    petRate = effRaid.pet.onUnique
      ? chance * effRaid.pet.chance(effValues, { unique: true })
      : effRaid.pet.chance(effValues, { unique: null });
  }

  const setValue = (key, v, also) => setValues((prev) => ({ ...prev, [raidId]: { ...prev[raidId], [key]: v, ...(also ?? {}) } }));

  // uniques: [{ name, at }] where `at` is the completion within this batch;
  // petsAt: the completions within the batch that gave the pet;
  // loot: Map of everything the batch gave, for the running tally.
  const record = useCallback((completions, uniques, petsAt, loot) => {
    const pets = petsAt.length;
    setStats((prev) => {
      const s = { ...(prev[statsKey] ?? emptyStats()) };
      const startKc = s.kc;
      if (!s.totals) { s.totals = {}; s.totalsFrom = s.kc; }
      const totals = { ...s.totals };
      for (const [name, t] of loot) {
        totals[name] = { qty: (totals[name]?.qty ?? 0) + t.qty, unique: t.unique };
      }
      // Pets aren't loot entries, but they're part of what you walked away with.
      if (pets && raid.pet) totals[raid.pet.name] = { qty: (totals[raid.pet.name]?.qty ?? 0) + pets, unique: true, pet: true };
      s.totals = totals;
      s.kc += completions;
      s.pets += pets;
      // Counts completions with a unique, to match "expected": a boss kill
      // can hold several (the Sire's Unsired and its Font reward).
      s.uniqueCount += new Set(uniques.map((u) => u.at)).size;
      // The log keeps uniques and pets together, in the order they dropped.
      const logged = [
        ...uniques.map((u) => ({ name: u.name, kc: startKc + u.at })),
        ...(raid.pet ? petsAt.map((at) => ({ name: raid.pet.name, kc: startKc + at, pet: true })) : []),
      ].sort((a, b) => a.kc - b.kc);
      s.uniques = [...s.uniques, ...logged].slice(-40);
      // The dry streak picks up after the batch's last purple.
      s.dry = uniques.length
        ? completions - Math.max(...uniques.map((u) => u.at))
        : s.dry + completions;
      return { ...prev, [statsKey]: s };
    });
  }, [statsKey, raid]);

  const reveal = (res) => {
    clearTimeout(timer.current);
    setOpening(true);
    setResult(null);
    flashKey.current++;
    timer.current = setTimeout(() => {
      setOpening(false);
      setResult(res);
    }, 700);
  };

  const openOne = () => {
    const run = runRaid(effRaid, effValues);
    record(1, uniquesOf(run).map((name) => ({ name, at: 1 })), run.pet ? [1] : [], tally(new Map(), run.loot));
    reveal({ kind: 'one', run, kc: raidStats.kc + 1 });
  };

  const openMany = (n) => {
    const agg = runMany(effRaid, effValues, n);
    record(n, agg.uniques, agg.petsAt, agg.totals);
    reveal({ kind: 'many', n, teamN: persp === 'team' ? teamN : 0, ...agg });
  };

  const untilPurple = () => {
    let tries = 0;
    let run = null;
    const petsAt = [];
    const loot = new Map();
    do {
      run = runRaid(effRaid, effValues);
      tries++;
      if (run.pet) petsAt.push(tries);
      tally(loot, run.loot);
    } while (!run.unique && tries < UNTIL_CAP);
    record(tries, uniquesOf(run).map((name) => ({ name, at: tries })), petsAt, loot);
    reveal({ kind: 'until', run, tries, kc: raidStats.kc + tries });
  };

  // Chase a specific prize (a master clue, any 3rd age, the pet, …).
  const untilChase = (chase) => {
    let tries = 0;
    let run = null;
    const petsAt = [];
    let found = false;
    const uniques = [];
    const loot = new Map();
    do {
      run = runRaid(effRaid, effValues);
      tries++;
      if (run.pet) petsAt.push(tries);
      tally(loot, run.loot);
      for (const name of uniquesOf(run)) uniques.push({ name, at: tries });
      found = chase.test(run);
    } while (!found && tries < UNTIL_CAP);
    record(tries, uniques, petsAt, loot);
    reveal({ kind: 'chase', run, tries, found, chase, kc: raidStats.kc + tries });
  };

  const resetStats = () => askThen({
    title: `Reset ${raid.name}?`,
    body: `This clears your ${raidStats.kc.toLocaleString()} ${raidStats.kc === 1 ? s.noun : s.nouns}, `
      + `${raidStats.uniqueCount.toLocaleString()} ${raidStats.uniqueCount === 1 ? s.unique : s.uniques} and the loot tally `
      + `for ${raid.name}${hasTeam ? ` (${PERSPECTIVES.find((p) => p.id === persp).label})` : ''}. It can't be undone.`,
    label: s.reset,
    action: () => setStats((prev) => ({ ...prev, [statsKey]: emptyStats() })),
  });

  // Every loot simulator at once: bosses, raids and clue caskets.
  const resetAll = () => askThen({
    title: 'Reset all loot simulators?',
    body: 'This clears every boss, raid and clue casket record, and every loot tally, saved in this browser. It can\'t be undone.',
    label: 'Reset everything',
    action: () => {
      forgetAllResults();
      setStats({});
      setResult(null);
    },
  });

  const toggleSave = (on) => {
    if (on) { setPrefs((p) => ({ ...p, save: true })); return; }
    askThen({
      title: 'Stop saving results?',
      body: 'This deletes the loot simulator results saved in this browser. What you see now stays until you leave the page.',
      label: 'Stop saving',
      action: () => {
        forgetAllResults();
        setPrefs((p) => ({ ...p, save: false }));
      },
    });
  };

  const expected = raidStats.kc * chance;
  const onRate = raidStats.kc > 0 ? atLeastOnce(chance, raidStats.dry) : 0;

  // Everything received since the last reset: pets, then uniques, then the
  // rest by quantity.
  const haul = useMemo(() => {
    const rank = (t) => (t.pet ? 2 : t.unique ? 1 : 0);
    return Object.entries(raidStats.totals ?? {})
      .map(([name, t]) => ({ name, ...t }))
      .sort((a, b) => rank(b) - rank(a) || b.qty - a.qty);
  }, [raidStats.totals]);
  const haulKills = raidStats.kc - (raidStats.totals ? raidStats.totalsFrom ?? 0 : raidStats.kc);

  const sortedTotals = useMemo(() => {
    if (!result || result.kind !== 'many') return [];
    return [...result.totals.entries()]
      .map(([name, t]) => ({ name, ...t }))
      .sort((a, b) => (b.unique ? 1 : 0) - (a.unique ? 1 : 0));
  }, [result]);

  // Did this reveal include something from the content's legendary class
  // (3rd age, the Bloodhound)? Deserves more than a purple beam.
  const legendaryHit = useMemo(() => {
    if (!raid.legendary || !result) return false;
    const { item, pet } = raid.legendary;
    if (result.kind === 'many') {
      return result.uniques.some((u) => item?.(u.name)) || (pet && result.pets > 0);
    }
    return uniquesOf(result.run).some((name) => item?.(name)) || (pet && result.run.pet);
  }, [raid, result]);

  return (
    <div className="page-content">
      <div
        className="rl"
        style={{
          '--raid-accent': raid.theme.accent,
          '--raid-accent2': raid.theme.accent2,
          '--raid-glow': raid.theme.glow,
        }}
      >
        <header className="rl-head">
          <h2>{title}</h2>
          <p>{intro}</p>
        </header>

        {Picker ? (
          <Picker contents={contents} activeId={raidId} onSelect={select} data={data} nameIndex={nameIndex} />
        ) : (
          <div className="rl-tabs" role="tablist">
            {contents.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={r.id === raidId}
                className={`rl-tab ${r.id === raidId ? 'active' : ''}`}
                style={{ '--raid-accent': r.theme.accent, '--raid-glow': r.theme.glow }}
                onClick={() => select(r.id)}
              >
                <RaidEmblem raid={r} data={data} nameIndex={nameIndex} className="rl-tab-emblem" />
                <span className="rl-tab-name">{r.short}</span>
              </button>
            ))}
          </div>
        )}

        <div className="rl-stage">
          <section className="rl-panel rl-setup" aria-label={s.setup}>
            <div className="rl-setup-head">
              <h3>{raid.name}</h3>
              <button
                type="button"
                className="rl-reset-inputs"
                title="Back to this raid's default setup"
                onClick={() => setValues((prev) => ({ ...prev, [raidId]: defaultsFor(raid) }))}
              >
                Defaults
              </button>
            </div>
            <p className="rl-tagline">{raid.tagline}</p>
            {hasTeam && (
              <div className="rl-persp" role="tablist" aria-label="Loot perspective">
                {PERSPECTIVES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={persp === p.id ? 'picked' : ''}
                    title={p.desc}
                    onClick={() => { setPerspBy((prev) => ({ ...prev, [raidId]: p.id })); setResult(null); }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            {raid.inputs
              .filter((input) => !(persp === 'solo' && input.key === raid.teamKey))
              .map((input) => (
                <RaidInput key={input.key} input={input} value={raidValues[input.key]} onChange={(v, also) => setValue(input.key, v, also)} ui={ui} />
              ))}
            {raid.summary && <div className="rl-summary">{raid.summary(effValues)}</div>}
            {s.chance && (
              <div className="rl-chance">
                {s.chance} <b>{(chance * 100).toFixed(2)}%</b>
                <small>≈ 1 in {chance > 0 ? Math.round(1 / chance).toLocaleString() : '∞'}</small>
              </div>
            )}
            <div className="rl-actions">
              <button type="button" className="rl-open" onClick={openOne} disabled={opening}>
                {s.open}
              </button>
              <span className="rl-bulk">
                <button type="button" className="rl-btn" onClick={() => openMany(bulkN)} disabled={opening}>
                  Open ×{bulkN.toLocaleString()}
                </button>
                <NumberBox
                  className="rl-range-num rl-bulk-num"
                  value={bulkN}
                  min={1}
                  max={BULK_MAX}
                  onChange={setBulkN}
                  onEnter={() => { if (!opening) openMany(bulkN); }}
                  aria-label={`How many ${s.nouns} to open at once`}
                />
              </span>
              {/* Nothing to wait for when no unique can drop (Jad, Zuk, a destroyed Araxxor). */}
              {chance > 0 && (
                <button type="button" className="rl-btn" onClick={untilPurple} disabled={opening}>{s.until}</button>
              )}
              {(raid.chases ?? []).map((c) => (
                <button key={c.label} type="button" className="rl-btn" onClick={() => untilChase(c)} disabled={opening}>
                  {c.label}
                </button>
              ))}
              {chaseItems.length > 1 && (
                <span className="rl-chase-item">
                  <select
                    value={pickedChase}
                    onChange={(e) => setChaseItem(e.target.value)}
                    aria-label="Item to roll until"
                  >
                    <option value="">Until a specific item…</option>
                    {chaseItems.map((n) => (
                      <option key={n} value={n}>{rateOf.has(n) ? `${n} — ${oneIn(rateOf.get(n))}` : n}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rl-btn"
                    disabled={opening || !pickedChase}
                    onClick={() => untilChase({
                      label: pickedChase,
                      done: pickedChase,
                      test: (run) => uniquesOf(run).includes(pickedChase),
                    })}
                  >
                    Go
                  </button>
                </span>
              )}
            </div>
          </section>

          <section className="rl-panel rl-reveal" aria-label="Loot">
            <span className="rl-emblem" aria-hidden="true">
              <RaidEmblem raid={raid} data={data} nameIndex={nameIndex} className="rl-emblem-inner" />
            </span>
            {opening && <div key={flashKey.current} className="rl-flash" />}
            {!opening && result?.kind !== 'many' && result?.run && (
              <div className={`rl-result ${result.run.unique || (result.kind === 'chase' && result.found) ? 'purple' : ''}`}>
                {legendaryHit && <div className="rl-legendary-banner">Legendary loot</div>}
                {result.run.unique && (
                  <>
                    <div className="rl-beam" />
                    {result.kind !== 'chase' && (
                      <div className="rl-purple-banner">
                        {result.kind === 'until' ? `${s.Unique} after ${result.tries.toLocaleString()} ${s.nouns}!` : `${s.Unique}!`}
                      </div>
                    )}
                    {result.run.recipient && (
                      <div className="rl-recipient">
                        {result.run.recipient === 'You' ? "It's yours!" : `${result.run.recipient} received it`}
                      </div>
                    )}
                  </>
                )}
                {result.kind === 'chase' && (
                  result.found ? (
                    <>
                      {!result.run.unique && <div className="rl-beam" />}
                      <div className="rl-purple-banner">
                        {result.chase.done} after {result.tries.toLocaleString()} {s.nouns}!
                      </div>
                    </>
                  ) : (
                    <div className="rl-dry-banner">
                      No {result.chase.done.toLowerCase()} in {UNTIL_CAP.toLocaleString()} {s.nouns}. {s.dry}
                    </div>
                  )
                )}
                {result.kind === 'until' && !result.run.unique && (
                  <div className="rl-dry-banner">Nothing in {UNTIL_CAP.toLocaleString()} {s.nouns}. {s.dry}</div>
                )}
                <div className="rl-loot">
                  {result.run.loot.map((l, i) => (
                    <LootItem
                      key={`${l.name}-${i}`}
                      data={data}
                      nameIndex={nameIndex}
                      name={l.name}
                      qty={l.qty}
                      unique={l.unique}
                      style={{ '--i': i }}
                    />
                  ))}
                </div>
                {result.run.pet && (
                  <div className="rl-pet">
                    🎉 {raid.pet.name} follows you home! <span className="rl-pet-kc">{s.noun} {result.kc.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            {!opening && result?.kind === 'many' && (
              <div className={`rl-result ${result.uniques.length ? 'purple' : ''}`}>
                {result.uniques.length > 0 && <div className="rl-beam" />}
                {legendaryHit && <div className="rl-legendary-banner">Legendary loot</div>}
                <div className="rl-many-head">
                  {result.n.toLocaleString()} {s.nouns} — {result.uniques.length} {s.unique}{result.uniques.length === 1 ? '' : 's'}
                  {result.pets > 0 && <>, {result.pets} pet{result.pets === 1 ? '' : 's'}!</>}
                </div>
                {result.teamN > 1 && (
                  <div className="rl-players">
                    {Array.from({ length: result.teamN }, (_, i) => (i === 0 ? 'You' : `Player ${i + 1}`)).map((who) => {
                      const got = result.recipients.get(who) ?? [];
                      const counts = new Map();
                      for (const name of got) counts.set(name, (counts.get(name) ?? 0) + 1);
                      return (
                        <div key={who} className={`rl-player ${who === 'You' ? 'me' : ''}`}>
                          <div className="rl-player-name">{who}</div>
                          <div className="rl-player-count">
                            {got.length ? `${got.length} ${s.unique}${got.length > 1 ? 's' : ''}` : 'dry'}
                          </div>
                          <div className="rl-player-items">
                            {[...counts.entries()].map(([name, c]) => {
                              const ix = nameIndex.get(name.toLowerCase());
                              return (
                                <span key={name} className="rl-player-item" title={c > 1 ? `${name} ×${c}` : name}>
                                  {ix != null && data ? <ItemIcon data={data} index={ix} /> : '?'}
                                  {c > 1 && <span className="rl-qty">{c}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(result.uniques.length > 0 || result.petsAt?.length > 0) && (
                  <ul className="rl-many-log">
                    {[
                      ...result.uniques,
                      ...(raid.pet ? (result.petsAt ?? []).map((at) => ({ name: raid.pet.name, at, pet: true })) : []),
                    ].sort((a, b) => a.at - b.at).map((u, i) => {
                      const ix = nameIndex.get(u.name.toLowerCase());
                      return (
                        <li key={i} className={u.pet ? 'pet' : ''}>
                          {ix != null && data && <ItemIcon data={data} index={ix} />}
                          <span className="n">{u.name}{u.pet && <i className="rl-pet-tag">pet</i>}</span>
                          {u.recipient && <span className="who">{u.recipient}</span>}
                          <span className="kc">{s.noun} {u.at.toLocaleString()}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="rl-loot">
                  {sortedTotals.map((l, i) => (
                    <LootItem
                      key={l.name}
                      data={data}
                      nameIndex={nameIndex}
                      name={l.name}
                      qty={l.qty}
                      unique={l.unique}
                      style={{ '--i': Math.min(i, 20) }}
                    />
                  ))}
                </div>
              </div>
            )}
            {!opening && !result && (
              <div className="rl-idle">
                <p>{s.idle}</p>
              </div>
            )}
          </section>

          <section className="rl-panel rl-stats" aria-label="Your record">
            <h3>
              {persp === 'team' ? 'Team record' : 'Your record'}
              {hasTeam && <> — {PERSPECTIVES.find((p) => p.id === persp).label}</>}
            </h3>
            <div className="rl-stat"><span>Completions</span><b>{raidStats.kc.toLocaleString()}</b></div>
            <div className="rl-stat"><span>{s.Uniques}</span><b>{raidStats.uniqueCount.toLocaleString()}</b></div>
            <div className="rl-stat"><span>Expected {s.uniques}</span><b>{expected.toFixed(1)}</b></div>
            <div className="rl-stat"><span>Dry streak</span><b>{raidStats.dry.toLocaleString()}</b></div>
            {raidStats.dry > 0 && (
              <div className="rl-stat"><span>Luck of going this dry</span><b>{((1 - onRate) * 100).toFixed(1)}%</b></div>
            )}
            <div className="rl-stat"><span>Pets</span><b>{raidStats.pets.toLocaleString()}</b></div>
            {raidStats.uniques.length > 0 && (
              <>
                <h4>Latest {s.uniques}</h4>
                <ul className="rl-log">
                  {[...raidStats.uniques].reverse().map((u, i) => {
                    const ix = nameIndex.get(u.name.toLowerCase());
                    return (
                      <li key={`${u.kc}-${i}`} className={u.pet ? 'pet' : ''}>
                        {ix != null && data && <ItemIcon data={data} index={ix} />}
                        <span className="n">{u.name}{u.pet && <i className="rl-pet-tag">pet</i>}</span>
                        <span className="kc">kc {u.kc.toLocaleString()}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <button type="button" className="rl-btn rl-reset" onClick={resetStats}>{s.reset}</button>
          </section>
        </div>

        {rates && rates.length > 0 && (
          <section className="rl-panel rl-rates" aria-label="Drop rates">
            <div className="rl-haul-head">
              <h3>Drop rates</h3>
              <small>Chance per {s.noun} with your current setup{hasTeam ? ` (${PERSPECTIVES.find((p) => p.id === persp).label})` : ''}.</small>
            </div>
            {raid.wiki && (
              <a className="rl-wiki-link" href={wikiUrl(raid.wiki)} target="_blank" rel="noopener noreferrer">
                Full drop table on the wiki ↗
              </a>
            )}
            <ul className="rl-rates-list">
              {[
                ...(petRate != null ? [{ name: raid.pet.name, p: petRate, pet: true }] : []),
                ...[...rates].sort((a, b) => b[1] - a[1]).map(([name, p]) => ({ name, p })),
              ].map((r) => {
                const ix = nameIndex.get(r.name.toLowerCase());
                return (
                  <li key={r.name} className={r.pet ? 'pet' : ''}>
                    <span className="rl-rates-icon">{ix != null && data && <ItemIcon data={data} index={ix} />}</span>
                    <span className="n">
                      <a href={wikiUrl(r.name)} target="_blank" rel="noopener noreferrer" title={`${r.name} on the wiki`}>{r.name}</a>
                      {r.pet && <i className="rl-pet-tag">pet</i>}
                    </span>
                    <b title={`${(r.p * 100).toPrecision(3)}%`}>{oneIn(r.p)}</b>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {haul.length > 0 && (
          <section className="rl-panel rl-haul" aria-label="All loot so far">
            <div className="rl-haul-head">
              <h3>All loot — {haulKills.toLocaleString()} {haulKills === 1 ? s.noun : s.nouns}</h3>
              <small>
                {haulKills < raidStats.kc
                  ? `Counting from ${s.noun} ${(raidStats.kc - haulKills).toLocaleString()}; ${s.reset.toLowerCase()} to start fresh.`
                  : `Everything since your last reset. ${haul.length} item${haul.length === 1 ? '' : 's'}.`}
              </small>
            </div>
            <div className="rl-loot rl-haul-grid">
              {haul.map((l) => (
                <LootItem
                  key={l.name}
                  data={data}
                  nameIndex={nameIndex}
                  name={l.name}
                  qty={l.qty}
                  unique={l.unique}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        <section className="rl-settings" aria-label="Loot simulator settings">
          <label className="rl-setting">
            <input type="checkbox" checked={prefs.save} onChange={(e) => toggleSave(e.target.checked)} />
            Save results in this browser
          </label>
          <label className="rl-setting">
            <input
              type="checkbox"
              checked={prefs.confirm}
              onChange={(e) => setPrefs((p) => ({ ...p, confirm: e.target.checked }))}
            />
            Ask before clearing results
          </label>
          <button type="button" className="rl-btn rl-danger rl-reset-all" onClick={resetAll}>
            Reset all loot simulators
          </button>
          <small className="rl-settings-note">
            {prefs.save
              ? 'Settings apply to every loot simulator: bosses, raids and clue caskets.'
              : 'Results aren’t being saved: they last until you leave the page.'}
          </small>
        </section>

        {confirm && (
          <ConfirmDialog
            {...confirm}
            onCancel={closeConfirm}
            onConfirm={(dontAsk) => {
              if (dontAsk) setPrefs((p) => ({ ...p, confirm: false }));
              confirm.action();
              setConfirm(null);
            }}
          />
        )}

        <p className="rl-credit">
          Drop rates and tables from the{' '}
          <a href="https://oldschool.runescape.wiki/" target="_blank" rel="noopener noreferrer">Old School RuneScape Wiki</a>
          ; regular loot is simplified. Item icons via{' '}
          <a href="https://runelite.net/" target="_blank" rel="noopener noreferrer">RuneLite</a>.
        </p>
      </div>
    </div>
  );
}

export default function RaidLootSimulatorPage() {
  // ?raid=toa opens on that raid (the raid landing pages link here).
  const [params] = useSearchParams();
  const raidParam = params.get('raid');
  return (
    <LootSimulator
      key={raidParam ?? ''}
      title="Raid Loot Simulator"
      intro="Open the reward chest as many times as you like — same odds as the real thing, none of the deaths. Rates and tables follow the wiki; your tally is saved in this browser."
      contents={RAIDS}
      storageKey={LOOT_SIM_KEYS.raid}
      migrate
      initialId={raidParam}
    />
  );
}
