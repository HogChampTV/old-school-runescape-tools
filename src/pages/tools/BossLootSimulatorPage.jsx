import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LootSimulator } from './RaidLootSimulatorPage.jsx';
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

function BossIcon({ boss, data, nameIndex }) {
  const ix = data && boss.emblemItem ? nameIndex.get(boss.emblemItem.toLowerCase()) : undefined;
  return (
    <span className="bp-icon">
      {ix != null ? <ItemIcon data={data} index={ix} /> : <span className="bp-icon-none">☠</span>}
    </span>
  );
}

/** Category tabs + search + a grid of boss tiles; collapses on phones. */
function BossPicker({ contents, activeId, onSelect, data, nameIndex }) {
  const [params, setParams] = useSearchParams();
  const active = contents.find((b) => b.id === activeId);
  const [category, setCategory] = useState(active.category);
  const [query, setQuery] = useState('');
  // A link that already names a boss opens folded (phones only), simulator first.
  const [collapsed, setCollapsed] = useState(() => params.has('boss'));

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (q
      ? contents.filter((b) => b.name.toLowerCase().includes(q) || b.short.toLowerCase().includes(q))
      : contents.filter((b) => b.category === category)),
    [contents, category, q],
  );

  const choose = (id) => {
    onSelect(id);
    setParams({ boss: id }, { replace: true });
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
                aria-selected={!q && category === c.id}
                className={`bp-cat ${!q && category === c.id ? 'active' : ''}`}
                style={{ '--c': c.theme.accent }}
                onClick={() => { setCategory(c.id); setQuery(''); }}
              >
                {c.name}
                <small>{contents.filter((b) => b.category === c.id).length}</small>
              </button>
            ))}
          </div>
          <input
            type="search"
            className="bp-search"
            placeholder="Search bosses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search bosses"
          />
        </div>
        <div className="bp-grid">
          {shown.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`bp-tile ${b.id === activeId ? 'active' : ''}`}
              style={{ '--c': b.theme.accent }}
              onClick={() => choose(b.id)}
              title={b.name}
            >
              <BossIcon boss={b} data={data} nameIndex={nameIndex} />
              <span className="bp-tile-name">{b.short}</span>
            </button>
          ))}
          {shown.length === 0 && <p className="bp-empty">No boss matches “{query}”.</p>}
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
      storageKey="boss-loot-stats"
      strings={BOSS_STRINGS}
      picker={BossPicker}
      initialId={params.get('boss')}
    />
  );
}
