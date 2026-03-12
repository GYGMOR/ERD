import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  Home, Ticket, Users, FileText, Settings, LogOut, Sun, Moon, Menu, ChevronLeft,
  Search, FolderOpen, UserCheck, ShieldCheck, Activity,
  Target, FileSignature, Package, Mail, BookOpen, Calculator, CreditCard, Calendar
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
import { CalendarView } from './pages/CalendarView';
import { GlobalLoginView } from './pages/GlobalLoginView';
import { ClientLoginView } from './pages/ClientLoginView';

// --- Customer Portal Views ---
import { CustomerLayout } from './layouts/CustomerLayout';
import { Dashboard as CustomerDashboard } from './pages/portal/Dashboard';
import { Tickets as CustomerTickets } from './pages/portal/Tickets';
import { TicketDetail as CustomerTicketDetail } from './pages/portal/TicketDetail';
import { NewTicket as CustomerNewTicket } from './pages/portal/NewTicket';
import { Projects as CustomerProjects } from './pages/portal/Projects';
import { Offers as CustomerOffers } from './pages/portal/Offers';
import { Invoices as CustomerInvoices } from './pages/portal/Invoices';
import { Contracts as CustomerContracts } from './pages/portal/Contracts';
import { Documents as CustomerDocuments } from './pages/portal/Documents';
import { Profile as CustomerProfile } from './pages/portal/Profile';
import { Calendar as CustomerCalendar } from './pages/portal/Calendar';

import { getUser, clearAuth, hasRole, isInternal } from './utils/auth';
import type { UserRole } from './types/entities';
import { supabase } from './utils/supabaseClient';

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
      { to: '/calendar', icon: Calendar, label: 'Kalender', roles: ['admin', 'manager', 'employee'] },
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

// ─── Placeholder Module ───────────────────────────────────────────────────────
const Placeholder = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12, color: 'var(--color-text-muted)' }}>
    <Icon size={40} strokeWidth={1.5} />
    <h2 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h2>
    <p style={{ fontSize: 13 }}>Dieses Modul wird in Kürze implementiert.</p>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
const AppChild = () => {
  const { instance, inProgress } = useMsal();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [isProcessingAuth, setIsProcessingAuth] = useState(true);
  const location = useLocation();
  const currentUser = getUser();

  // Handle MSAL Redirect Response
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        
        if (response) {
          console.log('MSAL Redirect Response received:', response);
          instance.setActiveAccount(response.account);

          const email = response.account.username;
          
          // --- 1. Supabase-basierte Authentifizierung (statt /api) ---
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

          if (userError || !user) {
            console.error('User not found in Supabase:', userError);
            alert('Kein NexService-Konto für ' + email + ' gefunden.');
            setIsProcessingAuth(false);
            return;
          }

          // --- 2. Lokalen Status setzen ---
          localStorage.setItem('token', 'dummy-token-for-ghpages'); 
          localStorage.setItem('user', JSON.stringify({
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            tenant_id: user.tenant_id
          }));

          setIsAuthenticated(true);
          window.location.hash = '#/'; 
        }
      } catch (err) {
        console.error('Error handling MSAL redirect:', err);
      } finally {
        setIsProcessingAuth(false);
      }
    };

    handleRedirect();
  }, [instance]);

  const handleLogout = () => { clearAuth(); setIsAuthenticated(false); };

  const isPortalPath = location.pathname.startsWith('/portal');

  if (isProcessingAuth || inProgress !== 'none') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Anmeldung wird verarbeitet...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isPortalPath) {
      return <ClientLoginView onLogin={() => setIsAuthenticated(true)} />;
    }
    return <GlobalLoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  const isCustomer = currentUser?.role === 'customer' || currentUser?.role === 'client';

  // Redirect logic: if customer tries to access internal paths, or staff tries to access portal
  if (isCustomer && !isPortalPath) {
    // Should be in portal
    return (
      <CustomerLayout>
        <Routes>
          <Route path="/" element={<CustomerDashboard />} />
          <Route path="/portal" element={<CustomerDashboard />} />
          <Route path="/portal/tickets" element={<CustomerTickets />} />
          <Route path="/portal/tickets/new" element={<CustomerNewTicket />} />
          <Route path="/portal/tickets/:id" element={<CustomerTicketDetail />} />
          <Route path="/portal/projects" element={<CustomerProjects />} />
          <Route path="/portal/projects/:id" element={<Placeholder title="Projekt-Details" icon={FolderOpen} />} />
          <Route path="/portal/offers" element={<CustomerOffers />} />
          <Route path="/portal/invoices" element={<CustomerInvoices />} />
          <Route path="/portal/contracts" element={<CustomerContracts />} />
          <Route path="/portal/documents" element={<CustomerDocuments />} />
          <Route path="/portal/profile" element={<CustomerProfile />} />
          <Route path="/portal/calendar" element={<CustomerCalendar />} />
          <Route path="*" element={<CustomerDashboard />} />
        </Routes>
      </CustomerLayout>
    );
  }

  if (!isCustomer && isPortalPath) {
     // Staff member in portal path? Show error or redirect to dashboard
     window.location.href = '/ERD/';
     return null;
  }

  if (isCustomer) {
    return (
      <CustomerLayout>
        <Routes>
          <Route path="/" element={<CustomerDashboard />} />
          <Route path="/portal" element={<CustomerDashboard />} />
          <Route path="/portal/tickets" element={<CustomerTickets />} />
          <Route path="/portal/tickets/new" element={<CustomerNewTicket />} />
          <Route path="/portal/tickets/:id" element={<CustomerTicketDetail />} />
          <Route path="/portal/projects" element={<CustomerProjects />} />
          <Route path="/portal/projects/:id" element={<Placeholder title="Projekt-Details" icon={FolderOpen} />} />
          <Route path="/portal/offers" element={<CustomerOffers />} />
          <Route path="/portal/invoices" element={<CustomerInvoices />} />
          <Route path="/portal/contracts" element={<CustomerContracts />} />
          <Route path="/portal/documents" element={<CustomerDocuments />} />
          <Route path="/portal/profile" element={<CustomerProfile />} />
          <Route path="/portal/calendar" element={<CustomerCalendar />} />
          <Route path="*" element={<CustomerDashboard />} />
        </Routes>
      </CustomerLayout>
    );
  }

  return (
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
                placeholder="Global search..."
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
            <Route path="/" element={<DashboardView />} />
            <Route path="/tickets" element={<TicketsView />} />
            <Route path="/tickets/:id" element={<TicketDetailView />} />
            <Route path="/calendar" element={isInternal() ? <CalendarView /> : <Placeholder title="Kein Zugriff" icon={Calendar} />} />
            <Route path="/projects" element={isInternal() ? <ProjectsView /> : <Placeholder title="Kein Zugriff" icon={FolderOpen} />} />
            <Route path="/knowledge" element={<KnowledgeBaseView />} />
            <Route path="/customers" element={<CustomersView />} />
            <Route path="/customers/:id" element={<CustomerDetailView />} />
            <Route path="/contacts" element={<ContactsView />} />
            <Route path="/leads" element={<LeadsView />} />
            <Route path="/quotes" element={<QuotesView />} />
            <Route path="/contracts" element={<ContractsView />} />
            <Route path="/products" element={<ProductsView />} />
            <Route path="/newsletter" element={<NewsletterView />} />
            <Route path="/accounting" element={hasRole('admin', 'manager') ? <AccountingView /> : <Placeholder title="Kein Zugriff" icon={Calculator} />} />
            <Route path="/business-card" element={isInternal() ? <BusinessCardView /> : <Placeholder title="Kein Zugriff" icon={CreditCard} />} />
            <Route path="/timeline" element={isInternal() ? <CustomerTimelineView /> : <Placeholder title="Kein Zugriff" icon={Activity} />} />
            <Route path="/users" element={hasRole('admin', 'manager') ? <UsersView /> : <Placeholder title="Kein Zugriff" icon={ShieldCheck} />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <Router>
    <AppChild />
  </Router>
);

export default App;
