import { useState, useEffect } from 'react';
import { FileSignature, Calendar, ShieldCheck, Download, Info, ExternalLink, Clock } from 'lucide-react';
import { dataService } from '../../services/dataService';

export const Contracts = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await dataService.getPortalContracts();
        if (res.success) setContracts(res.data || []);
      } catch (err) {
        console.error('Failed to fetch contracts', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <span className="badge success">Aktiv</span>;
      case 'cancelled': return <span className="badge danger">Gekündigt</span>;
      case 'expired': return <span className="badge warning">Abgelaufen</span>;
      case 'pending': return <span className="badge info italic">Anstehend</span>;
      default: return <span className="badge info">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Wartungsverträge & SLA
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>
          Übersicht Ihrer aktiven Serviceverträge und Lizenzvereinbarungen.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {loading ? (
          [1,2].map(i => (
            <div key={i} className="card pulse" style={{ height: 120, backgroundColor: 'var(--color-surface-hover)', border: 'none' }}></div>
          ))
        ) : contracts.length === 0 ? (
          <div className="card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FileSignature size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
            <p style={{ margin: 0 }}>Keine aktiven Verträge gefunden.</p>
          </div>
        ) : (
          contracts.map((contract: any) => (
            <div 
              key={contract.id} 
              className="card hover-bg-row"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-lg)', gap: 24, flexWrap: 'wrap', borderLeft: '4px solid var(--color-primary)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                 <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                    <ShieldCheck size={28} strokeWidth={1.5} />
                 </div>
                 <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                       <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
                         {contract.title}
                       </h3>
                       {getStatusBadge(contract.status)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--color-text-muted)' }}>
                       <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> Start: {new Date(contract.start_date).toLocaleDateString()}</span>
                       {contract.end_date && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> Ende: {new Date(contract.end_date).toLocaleDateString()}</span>}
                    </div>
                 </div>
              </div>

              <div style={{ flex: 1, minWidth: 200, textAlign: 'center' }}>
                 <p style={{ margin: '0 0 6px 0', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monatlicher Fixpreis</p>
                 <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>CHF {parseFloat(contract.monthly_value || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</p>
                 <p style={{ margin: '4px 0 0 0', fontSize: 10, color: 'var(--color-text-muted)' }}>Nächste Abrechnung: 01.{new Date().getMonth() + 2 > 9 ? new Date().getMonth() + 2 : `0${new Date().getMonth() + 2}`}.2026</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Download size={14} /> Vertrag PDF
                 </button>
                 <button className="btn-secondary" style={{ padding: 8, display: 'flex' }}>
                    <ExternalLink size={16} />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--spacing-xl)' }}>
         <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
               <Info size={20} style={{ color: 'var(--color-primary)' }} /> Service Level Agreement (SLA)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                     { label: 'Reaktionszeit (P1)', val: '1 Std.', color: '#ff5630' },
                     { label: 'Reaktionszeit (P2)', val: '4 Std.', color: '#ffab00' },
                     { label: 'Reaktionszeit (P3)', val: 'Nächster Werktag', color: '#0052cc' },
                  ].map(sla => (
                     <div key={sla.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                           <span style={{ color: 'var(--color-text-muted)' }}>{sla.label}</span>
                           <span style={{ color: sla.color }}>{sla.val}</span>
                        </div>
                        <div style={{ height: 4, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                           <div style={{ height: '100%', width: '100%', backgroundColor: sla.color, opacity: 0.3 }}></div>
                        </div>
                     </div>
                  ))}
               </div>
               <div style={{ padding: 20, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
                     "Ihr SLA garantiert Ihnen bevorzugten Support und feste Lösungszeiten für kritische Systeme. Bei Fragen zu Ihrem Deckungsumfang wenden Sie sich bitte an Ihren Account Manager."
                  </p>
               </div>
            </div>
         </div>
         
         <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-text-main)', border: 'none', position: 'relative', overflow: 'hidden' }}>
            <FileSignature size={60} style={{ color: 'white', opacity: 0.05, marginBottom: 16 }} />
            <h4 style={{ margin: '0 0 8px 0', color: 'white', fontSize: 16, fontWeight: 700 }}>Vertrag kündigen</h4>
            <p style={{ margin: '0 0 24px 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, lineHeight: 1.5 }}>
               Möchten Sie Ihren Vertrag anpassen oder kündigen? 
            </p>
            <button className="btn-secondary" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '8px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Anfrage stellen</button>
         </div>
      </div>
    </div>
  );
};
