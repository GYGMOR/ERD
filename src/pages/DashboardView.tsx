import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Ticket } from 'lucide-react';
import { revData } from '../utils/dummyData';
import type { ChartEntry } from '../types/entities';

export const DashboardView = () => {
  const [metrics, setMetrics] = useState({
    openTickets: 0,
    criticalTickets: 0,
    revenueMtd: 0,
    activeProjects: 0,
    satisfaction: 100
  });
  
  const [ticketData, setTicketData] = useState<ChartEntry[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/dashboard/metrics');
        const data = await response.json();
        if (data.success) {
          setMetrics(data.metrics);
          setTicketData(data.charts.ticketData);
        }
      } catch (error) {
        console.error('Failed to fetch metrics', error);
      }
    };
    fetchMetrics();
  }, []);

  return (
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
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{metrics.openTickets}</h2>
          {metrics.criticalTickets > 0 && <span className="badge danger">{metrics.criticalTickets} Kritisch</span>}
        </div>
      </div>
      <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Umsatz (MTD)</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>CHF {(metrics.revenueMtd / 1000).toFixed(1)}k</h2>
          <span className="badge success">+0%</span>
        </div>
      </div>
      <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Aktive Projekte</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{metrics.activeProjects}</h2>
        </div>
      </div>
      <div className="card" style={{ borderTop: '4px solid var(--color-info)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Zufriedenheit</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{metrics.satisfaction}%</h2>
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
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 12}} tickFormatter={(val) => (val/1000) + 'k'} />
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
                  <Cell key={'cell-' + index} fill={entry.color} />
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
};
