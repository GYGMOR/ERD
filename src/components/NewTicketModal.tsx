import React, { useState, useEffect } from 'react';
import { getTenantId } from '../utils/auth';
import type { Company } from '../types/entities';

export const NewTicketModal = ({ onClose, onSave }: { onClose: () => void, onSave: (data: Record<string, unknown>) => void }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    type: 'support',
    company_id: ''
  });
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch companies for the dropdown
    fetch('/api/companies').then(res => res.json()).then(data => {
      if(data.success) {
        setCompanies(data.data);
      }
    }).catch(console.error);
  }, []);

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
        tenant_id: tenantId,
        company_id: formData.company_id || null // null if empty string
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        onSave(data.data);
      } else {
        setError(data.error || 'Fehler beim Erstellen des Tickets.');
      }
    } catch {
      setError('Netzwerkfehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '600px', padding: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Neues Ticket eröffnen</h2>
        
        {error && <div style={{ padding: '12px', backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Betreff *</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Beschreibung</label>
            <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Firma (Optional)</label>
              <select value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <option value="">-- Keine Firma --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Typ</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <option value="support">Support</option>
                <option value="incident">Incident / Störung</option>
                <option value="request">Anfrage</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>Priorität</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer' }}>Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 16px' }}>
              {loading ? 'Speichern...' : 'Ticket erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
