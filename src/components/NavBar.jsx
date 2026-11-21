import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV } from '../site';
import './NavBar.css';

const link = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

/** One tool in a menu: a card, a featured card, or a compact one-liner. */
function MenuLink({ item }) {
  const kind = item.featured ? 'featured' : item.compact ? 'compact' : '';
  return (
    <NavLink
      to={item.path}
      role="menuitem"
      className={({ isActive }) => `nav-menu-link ${kind} ${isActive ? 'active' : ''}`}
      style={item.accent ? { '--c': item.accent } : undefined}
      title={item.compact ? item.blurb : undefined}
    >
      {item.compact && <span className="nav-dot" aria-hidden="true" />}
      <b>{item.name}</b>
      {!item.compact && <small>{item.blurb}</small>}
    </NavLink>
  );
}

/** A top-level nav entry that opens a menu of tools. */
function NavGroup({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const active = items.some((t) => pathname.startsWith(t.path));

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
          {items.map((item) => <MenuLink key={item.path} item={item} />)}
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
        {NAV.map((g) => <NavGroup key={g.label} label={g.label} items={g.items} />)}
      </div>
    </nav>
  );
}
