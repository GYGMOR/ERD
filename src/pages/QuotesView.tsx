import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { getTenantId } from '../utils/auth';
import type { Invoice, Company } from '../types/entities';


const statusClassMap: Record<string, string> = {
  paid: 'success',
  sent: 'info',
  draft: 'warning',
  overdue: 'danger',
  cancelled: 'danger',
};

const statusLabelMap: Record<string, string> = {
  paid: 'Bezahlt',
  sent: 'Gesendet',
  draft: 'Entwurf',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
};

const NewInvoiceModal = ({ onClose, onSave }: { onClose: () => void, onSave: () => void }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    due_date: '',
    status: 'draft',
    company_id: ''
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(d => {
      if (d.success) setCompanies(d.data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const tenantId = getTenantId();
    if (!tenantId) { setError('Kein Tenant. Bitte neu einloggen.'); setLoading(false); return; }
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenant_id: tenantId, company_id: formData.company_id || null, amount: parseFloat(formData.amount) || 0 })
      });
      const data = await res.json();
      if (data.success) { onSave(); }
      else { setError(data.error || 'Fehler'); }
    } catch { setError('Netzwerkfehler'); } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: 520, padding: 32 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 24 }}>Neue Rechnung / Offerte</h2>
        {error && <div style={{ padding: 12, backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: 4, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Betreff / Titel *</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 4, border: '1px solid var(--color-border)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Betrag (CHF)</label>
              <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 4, border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Fälligkeitsdatum</label>
              <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 4, border: '1px solid var(--color-border)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Firma</label>
              <select value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                <option value="">-- Keine --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                <option value="draft">Entwurf</option>
                <option value="sent">Gesendet</option>
                <option value="paid">Bezahlt</option>
                <option value="overdue">Überfällig</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 4, border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer' }}>Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 16px' }}>
              {loading ? 'Speichern...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const QuotesView = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.success) setInvoices(data.data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(String(i.amount || '0')), 0);
  const pendingRevenue = invoices.filter(i => ['sent', 'draft'].includes(i.status)).reduce((sum, i) => sum + parseFloat(String(i.amount || '0')), 0);

  return (
  <div style={{ maxWidth: 1200, margin: '0 auto' }}>

    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Offerten & Rechnungen</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Verwalte alle ausgehenden Angebote und Rechnungen.</p>
      </div>
      <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowModal(true)}>
        <Plus size={16} /> Neue Rechnung
      </button>
    </div>

    {/* Summary Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
      <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>Bezahlt (Total)</p>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8 }}>CHF {totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
      </div>
      <div className="card" style={{ borderTop: '4px solid var(--color-warning)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>Ausstehend</p>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8 }}>CHF {pendingRevenue.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
      </div>
      <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>Total Dokumente</p>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8 }}>{invoices.length}</h2>
      </div>
    </div>

    {/* Table */}
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 13, textTransform: 'uppercase' }}>Nr.</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 13, textTransform: 'uppercase' }}>Kunde & Betreff</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 13, textTransform: 'uppercase' }}>Betrag</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 13, textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 13, textTransform: 'uppercase' }}>Fälligkeit</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>Lade Rechnungen...</td></tr>
          ) : invoices.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>Keine Rechnungen vorhanden.</td></tr>
          ) : invoices.map((inv, i) => (
            <tr key={inv.id} style={{ borderBottom: i === invoices.length - 1 ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }} className="hover-bg-row">
              <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--color-primary)' }}>INV-{inv.id.substring(0,6)}</td>
              <td style={{ padding: '16px 24px' }}>
                <div style={{ fontWeight: 500 }}>{inv.company_name || 'Kein Kunde'}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{inv.title}</div>
              </td>
              <td style={{ padding: '16px 24px', fontWeight: 600 }}>CHF {parseFloat(String(inv.amount || '0')).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style={{ padding: '16px 24px' }}>
                <span className={'badge ' + (statusClassMap[inv.status] || 'info')}>
                  {statusLabelMap[inv.status] || inv.status}
                </span>
              </td>
              <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)', fontSize: 13 }}>
                {inv.due_date ? new Date(inv.due_date).toLocaleDateString('de-CH') : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {showModal && (
      <NewInvoiceModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchInvoices(); }} />
    )}
  </div>
  );
};
