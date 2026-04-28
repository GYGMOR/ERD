import { useState, useEffect } from 'react';
import { TrendingUp, Users, Ticket, FolderOpen, Calendar, ChevronDown, Download } from 'lucide-react';
import { getToken } from '../utils/auth';

interface PerformanceData {
  id: string;
  first_name: string;
  last_name: string;
  resolved_tickets: number;
  completed_projects: number;
}

export const PerformanceView = () => {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState('3');

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/performance?months=${months}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [months]);

  const totalTickets = data.reduce((sum, u) => sum + parseInt(String(u.resolved_tickets)), 0);
  const totalProjects = data.reduce((sum, u) => sum + parseInt(String(u.completed_projects)), 0);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Performance & Analytics</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Produktivität des Teams im Überblick.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            className="input-field" 
            value={months} 
            onChange={e => setMonths(e.target.value)}
            style={{ width: 180, padding: '8px 12px', fontSize: 13 }}
          >
            <option value="3">Letzte 3 Monate (1/4 J)</option>
            <option value="6">Letzte 6 Monate (1/2 J)</option>
            <option value="12">Letztes Jahr (1 J)</option>
          </select>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0, 82, 204, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ticket size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{totalTickets}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>Gelöste Tickets</div>
          </div>
        </div>
        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{totalProjects}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>Erledigte Projekte</div>
          </div>
        </div>
        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{data.length}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>Aktive Mitarbeiter</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Mitarbeiter-Ranking</h3>
          <TrendingUp size={18} style={{ color: 'var(--color-text-muted)' }} />
        </div>
        
        {loading ? (
          <div style={{ padding: 64, textAlign: 'center', color: 'var(--color-text-muted)' }}>Lade Daten...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Mitarbeiter</th>
                <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Tickets gelöst</th>
                <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Projekte erledigt</th>
                <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user, i) => {
                const score = (user.resolved_tickets * 1) + (user.completed_projects * 5);
                const maxScore = Math.max(...data.map(u => (u.resolved_tickets * 1) + (u.completed_projects * 5))) || 1;
                const percent = (score / maxScore) * 100;

                return (
                  <tr key={user.id} className="hover-bg-row" style={{ borderBottom: i === data.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{user.first_name} {user.last_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className="badge info" style={{ fontSize: 13, fontWeight: 700 }}>{user.resolved_tickets}</span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className="badge success" style={{ fontSize: 13, fontWeight: 700 }}>{user.completed_projects}</span>
                    </td>
                    <td style={{ padding: '16px 24px', width: 200 }}>
                      <div style={{ height: 6, backgroundColor: 'var(--color-surface-hover)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${percent}%`, backgroundColor: 'var(--color-primary)', borderRadius: 3 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
