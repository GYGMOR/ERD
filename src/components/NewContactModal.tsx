import { useState, useEffect } from 'react';
import { getTenantId } from '../utils/auth';
import type { Company } from '../types/entities';

interface NewContactModalProps {
  onClose: () => void;
  onSave: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-main)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

export const NewContactModal = ({ onClose, onSave }: NewContactModalProps) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    company_id: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch companies once on mount
  useEffect(() => {
    fetch('/api/companies')
      .then(r => r.json())
      .then(d => { if (d.success) setCompanies(d.data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const tenantId = getTenantId();
    if (!tenantId) { setError('Kein Tenant. Bitte neu einloggen.'); setLoading(false); return; }
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenant_id: tenantId, company_id: formData.company_id || null }),
      });
      const data = await res.json();
      if (data.success) { onSave(); }
      else { setError(data.error || 'Fehler beim Erstellen.'); }
    } catch { setError('Netzwerkfehler.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 540, padding: 32, animation: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Neuer Kontakt</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Vorname *</label>
              <input required style={inputStyle} value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder="Max" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nachname *</label>
              <input required style={inputStyle} value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} placeholder="Mustermann" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>E-Mail</label>
            <input type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="max@firma.ch" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Telefon</label>
              <input type="tel" style={inputStyle} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+41 79 000 00 00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Funktion / Rolle</label>
              <input style={inputStyle} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="CEO, IT-Manager, ..." />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Firma</label>
            <select style={inputStyle} value={formData.company_id} onChange={e => setFormData({ ...formData, company_id: e.target.value })}>
              <option value="">-- Keine Firma auswählen --</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 500, color: 'var(--color-text-main)' }}>
              Abbrechen
            </button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 18px' }}>
              {loading ? 'Speichern...' : 'Kontakt erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
