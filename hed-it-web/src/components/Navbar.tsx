import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


interface NavbarProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const location = useLocation();
  const { token } = useAuth();

  
  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="logo-icon">H</div>
          <span>hed-it<span className="premium-gradient">.ch</span></span>
        </Link>
        
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/services" className={`nav-link ${location.pathname === '/services' ? 'active' : ''}`}>Dienstleistungen</Link>
          <Link to="/references" className={`nav-link ${location.pathname === '/references' ? 'active' : ''}`}>Referenzen</Link>
          <Link to="/calculator" className={`nav-link ${location.pathname === '/calculator' ? 'active' : ''}`}>Kalkulator</Link>
          <Link to="/support" className={`nav-link ${location.pathname === '/support' ? 'active' : ''}`}>Support</Link>
          <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Kontakt</Link>
        </div>

        <div className="flex items-center gap-4">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {token ? (
            <Link to="/portal" className="btn btn-outline" style={{ padding: '10px 20px', fontSize: '14px', textDecoration: 'none', display: 'flex', gap: '8px' }}>
              <User size={18} /> Kundenportal
            </Link>
          ) : (
            <Link to="/login" className="btn btn-outline" style={{ padding: '10px 20px', fontSize: '14px', textDecoration: 'none' }}>
              Login
            </Link>
          )}

          <Link to="/calculator" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '14px', textDecoration: 'none' }}>
            Projekt starten
          </Link>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
