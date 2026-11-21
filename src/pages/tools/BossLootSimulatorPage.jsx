import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LootSimulator } from './RaidLootSimulatorPage.jsx';
import { LOOT_SIM_KEYS } from './loot-sim-prefs.js';
import { ItemIcon } from './loadout-items.jsx';
import { BOSS_CATEGORIES, BOSSES } from './boss-data/index.js';
import './BossLootSimulatorPage.css';

const BOSS_STRINGS = {
  noun: 'kill',
  nouns: 'kills',
  unique: 'unique',
  uniques: 'uniques',
  Unique: 'Unique',
  Uniques: 'Uniques',
  open: 'Kill',
  until: 'Until unique',
  idle: 'Ready when you are.',
  reset: 'Reset this boss',
  dry: 'RNG has left the chat.',
  setup: 'Boss setup',
  chance: 'Unique chance per kill:',
};

const CATEGORY_NAME = new Map(BOSS_CATEGORIES.map((c) => [c.id, c.name]));
const MAX_RESULTS = 8; // shown at once, so the dropdown never needs its own scrollbar

function BossIcon({ boss, data, nameIndex }) {
  const ix = data && boss.emblemItem ? nameIndex.get(boss.emblemItem.toLowerCase()) : undefined;
  return (
    <span className="bp-icon">
      {ix != null ? <ItemIcon data={data} index={ix} /> : <span className="bp-icon-none">☠</span>}
    </span>
  );
}

/** Type to search every boss; matches drop down under the box. */
function BossSearch({ contents, onPick, data, nameIndex }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0); // highlighted result
  const ref = useRef(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    // Names that start with the query first, then any other match.
    const hit = contents.filter((b) => b.name.toLowerCase().includes(q) || b.short.toLowerCase().includes(q));
    const starts = (b) => b.name.toLowerCase().startsWith(q) || b.short.toLowerCase().startsWith(q);
    return [...hit.filter(starts), ...hit.filter((b) => !starts(b))];
  }, [contents, q]);
  const shown = matches.slice(0, MAX_RESULTS);
  const showList = open && q.length > 0;

  useEffect(() => setHi(0), [q]);
  useEffect(() => {
    if (!showList) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [showList]);

  const pick = (b) => {
    onPick(b);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && shown[hi]) { e.preventDefault(); pick(shown[hi]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="bp-search-wrap" ref={ref}>
      <input
        type="search"
        className="bp-search"
        placeholder="Search bosses…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showList}
        aria-controls="bp-results"
        aria-autocomplete="list"
        aria-activedescendant={showList && shown[hi] ? `bp-result-${shown[hi].id}` : undefined}
        aria-label="Search bosses"
      />
      {showList && (
        <ul className="bp-results" id="bp-results" role="listbox">
          {shown.map((b, i) => (
            <li
              key={b.id}
              id={`bp-result-${b.id}`}
              role="option"
              aria-selected={i === hi}
              className={`bp-result ${i === hi ? 'hi' : ''}`}
              style={{ '--c': b.theme.accent }}
              onPointerEnter={() => setHi(i)}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(b)}
            >
              <BossIcon boss={b} data={data} nameIndex={nameIndex} />
              <span className="bp-result-name">{b.name}</span>
              <span className="bp-result-cat">{CATEGORY_NAME.get(b.category)}</span>
            </li>
          ))}
          {shown.length === 0 && <li className="bp-result-empty">No boss matches “{query.trim()}”.</li>}
          {matches.length > shown.length && (
            <li className="bp-result-more">+{matches.length - shown.length} more — keep typing to narrow it down</li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Category tabs + search + a grid of boss tiles; collapses on phones. */
function BossPicker({ contents, activeId, onSelect, data, nameIndex }) {
  const [params, setParams] = useSearchParams();
  const active = contents.find((b) => b.id === activeId);
  const [category, setCategory] = useState(active.category);
  // A link that already names a boss opens folded (phones only), simulator first.
  const [collapsed, setCollapsed] = useState(() => params.has('boss'));

  const shown = useMemo(() => contents.filter((b) => b.category === category), [contents, category]);

  const choose = (b) => {
    onSelect(b.id);
    setCategory(b.category);
    setParams({ boss: b.id }, { replace: true });
    setCollapsed(true);
  };

  return (
    <section className={`bp ${collapsed ? 'collapsed' : ''}`} aria-label="Choose a boss">
      <button type="button" className="bp-current" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
        <BossIcon boss={active} data={data} nameIndex={nameIndex} />
        <span className="bp-current-name">{active.name}</span>
        <span className="bp-current-change">{collapsed ? 'Change boss ▾' : 'Close ▴'}</span>
      </button>
      <div className="bp-body">
        <div className="bp-bar">
          <div className="bp-cats" role="tablist">
            {BOSS_CATEGORIES.filter((c) => contents.some((b) => b.category === c.id)).map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={category === c.id}
                className={`bp-cat ${category === c.id ? 'active' : ''}`}
                style={{ '--c': c.theme.accent }}
                onClick={() => setCategory(c.id)}
              >
                {c.name}
                <small>{contents.filter((b) => b.category === c.id).length}</small>
              </button>
            ))}
          </div>
          <BossSearch contents={contents} onPick={choose} data={data} nameIndex={nameIndex} />
        </div>
        <div className="bp-grid">
          {shown.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`bp-tile ${b.id === activeId ? 'active' : ''}`}
              style={{ '--c': b.theme.accent }}
              onClick={() => choose(b)}
              title={b.name}
            >
              <BossIcon boss={b} data={data} nameIndex={nameIndex} />
              <span className="bp-tile-name">{b.short}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function BossLootSimulatorPage() {
  const [params] = useSearchParams();
  return (
    <LootSimulator
      title="Boss Loot Simulator"
      intro="Kill any boss as many times as you like at the wiki's drop rates — no supplies, no deaths, no spade. Your tally is saved in this browser."
      contents={BOSSES}
      storageKey={LOOT_SIM_KEYS.boss}
      strings={BOSS_STRINGS}
      picker={BossPicker}
      initialId={params.get('boss')}
    />
  );
}
