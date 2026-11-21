import { Link, useParams } from 'react-router-dom';
import { RAID_HUBS, raidHubPath } from '../site';
import { RAIDS } from './tools/raid-loot-data.js';
import { useItemData, useNameIndex, ItemIcon } from './tools/loadout-items.jsx';
import NotFoundPage from './NotFoundPage';
import './RaidHubPage.css';

function PetIcon({ name, data, nameIndex, className }) {
  const ix = data ? nameIndex.get(name.toLowerCase()) : undefined;
  return <span className={className}>{ix != null && <ItemIcon data={data} index={ix} />}</span>;
}

/** A raid's landing page: what it is, and every tool the site has for it. */
export default function RaidHubPage() {
  const { slug } = useParams();
  const { data } = useItemData();
  const nameIndex = useNameIndex(data);
  const hub = RAID_HUBS.find((h) => h.slug === slug);
  const raid = hub && RAIDS.find((r) => r.id === hub.id);
  if (!hub || !raid) return <NotFoundPage />;

  // Every raid gets its loot simulator; anything else is the raid's own.
  const tools = [
    {
      path: `/raid-loot-simulator?raid=${raid.id}`,
      name: 'Loot simulator',
      blurb: `Open the ${raid.name} reward chest as many times as you like, at wiki drop rates.`,
    },
    ...hub.tools,
  ];

  return (
    <div className="page-content">
      <div
        className="rh"
        style={{ '--c': raid.theme.accent, '--c2': raid.theme.accent2, '--glow': raid.theme.glow }}
      >
        <header className="rh-head">
          <PetIcon name={raid.pet.name} data={data} nameIndex={nameIndex} className="rh-emblem" />
          <div>
            <p className="rh-kicker">Raid</p>
            <h2>{raid.name}</h2>
            <p className="rh-tagline">{raid.tagline}</p>
          </div>
        </header>

        <h3 className="rh-section">Tools</h3>
        <div className="rh-tools">
          {tools.map((t) => (
            <Link key={t.path} to={t.path} className="rh-tool">
              <b>{t.name}</b>
              <span>{t.blurb}</span>
              <i aria-hidden="true">Open →</i>
            </Link>
          ))}
          {hub.tools.length === 0 && (
            <div className="rh-tool rh-soon">
              <b>More {raid.name} tools</b>
              <span>Coming soon.</span>
            </div>
          )}
        </div>

        <h3 className="rh-section">Other raids</h3>
        <nav className="rh-others" aria-label="Other raids">
          {RAID_HUBS.filter((h) => h !== hub).map((h) => {
            const r = RAIDS.find((x) => x.id === h.id);
            return (
              <Link key={h.slug} to={raidHubPath(h)} className="rh-other" style={{ '--c': r.theme.accent }}>
                <PetIcon name={r.pet.name} data={data} nameIndex={nameIndex} className="rh-other-icon" />
                {h.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
