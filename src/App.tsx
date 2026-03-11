import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Ticket, Users, FileText, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

// Theme Toggle Component
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference or local storage on initial load
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    const useDark = storedTheme === 'dark' || (!storedTheme && systemPrefersDark);
    
    setIsDark(useDark);
    document.documentElement.setAttribute('data-theme', useDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme" style={{color: 'var(--color-text-muted)'}}>
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

// Sidebar Navigation
const Sidebar = () => (
  <aside className="sidebar">
    <div style={{ padding: '24px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{width: 32, height: 32, backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)'}}></div>
      NexService
    </div>
    
    <nav style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <p style={{fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '8px', marginBottom: '8px'}}>Service Hub</p>
      
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontWeight: 500 }}>
        <Home size={18} /> Dashboard
      </Link>
      <Link to="/tickets" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontWeight: 500, backgroundColor: 'rgba(0, 82, 204, 0.05)' }}>
        <Ticket size={18} /> Tickets
      </Link>
      
      <p style={{fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '8px', marginTop: '24px', marginBottom: '8px'}}>Sales & CRM</p>
      <Link to="/customers" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontWeight: 500 }}>
        <Users size={18} /> Kunden
      </Link>
      <Link to="/quotes" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontWeight: 500 }}>
        <FileText size={18} /> Offerten
      </Link>
    </nav>
    
    <div style={{ padding: '24px 16px', borderTop: '1px solid var(--color-border)' }}>
      <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontWeight: 500 }}>
        <Settings size={18} /> Settings
      </Link>
      <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontWeight: 500, width: '100%', marginTop: '4px' }}>
        <LogOut size={18} /> Logout
      </button>
    </div>
  </aside>
);

// Stub Views
const DashboardView = () => (
  <div>
    <h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>Command Center</h1>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Offene Tickets</p>
        <h2 style={{ fontSize: '2rem', marginTop: '8px' }}>24</h2>
        <span className="badge warning" style={{ marginTop: '12px' }}>5 Kritisch</span>
      </div>
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Umsatz (MTD)</p>
        <h2 style={{ fontSize: '2rem', marginTop: '8px' }}>CHF 42k</h2>
        <span className="badge success" style={{ marginTop: '12px' }}>+12% YoY</span>
      </div>
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Aktive Projekte</p>
        <h2 style={{ fontSize: '2rem', marginTop: '8px' }}>8</h2>
      </div>
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Zufriedenheit</p>
        <h2 style={{ fontSize: '2rem', marginTop: '8px' }}>98%</h2>
      </div>
    </div>
  </div>
);

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        
        <main className="main-content">
          <header className="topbar">
            <div>
              {/* Globale Suche Placeholder */}
              <input type="text" placeholder="Suche nach Ticket, Kunde..." style={{ padding: '8px 16px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-main)', width: '300px', outline: 'none' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <ThemeToggle />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Admin User</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>CEO</p>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                  AU
                </div>
              </div>
            </div>
          </header>
          
          <div className="content-area">
            <Routes>
              <Route path="/" element={<DashboardView />} />
              <Route path="/tickets" element={<div><h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>Tickets</h1><div className="card"><p>Ticketsystem Listenansicht kommt hierhin.</p></div></div>} />
              <Route path="/customers" element={<div><h1>Kunden</h1></div>} />
              <Route path="/quotes" element={<div><h1>Offerten</h1></div>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;
