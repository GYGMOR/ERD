import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Ticket, TrendingUp, FolderOpen, Clock, AlertTriangle, Tag, Activity, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import type { TimelineEvent } from '../types/entities';

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, sub, badge, badgeCls, color, icon: Icon, onClick }:
  { title: string; value: string | number; sub?: string; badge?: string; badgeCls?: string; color: string; icon: React.ElementType; onClick?: () => void }) => (
  <div className="card hover-bg-row" style={{ borderTop: `4px solid ${color}`, position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        <Icon size={16} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{value}</h2>
      {badge && <span className={'badge ' + (badgeCls || 'info')} style={{ fontSize: 9 }}>{badge}</span>}
    </div>
    {sub && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</p>}
  </div>
);

export const DashboardView = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    openTickets: 0, criticalTickets: 0, activeProjects: 0, 
    newLeads: 0, monthRevenue: 0,
    overdueInvoices: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [metricsRes, timelineRes] = await Promise.all([
          dataService.getDashboardMetrics(),
          dataService.getTimelineEvents(5)
        ]);

        if (metricsRes.success) {
          setMetrics(metricsRes.metrics);
          if (metricsRes.charts?.revenueByMonth) {
            setRevenueData(metricsRes.charts.revenueByMonth);
          }
        }

        if (timelineRes.success) {
          setTimeline(timelineRes.data);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);


  return (
    <div className="dashboard-page" style={{ maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={28} color="var(--color-primary)" /> Command Center
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
            Echtzeit-Überblick über alle Unternehmensbereiche.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
           <button className="btn-secondary" onClick={() => navigate('/timeline')}>
             <Clock size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> History
           </button>
           <button className="btn-primary" onClick={() => navigate('/tickets')}>
             <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Quick Action
           </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid-responsive grid-cols-1-5" style={{ marginBottom: 24 }}>
        <KpiCard
          title="Umsatz laufender Monat"
          value={`${metrics.monthRevenue?.toLocaleString('de-CH')} CHF`}
          sub="Zahlungen & Offerten"
          color="#10b981"
          icon={TrendingUp}
          onClick={() => navigate('/quotes')}
        />
        <KpiCard
          title="Überfällige Posten"
          value={metrics.overdueInvoices}
          badge={metrics.overdueInvoices > 0 ? 'Aktion nötig' : undefined}
          badgeCls="danger"
          color="#ef4444"
          icon={AlertTriangle}
          onClick={() => navigate('/quotes')}
        />
        <KpiCard
          title="Neue Leads"
          value={metrics.newLeads}
          sub="Letzte 7 Tage"
          color="#8b5cf6"
          icon={Tag}
          onClick={() => navigate('/leads')}
        />
        <KpiCard
          title="Aktive Projekte"
          value={metrics.activeProjects}
          sub="In Umsetzung"
          color="var(--color-primary)"
          icon={FolderOpen}
          onClick={() => navigate('/projects')}
        />
        <KpiCard
          title="Offene Supportfälle"
          value={metrics.openTickets}
          badge={metrics.criticalTickets > 0 ? `${metrics.criticalTickets} Prio` : undefined}
          badgeCls="danger"
          color="#ffab00"
          icon={Ticket}
          onClick={() => navigate('/tickets')}
        />
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: 'var(--dashboard-main-cols, 2fr 1fr)' }}>
        <style>{`
          @media (max-width: 1024px) {
            .dashboard-page { --dashboard-main-cols: 1fr; }
          }
        `}</style>
        
        {/* Left Column: Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Revenue Graph */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Performance & Cashflow</h3>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></div> Umsatz
                </span>
              </div>
            </div>
            <div style={{ height: 320, opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}
                      itemStyle={{ fontSize: 12, fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                   Keine Umsatzdaten für den aktuellen Zeitraum vorhanden.
                </div>
              )}
            </div>
          </div>

          <div className="grid-responsive grid-cols-1-2">
             {/* Sales Pipeline */}
             <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Sales Pipeline</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   {[
                     { stage: 'Neu / Qualifizierung', count: 8, val: '2.5k', color: '#ffab00' },
                     { stage: 'Angebot erstellt', count: 3, val: '14.2k', color: '#0052cc' },
                     { stage: 'Verhandlung', count: 2, val: '5.8k', color: '#6554c0' },
                   ].map(s => (
                     <div key={s.stage}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{s.stage}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{s.count} Leads · CHF {s.val}</span>
                        </div>
                        <div style={{ height: 6, backgroundColor: 'var(--color-surface-hover)', borderRadius: 3, overflow: 'hidden' }}>
                           <div style={{ height: '100%', width: `${(s.count / 15) * 100}%`, backgroundColor: s.color }}></div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             {/* Quick Stats */}
             <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Team Auslastung</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   {[
                     { name: 'Entwicklung', load: 85, color: '#36b37e' },
                     { name: 'Support', load: 42, color: '#ffab00' },
                     { name: 'Marketing', load: 60, color: '#0052cc' },
                   ].map(t => (
                     <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                            <span>{t.name}</span>
                            <span>{t.load}%</span>
                          </div>
                          <div style={{ height: 4, backgroundColor: 'var(--color-surface-hover)', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${t.load}%`, backgroundColor: t.color }}></div>
                          </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

        </div>

        {/* Right Column: Feed */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="card" style={{ padding: 20, flex: 1 }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
               <Clock size={16} color="var(--color-primary)" /> Live Aktivität
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--color-border)' }}></div>
                {timeline.length > 0 ? timeline.map((event, i) => (
                  <div key={event.id || i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                    <div style={{ 
                      width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--color-background)', 
                      border: '2px solid var(--color-primary)', zIndex: 1, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></div>
                    </div>
                    <div style={{ flex: 1 }}>
                       <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{event.title}</p>
                       <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 6px 0' }}>{event.description}</p>
                       <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>{new Date(event.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 12 }}>Noch keine Aktivitäten</div>
                )}
             </div>
             <button 
               className="btn-secondary" 
               style={{ width: '100%', marginTop: 24, fontSize: 11, padding: '8px' }}
               onClick={() => navigate('/timeline')}
             >
               Alle Aktivitäten ansehen
             </button>
          </div>

          <div className="card" style={{ padding: 20, backgroundColor: 'var(--color-primary)', color: 'white', border: 'none' }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Pro Upgrade</h3>
             <p style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.5, marginBottom: 16 }}>
               Schalten Sie KI-gestützte Analysen und automatisierte Workflows frei.
             </p>
             <button style={{ width: '100%', backgroundColor: 'white', color: 'var(--color-primary)', border: 'none', padding: '8px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700 }}>
               Mehr erfahren
             </button>
          </div>

        </aside>

      </div>
    </div>
  );
};
