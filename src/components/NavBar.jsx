import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navEntries } from '../site';
import './NavBar.css';

const link = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

/** A nav entry that opens a small menu of related tools. */
function NavGroup({ label, tools }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const active = tools.some((t) => pathname.startsWith(t.path));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`nav-group ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`nav-link nav-group-button ${active ? 'active' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <span className="nav-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="nav-menu" role="menu">
          {tools.map((t) => (
            <NavLink key={t.path} to={t.path} role="menuitem" className={({ isActive }) => `nav-menu-link ${isActive ? 'active' : ''}`}>
              <b>{t.name}</b>
              <small>{t.blurb}</small>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  return (
    <nav className="navbar">
      <NavLink to="/" end className="navbar-brand">
        <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" className="navbar-logo" />
        <span>Old School RuneScape Tools</span>
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" end className={link}>Home</NavLink>
        {navEntries().map((e) => (e.group
          ? <NavGroup key={e.group} label={e.group} tools={e.tools} />
          : <NavLink key={e.tool.path} to={e.tool.path} className={link}>{e.tool.name}</NavLink>))}
      </div>
    </nav>
  );
}
