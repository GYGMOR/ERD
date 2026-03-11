import React, { useState } from 'react';
import { getTenantId } from '../utils/auth';

export const NewCustomerModal = ({ onClose, onSave }: { onClose: () => void, onSave: (data: Record<string, unknown>) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    industry: '',
    phone: '',
    city: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // In a real app we'd get this from the JWT token
      const tenantId = getTenantId();
      if (!tenantId) {
        setError('Kein Tenant gefunden. Bitte neu einloggen.');
        setLoading(false);
        return;
      }
      const payload = {
        ...formData,
        tenant_id: tenantId
      };

      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        onSave(data.data);
      } else {
        setError(data.error || 'Fehler beim Erstellen des Kunden.');
      }
    } catch {
      setError('Netzwerkfehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '500px', padding: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Neuer Kunde (Firma)</h2>
        
        {error && <div style={{ padding: '12px', backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Firmenname *</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Domain (Webseite)</label>
              <input type="text" value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Telefon</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
               <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Branche</label>
              <input type="text" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Stadt</label>
              <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer' }}>Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 16px' }}>
              {loading ? 'Speichern...' : 'Kunde anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
