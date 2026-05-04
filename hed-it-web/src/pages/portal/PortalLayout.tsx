import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Ticket, 
  CreditCard, 
  Settings, 
  LogOut,
  ChevronRight,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PortalLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/portal' },
    { icon: <FileText size={20} />, label: 'Verträge', path: '/portal/contracts' },
    { icon: <Ticket size={20} />, label: 'Tickets', path: '/portal/tickets' },
    { icon: <CreditCard size={20} />, label: 'Rechnungen', path: '/portal/invoices' },
    { icon: <Settings size={20} />, label: 'Einstellungen', path: '/portal/settings' },
  ];

  return (
    <div className="portal-container">
      <aside className="portal-sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar">
              <User size={24} />
            </div>
            <div className="user-details">
              <p className="user-name">{user?.firstName} {user?.lastName}</p>
              <p className="user-role">{user?.role === 'customer' ? 'Kunde' : 'Mitarbeiter'}</p>
            </div>
          </div>
        </div>

        <nav className="portal-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              end={item.path === '/portal'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              <ChevronRight className="chevron" size={16} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Abmelden</span>
          </button>
        </div>
      </aside>

      <main className="portal-main">
        <div className="portal-content">
          <Outlet />
        </div>
      </main>

      <style>{`
        .portal-container { display: flex; min-height: 100vh; background: #020204; color: white; padding-top: var(--nav-height); }
        
        .portal-sidebar { 
          width: 280px; 
          background: #08080a; 
          border-right: 1px solid var(--border); 
          display: flex; 
          flex-direction: column;
          position: fixed;
          top: var(--nav-height);
          bottom: 0;
          left: 0;
          z-index: 10;
        }

        .sidebar-header { padding: 32px 24px; border-bottom: 1px solid var(--border); }
        .user-info { display: flex; align-items: center; gap: 12px; }
        .user-avatar { 
          width: 48px; 
          height: 48px; 
          border-radius: 12px; 
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          display: flex; 
          align-items: center; 
          justify-content: center;
        }
        .user-name { font-weight: 700; font-size: 15px; margin: 0; }
        .user-role { font-size: 12px; color: var(--text-muted); margin: 0; }

        .portal-nav { flex: 1; padding: 24px 12px; display: flex; flex-direction: column; gap: 4px; }
        .nav-item { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          padding: 12px 16px; 
          border-radius: 12px; 
          color: var(--text-muted); 
          text-decoration: none; 
          transition: all 0.3s ease;
          position: relative;
        }
        .nav-item:hover { background: rgba(255,255,255,0.03); color: white; }
        .nav-item.active { background: var(--primary-glow); color: var(--primary); }
        .nav-item .chevron { margin-left: auto; opacity: 0; transition: all 0.3s ease; }
        .nav-item.active .chevron { opacity: 1; }
        
        .sidebar-footer { padding: 24px; border-top: 1px solid var(--border); }
        .logout-btn { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          width: 100%; 
          padding: 12px; 
          background: none; 
          border: none; 
          color: #ef4444; 
          cursor: pointer; 
          border-radius: 12px;
          transition: background 0.3s;
        }
        .logout-btn:hover { background: rgba(239, 68, 68, 0.1); }

        .portal-main { flex: 1; margin-left: 280px; padding: 40px; }
        .portal-content { max-width: 1200px; margin: 0 auto; }

        @media (max-width: 1024px) {
          .portal-sidebar { width: 80px; }
          .user-details, .nav-item span, .nav-item .chevron, .logout-btn span { display: none; }
          .portal-main { margin-left: 80px; }
          .sidebar-header, .sidebar-footer { padding: 20px 0; display: flex; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default PortalLayout;
