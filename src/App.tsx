import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Ticket, Users, FileText, Settings, LogOut, Sun, Moon, Menu, ChevronLeft, Bell, Search } from 'lucide-react';
import { DashboardView } from './pages/DashboardView';
import { TicketsView } from './pages/TicketsView';
import { CustomersView } from './pages/CustomersView';
import { QuotesView } from './pages/QuotesView';
import { LoginView } from './pages/LoginView';

// Theme Toggle Component
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
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
    <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme" style={{color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%'}}>
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

// Sidebar Item Component
const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string, icon: any, label: string, isCollapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link 
      to={to} 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '10px 12px', 
        borderRadius: 'var(--radius-md)', 
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)', 
        fontWeight: 500,
        backgroundColor: isActive ? 'rgba(0, 82, 204, 0.05)' : 'transparent',
        transition: 'all var(--transition-fast)',
        justifyContent: isCollapsed ? 'center' : 'flex-start'
      }}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={20} />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
};

// Sidebar Navigation
const Sidebar = ({ isCollapsed }: { isCollapsed: boolean }) => (
  <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
    <div style={{ padding: isCollapsed ? '24px 0' : '24px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '8px', borderBottom: '1px solid var(--color-border)', height: 'var(--header-height)' }}>
      <div style={{width: 32, height: 32, minWidth: 32, backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16}}>
        N
      </div>
      {!isCollapsed && <span>NexService</span>}
    </div>
    
    <nav style={{ padding: isCollapsed ? '24px 8px' : '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {!isCollapsed && <p style={{fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '8px', marginBottom: '8px'}}>Service Hub</p>}
      
      <NavItem to="/" icon={Home} label="Dashboard" isCollapsed={isCollapsed} />
      <NavItem to="/tickets" icon={Ticket} label="Tickets" isCollapsed={isCollapsed} />
      
      {!isCollapsed && <p style={{fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '8px', marginTop: '24px', marginBottom: '8px'}}>Sales & CRM</p>}
      {isCollapsed && <div style={{height: 1, backgroundColor: 'var(--color-border)', margin: '16px 8px'}} />}
      
      <NavItem to="/customers" icon={Users} label="Kunden" isCollapsed={isCollapsed} />
      <NavItem to="/quotes" icon={FileText} label="Offerten" isCollapsed={isCollapsed} />
    </nav>
    
    <div style={{ padding: isCollapsed ? '24px 8px' : '24px 16px', borderTop: '1px solid var(--color-border)' }}>
      <NavItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
      <button 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '12px', 
          padding: '10px 12px', 
          borderRadius: 'var(--radius-md)', 
          color: 'var(--color-danger)', 
          fontWeight: 500, 
          width: '100%', 
          marginTop: '4px',
          transition: 'all var(--transition-fast)'
        }}
        title={isCollapsed ? "Logout" : undefined}
      >
        <LogOut size={20} />
        {!isCollapsed && <span>Logout</span>}
      </button>
    </div>
  </aside>
);

const App = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Router basename="/ERD">
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="*" element={
          <div className="app-container">
            <Sidebar isCollapsed={isSidebarCollapsed} />
            
            <main className="main-content">
              <header className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', color: 'var(--color-text-muted)', transition: 'background-color var(--transition-fast)' }}
                    className="hover-bg"
                    aria-label="Toggle Sidebar"
                  >
                    {isSidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                  </button>
                  
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Suche nach Ticket, Kunde, Projekt..." 
                      style={{ 
                        padding: '10px 16px 10px 44px', 
                        borderRadius: 'var(--radius-pill)', 
                        border: '1px solid var(--color-border)', 
                        backgroundColor: 'var(--color-surface-hover)', 
                        color: 'var(--color-text-main)', 
                        width: '360px', 
                        outline: 'none',
                        fontSize: '14px',
                        transition: 'all var(--transition-fast)'
                      }} 
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <ThemeToggle />
                  
                  <button style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', color: 'var(--color-text-muted)' }}>
                    <Bell size={20} />
                    <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, backgroundColor: 'var(--color-danger)', borderRadius: '50%', border: '2px solid var(--color-surface)' }} />
                  </button>
                  
                  <div style={{ width: 1, height: 24, backgroundColor: 'var(--color-border)', margin: '0 8px' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ textAlign: 'right', display: 'none', '@media (min-width: 768px)': { display: 'block' } } as any}>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>Joel Hediger</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Administrator</p>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px' }}>
                      JH
                    </div>
                  </div>
                </div>
              </header>
              
              <div className="content-area">
                <Routes>
                  <Route path="/" element={<DashboardView />} />
                  <Route path="/tickets" element={<TicketsView />} />
                  <Route path="/customers" element={<CustomersView />} />
                  <Route path="/quotes" element={<QuotesView />} />
                  <Route path="/settings" element={<div><h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>System Settings</h1></div>} />
                </Routes>
              </div>
            </main>
          </div>
        } />
      </Routes>
    </Router>
  );
};

export default App;
