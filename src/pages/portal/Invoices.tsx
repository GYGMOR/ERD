import { useState, useEffect } from 'react';
import { CreditCard, Download, ExternalLink, Filter, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export const Invoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('issue_date', { ascending: false });
        if (!error && data) setInvoices(data);
      } catch (err) {
        console.error('Failed to fetch invoices', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}><CheckCircle2 size={12} /> Bezahlt</div>;
      case 'open': return <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}><Clock size={12} /> Offen</div>;
      case 'sent': return <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}><Clock size={12} /> Gesendet</div>;
      case 'overdue': return <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-danger)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}><AlertTriangle size={12} /> Überfällig</div>;
      default: return <span className="badge info">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Meine Rechnungen
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>
            Alle Ihre Abrechnungen und Zahlungsbelege an einem Ort.
          </p>
        </div>
        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
           <Filter size={14} /> Filter
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Nummer</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Positionen</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Datum</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Fälligkeit</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', textAlign: 'right' }}>Betrag</th>
                <th style={{ padding: '12px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="pulse">
                    <td colSpan={7} style={{ padding: '20px 16px' }}><div style={{ height: 12, backgroundColor: 'var(--color-surface-hover)', borderRadius: 4, width: '100%' }}></div></td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <CreditCard size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
                    <p style={{ margin: 0 }}>Keine Rechnungen vorhanden.</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover-bg-row" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(inv.status)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
                        {inv.invoice_number || 'RE-0000'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                       <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{inv.title || 'Dienstleistungen'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-CH') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('de-CH') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>
                      {parseFloat(inv.amount).toLocaleString('de-CH', { minimumFractionDigits: 2 })} CHF
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button className="btn-secondary" style={{ padding: 6, borderRadius: 6 }} title="Download PDF">
                             <Download size={14} />
                          </button>
                          <button className="btn-secondary" style={{ padding: 6, borderRadius: 6 }} title="Online bezahlen">
                             <ExternalLink size={14} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--spacing-xl)' }}>
         <div className="card" style={{ backgroundColor: 'var(--color-primary)', border: 'none', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1, color: 'white' }}>
               <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 800 }}>Zahlungsarten verwalten</h3>
               <p style={{ margin: '0 0 24px 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5, maxWidth: '70%' }}>
                  Hinterlegen Sie eine Kreditkarte für automatische Zahlungen Ihrer Service-Abonnements.
               </p>
               <button className="btn-secondary" style={{ padding: '10px 24px', backgroundColor: 'white', color: 'var(--color-primary)', border: 'none', fontWeight: 700 }}>Hinterlegen</button>
            </div>
            <CreditCard size={120} style={{ position: 'absolute', bottom: -20, right: -20, color: 'white', opacity: 0.1, transform: 'rotate(-15deg)' }} />
         </div>
         
         <div className="card" style={{ border: '1px dashed var(--color-border)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700 }}>Benötigen Sie Hilfe?</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
               Falls Sie Unstimmigkeiten in einer Rechnung finden oder Fragen zur Abrechnung haben, eröffnen Sie bitte ein Ticket.
            </p>
            <button className="btn-secondary" style={{ width: 'fit-content', padding: '6px 16px', fontSize: 12, fontWeight: 600 }}>Abrechnungs-Support</button>
         </div>
      </div>
    </div>
  );
};
