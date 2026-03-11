import React, { useState, useEffect } from 'react';
import { getTenantId } from '../utils/auth';
import type { Company } from '../types/entities';
import { X, Image as ImageIcon, FileText, UploadCloud } from 'lucide-react';

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
  const [attachments, setAttachments] = useState<{ name: string, size: string, type: string }[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAtts = Array.from(files).map(f => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB',
        type: f.type
      }));
      setAttachments([...attachments, ...newAtts]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        if(data.success) setCompanies(data.data);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        setError('Kein Tenant gefunden. Bitte neu einloggen.');
        setLoading(false);
        return;
      }
      const payload = {
        ...formData,
        tenant_id: tenantId,
        company_id: formData.company_id || null
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
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 640 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Neues Ticket eröffnen</h2>
        
        {error && <div className="badge danger" style={{ width: '100%', marginBottom: 16, padding: 12 }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">Betreff *</label>
            <input required type="text" className="input-field" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          
          <div>
            <label className="input-label">Beschreibung</label>
            <textarea rows={3} className="input-field" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label className="input-label">Firma (Optional)</label>
              <select className="input-field" value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})}>
                <option value="">-- Keine Firma --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Typ</label>
              <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="support">Support</option>
                <option value="incident">Incident / Störung</option>
                <option value="request">Anfrage</option>
              </select>
            </div>
            <div>
              <label className="input-label">Priorität</label>
              <select className="input-field" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="input-label">Anhänge</label>
            <div 
              style={{ 
                border: '2px dashed var(--color-border)', 
                borderRadius: 'var(--radius-md)', 
                padding: '24px', 
                textAlign: 'center',
                backgroundColor: 'var(--color-surface-hover)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <UploadCloud size={32} color="var(--color-text-muted)" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Dateien hierher ziehen oder klicken
              </p>
              <input id="file-upload" type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
            
            {attachments.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                {attachments.map((file, i) => (
                  <div key={i} style={{ 
                    display: 'flex', alignItems: 'center', gap: 10, padding: 8, 
                    backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)', position: 'relative'
                  }}>
                    {file.type.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{file.name}</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>{file.size}</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeAttachment(i); }} style={{ border: 'none', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Speichern...' : 'Ticket erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
