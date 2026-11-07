import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { RAIDS } from './raid-loot-data.js';
import { runRaid, runMany, atLeastOnce } from './raid-loot-engine.js';
import { useItemData, useNameIndex, useUiData, ItemIcon, UiIcon } from './loadout-items.jsx';
import './RaidLootSimulatorPage.css';

const STATS_KEY = 'raid-loot-stats';
const UNTIL_CAP = 25000; // completions before "until purple" gives up

// Each raid keeps three separate records, one per way of raiding.
const PERSPECTIVES = [
  { id: 'solo', label: 'Solo', desc: 'You raid alone — team size is ignored.' },
  { id: 'share', label: 'You in a team', desc: 'Your own chest as one member of the team.' },
  { id: 'team', label: 'Whole team', desc: 'Everything the entire team pulls per raid.' },
];

const emptyStats = () => ({ kc: 0, dry: 0, pets: 0, uniqueCount: 0, uniques: [] });

function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY));
    if (raw && typeof raw === 'object') {
      // Older saves were keyed by raid id alone; they were team-share records.
      for (const k of Object.keys(raw)) {
        if (!k.includes(':')) {
          raw[`${k}:share`] = raw[k];
          delete raw[k];
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

/** A raid's boss emblem: the boss pet's in-game icon (Olmlet for Olm, etc.). */
function RaidEmblem({ raid, data, nameIndex, className = '' }) {
  const ix = data ? nameIndex.get(raid.pet.name.toLowerCase()) : undefined;
  if (ix == null) return <span className={className}>{raid.emblem}</span>;
  return <span className={`${className} rl-emblem-item`}><ItemIcon data={data} index={ix} /></span>;
}

function LootItem({ data, nameIndex, name, qty, unique, style }) {
  const ix = nameIndex.get(name.toLowerCase());
  return (
    <div className={`rl-item ${unique ? 'unique' : ''}`} style={style} title={name}>
      <span className="rl-item-icon">
        {ix != null && data ? <ItemIcon data={data} index={ix} /> : <span className="rl-item-missing">?</span>}
        {qty > 1 && <span className="rl-qty">{qty.toLocaleString()}</span>}
      </span>
      <span className="rl-item-name">{name}</span>
    </div>
  );
}

/** Invocation toggles with presets; the raid level is the sum of what's on. */
function InvocationPicker({ input, value, onChange, ui }) {
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
      <details className="rl-invo-details">
        <summary>Pick invocations</summary>
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
                  {name} <i>+{rl}</i>
                </button>
              ))}
            </div>
          </div>
        ))}
      </details>
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
          <input
            type="number"
            className="rl-range-num"
            min={input.min}
            max={input.max}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              // Let partial numbers through while typing; cap only the top.
              onChange(Number.isFinite(n) ? Math.min(n, input.max) : input.min);
            }}
            onBlur={(e) => {
              // Leaving the box empty or out of range falls back to sane values.
              if (e.target.value === '') { onChange(input.default); return; }
              const n = Number(e.target.value);
              onChange(Number.isFinite(n) ? Math.min(Math.max(n, input.min), input.max) : input.default);
            }}
          />
        </div>
        {input.hint && <small>{input.hint}</small>}
      </label>
    );
  }
  return (
    <label className="rl-input">
      <span>{input.label}</span>
      <input
        type="number"
        min={input.min}
        max={input.max}
        step={input.step ?? 1}
        value={value}
        onChange={(e) => onChange(Math.max(input.min ?? 0, Math.min(input.max ?? Infinity, Number(e.target.value) || 0)))}
      />
      {input.hint && <small>{input.hint}</small>}
    </label>
  );
}

export default function RaidLootSimulatorPage() {
  const { data } = useItemData();
  const nameIndex = useNameIndex(data);
  const ui = useUiData(); // icon sheet for the invocation picker
  const [raidId, setRaidId] = useState(RAIDS[0].id);
  const raid = RAIDS.find((r) => r.id === raidId);

  const defaultsFor = (r) => Object.fromEntries(r.inputs.map((i) => [i.key, i.default]));
  const [values, setValues] = useState(() => {
    const v = {};
    for (const r of RAIDS) v[r.id] = defaultsFor(r);
    return v;
  });
  const [stats, setStats] = useState(loadStats);
  const [result, setResult] = useState(null); // { kind:'one', run } | { kind:'many', n, totals, uniques, pets } | { kind:'until', run, tries }
  const [bulkN, setBulkN] = useState(100); // how many raids the bulk button opens
  const [perspBy, setPerspBy] = useState({}); // raid id -> 'solo' | 'share' | 'team'
  const [opening, setOpening] = useState(false);
  const flashKey = useRef(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* fine */ }
  }, [stats]);

  const raidValues = values[raidId];
  const persp = perspBy[raidId] ?? 'share';
  const teamN = Math.max(1, raidValues[raid.teamKey] || 1);
  // 'solo' ignores the team-size input; 'team' multiplies the whole config up.
  const effValues = persp === 'solo' ? { ...raidValues, [raid.teamKey]: 1 } : raidValues;
  const effRaid = useMemo(() => perspectiveConfig(raid, persp, teamN), [raid, persp, teamN]);
  const statsKey = `${raidId}:${persp}`;
  const raidStats = stats[statsKey] ?? emptyStats();
  const chance = effRaid.uniqueChance(effValues);

  const setValue = (key, v, also) => setValues((prev) => ({ ...prev, [raidId]: { ...prev[raidId], [key]: v, ...(also ?? {}) } }));

  // uniques: [{ name, at }] where `at` is the completion within this batch.
  const record = useCallback((completions, uniques, pets) => {
    setStats((prev) => {
      const s = { ...(prev[statsKey] ?? emptyStats()) };
      const startKc = s.kc;
      s.kc += completions;
      s.pets += pets;
      s.uniqueCount += uniques.length;
      for (const u of uniques) s.uniques = [...s.uniques, { name: u.name, kc: startKc + u.at }].slice(-40);
      // The dry streak picks up after the batch's last purple.
      s.dry = uniques.length
        ? completions - Math.max(...uniques.map((u) => u.at))
        : s.dry + completions;
      return { ...prev, [statsKey]: s };
    });
  }, [statsKey]);

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
    record(1, run.unique ? [{ name: run.unique, at: 1 }] : [], run.pet ? 1 : 0);
    reveal({ kind: 'one', run });
  };

  const openMany = (n) => {
    const agg = runMany(effRaid, effValues, n);
    record(n, agg.uniques, agg.pets);
    reveal({ kind: 'many', n, teamN: persp === 'team' ? teamN : 0, ...agg });
  };

  const untilPurple = () => {
    let tries = 0;
    let run = null;
    let pets = 0;
    do {
      run = runRaid(effRaid, effValues);
      tries++;
      if (run.pet) pets++;
    } while (!run.unique && tries < UNTIL_CAP);
    record(tries, run.unique ? [{ name: run.unique, at: tries }] : [], pets);
    reveal({ kind: 'until', run, tries });
  };

  const resetStats = () => setStats((prev) => ({ ...prev, [statsKey]: emptyStats() }));

  const expected = raidStats.kc * chance;
  const onRate = raidStats.kc > 0 ? atLeastOnce(chance, raidStats.dry) : 0;

  const sortedTotals = useMemo(() => {
    if (!result || result.kind !== 'many') return [];
    return [...result.totals.entries()]
      .map(([name, t]) => ({ name, ...t }))
      .sort((a, b) => (b.unique ? 1 : 0) - (a.unique ? 1 : 0));
  }, [result]);

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
          <h2>Raid Loot Simulator</h2>
          <p>
            Open the reward chest as many times as you like — same odds as the real thing, none of the
            deaths. Rates and tables follow the wiki; your tally is saved in this browser.
          </p>
        </header>

        <div className="rl-tabs" role="tablist">
          {RAIDS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === raidId}
              className={`rl-tab ${r.id === raidId ? 'active' : ''}`}
              style={{ '--raid-accent': r.theme.accent, '--raid-glow': r.theme.glow }}
              onClick={() => { setRaidId(r.id); setResult(null); setOpening(false); }}
            >
              <RaidEmblem raid={r} data={data} nameIndex={nameIndex} className="rl-tab-emblem" />
              <span className="rl-tab-name">{r.short}</span>
            </button>
          ))}
        </div>

        <div className="rl-stage">
          <section className="rl-panel rl-setup" aria-label="Raid setup">
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
            {raid.inputs
              .filter((input) => !(persp === 'solo' && input.key === raid.teamKey))
              .map((input) => (
                <RaidInput key={input.key} input={input} value={raidValues[input.key]} onChange={(v, also) => setValue(input.key, v, also)} ui={ui} />
              ))}
            {raid.summary && <div className="rl-summary">{raid.summary(effValues)}</div>}
            <div className="rl-chance">
              Unique chance: <b>{(chance * 100).toFixed(2)}%</b>
              <small>≈ 1 in {chance > 0 ? Math.round(1 / chance).toLocaleString() : '∞'}</small>
            </div>
            <div className="rl-actions">
              <button type="button" className="rl-open" onClick={openOne} disabled={opening}>
                Open chest
              </button>
              <span className="rl-bulk">
                <button type="button" className="rl-btn" onClick={() => openMany(bulkN)} disabled={opening}>
                  Open ×{bulkN.toLocaleString()}
                </button>
                <input
                  type="number"
                  className="rl-range-num rl-bulk-num"
                  min={1}
                  max={100000}
                  value={bulkN}
                  aria-label="How many raids to open at once"
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value));
                    setBulkN(Number.isFinite(n) ? Math.min(Math.max(n, 1), 100000) : 100);
                  }}
                />
              </span>
              <button type="button" className="rl-btn" onClick={untilPurple} disabled={opening}>Until purple</button>
            </div>
          </section>

          <section className="rl-panel rl-reveal" aria-label="Loot">
            <span className="rl-emblem" aria-hidden="true">
              <RaidEmblem raid={raid} data={data} nameIndex={nameIndex} className="rl-emblem-inner" />
            </span>
            {opening && <div key={flashKey.current} className="rl-flash" />}
            {!opening && result?.kind !== 'many' && result?.run && (
              <div className={`rl-result ${result.run.unique ? 'purple' : ''}`}>
                {result.run.unique && (
                  <>
                    <div className="rl-beam" />
                    <div className="rl-purple-banner">
                      {result.kind === 'until' ? `Purple after ${result.tries.toLocaleString()} raids!` : 'Purple!'}
                    </div>
                    {result.run.recipient && (
                      <div className="rl-recipient">
                        {result.run.recipient === 'You' ? "It's yours!" : `${result.run.recipient} received it`}
                      </div>
                    )}
                  </>
                )}
                {result.kind === 'until' && !result.run.unique && (
                  <div className="rl-dry-banner">Nothing in {UNTIL_CAP.toLocaleString()} raids. The desert is cruel.</div>
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
                {result.run.pet && <div className="rl-pet">🎉 {raid.pet.name} follows you home!</div>}
              </div>
            )}
            {!opening && result?.kind === 'many' && (
              <div className={`rl-result ${result.uniques.length ? 'purple' : ''}`}>
                {result.uniques.length > 0 && <div className="rl-beam" />}
                <div className="rl-many-head">
                  {result.n.toLocaleString()} raids — {result.uniques.length} purple{result.uniques.length === 1 ? '' : 's'}
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
                            {got.length ? `${got.length} purple${got.length > 1 ? 's' : ''}` : 'dry'}
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
                {result.uniques.length > 0 && (
                  <ul className="rl-many-log">
                    {result.uniques.map((u, i) => {
                      const ix = nameIndex.get(u.name.toLowerCase());
                      return (
                        <li key={i}>
                          {ix != null && data && <ItemIcon data={data} index={ix} />}
                          <span className="n">{u.name}</span>
                          {u.recipient && <span className="who">{u.recipient}</span>}
                          <span className="kc">raid {u.at.toLocaleString()}</span>
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
                <p>The chest awaits.</p>
              </div>
            )}
          </section>

          <section className="rl-panel rl-stats" aria-label="Your record">
            <h3>{persp === 'team' ? 'Team record' : 'Your record'} — {PERSPECTIVES.find((p) => p.id === persp).label}</h3>
            <div className="rl-stat"><span>Completions</span><b>{raidStats.kc.toLocaleString()}</b></div>
            <div className="rl-stat"><span>Purples</span><b>{raidStats.uniqueCount.toLocaleString()}</b></div>
            <div className="rl-stat"><span>Expected purples</span><b>{expected.toFixed(1)}</b></div>
            <div className="rl-stat"><span>Dry streak</span><b>{raidStats.dry.toLocaleString()}</b></div>
            {raidStats.dry > 0 && (
              <div className="rl-stat"><span>Luck of going this dry</span><b>{((1 - onRate) * 100).toFixed(1)}%</b></div>
            )}
            <div className="rl-stat"><span>Pets</span><b>{raidStats.pets.toLocaleString()}</b></div>
            {raidStats.uniques.length > 0 && (
              <>
                <h4>Latest purples</h4>
                <ul className="rl-log">
                  {[...raidStats.uniques].reverse().map((u, i) => {
                    const ix = nameIndex.get(u.name.toLowerCase());
                    return (
                      <li key={`${u.kc}-${i}`}>
                        {ix != null && data && <ItemIcon data={data} index={ix} />}
                        <span className="n">{u.name}</span>
                        <span className="kc">kc {u.kc.toLocaleString()}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <button type="button" className="rl-btn rl-reset" onClick={resetStats}>Reset this raid</button>
          </section>
        </div>

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
