import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Ticket, TrendingUp, FolderOpen, Clock, AlertTriangle, Tag, Activity, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
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
    newLeads: 4, pipelineValue: 12500,
    paidInvoices: 8, overdueInvoices: 2
  });
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Fetch ticket stats directly from Supabase
        const { data: ticketData } = await supabase
          .from('tickets')
          .select('status, priority');

        const { count: projectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        const { count: leadCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'new');

        if (ticketData) {
          const openTickets = ticketData.filter(t => !['closed', 'resolved'].includes(t.status)).length;
          const criticalTickets = ticketData.filter(t => t.priority === 'critical' && !['closed', 'resolved'].includes(t.status)).length;
          setMetrics(prev => ({
            ...prev,
            openTickets,
            criticalTickets,
            activeProjects: projectCount || 0,
            newLeads: leadCount || 0
          }));
        }

        // Live activity from customer_timeline_events (most recent 5)
        const { data: tData } = await supabase
          .from('customer_timeline_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (tData) setTimeline(tData as any);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const revenueData = [
    { name: 'Jan', revenue: 4200, costs: 2100 },
    { name: 'Feb', revenue: 5100, costs: 2400 },
    { name: 'Mar', revenue: 3800, costs: 2800 },
    { name: 'Apr', revenue: 6200, costs: 3100 },
    { name: 'Mai', revenue: 5900, costs: 3400 },
    { name: 'Jun', revenue: 7500, costs: 3800 },
  ];

  return (
    <div className="dashboard-page" style={{ maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={28} color="var(--color-primary)" /> Command Center
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
            Echtzeit-Überblick über alle Unternehmensbereiche.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
           <button className="btn-secondary" onClick={() => navigate('/timeline')}>
             <Clock size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> History
           </button>
           <button className="btn-primary" onClick={() => navigate('/tickets')}>
             <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Quick Action
           </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          title="Offene Supportfälle"
          value={metrics.openTickets}
          badge={metrics.criticalTickets > 0 ? `${metrics.criticalTickets} Prio` : undefined}
          badgeCls="danger"
          color="#ffab00"
          icon={Ticket}
          onClick={() => navigate('/tickets')}
        />
        <KpiCard
          title="Neue Leads"
          value={metrics.newLeads}
          sub="Letzte 7 Tage"
          color="#6554c0"
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
          title="Umsatz (Jun)"
          value="CHF 7'540"
          badge="+12%"
          badgeCls="success"
          color="#36b37e"
          icon={TrendingUp}
          onClick={() => navigate('/accounting')}
        />
        <KpiCard
          title="Überfällig"
          value={metrics.overdueInvoices}
          sub="Zahlungserinnerungen"
          badge="Aktion nötig"
          badgeCls="danger"
          color="#ff5630"
          icon={AlertTriangle}
          onClick={() => navigate('/quotes')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        
        {/* Left Column: Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Revenue Graph */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Performance & Cashflow</h3>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#36b37e' }}></div> Umsatz
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff5630' }}></div> Kosten
                </span>
              </div>
            </div>
            <div style={{ height: 320, opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#36b37e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#36b37e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)', fontSize: 11}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#36b37e" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="costs" stroke="#ff5630" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
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
