import { Link } from 'react-router-dom';
import { NAV } from '../site';
import './HomePage.css';

const ToolCard = ({ tool }) => (
  <Link
    to={tool.path}
    className={`home-card ${tool.featured ? 'featured' : ''} ${tool.accent ? 'accented' : ''}`}
    style={tool.accent ? { '--c': tool.accent } : undefined}
  >
    <h2>{tool.name}</h2>
    <p>{tool.blurb}</p>
  </Link>
);

export default function HomePage() {
  return (
    <div className="page-content home">
      <header className="home-head">
        <h1>Old School RuneScape Tools</h1>
        <p>Loot simulators, raid tools and a loadout planner for Old School RuneScape.</p>
      </header>

      <div className="home-groups">
        {NAV.map((g) => (
          <section key={g.label} className="home-group">
            <h3><Link to={g.path} className="home-group-link">{g.label} <span aria-hidden="true">→</span></Link></h3>
            <div className="home-cards">
              {g.items.map((t) => <ToolCard key={t.path} tool={t} />)}
            </div>
          </section>
        ))}
      </div>

      <p className="home-more">
        More to come —{' '}
        <a
          href="https://github.com/HogChampTV/old-school-runescape-tools/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          suggestions welcome
        </a>.
      </p>
    </div>
  );
}
