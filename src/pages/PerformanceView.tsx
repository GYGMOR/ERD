import { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, CheckCircle, Clock, 
  Download, Award, Activity, PieChart as PieChartIcon
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { getToken } from '../utils/auth';

interface PerformanceData {
  ranking: any[];
  statusDistribution: any[];
  trend: any[];
}

export const PerformanceView = () => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState('3');

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/performance?months=${months}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) {
      console.error('Error fetching performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [months]);

  const exportCSV = () => {
    if (!data) return;
    const headers = ['Mitarbeiter', 'Email', 'Geloeste Tickets', 'Abgeschlossene Projekte', 'Ø Zeit (h)'];
    const rows = data.ranking.map(p => [
      `${p.first_name} ${p.last_name}`,
      p.email,
      p.resolved_tickets,
      p.completed_projects,
      p.avg_resolution_hours || '0'
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `performance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const COLORS = ['#0052CC', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading && !data) return <div style={{ padding: 40, textAlign: 'center' }}>Lade Performance-Daten...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Performance & Analytics</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Analyse der Team-Produktivität und Trends.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            className="input-field" 
            style={{ width: 'auto', padding: '8px 12px' }}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          >
            <option value="3">Letzte 3 Monate</option>
            <option value="6">Letzte 6 Monate</option>
            <option value="12">Letztes Jahr</option>
          </select>
          <button className="btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(0, 82, 204, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Gelöste Tickets</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{data?.ranking.reduce((acc, curr) => acc + parseInt(curr.resolved_tickets), 0)}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Projekte Fertig</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{data?.ranking.reduce((acc, curr) => acc + parseInt(curr.completed_projects), 0)}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ø Zeit (Std.)</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {(data?.ranking.reduce((acc, curr) => acc + (parseFloat(curr.avg_resolution_hours) || 0), 0) / (data?.ranking.length || 1)).toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} /> Ticket-Trend (12 Monate)
          </h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <PieChartIcon size={18} /> Ticket-Status
          </h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {data?.statusDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Mitarbeiter Ranking</h3>
          <TrendingUp size={18} color="var(--color-text-muted)" />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ padding: '12px 24px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Mitarbeiter</th>
              <th style={{ padding: '12px 24px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tickets</th>
              <th style={{ padding: '12px 24px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Projekte</th>
              <th style={{ padding: '12px 24px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ø Zeit</th>
              <th style={{ padding: '12px 24px', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', width: 200 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {data?.ranking.map((p, i) => {
              const maxTickets = Math.max(...data.ranking.map(r => parseInt(r.resolved_tickets)), 1);
              const progress = (parseInt(p.resolved_tickets) / maxTickets) * 100;
              
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 700 }}>{p.resolved_tickets}</td>
                  <td style={{ padding: '16px 24px' }}>{p.completed_projects}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)' }}>{p.avg_resolution_hours || '0'}h</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ width: '100%', height: 6, backgroundColor: 'var(--color-surface-hover)', borderRadius: 3 }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: 3 }}></div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
