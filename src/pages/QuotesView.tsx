import { FileText } from 'lucide-react';
import { dummyQuotes } from '../utils/dummyData';

export const QuotesView = () => (
  <div style={{ maxWidth: 1200, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Offerten & Angebote</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>Verwalte alle ausgehenden Angebote und deren Akzeptanz-Status.</p>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} /> Neue Offerte
        </button>
      </div>
    </div>

    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Offerten-Nr.</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Kunde & Betreff</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Betrag</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Ablaufdatum</th>
          </tr>
        </thead>
        <tbody>
          {dummyQuotes.map((quote, i) => (
            <tr key={quote.id} style={{ borderBottom: i === dummyQuotes.length - 1 ? 'none' : '1px solid var(--color-border)', transition: 'background-color var(--transition-fast)', cursor: 'pointer' }} className="hover-bg-row">
              <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--color-primary)' }}>{quote.id}</td>
              <td style={{ padding: '16px 24px' }}>
                <div style={{ fontWeight: 500 }}>{quote.customer}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{quote.title}</div>
              </td>
              <td style={{ padding: '16px 24px', fontWeight: 600 }}>{quote.amount}</td>
              <td style={{ padding: '16px 24px' }}>
                <span className={'badge ' + (quote.status === 'Akzeptiert' ? 'success' : quote.status === 'Gesendet' ? 'info' : quote.status === 'Abgelehnt' ? 'danger' : 'warning')}>
                  {quote.status}
                </span>
              </td>
              <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)', fontSize: '13px' }}>{quote.validUntil}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
