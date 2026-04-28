import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Ticket, Calendar, FolderOpen, FileText, FileSignature, 
  CreditCard, User, LogOut, Menu, ChevronLeft, Sun, Moon
} from 'lucide-react';
import { clearAuth, getUser } from '../utils/auth';
import { NotificationCenter } from '../components/NotificationCenter';

// --- Theme Toggle ---
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
    <button 
      onClick={toggle} 
      style={{ 
        padding: 8, 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'var(--color-text-muted)',
        transition: 'background-color 0.2s'
      }} 
      className="hover-bg-row"
      title="Theme umschalten"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string, icon: any, label: string, isCollapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/portal' && location.pathname.startsWith(to));

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

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = getUser();
  
  const { instance } = useMsal();
  
  const handleLogout = () => {
    clearAuth();
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin + window.location.pathname
    }).catch(console.error);
  };

  const navItems = [
    { to: '/portal', icon: Home, label: 'Dashboard' },
    { to: '/portal/calendar', icon: Calendar, label: 'Kalender' },
    { to: '/portal/tickets', icon: Ticket, label: 'Tickets' },
    { to: '/portal/projects', icon: FolderOpen, label: 'Projekte' },
    { to: '/portal/offers', icon: FileText, label: 'Offerten' },
    { to: '/portal/invoices', icon: CreditCard, label: 'Rechnungen' },
    { to: '/portal/contracts', icon: FileSignature, label: 'Verträge' },
    { to: '/portal/profile', icon: User, label: 'Profil' },
  ];

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'visible' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ padding: isCollapsed ? '12px 0' : '12px 14px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: 8, borderBottom: '1px solid var(--color-border)', height: 'var(--header-height)' }}>
          <div style={{ width: 28, height: 28, minWidth: 28, backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700 }}>N</div>
          {!isCollapsed && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>Kundenportal</span>}
        </div>

        <nav className="sidebar-nav" style={{ padding: '8px 0' }}>
          {navItems.map(item => (
            <div key={item.to} onClick={() => setIsMobileMenuOpen(false)}>
              <NavItem {...item} isCollapsed={isCollapsed} />
            </div>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ padding: isCollapsed ? '12px 6px' : '12px 10px', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: 10, padding: isCollapsed ? '10px' : '8px 12px', borderRadius: 'var(--radius-md)',
              color: 'var(--color-danger)', fontWeight: 600, fontSize: 13, width: '100%',
              transition: 'all 0.2s ease',
            }}
            title={isCollapsed ? 'Abmelden' : undefined}
          >
            <LogOut size={isCollapsed ? 20 : 17} />
            {!isCollapsed && <span>Abmelden</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                } else {
                  setIsCollapsed(!isCollapsed);
                }
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', color: 'var(--color-text-muted)' }}
            >
              {window.innerWidth <= 768 ? <Menu size={20} /> : (isCollapsed ? <Menu size={17} /> : <ChevronLeft size={17} />)}
            </button>
            <h1 style={{ fontSize: 16, fontWeight: 600 }}>
              Willkommen, {user?.firstName}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle />
            <NotificationCenter />
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-border)', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="user-profile-text" style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, fontWeight: 600 }}>{user?.firstName} {user?.lastName}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{user?.role}</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 12 }}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
            </div>
            <style>{`
              @media (max-width: 480px) {
                .user-profile-text { display: none; }
              }
            `}</style>
          </div>
        </header>

        {/* Content Area */}
        <main className="content-area">
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
