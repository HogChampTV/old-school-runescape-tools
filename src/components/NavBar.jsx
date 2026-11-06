import { NavLink } from 'react-router-dom';
import { TOOLS } from '../site';
import './NavBar.css';

export default function NavBar() {
  const link = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <nav className="navbar">
      <NavLink to="/" end className="navbar-brand">
        <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" className="navbar-logo" />
        <span>Old School RuneScape Tools</span>
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" end className={link}>Home</NavLink>
        {TOOLS.map(tool => (
          <NavLink key={tool.path} to={tool.path} className={link}>{tool.name}</NavLink>
        ))}
      </div>
    </nav>
  );
}
