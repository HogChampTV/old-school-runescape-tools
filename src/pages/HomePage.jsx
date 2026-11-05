import { Link } from 'react-router-dom';
import { TOOLS } from '../site';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="page-content home">
      <header className="home-head">
        <h1>Old School RuneScape Tools</h1>
        <p>Small browser tools for OSRS. Free, no signup, nothing to install.</p>
      </header>

      <div className="home-cards">
        {TOOLS.map(tool => (
          <Link key={tool.path} to={tool.path} className="home-card">
            <h2>{tool.name}</h2>
            <p>{tool.blurb}</p>
          </Link>
        ))}
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
