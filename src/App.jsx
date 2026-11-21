import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import TzhaarNameGeneratorPage from './pages/tools/TzhaarNameGeneratorPage';
import LoadoutCreatorPage from './pages/tools/LoadoutCreatorPage';
import RaidLootSimulatorPage from './pages/tools/RaidLootSimulatorPage';
import ClueCasketSimulatorPage from './pages/tools/ClueCasketSimulatorPage';
import ToaSupplyPage from './pages/tools/ToaSupplyPage';
import BossLootSimulatorPage from './pages/tools/BossLootSimulatorPage';
import RaidHubPage from './pages/RaidHubPage';
import SectionPage from './pages/SectionPage';
import { NAV } from './site';
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
          <Route path="/clue-casket-simulator" element={<ClueCasketSimulatorPage />} />
          <Route path="/helpful-spirit-supply-viewer" element={<ToaSupplyPage />} />
          {/* The tool's old address, kept so existing links still land. */}
          <Route path="/toa-supply-generator" element={<Navigate to="/helpful-spirit-supply-viewer" replace />} />
          <Route path="/boss-loot-simulator" element={<BossLootSimulatorPage />} />
          <Route path="/raids/:slug" element={<RaidHubPage />} />
          {/* A landing page for each menu group (Loot Simulators, Utilities, Fun). */}
          {NAV.map((g) => <Route key={g.path} path={g.path} element={<SectionPage group={g} />} />)}
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
