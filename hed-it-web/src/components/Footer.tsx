import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Globe, CheckCircle2 } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="logo">
            <div className="logo-icon">H</div>
            <span>hed-it<span className="premium-gradient">.ch</span></span>
          </div>
          <p className="footer-desc">
            Spezialisiert auf High-End Webentwicklung, Cloud-Migrationen und moderne Infrastruktur-Systeme in der Schweiz.
          </p>
        </div>
        
        <div className="footer-links">
          <h4>Rechtliches</h4>
          <ul className="footer-list">
            <li><Link to="/impressum" className="nav-link" style={{ fontSize: '12px' }}>Impressum</Link></li>
            <li><Link to="/privacy" className="nav-link" style={{ fontSize: '12px' }}>Datenschutz</Link></li>
            <li><Link to="/agb" className="nav-link" style={{ fontSize: '12px' }}>AGB</Link></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h4>Kontakt</h4>
          <ul className="footer-list">
            <li><Mail size={16} /> info@hed-it.ch</li>
            <li><Globe size={16} /> www.hed-it.ch</li>
            <li><CheckCircle2 size={16} /> Standort Schweiz</li>
          </ul>
        </div>
      </div>
      
      <div className="container footer-bottom">
        <p>© 2026 hed-it. All Rights Reserved. Engineered for Performance.</p>
        <div className="footer-legal-links">
           <Link to="/support">Support-Portal</Link>
           <Link to="/calculator">Kalkulator</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
