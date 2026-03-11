import { X, Printer, FileText, Calendar, Clock, DollarSign } from 'lucide-react';
import type { Contract } from '../types/entities';

interface ContractPreviewModalProps {
  contract: Contract;
  onClose: () => void;
}

export const ContractPreviewModal = ({ contract, onClose }: ContractPreviewModalProps) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Bitte Popup-Blocker deaktivieren, um zu drucken.');
      return;
    }

    const items = (contract as any).items || [];
    const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.total_price) || 0), 0);
    const tax = items.reduce((s: number, i: any) => s + ((parseFloat(i.total_price) || 0) * (parseFloat(i.tax_rate) || 8.1) / 100), 0);
    const total = subtotal + tax;

    const itemsHtml = items.map((i: any) => `
      <tr>
        <td>
          <div style="font-weight: 600;">${i.title}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">${i.description || ''}</div>
        </td>
        <td style="text-align: right">${i.quantity}</td>
        <td style="text-align: right">CHF ${parseFloat(i.unit_price).toFixed(2)}</td>
        <td style="text-align: right; font-weight: 600;">CHF ${parseFloat(i.total_price).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vertrag - ${contract.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .label { font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 4px; }
            .value { font-size: 14px; }
            .section-title { font-size: 14px; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 16px; margin-top: 30px; text-transform: uppercase; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase; }
            td { padding: 16px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .totals { margin-top: 30px; }
            .total-row { display: flex; justify-content: flex-end; gap: 30px; margin-bottom: 8px; font-size: 14px; }
            .grand-total { border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 8px; font-size: 18px; font-weight: bold; color: #2563eb; }
            .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; }
            @media print { body { padding: 0; } .footer { position: absolute; bottom: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">NexService</div>
            <div style="text-align: right">
              <div style="font-size: 20px; font-weight: bold; color: #1e293b;">DIENSTLEISTUNGSVERTRAG</div>
              <div style="color: #64748b; font-size: 13px;">Nr. ${contract.contract_number || 'VER-' + contract.id.substring(0, 8)}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div>
              <div class="label">Vertragspartner</div>
              <div class="value" style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${contract.company_name || 'Privatperson'}</div>
              <div style="color: #64748b; font-size: 13px;">Projektreferenz: ${contract.title}</div>
            </div>
            <div style="text-align: right">
              <div class="label">Datum & Status</div>
              <div class="value" style="font-weight: 600;">${new Date().toLocaleDateString('de-CH')} | ${contract.status.toUpperCase()}</div>
            </div>
          </div>

          <div class="section-title">Leistungen / Positionen</div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%">Beschreibung</th>
                <th style="text-align: right">Menge</th>
                <th style="text-align: right">Preis</th>
                <th style="text-align: right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || `<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">Keine Positionen definiert</td></tr>`}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span style="color: #64748b">Zwischensumme:</span>
              <span style="width: 120px; text-align: right;">CHF ${subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
              <span style="color: #64748b">MwSt:</span>
              <span style="width: 120px; text-align: right;">CHF ${tax.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row grand-total">
              <span>Gesamtbetrag (CHF):</span>
              <span style="width: 120px; text-align: right;">${total.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b; margin-top: 4px;">
              Abrechnungsintervall: ${contract.billing_interval}
            </div>
          </div>

          <div class="footer">NexService AG | Musterstrasse 12 | 8000 Zürich | www.nexservice.ch</div>
          <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ 
        maxWidth: 840, 
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
            <span style={{ fontWeight: 600, fontSize: 16 }}>Vorschau: {contract.contract_number || 'Vertrag'}</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: 'auto', flex: 1, backgroundColor: 'var(--color-surface-hover)', padding: '24px' }}>
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
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>VERTRAG</h2>
                <p style={{ color: '#666', margin: '4px 0' }}>Nr. {contract.contract_number || 'VER-' + contract.id.substring(0, 8)}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>Vertragspartner</h4>
                <p style={{ fontWeight: 700, margin: 0, fontSize: 15 }}>{contract.company_name || 'Privatperson'}</p>
                <p style={{ margin: '4px 0', fontSize: 14 }}>{contract.title}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, fontSize: 14 }}>
                  <span style={{ color: '#666' }}>Status:</span>
                  <span style={{ fontWeight: 600 }}>{contract.status.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #eee', paddingTop: 24, marginBottom: 30 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 16 }}>Leistungen / Positionen</h4>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: '8px 0', textAlign: 'left', fontSize: 11, color: '#999' }}>Position</th>
                    <th style={{ padding: '8px 0', textAlign: 'right', fontSize: 11, color: '#999', width: 60 }}>Menge</th>
                    <th style={{ padding: '8px 0', textAlign: 'right', fontSize: 11, color: '#999', width: 100 }}>Einzel</th>
                    <th style={{ padding: '8px 0', textAlign: 'right', fontSize: 11, color: '#999', width: 100 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {((contract as any).items || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>Keine Positionen definiert</td>
                    </tr>
                  ) : (contract as any).items.map((i: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 0' }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{i.title}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{i.description}</div>
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontSize: 14 }}>{i.quantity}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontSize: 14 }}>CHF {parseFloat(i.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontSize: 14, fontWeight: 600 }}>CHF {parseFloat(i.total_price).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #eee', paddingTop: 20 }}>
              <div style={{ width: 250 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#666' }}>Zwischensumme:</span>
                  <span>CHF {((contract as any).items || []).reduce((s: number, i: any) => s + (parseFloat(i.total_price) || 0), 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#666' }}>
                  <span>MwSt (Mix):</span>
                  <span>CHF {((contract as any).items || []).reduce((s: number, i: any) => s + ((parseFloat(i.total_price) || 0) * (parseFloat(i.tax_rate) || 8.1) / 100), 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', marginTop: 10, borderTop: '1px solid #eee', fontWeight: 800, fontSize: 16, color: 'var(--color-primary)' }}>
                  <span>Brutto:</span>
                  <span>CHF {parseFloat(String(contract.amount || '0')).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 40, padding: 20, backgroundColor: 'var(--color-surface-hover)', borderRadius: 8, fontSize: 13, color: '#666', border: '1px solid var(--color-border)' }}>
              <strong>Hinweis:</strong> Dies ist eine Systemvorschau des Vertrags. Alle Details sind rechtlich bindend gemäß den hinterlegten Stammunterlagen.
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
