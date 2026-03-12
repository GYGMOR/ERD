import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Eye, Send } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export const Offers = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) setOffers(data);
      } catch (err) {
        console.error('Failed to fetch offers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent': return <span className="badge info pulse">Offen</span>;
      case 'accepted': return <span className="badge success">Akzeptiert</span>;
      case 'rejected': return <span className="badge danger">Abgelehnt</span>;
      case 'draft': return <span className="badge warning">Entwurf</span>;
      default: return <span className="badge info">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Offerten & Angebote
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>
          Überprüfen Sie neue Angebote und akzeptieren Sie diese direkt online.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {loading ? (
          [1,2].map(i => (
            <div key={i} className="card pulse" style={{ height: 100, backgroundColor: 'var(--color-surface-hover)', border: 'none' }}></div>
          ))
        ) : offers.length === 0 ? (
          <div className="card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FileText size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
            <p style={{ margin: 0 }}>Aktuell keine offenen Angebote vorhanden.</p>
          </div>
        ) : (
          offers.map((offer: any) => (
            <div 
              key={offer.id} 
              className="card hover-bg-row"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-lg)', gap: 24, flexWrap: 'wrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                 <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={20} />
                 </div>
                 <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                       <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
                         {offer.offer_number}
                       </h3>
                       {getStatusBadge(offer.status)}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>Gültig bis: {offer.valid_until ? new Date(offer.valid_until).toLocaleDateString() : 'N/A'}</p>
                 </div>
              </div>

              <div style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
                 <p style={{ margin: '0 0 4px 0', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gesamtbetrag</p>
                 <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>CHF {parseFloat(offer.total_amount).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={14} /> Details
                 </button>
                 <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={14} /> PDF
                 </button>
                 {offer.status === 'sent' && (
                    <button className="btn-primary" style={{ padding: '6px 20px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                       <CheckCircle size={14} /> Akzeptieren
                    </button>
                 )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-surface-hover)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
         <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
            <Send size={28} />
         </div>
         <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>Benötigen Sie ein individuelles Angebot?</h4>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
               Haben Sie Anforderungen, die nicht durch unsere Standardpakete abgedeckt sind? Kontaktieren Sie uns für eine kostenlose Beratung.
            </p>
         </div>
         <button className="btn-primary" style={{ padding: '10px 24px', whiteSpace: 'nowrap' }}>Anfrage senden</button>
      </div>
    </div>
  );
};
