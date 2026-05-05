import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Eye, Send, X, ShieldCheck, Loader2 } from 'lucide-react';
import { dataService } from '../../services/dataService';

export const Offers = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOffer, setSigningOffer] = useState<any>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await dataService.getPortalOffers();
        if (res.success) setOffers(res.data || []);
      } catch (err) {
        console.error('Failed to fetch offers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const handleSign = async () => {
    if (!signingOffer) return;
    setIsSigning(true);
    try {
      const res = await dataService.signProposal({
        documentId: signingOffer.id, // In a real app, this would be the linked file ID
        totalAmount: signingOffer.total_amount,
        projectName: `Angebot ${signingOffer.offer_number}`
      });
      if (res.success) {
        setSignSuccess(true);
        setTimeout(() => {
          setSignSuccess(false);
          setSigningOffer(null);
          // Refresh offers to show 'Accepted'
          window.location.reload();
        }, 2500);
      }
    } catch (err) {
      alert('Fehler beim Signieren.');
    } finally {
      setIsSigning(false);
    }
  };

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
                    <button 
                      className="btn-primary" 
                      style={{ padding: '6px 20px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => setSigningOffer(offer)}
                    >
                       <CheckCircle size={14} /> Akzeptieren
                    </button>
                 )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Signature Modal */}
      {signingOffer && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 500, width: '100%', padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                 <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Angebot signieren</h2>
                 <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{signingOffer.offer_number}</p>
               </div>
               <button onClick={() => setSigningOffer(null)} style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: 32 }}>
               {signSuccess ? (
                 <div style={{ textAlign: 'center', padding: '20px 0' }}>
                   <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                     <CheckCircle size={32} />
                   </div>
                   <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Vielen Dank!</h3>
                   <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Das Angebot wurde signiert. Die Anzahlungsrechnung (50%) wird nun erstellt.</p>
                 </div>
               ) : (
                 <>
                   <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                       <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Gesamtbetrag:</span>
                       <span style={{ fontSize: 14, fontWeight: 700 }}>CHF {parseFloat(signingOffer.total_amount).toLocaleString('de-CH')}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                       <span style={{ fontSize: 13, fontWeight: 600 }}>Anzahlung (50%):</span>
                       <span style={{ fontSize: 15, fontWeight: 800 }}>CHF {(parseFloat(signingOffer.total_amount) * 0.5).toLocaleString('de-CH')}</span>
                     </div>
                   </div>

                   <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
                     Mit Ihrer digitalen Unterschrift akzeptieren Sie das Angebot verbindlich. Es wird automatisch eine Anzahlungsrechnung generiert, um das Projekt zu starten.
                   </p>

                   <div style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center', marginBottom: 24, backgroundColor: 'var(--color-surface)' }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Hier klicken oder tippen zum Signieren</p>
                      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                         <ShieldCheck size={40} style={{ opacity: 0.2 }} />
                      </div>
                   </div>

                   <button 
                     className="btn-primary" 
                     style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                     onClick={handleSign}
                     disabled={isSigning}
                   >
                     {isSigning ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                     Verbindlich signieren & starten
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>
      )}


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
