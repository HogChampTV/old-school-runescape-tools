import { Link } from 'react-router-dom';
import { navEntries } from '../site';
import './HomePage.css';

const ToolCard = ({ tool }) => (
  <Link to={tool.path} className="home-card">
    <h2>{tool.name}</h2>
    <p>{tool.blurb}</p>
  </Link>
);

export default function HomePage() {
  return (
    <div className="page-content home">
      <header className="home-head">
        <h1>Old School RuneScape Tools</h1>
        <p>Small browser tools for Old School RuneScape. Free, no signup, nothing to install.</p>
      </header>

      <div className="home-cards">
        {navEntries().map((e) => (e.group ? (
          <section key={e.group} className="home-group">
            <h3>{e.group}</h3>
            <div className="home-cards">
              {e.tools.map((t) => <ToolCard key={t.path} tool={t} />)}
            </div>
          </section>
        ) : <ToolCard key={e.tool.path} tool={e.tool} />))}
        <div className="home-card placeholder">
          <h2>More to come</h2>
          <p>
            Calculators and other small tools are planned.{' '}
            <a
              href="https://github.com/HogChampTV/old-school-runescape-tools/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Suggestions welcome
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
