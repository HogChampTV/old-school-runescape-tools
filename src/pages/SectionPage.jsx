import { Link } from 'react-router-dom';
import { useItemData, useNameIndex, ItemIcon } from './tools/loadout-items.jsx';
import './SectionPage.css';

function Icon({ name, data, nameIndex }) {
  const ix = data && name ? nameIndex.get(name.toLowerCase()) : undefined;
  return <span className="sp-icon">{ix != null && <ItemIcon data={data} index={ix} />}</span>;
}

function ToolCard({ tool, data, nameIndex }) {
  return (
    <Link
      to={tool.path}
      className={`sp-card ${tool.featured ? 'featured' : ''} ${tool.accent ? 'accented' : ''}`}
      style={tool.accent ? { '--c': tool.accent } : undefined}
    >
      <Icon name={tool.icon} data={data} nameIndex={nameIndex} />
      <span className="sp-card-text">
        <b>{tool.name}</b>
        <span>{tool.blurb}</span>
        <i aria-hidden="true">Open →</i>
      </span>
    </Link>
  );
}

/** A menu group's landing page: what's in it, one card per tool. */
export default function SectionPage({ group }) {
  const { data } = useItemData();
  const nameIndex = useNameIndex(data);
  const main = group.items.filter((t) => !t.compact);
  const compact = group.items.filter((t) => t.compact);
  return (
    <div className="page-content">
      <div className="sp">
        <header className="sp-head">
          <p className="sp-kicker">Old School RuneScape Tools</p>
          <h2>{group.label}</h2>
          <p className="sp-intro">{group.intro}</p>
        </header>

        <div className="sp-grid">
          {main.map((t) => <ToolCard key={t.path} tool={t} data={data} nameIndex={nameIndex} />)}
        </div>

        {compact.length > 0 && (
          <>
            <h3 className="sp-section">{group.compactLabel}</h3>
            <div className="sp-grid sp-grid-wide">
              {compact.map((t) => <ToolCard key={t.path} tool={t} data={data} nameIndex={nameIndex} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
