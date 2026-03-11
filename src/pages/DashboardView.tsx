import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Ticket, TrendingUp, FolderOpen, Clock, AlertTriangle } from 'lucide-react';
import { revData } from '../utils/dummyData';
import { useNavigate } from 'react-router-dom';
import type { ChartEntry } from '../types/entities';

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, sub, badge, badgeCls, color, icon: Icon }:
  { title: string; value: string | number; sub?: string; badge?: string; badgeCls?: string; color: string; icon: React.ElementType }) => (
  <div className="card" style={{ borderTop: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        <Icon size={18} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
      <h2 style={{ fontSize: '2.2rem', fontWeight: 700, lineHeight: 1 }}>{value}</h2>
      {badge && <span className={'badge ' + (badgeCls || 'info')}>{badge}</span>}
    </div>
    {sub && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>{sub}</p>}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const DashboardView = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    openTickets: 0, criticalTickets: 0, revenueMtd: 0, activeProjects: 0, satisfaction: 100
  });
  const [revenue, setRevenue] = useState({ mtd: 0, ytd: 0, pending: 0, overdue: 0 });
  const [ticketData, setTicketData] = useState<ChartEntry[]>([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [metricsRes, revenueRes] = await Promise.all([
          fetch('/api/dashboard/metrics'),
          fetch('/api/dashboard/revenue'),
        ]);
        const [metricsData, revenueData] = await Promise.all([metricsRes.json(), revenueRes.json()]);
        if (metricsData.success) {
          setMetrics(metricsData.metrics);
          setTicketData(metricsData.charts.ticketData);
        }
        if (revenueData.success) {
          setRevenue(revenueData.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoadingRevenue(false);
      }
    };
    fetchAll();
  }, []);

  const fmtCHF = (val: number) => {
    if (val >= 1000) return `CHF ${(val / 1000).toFixed(1)}k`;
    return `CHF ${val.toFixed(2)}`;
  };

  return (
  <div style={{ maxWidth: 1200, margin: '0 auto' }}>

    {/* Page Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Command Center</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Willkommen zurück. Hier ist der Überblick für heute.</p>
      </div>
      <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => navigate('/tickets')}>
        <Ticket size={16} /> Neues Ticket
      </button>
    </div>

    {/* KPI Row – 5 cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20, marginBottom: 28 }}>
      <KpiCard
        title="Offene Tickets"
        value={metrics.openTickets}
        badge={metrics.criticalTickets > 0 ? `${metrics.criticalTickets} kritisch` : undefined}
        badgeCls="danger"
        color="var(--color-warning)"
        icon={Ticket}
      />
      <KpiCard
        title="Aktive Projekte"
        value={metrics.activeProjects}
        sub="Laufende Projekte"
        color="var(--color-primary)"
        icon={FolderOpen}
      />
      <KpiCard
        title="Umsatz MTD"
        value={loadingRevenue ? '...' : fmtCHF(revenue.mtd)}
        sub="Bezahlte Rechnungen"
        badge={revenue.overdue > 0 ? `${revenue.overdue} überfällig` : undefined}
        badgeCls="danger"
        color="var(--color-success)"
        icon={TrendingUp}
      />
      <KpiCard
        title="Umsatz YTD"
        value={loadingRevenue ? '...' : fmtCHF(revenue.ytd)}
        sub="Laufendes Jahr"
        color="var(--color-info)"
        icon={TrendingUp}
      />
      <KpiCard
        title="Ausstehend"
        value={loadingRevenue ? '...' : fmtCHF(revenue.pending)}
        sub="Offene Rechnungen"
        badge={revenue.overdue > 0 ? `${revenue.overdue} überfällig` : undefined}
        badgeCls="danger"
        color="var(--color-danger)"
        icon={AlertTriangle}
      />
    </div>

    {/* Charts + Quick Info Row */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
      {/* Revenue Area Chart */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>Umsatzentwicklung (YTD)</h3>
        <div style={{ height: 280 }}>
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
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 12}} tickFormatter={(val) => (val/1000) + 'k'} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                itemStyle={{ color: 'var(--color-text-main)', fontWeight: 600 }}
                formatter={(val: unknown) => [`CHF ${Number(val).toLocaleString('de-CH')}`, 'Umsatz']}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-success)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ticket Status Donut */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Ticket Status</h3>
        <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {ticketData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={ticketData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                    {ticketData.map((entry, index) => <Cell key={'cell-' + index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-md)' }} itemStyle={{ color: 'var(--color-text-main)', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                {ticketData.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: entry.color }} />
                    {entry.name} <strong style={{ color: 'var(--color-text-main)' }}>({entry.value})</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', opacity: 0.5 }}>
              <Clock size={36} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14 }}>Noch keine Ticket-Daten</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Revenue Summary Banner */}
    <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-primary), #4f46e5)', color: 'white', padding: '24px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, opacity: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diesen Monat verdient</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 6 }}>{loadingRevenue ? '...' : fmtCHF(revenue.mtd)}</p>
        </div>
        <div>
          <p style={{ fontSize: 12, opacity: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dieses Jahr verdient</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 6 }}>{loadingRevenue ? '...' : fmtCHF(revenue.ytd)}</p>
        </div>
        <div>
          <p style={{ fontSize: 12, opacity: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ausstehend</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 6 }}>{loadingRevenue ? '...' : fmtCHF(revenue.pending)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {revenue.overdue > 0 ? (
            <div>
              <p style={{ fontSize: 12, opacity: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Überfällige Rechnungen</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 6 }}>{revenue.overdue}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, opacity: 0.85 }}>
              <span style={{ fontSize: 24 }}>✓</span>
              <p style={{ fontWeight: 600 }}>Keine überfälligen Rechnungen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};
