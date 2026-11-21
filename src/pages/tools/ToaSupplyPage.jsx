import { useMemo, useState } from 'react';
import { TOA_INVOCATIONS } from './raid-loot-data.js';
import {
  SUPPLY_ITEMS, HELP_LEVELS, RESTORATION, BUNDLES, RARE_CHANCE,
  bundleContents, rollBundle, qtyOdds,
} from './toa-supply-data.js';
import { useItemData, useNameIndex, useUiData, ItemIcon, UiIcon } from './loadout-items.jsx';
import './ToaSupplyPage.css';

// The spirit shows up twice a raid.
const VISITS = ['After your first two paths', 'Before the Wardens'];

const pctLabel = (p) => `${Math.round(p * 100)}%`;
const rangeLabel = ([lo, hi]) => (lo === hi ? String(lo) : `${lo}–${hi}`);

/** Where each invocation sits in the ui-icons sheet (after prayers + spells). */
function useInvoIcons(ui) {
  return useMemo(() => {
    if (!ui?.invocations) return null;
    const base = ui.prayers + ui.spells;
    const m = new Map();
    TOA_INVOCATIONS.flatMap((g) => g.options).forEach(([name], i) => m.set(name, base + i));
    return m;
  }, [ui]);
}

function SupplyIcon({ data, nameIndex, itemKey }) {
  const ix = nameIndex.get(SUPPLY_ITEMS[itemKey].name.toLowerCase());
  return (
    <span className="ts-icon">
      {data && ix != null ? <ItemIcon data={data} index={ix} /> : null}
    </span>
  );
}

/** One item in a bundle: icon, amount, and its odds on hover. */
function SupplyChip({ data, nameIndex, bundleId, entry, pct, diet, dehydrated }) {
  const [open, setOpen] = useState(false);
  const item = SUPPLY_ITEMS[entry.key];
  const blocked = dehydrated && item.heals;
  const odds = qtyOdds(bundleId, entry.key, pct, diet);
  const fmt = (p) => `${(p * 100).toFixed(p < 0.1 && p > 0 ? 1 : 0)}%`;
  const notes = [
    entry.rare && `Rare: assumed 1 in ${Math.round(1 / RARE_CHANCE)}`,
    entry.assumed && 'On a Diet swap: amount assumed',
    blocked && 'Can’t be drunk with Dehydration',
  ].filter(Boolean);
  return (
    <button
      type="button"
      className={`ts-chip ${blocked ? 'blocked' : ''} ${entry.assumed ? 'assumed' : ''} ${open ? 'open' : ''}`}
      aria-expanded={open}
      onClick={() => setOpen((o) => !o)}
      onBlur={() => setOpen(false)}
    >
      <SupplyIcon data={data} nameIndex={nameIndex} itemKey={entry.key} />
      <b>{rangeLabel(entry.range)}</b>
      <span className="ts-chip-name">{item.short}{entry.rare && <i>rare</i>}</span>
      {open && (
        <span className="ts-odds" role="tooltip">
          <span className="ts-odds-title">{item.name}</span>
          {odds.map(([q, p]) => (
            <span key={q} className="ts-odds-row">
              <span>{q === 0 ? 'none' : `×${q}`}</span>
              <span className="ts-odds-bar"><span style={{ width: fmt(p) }} /></span>
              <b>{fmt(p)}</b>
            </span>
          ))}
          {notes.map((n) => <small key={n}>{n}</small>)}
        </span>
      )}
    </button>
  );
}

export default function ToaSupplyPage() {
  const { data } = useItemData();
  const nameIndex = useNameIndex(data);
  const ui = useUiData();
  const invoIcons = useInvoIcons(ui);

  const [helpId, setHelpId] = useState('none');
  const [restore, setRestore] = useState({ diet: false, dehydration: false });
  const [visits, setVisits] = useState(null); // rolled offers, one set per visit
  const help = HELP_LEVELS.find((h) => h.id === helpId);
  const { diet, dehydration } = restore;

  const raidLevel = help.rl + RESTORATION.reduce((n, r) => n + (restore[r.id] ? r.rl : 0), 0);

  const roll = () => setVisits(VISITS.map(() => BUNDLES.map((b) => ({ id: b.id, items: rollBundle(b.id, help.pct, diet) }))));

  const invoIcon = (name) => (invoIcons && name && ui ? <UiIcon ui={ui} index={invoIcons.get(name)} /> : null);

  return (
    <div className="page-content">
      <div className="ts">
        <header className="ts-head">
          <h2>ToA Supply Generator</h2>
          <p>
            What the Helpful Spirit hands you between paths, for every mix of the supply invocations. Pick yours
            below — the whole grid stays visible so you can compare, and clicking an item shows the odds of each amount.
          </p>
        </header>

        <section className="ts-panel ts-toggles" aria-label="Invocations">
          <div className="ts-group">
            <h4>Helpful spirit — pick one</h4>
            <div className="ts-invos">
              {HELP_LEVELS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`ts-invo ${helpId === h.id ? 'picked' : ''}`}
                  onClick={() => { setHelpId(h.id); setVisits(null); }}
                  title={h.invo ? `${h.invo}: supplies cut to ${pctLabel(h.pct)}, at least one of each type` : 'No reduction invocation'}
                >
                  <span className="ts-invo-icon">{invoIcon(h.invo) ?? <span className="ts-invo-none">—</span>}</span>
                  <span className="ts-invo-name">{h.label}</span>
                  <span className="ts-invo-meta">{pctLabel(h.pct)}{h.rl ? ` · +${h.rl}` : ''}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="ts-group">
            <h4>Restoration</h4>
            <div className="ts-invos">
              {RESTORATION.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`ts-invo ${restore[r.id] ? 'picked' : ''}`}
                  onClick={() => { setRestore((s) => ({ ...s, [r.id]: !s[r.id] })); setVisits(null); }}
                  title={`${r.invo}: ${r.desc}`}
                >
                  <span className="ts-invo-icon">{invoIcon(r.invo)}</span>
                  <span className="ts-invo-name">{r.invo}</span>
                  <span className="ts-invo-meta">+{r.rl}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="ts-level">
            Supply invocations: <b>+{raidLevel}</b> raid level
          </div>
        </section>

        <section className="ts-panel ts-grid-panel" aria-label="What the spirit offers">
          <div className="ts-grid">
            <div className="ts-corner" />
            {BUNDLES.map((b) => (
              <div key={b.id} className={`ts-col-head ts-${b.id}`}>
                <b>{b.name}</b>
                <small>{b.blurb}</small>
              </div>
            ))}
            {HELP_LEVELS.map((h) => (
              <div key={h.id} className={`ts-row ${h.id === helpId ? 'active' : ''}`}>
                <button
                  type="button"
                  className="ts-row-head"
                  aria-label={`${h.label}: ${pctLabel(h.pct)} of supplies`}
                  onClick={() => { setHelpId(h.id); setVisits(null); }}
                >
                  <span className="ts-invo-icon">{invoIcon(h.invo) ?? <span className="ts-invo-none">—</span>}</span>
                  <span>
                    <b>{h.label}</b>
                    <small>{pctLabel(h.pct)} of supplies</small>
                  </span>
                </button>
                {BUNDLES.map((b) => (
                  <div key={b.id} className={`ts-cell ts-${b.id}`}>
                    <span className="ts-cell-label">{b.name}</span>
                    {bundleContents(b.id, h.pct, diet).map((entry) => (
                      <SupplyChip
                        key={entry.key}
                        data={data}
                        nameIndex={nameIndex}
                        bundleId={b.id}
                        entry={entry}
                        pct={h.pct}
                        diet={diet}
                        dehydrated={dehydration}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {(diet || dehydration) && (
            <ul className="ts-effects">
              {diet && <li><b>On a Diet:</b> no silk dressings in Life, and a wipe hands out no honey locusts.</li>}
              {dehydration && <li><b>Dehydration:</b> nectar and ambrosia are still offered, but you can’t drink them.</li>}
            </ul>
          )}
        </section>

        <section className="ts-panel ts-gen" aria-label="Generate an offer">
          <div className="ts-gen-head">
            <div>
              <h3>Ask the spirit</h3>
              <p>Rolls a real offer for both visits with your invocations: {help.label}{diet ? ', On a Diet' : ''}{dehydration ? ', Dehydration' : ''}.</p>
            </div>
            <button type="button" className="ts-roll" onClick={roll}>{visits ? 'Roll again' : 'Roll supplies'}</button>
          </div>
          {visits && (
            <div className="ts-visits">
              {visits.map((offer, vi) => (
                <div key={vi} className="ts-visit" style={{ '--d': `${vi * 120}ms` }}>
                  <h4>{VISITS[vi]}</h4>
                  <div className="ts-offers">
                    {offer.map((o) => {
                      const b = BUNDLES.find((x) => x.id === o.id);
                      return (
                        <div key={o.id} className={`ts-offer ts-${o.id}`}>
                          <span className="ts-offer-name">{b.name}</span>
                          <div className="ts-offer-items">
                            {o.items.map((it) => {
                              const blocked = dehydration && SUPPLY_ITEMS[it.key].heals;
                              return (
                                <span key={it.key} className={`ts-slot ${blocked ? 'blocked' : ''}`} title={`${SUPPLY_ITEMS[it.key].name} ×${it.qty}${blocked ? ' — can’t be drunk' : ''}`}>
                                  <SupplyIcon data={data} nameIndex={nameIndex} itemKey={it.key} />
                                  <span className="ts-qty">{it.qty}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="ts-credit">
          Bundle contents and the 66% / 33% / 10% reductions are from the{' '}
          <a href="https://oldschool.runescape.wiki/w/Helpful_Spirit" target="_blank" rel="noopener noreferrer">Old School RuneScape Wiki</a>.
          The wiki doesn’t publish odds, so the generator assumes even rolls across each range, a 1 in{' '}
          {Math.round(1 / RARE_CHANCE)} chance for Chaos’s rare items, and that a reduced amount rounds up as often
          as its fraction (2 salts at 66% → 1.32 → 2 salts 32% of the time). Items marked with a dotted border are the
          On a Diet swap, whose amount the wiki leaves vague.
        </p>
      </div>
    </div>
  );
}
