import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Home, Ticket, Users, FileText, Settings, LogOut, Sun, Moon, Menu, ChevronLeft,
  Search, FolderOpen, UserCheck, ShieldCheck, Activity,
  Target, FileSignature, Package, Mail, BookOpen, Calculator, CreditCard,
} from 'lucide-react';
import { DashboardView } from './pages/DashboardView';
import { TicketsView } from './pages/TicketsView';
import { TicketDetailView } from './pages/TicketDetailView';
import { ContactsView } from './pages/ContactsView';
import { CustomersView } from './pages/CustomersView';
import { CustomerDetailView } from './pages/CustomerDetailView';
import { LeadsView } from './pages/LeadsView';
import { ContractsView } from './pages/ContractsView';
import { ProductsView } from './pages/ProductsView';
import { NewsletterView } from './pages/NewsletterView';
import { KnowledgeBaseView } from './pages/KnowledgeBaseView';
import { AccountingView } from './pages/AccountingView';
import { BusinessCardView } from './pages/BusinessCardView';
import { CustomerTimelineView } from './pages/CustomerTimelineView';
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

import { NotificationCenter } from './components/NotificationCenter';

// ─── Sidebar NavItem ──────────────────────────────────────────────────────────
const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string; icon: React.ElementType; label: string; isCollapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '10px',
        padding: isCollapsed ? '10px' : '7px 12px',
        margin: isCollapsed ? '2px 6px' : '1px 10px',
        borderRadius: 'var(--radius-md)',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
        fontWeight: isActive ? 600 : 500,
        fontSize: '13px',
        backgroundColor: isActive ? 'rgba(0, 82, 204, 0.08)' : 'transparent',
        transition: 'all var(--transition-fast)',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={isCollapsed ? 20 : 17} />
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
      {/* Fixed Brand Header */}
      <div className="sidebar-header" style={{ padding: isCollapsed ? '12px 0' : '12px 14px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: 8, borderBottom: '1px solid var(--color-border)', height: 'var(--header-height)' }}>
        <div style={{ width: 28, height: 28, minWidth: 28, backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700 }}>N</div>
        {!isCollapsed && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>NexService</span>}
      </div>

      {/* Scrollable Navigation */}
      <nav className="sidebar-nav" style={{ padding: '8px 0' }}>
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} style={{ marginBottom: isCollapsed ? 12 : 16 }}>
              <GroupLabel label={group.label} isCollapsed={isCollapsed} />
              {visibleItems.map(item => (
                <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isCollapsed={isCollapsed} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Fixed Bottom Footer */}
      <div className="sidebar-footer" style={{ padding: isCollapsed ? '12px 6px' : '12px 10px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 10, padding: isCollapsed ? '10px' : '8px 12px', borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)', fontWeight: 600, fontSize: 13, width: '100%',
            transition: 'all 0.2s ease',
          }}
          className="hover-bg-row"
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={isCollapsed ? 20 : 17} />
          {!isCollapsed && <span>Abmelden</span>}
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
    <p style={{ fontSize: 13 }}>Dieses Modul wird in Kürze implementiert.</p>
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
                  <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Global search (Tickets, Projects...)"
                      style={{
                        padding: '6px 12px 6px 34px', borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)',
                        color: 'var(--color-text-main)', width: '100%', outline: 'none', fontSize: 13,
                        transition: 'all 0.2s ease',
                      }}
                      className="search-input-premium"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ThemeToggle />
                  <NotificationCenter />
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
                  <Route path="/knowledge" element={<KnowledgeBaseView />} />

                  {/* Sales & CRM */}
                  <Route path="/customers" element={<CustomersView />} />
                  <Route path="/customers/:id" element={<CustomerDetailView />} />
                  <Route path="/contacts" element={<ContactsView />} />
                  <Route path="/leads" element={<LeadsView />} />
                  <Route path="/quotes" element={<QuotesView />} />
                  <Route path="/invoices" element={<QuotesView />} />
                  <Route path="/contracts" element={<ContractsView />} />
                  <Route path="/products" element={<ProductsView />} />
                  <Route path="/newsletter" element={<NewsletterView />} />

                  {/* Finance */}
                  <Route path="/accounting" element={hasRole('admin', 'manager') ? <AccountingView /> : <Placeholder title="Kein Zugriff" icon={Calculator} />} />

                  {/* Intern */}
                  <Route path="/business-card" element={isInternal() ? <BusinessCardView /> : <Placeholder title="Kein Zugriff" icon={CreditCard} />} />
                  <Route path="/timeline" element={isInternal() ? <CustomerTimelineView /> : <Placeholder title="Kein Zugriff" icon={Activity} />} />
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
