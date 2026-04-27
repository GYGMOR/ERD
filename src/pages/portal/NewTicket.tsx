import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Send, ShieldQuestion } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { getUser, getTenantId } from '../../utils/auth';

export const NewTicket = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || loading) return;

    setLoading(true);
    try {
      const user = getUser();
      const tenantId = getTenantId();
      
      const res = await dataService.createTicket({ 
        ...formData,
        customer_id: user?.id || null,
        tenant_id: tenantId || null,
        status: 'new'
      });

      if (res.success && res.data) {
        navigate(`/portal/tickets/${res.data.id}`);
      }
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button 
          onClick={() => navigate('/portal/tickets')}
          className="btn-secondary"
          style={{ padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Neues Support Ticket</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>Schildern Sie uns Ihr Anliegen, wir helfen Ihnen gerne weiter.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="input-label">Was ist das Problem? (Betreff)</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ height: 44, fontSize: 15, fontWeight: 600 }}
              placeholder="Z.B. VPN Verbindung bricht ab"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="input-label">Dringlichkeit</label>
              <select 
                className="input-field"
                style={{ height: 44 }}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Niedrig - Keine Eile</option>
                <option value="medium">Mittel - Standard</option>
                <option value="high">Hoch - Wichtig für die Arbeit</option>
                <option value="critical">Kritisch - Systemausfall!</option>
              </select>
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 10, fontSize: 11, color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
               <Info size={14} style={{ flexShrink: 0, color: 'var(--color-primary)', marginTop: 2 }} />
               <p style={{ margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>Unser Support-Team bearbeitet Anfragen in der Regel innerhalb von 4 Stunden (während der Bürozeiten).</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="input-label">Detaillierte Beschreibung</label>
            <textarea 
              className="input-field" 
              style={{ minHeight: 180, padding: 12, lineHeight: 1.6 }}
              placeholder="Bitte beschreiben Sie das Problem so genau wie möglich. Welche Schritte haben Sie bereits unternommen?"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
               <ShieldQuestion size={16} />
               <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ihre Daten sind sicher</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
               <button 
                type="button"
                onClick={() => navigate('/portal/tickets')}
                className="btn-secondary"
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600 }}
              >
                Abbrechen
              </button>
               <button 
                type="submit" 
                disabled={loading}
                className="btn-primary"
                style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700 }}
              >
                {loading ? 'Wird gesendet...' : <><Send size={16} /> Ticket Absenden</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
