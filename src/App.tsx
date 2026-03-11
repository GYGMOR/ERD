import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Home, Ticket, Users, FileText, Settings, LogOut, Sun, Moon, Menu, ChevronLeft,
  Bell, Search, AlertTriangle, X, FolderOpen, UserCheck, ShieldCheck,
  Target, FileSignature, Package, Mail, BookOpen, Calculator, CreditCard,
} from 'lucide-react';
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
import { getUser, clearAuth, hasRole, isInternal } from './utils/auth';
import type { UserRole } from './types/entities';

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = stored === 'dark' || (!stored && systemDark);
    document.documentElement.setAttribute('data-theme', useDark ? 'dark' : 'light');
    return useDark;
  });

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button onClick={toggle} aria-label="Toggle theme" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%' }}>
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
};

// ─── Notification Bell ────────────────────────────────────────────────────────
interface Notif { id: string; type: string; title: string; body: string; created_at: string }
const TYPE_CLR: Record<string, string> = { danger: 'var(--color-danger)', warning: 'var(--color-warning)', info: 'var(--color-info)' };

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch('/api/notifications').then(r => r.json()).then(d => { if (d.success) setNotifs(d.data); }).catch(() => {}); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:'50%', color: open ? 'var(--color-primary)' : 'var(--color-text-muted)', background:'none', border:'none', cursor:'pointer', transition:'color 0.15s' }}>
        <Bell size={17} />
        {notifs.length > 0 && <span style={{ position:'absolute', top:5, right:5, width:7, height:7, backgroundColor:'var(--color-danger)', borderRadius:'50%', border:'2px solid var(--color-surface)' }} />}
      </button>
      {open && (
        <div style={{ position:'absolute', right:0, top:40, width:360, maxHeight:440, overflowY:'auto', backgroundColor:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-lg)', zIndex:200 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--color-border)' }}>
            <span style={{ fontWeight:700, fontSize:13 }}>Benachrichtigungen</span>
            <span style={{ fontSize:11, fontWeight:600, backgroundColor: notifs.length > 0 ? 'var(--color-danger)' : 'var(--color-border)', color: notifs.length > 0 ? 'white' : 'var(--color-text-muted)', borderRadius:10, padding:'1px 7px' }}>{notifs.length}</span>
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>Keine Benachrichtigungen ✓</div>
          ) : notifs.map(n => (
            <div key={n.id} style={{ display:'flex', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--color-border)' }}>
              <div style={{ flexShrink:0, marginTop:2, color: TYPE_CLR[n.type] || 'var(--color-info)' }}><AlertTriangle size={14} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:12, color: TYPE_CLR[n.type] || 'var(--color-text-main)' }}>{n.title}</div>
                <div style={{ fontSize:12, color:'var(--color-text-muted)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>
              </div>
            </div>
          ))}
          <div style={{ padding:'8px 16px', textAlign:'center' }}>
            <button onClick={() => setOpen(false)} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'var(--color-text-muted)', background:'none', border:'none', cursor:'pointer' }}>
              <X size={12} /> Schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sidebar NavItem ──────────────────────────────────────────────────────────
const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string; icon: React.ElementType; label: string; isCollapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: isCollapsed ? '7px' : '7px 10px',
        borderRadius: 'var(--radius-md)',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
        fontWeight: isActive ? 600 : 500,
        fontSize: '13px',
        backgroundColor: isActive ? 'rgba(0, 82, 204, 0.06)' : 'transparent',
        transition: 'all var(--transition-fast)',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={17} />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
};

// ─── Sidebar Group Label ──────────────────────────────────────────────────────
const GroupLabel = ({ label, isCollapsed }: { label: string; isCollapsed: boolean }) =>
  isCollapsed
    ? <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '8px 6px' }} />
    : <p className="sidebar-group-label">{label}</p>;

// ─── Navigation Structure ─────────────────────────────────────────────────────
interface NavEntry { to: string; icon: React.ElementType; label: string; roles?: UserRole[] }
interface NavGroup { label: string; items: NavEntry[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Service Hub',
    items: [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/tickets', icon: Ticket, label: 'Tickets' },
      { to: '/projects', icon: FolderOpen, label: 'Projekte', roles: ['admin', 'manager', 'employee'] },
      { to: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
    ],
  },
  {
    label: 'Sales & CRM',
    items: [
      { to: '/customers', icon: Users, label: 'Kunden', roles: ['admin', 'manager', 'employee'] },
      { to: '/contacts', icon: UserCheck, label: 'Kontakte', roles: ['admin', 'manager', 'employee'] },
      { to: '/leads', icon: Target, label: 'Akquise', roles: ['admin', 'manager', 'employee'] },
      { to: '/quotes', icon: FileText, label: 'Offerten', roles: ['admin', 'manager', 'employee'] },
      { to: '/contracts', icon: FileSignature, label: 'Verträge', roles: ['admin', 'manager', 'employee'] },
      { to: '/products', icon: Package, label: 'Produkte', roles: ['admin', 'manager', 'employee'] },
      { to: '/newsletter', icon: Mail, label: 'Newsletter', roles: ['admin', 'manager', 'employee'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/accounting', icon: Calculator, label: 'Buchhaltung', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Intern',
    items: [
      { to: '/business-card', icon: CreditCard, label: 'Visitenkarte', roles: ['admin', 'manager', 'employee'] },
      { to: '/users', icon: ShieldCheck, label: 'Benutzer', roles: ['admin', 'manager'] },
      { to: '/settings', icon: Settings, label: 'Einstellungen' },
    ],
  },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────
const Sidebar = ({ isCollapsed, onLogout }: { isCollapsed: boolean; onLogout: () => void }) => {
  const userRole = (getUser()?.role || 'customer') as UserRole;

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div style={{ padding: isCollapsed ? '12px 0' : '12px 14px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: 8, borderBottom: '1px solid var(--color-border)', height: 'var(--header-height)', minHeight: 'var(--header-height)' }}>
        <div style={{ width: 28, height: 28, minWidth: 28, backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700 }}>N</div>
        {!isCollapsed && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>NexService</span>}
      </div>

      {/* Navigation */}
      <nav style={{ padding: isCollapsed ? '8px 6px' : '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <GroupLabel label={group.label} isCollapsed={isCollapsed} />
              {visibleItems.map(item => (
                <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isCollapsed={isCollapsed} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: isCollapsed ? '8px 6px' : '8px 10px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)', fontWeight: 500, fontSize: 13, width: '100%',
          }}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={17} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

// ─── Placeholder View (for modules not yet built) ─────────────────────────────
const Placeholder = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12, color: 'var(--color-text-muted)' }}>
    <Icon size={40} strokeWidth={1.5} />
    <h2 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h2>
    <p style={{ fontSize: 13 }}>Dieses Modul wird in Batch B/C implementiert.</p>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
const App = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const currentUser = getUser();

  const handleLogout = () => { clearAuth(); setIsAuthenticated(false); };

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', color: 'var(--color-text-muted)' }}
                    aria-label="Toggle Sidebar"
                  >
                    {isSidebarCollapsed ? <Menu size={17} /> : <ChevronLeft size={17} />}
                  </button>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Suche..."
                      style={{
                        padding: '6px 12px 6px 34px', borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)',
                        color: 'var(--color-text-main)', width: 280, outline: 'none', fontSize: 13,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ThemeToggle />
                  <NotificationBell />
                  <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-border)', margin: '0 4px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 600 }}>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Gast'}</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{currentUser?.role || 'user'}</p>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 12 }}>
                      {currentUser ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}` : 'N'}
                    </div>
                  </div>
                </div>
              </header>

              <div className="content-area">
                <Routes>
                  {/* Service Hub */}
                  <Route path="/" element={<DashboardView />} />
                  <Route path="/tickets" element={<TicketsView />} />
                  <Route path="/tickets/:id" element={<TicketDetailView />} />
                  <Route path="/projects" element={isInternal() ? <ProjectsView /> : <Placeholder title="Kein Zugriff" icon={FolderOpen} />} />
                  <Route path="/knowledge" element={<Placeholder title="Knowledge Base" icon={BookOpen} />} />

                  {/* Sales & CRM */}
                  <Route path="/customers" element={<CustomersView />} />
                  <Route path="/customers/:id" element={<CustomerDetailView />} />
                  <Route path="/contacts" element={<ContactsView />} />
                  <Route path="/leads" element={<Placeholder title="Akquise / Leads" icon={Target} />} />
                  <Route path="/quotes" element={<QuotesView />} />
                  <Route path="/contracts" element={<Placeholder title="Verträge" icon={FileSignature} />} />
                  <Route path="/products" element={<Placeholder title="Produkte" icon={Package} />} />
                  <Route path="/newsletter" element={<Placeholder title="Newsletter" icon={Mail} />} />

                  {/* Finance */}
                  <Route path="/accounting" element={hasRole('admin', 'manager') ? <Placeholder title="Buchhaltung" icon={Calculator} /> : <Placeholder title="Kein Zugriff" icon={Calculator} />} />

                  {/* Intern */}
                  <Route path="/business-card" element={isInternal() ? <Placeholder title="Visitenkarte" icon={CreditCard} /> : <Placeholder title="Kein Zugriff" icon={CreditCard} />} />
                  <Route path="/users" element={hasRole('admin', 'manager') ? <UsersView /> : <Placeholder title="Kein Zugriff" icon={ShieldCheck} />} />
                  <Route path="/settings" element={<SettingsView />} />
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
