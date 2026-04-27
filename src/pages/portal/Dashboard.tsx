import { useState, useEffect } from 'react';
import { Ticket, FolderOpen, FileText, CreditCard, FileSignature, Clock, ArrowRight, BookOpen, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';

const PortalKpiCard = ({ title, value, icon: Icon, color, onClick }: any) => (
  <div 
    onClick={onClick}
    className="card hover-bg-row"
    style={{ 
      minHeight: '100px', 
      borderLeft: `3px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      cursor: 'pointer',
      padding: 'var(--spacing-md)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{title}</span>
      <div style={{ padding: 6, borderRadius: 'var(--radius-md)', backgroundColor: `${color}15`, color, display: 'flex' }}>
        <Icon size={16} />
      </div>
    </div>
    <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{value}</h2>
      <ArrowRight size={14} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
    </div>
  </div>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    openTickets: 0,
    activeProjects: 0,
    pendingOffers: 0,
    openInvoices: 0,
    activeContracts: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await dataService.getPortalDashboard();
        if (res.success && res.metrics) {
          setMetrics(res.metrics);
        }
      } catch (err) {
        console.error('Failed to fetch portal metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--spacing-lg)',
    marginBottom: 'var(--spacing-xl)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Ihr Business Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            Alle Ihre IT-Services und Projekte im Überblick.
          </p>
        </div>
        <button 
          onClick={() => navigate('/portal/tickets')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 'fit-content' }}
        >
          <Ticket size={16} /> Neues Ticket erstellen
        </button>
      </div>

      {loading ? (
        <div style={gridStyle}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="card pulse" style={{ height: 100, backgroundColor: 'var(--color-surface-hover)', border: 'none' }}></div>
          ))}
        </div>
      ) : (
        <div style={gridStyle}>
          <PortalKpiCard 
            title="Meine Tickets" 
            value={metrics.openTickets} 
            icon={Ticket} 
            color="var(--color-warning)" 
            onClick={() => navigate('/portal/tickets')}
          />
          <PortalKpiCard 
            title="Meine Projekte" 
            value={metrics.activeProjects} 
            icon={FolderOpen} 
            color="var(--color-primary)" 
            onClick={() => navigate('/portal/projects')}
          />
          <PortalKpiCard 
            title="Meine Offerten" 
            value={metrics.pendingOffers} 
            icon={FileText} 
            color="var(--color-success)" 
            onClick={() => navigate('/portal/offers')}
          />
          <PortalKpiCard 
            title="Zahlbar" 
            value={metrics.openInvoices} 
            icon={CreditCard} 
            color="var(--color-danger)" 
            onClick={() => navigate('/portal/invoices')}
          />
          <PortalKpiCard 
            title="Verträge" 
            value={metrics.activeContracts} 
            icon={FileSignature} 
            color="#6554c0" 
            onClick={() => navigate('/portal/contracts')}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', flex: 2 }}>
          <div className="card">
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Aktuelle Aktivitäten</h3>
                <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', position: 'relative', paddingLeft: 20 }}>
                <div style={{ position: 'absolute', left: 4, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--color-border)' }}></div>
                
                <div style={{ position: 'relative' }}>
                   <div style={{ position: 'absolute', left: -20, top: 4, width: 9, height: 9, borderRadius: '50%', backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-primary)', zIndex: 2 }}></div>
                   <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Willkommen im neuen Kundenportal</p>
                   <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, margin: 0 }}>Ihr Zugang wurde erfolgreich eingerichtet.</p>
                   <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: 8, display: 'block' }}>Heute, 08:30 Uhr</span>
                </div>

                <div style={{ position: 'relative' }}>
                   <div style={{ position: 'absolute', left: -20, top: 4, width: 9, height: 9, borderRadius: '50%', backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-warning)', zIndex: 2 }}></div>
                   <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>System Update</p>
                   <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, margin: 0 }}>Neue Funktionen für die Ticketverwaltung wurden freigeschaltet.</p>
                   <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: 8, display: 'block' }}>Gestern, 14:15 Uhr</span>
                </div>
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
             <div className="card" style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                   <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Hilfe & FAQ</h4>
                   <p style={{ fontSize: 12, opacity: 0.9, marginTop: 8, marginBottom: 16, lineHeight: 1.4 }}>
                      Haben Sie Fragen zur Bedienung? Besuchen Sie unsere Knowledge Base.
                   </p>
                   <button style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 700 }}>
                      Zum Helpcenter
                   </button>
                </div>
                <BookOpen size={80} style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.1, transform: 'rotate(15deg)' }} />
             </div>
             
             <div className="card" style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                   <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Support Kontakt</h4>
                   <p style={{ fontSize: 12, opacity: 0.9, marginTop: 8, marginBottom: 12, lineHeight: 1.4 }}>
                      Unser Team ist von 08:00 - 17:00 für Sie erreichbar.
                   </p>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 500 }}>
                      <span>Tel: +41 44 123 45 67</span>
                      <span>Mail: support@vierkorken.ch</span>
                   </div>
                </div>
                <User size={80} style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.1, transform: 'rotate(15deg)' }} />
             </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', flex: 1 }}>
           <div className="card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>Service Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {[
                    { label: 'E-Mail & Web', status: 'operational', color: 'var(--color-success)' },
                    { label: 'Cloud Services', status: 'operational', color: 'var(--color-success)' },
                    { label: 'Telefonie / VoIP', status: 'maintenance', color: 'var(--color-info)' },
                    { label: 'Internet', status: 'operational', color: 'var(--color-success)' },
                 ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                       <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: s.color }}>{s.status}</span>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.color }}></div>
                       </div>
                    </div>
                 ))}
              </div>
              <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                 <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>Letzte Prüfung: gerade jetzt</p>
              </div>
           </div>

           <div className="card" style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px dashed var(--color-border)', position: 'relative' }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Projekt-Report</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 4, marginBottom: 16 }}>Aktueller Monatsbericht steht zum Download bereit.</p>
                <button className="btn-primary" style={{ width: '100%', fontSize: 11, padding: '8px' }}>Download PDF (2.4 MB)</button>
              </div>
              <FileText size={24} style={{ position: 'absolute', top: 12, right: 12, opacity: 0.2 }} />
           </div>
        </div>
      </div>
    </div>
  );
};
