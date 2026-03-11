import { X, Printer, FileText } from 'lucide-react';
import type { Invoice } from '../types/entities';

interface QuotePreviewModalProps {
  quote: Invoice;
  onClose: () => void;
}

export const QuotePreviewModal = ({ quote, onClose }: QuotePreviewModalProps) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Bitte Popup-Blocker deaktivieren, um zu drucken.');
      return;
    }

    // Calculate totals
    const subtotal = (quote.items || []).reduce((sum, item) => sum + (parseFloat(item.total_price as any) || 0), 0);
    const tax = (quote.items || []).reduce((sum, item) => sum + ((parseFloat(item.total_price as any) || 0) * (parseFloat(item.tax_rate as any) || 8.1) / 100), 0);
    const total = subtotal + tax;

    const itemsHtml = (quote.items || []).map(item => `
      <tr>
        <td>
          <div style="font-weight: 600; color: #1e293b;">${item.title}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${item.description || ''}</div>
        </td>
        <td style="text-align: right">${item.quantity}</td>
        <td style="text-align: right">CHF ${parseFloat(item.unit_price as any).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: 600;">CHF ${parseFloat(item.total_price as any).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offerte INV-${quote.id.substring(0, 8)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .label { font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 4px; }
            .value { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase; }
            td { padding: 16px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .totals { margin-top: 40px; }
            .total-row { display: flex; justify-content: flex-end; gap: 30px; margin-bottom: 8px; font-size: 14px; }
            .total-label { color: #64748b; }
            .grand-total { border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 8px; font-size: 18px; font-weight: bold; color: #2563eb; }
            .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
              .footer { position: absolute; bottom: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">NexService</div>
            <div style="text-align: right">
              <div style="font-size: 20px; font-weight: bold; color: #1e293b;">OFFERTE</div>
              <div style="color: #64748b; font-size: 13px;">Nr. INV-${quote.id.substring(0, 8)}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div>
              <div class="label">Empfänger</div>
              <div class="value" style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${quote.company_name || 'Privatkunde'}</div>
              <div style="color: #64748b; font-size: 13px;">Projektreferenz: ${quote.title}</div>
            </div>
            <div style="text-align: right">
              <div>
                <span class="label">Datum:</span>
                <span class="value" style="font-weight: 600; margin-left: 10px;">${new Date(quote.created_at).toLocaleDateString('de-CH')}</span>
              </div>
              <div style="margin-top: 8px">
                <span class="label">Fälligkeit:</span>
                <span class="value" style="font-weight: 600; margin-left: 10px;">${quote.due_date ? new Date(quote.due_date).toLocaleDateString('de-CH') : '-'}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%">Beschreibung</th>
                <th style="text-align: right">Menge</th>
                <th style="text-align: right">Einzelpreis</th>
                <th style="text-align: right">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">Keine Positionen vorhanden</td></tr>`}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span class="total-label">Zwischensumme:</span>
              <span style="width: 120px; text-align: right;">CHF ${subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
              <span class="total-label">MwSt:</span>
              <span style="width: 120px; text-align: right;">CHF ${tax.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row grand-total">
              <span style="color: #1e293b">Gesamtbetrag (CHF):</span>
              <span style="width: 120px; text-align: right;">${total.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="footer">
            NexService AG | Musterstrasse 12 | 8000 Zürich | www.nexservice.ch | info@nexservice.ch
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ 
        maxWidth: 800, 
        width: '95%',
        maxHeight: '90vh', 
        padding: 0, 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          padding: '16px 24px', 
          borderBottom: '1px solid var(--color-border)', 
          backgroundColor: 'var(--color-surface-hover)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20} color="var(--color-primary)" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>Vorschau: INV-{quote.id.substring(0, 8)}</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div style={{ overflowY: 'auto', flex: 1, backgroundColor: 'var(--color-surface-hover)', padding: '24px' }}>
          {/* The Paper / Invoice */}
          <div style={{ 
            padding: '48px 40px', 
            backgroundColor: 'white', 
            color: '#111', 
            borderRadius: 'var(--radius-md)', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            maxWidth: '100%',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)' }}>NexService</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Premium Business Platform</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>OFFERTE</h2>
                <p style={{ color: '#666', margin: '4px 0' }}>Nr. INV-{quote.id.substring(0, 8)}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>Empfänger</h4>
                <p style={{ fontWeight: 700, margin: 0, fontSize: 15 }}>{quote.company_name || 'Privatkunde'}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}>{quote.title}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, fontSize: 14 }}>
                  <span style={{ color: '#666' }}>Datum:</span>
                  <span style={{ fontWeight: 600 }}>{new Date(quote.created_at).toLocaleDateString('de-CH')}</span>
                  <span style={{ color: '#666' }}>Fälligkeit:</span>
                  <span style={{ fontWeight: 600 }}>{quote.due_date ? new Date(quote.due_date).toLocaleDateString('de-CH') : '-'}</span>
                  <span style={{ color: '#666' }}>Status:</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{quote.status}</span>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px 0', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>Position</th>
                  <th style={{ padding: '12px 0', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', width: 80 }}>Menge</th>
                  <th style={{ padding: '12px 0', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', width: 120 }}>Preis</th>
                  <th style={{ padding: '12px 0', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', width: 120 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(quote.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', color: '#666' }}>Keine Positionen definiert</td>
                  </tr>
                ) : quote.items.map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '16px 0' }}>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{item.description}</div>
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ padding: '16px 0', textAlign: 'right' }}>CHF {parseFloat(item.unit_price).toFixed(2)}</td>
                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 600 }}>
                      CHF {parseFloat(item.total_price).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 250 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span style={{ color: '#666' }}>Zwischensumme:</span>
                  <span>CHF {(quote.items || []).reduce((s: number, i: any) => s + (parseFloat(i.total_price) || 0), 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                  <span style={{ color: '#666' }}>MwSt (Mix):</span>
                  <span>CHF {(quote.items || []).reduce((s: number, i: any) => s + (parseFloat(i.total_price) * (parseFloat(i.tax_rate) || 8.1) / 100), 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #eee', marginTop: 8, fontSize: 16, fontWeight: 700 }}>
                  <span>Gesamtbetrag:</span>
                  <span style={{ color: 'var(--color-primary)' }}>CHF {parseFloat(String(quote.amount)).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 12, 
          padding: '16px 24px', 
          borderTop: '1px solid var(--color-border)', 
          backgroundColor: 'var(--color-surface-hover)',
          flexShrink: 0
        }}>
          <button onClick={onClose} className="btn-secondary">Schliessen</button>
          <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={16} /> Drucken / PDF
          </button>
        </div>
      </div>
    </div>
  );
};
