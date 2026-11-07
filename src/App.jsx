import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import TzhaarNameGeneratorPage from './pages/tools/TzhaarNameGeneratorPage';
import LoadoutCreatorPage from './pages/tools/LoadoutCreatorPage';
import RaidLootSimulatorPage from './pages/tools/RaidLootSimulatorPage';
import './App.css';

export default function App() {
  return (
    <div className="app-container">
      <NavBar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tzhaar-name-generator" element={<TzhaarNameGeneratorPage />} />
          <Route path="/loadout-creator" element={<LoadoutCreatorPage />} />
          <Route path="/raid-loot-simulator" element={<RaidLootSimulatorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>
          Not affiliated with Jagex Ltd. or Old School RuneScape. Game data and
          names belong to their respective owners. Non-commercial fan project.
        </p>
        <a href="https://github.com/HogChampTV/old-school-runescape-tools" target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
