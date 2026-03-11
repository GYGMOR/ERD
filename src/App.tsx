import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Ticket, Users, FileText, Settings, LogOut, Sun, Moon, Menu, ChevronLeft, Bell, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

// Dummy Data for Dashboard
const revData = [
  { name: 'Jan', revenue: 12000 },
  { name: 'Feb', revenue: 19000 },
  { name: 'Mar', revenue: 15000 },
  { name: 'Apr', revenue: 22000 },
  { name: 'May', revenue: 28000 },
  { name: 'Jun', revenue: 35000 },
  { name: 'Jul', revenue: 42000 },
];
const ticketData = [
  { name: 'Offen', value: 24, color: '#0052cc' },
  { name: 'Kritisch', value: 5, color: '#ff5630' },
  { name: 'Pending', value: 12, color: '#ffab00' },
  { name: 'Erledigt', value: 45, color: '#36b37e' },
];

const DashboardView = () => (
  <div style={{ maxWidth: 1200, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Command Center</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>Willkommen zurück, Joel. Hier ist der Überblick für heute.</p>
      </div>
      <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Ticket size={16} /> Neues Ticket
      </button>
    </div>

    {/* KPI Row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
      <div className="card" style={{ borderTop: '4px solid var(--color-warning)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Offene Tickets</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>24</h2>
          <span className="badge danger">5 Kritisch</span>
        </div>
      </div>
      <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Umsatz (MTD)</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>CHF 42k</h2>
          <span className="badge success">+12%</span>
        </div>
      </div>
      <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Aktive Projekte</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>8</h2>
        </div>
      </div>
      <div className="card" style={{ borderTop: '4px solid var(--color-info)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Zufriedenheit</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>98%</h2>
        </div>
      </div>
    </div>

    {/* Charts Row */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '24px' }}>Umsatzentwicklung (YTD)</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 12}} tickFormatter={(val) => \`\${val/1000}k\`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                itemStyle={{ color: 'var(--color-text-main)', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-success)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '24px' }}>Ticket Status</h3>
        <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ticketData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {ticketData.map((entry, index) => (
                  <Cell key={\`cell-\${index}\`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)' }}
                itemStyle={{ color: 'var(--color-text-main)', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
             {ticketData.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color }} />
                  {entry.name} ({entry.value})
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const App = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Router basename="/ERD">
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
              <Route path="/tickets" element={<div><h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>Tickets</h1><div className="card"><p>Ticketsystem Listenansicht kommt hierhin.</p></div></div>} />
              <Route path="/customers" element={<div><h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>Kunden</h1><div className="card"><p>Kundenübersicht</p></div></div>} />
              <Route path="/quotes" element={<div><h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>Offerten</h1></div>} />
              <Route path="/settings" element={<div><h1 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>System Settings</h1></div>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;
