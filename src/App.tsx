import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Ticket, Users, FileText, Settings, LogOut, Sun, Moon, Menu, ChevronLeft, Bell, Search, UserCheck, FolderOpen, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { DashboardView } from './pages/DashboardView';
import { TicketsView } from './pages/TicketsView';
import { TicketDetailView } from './pages/TicketDetailView';
import { ContactsView } from './pages/ContactsView';
import { CustomersView } from './pages/CustomersView';
import { CustomerDetailView } from './pages/CustomerDetailView';
import { ProjectsView } from './pages/ProjectsView';
import { QuotesView } from './pages/QuotesView';
import { SettingsView } from './pages/SettingsView';
import { UsersView } from './pages/UsersView';
import { LoginView } from './pages/LoginView';
import { GlobalLoginView } from './pages/GlobalLoginView';
import { getUser, clearAuth } from './utils/auth';

// Theme Toggle Component
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = storedTheme === 'dark' || (!storedTheme && systemPrefersDark);
    // Apply on first render
    document.documentElement.setAttribute('data-theme', useDark ? 'dark' : 'light');
    return useDark;
  });

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

// ─── Notification Bell ────────────────────────────────────────────────────────
interface Notif { id: string; type: string; title: string; body: string; created_at: string }
const TYPE_COLOR: Record<string, string> = { danger: 'var(--color-danger)', warning: 'var(--color-warning)', info: 'var(--color-info)' };

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => { if (d.success) setNotifs(d.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', color: open ? 'var(--color-primary)' : 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}>
        <Bell size={20} />
        {notifs.length > 0 && <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, backgroundColor: 'var(--color-danger)', borderRadius: '50%', border: '2px solid var(--color-surface)' }} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 48, width: 380, maxHeight: 480, overflowY: 'auto', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Benachrichtigungen</span>
            <span style={{ fontSize: 12, fontWeight: 600, backgroundColor: notifs.length > 0 ? 'var(--color-danger)' : 'var(--color-border)', color: notifs.length > 0 ? 'white' : 'var(--color-text-muted)', borderRadius: 10, padding: '2px 8px' }}>{notifs.length}</span>
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>Keine Benachrichtigungen ✓</div>
          ) : notifs.map(n => (
            <div key={n.id} style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--color-border)', transition: 'background 0.1s' }} className="hover-bg-row">
              <div style={{ flexShrink: 0, marginTop: 2, color: TYPE_COLOR[n.type] || 'var(--color-info)' }}><AlertTriangle size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: TYPE_COLOR[n.type] || 'var(--color-text-main)' }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: '10px 20px', textAlign: 'center' }}>
            <button onClick={() => setOpen(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={13} /> Schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Sidebar Item Component
const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string, icon: React.ElementType, label: string, isCollapsed: boolean }) => {
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
const Sidebar = ({ isCollapsed, onLogout }: { isCollapsed: boolean, onLogout: () => void }) => (
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
      <NavItem to="/projects" icon={FolderOpen} label="Projekte" isCollapsed={isCollapsed} />
      
      {!isCollapsed && <p style={{fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '8px', marginTop: '24px', marginBottom: '8px'}}>Sales & CRM</p>}
      {isCollapsed && <div style={{height: 1, backgroundColor: 'var(--color-border)', margin: '16px 8px'}} />}
      
      <NavItem to="/customers" icon={Users} label="Kunden" isCollapsed={isCollapsed} />
      <NavItem to="/contacts" icon={UserCheck} label="Kontakte" isCollapsed={isCollapsed} />
      <NavItem to="/quotes" icon={FileText} label="Offerten" isCollapsed={isCollapsed} />
    </nav>
    
    <div style={{ padding: isCollapsed ? '24px 8px' : '24px 16px', borderTop: '1px solid var(--color-border)' }}>
      <NavItem to="/settings" icon={Settings} label="Einstellungen" isCollapsed={isCollapsed} />
      <NavItem to="/users" icon={ShieldCheck} label="Benutzer" isCollapsed={isCollapsed} />
      <button 
        onClick={onLogout}
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
  // Persist auth state across page refreshes by checking localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const currentUser = getUser();

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <GlobalLoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router basename="/ERD">
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="*" element={
          <div className="app-container">
            <Sidebar isCollapsed={isSidebarCollapsed} onLogout={handleLogout} />
            
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
                  <NotificationBell />
                  
                  <div style={{ width: 1, height: 24, backgroundColor: 'var(--color-border)', margin: '0 8px' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ textAlign: 'right', display: 'none', '@media (min-width: 768px)': { display: 'block' } } as React.CSSProperties}>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Gast'}</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{currentUser?.role || 'user'}</p>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px' }}>
                      {currentUser ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}` : 'JH'}
                    </div>
                  </div>
                </div>
              </header>
              
              <div className="content-area">
                <Routes>
                  <Route path="/" element={<DashboardView />} />
                  <Route path="/tickets" element={<TicketsView />} />
                  <Route path="/tickets/:id" element={<TicketDetailView />} />
                  <Route path="/projects" element={<ProjectsView />} />
                  <Route path="/customers" element={<CustomersView />} />
                  <Route path="/customers/:id" element={<CustomerDetailView />} />
                  <Route path="/contacts" element={<ContactsView />} />
                  <Route path="/quotes" element={<QuotesView />} />
                  <Route path="/settings" element={<SettingsView />} />
                  <Route path="/users" element={<UsersView />} />
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
