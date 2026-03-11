import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Building2, User, Tag, Calendar } from 'lucide-react';
import type { Ticket } from '../types/entities';

const PRIORITIES: Record<string, { label: string; cls: string }> = {
  low:      { label: 'Niedrig',  cls: 'success' },
  medium:   { label: 'Mittel',   cls: 'info' },
  high:     { label: 'Hoch',     cls: 'warning' },
  critical: { label: 'Kritisch', cls: 'danger' },
};

const STATUSES: Record<string, { label: string; icon: React.ReactNode }> = {
  new:         { label: 'Neu',        icon: <AlertCircle size={14} /> },
  open:        { label: 'Offen',      icon: <Clock size={14} /> },
  in_progress: { label: 'In Arbeit',  icon: <Clock size={14} /> },
  pending:     { label: 'Wartend',    icon: <Clock size={14} /> },
  resolved:    { label: 'Gelöst',     icon: <CheckCircle size={14} /> },
  closed:      { label: 'Geschlossen',icon: <CheckCircle size={14} /> },
};

const STATUS_COLORS: Record<string, string> = {
  new: 'var(--color-primary)',
  open: 'var(--color-warning)',
  in_progress: 'var(--color-info)',
  pending: 'var(--color-text-muted)',
  resolved: 'var(--color-success)',
  closed: 'var(--color-success)',
};

const InfoRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
    <div style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0, width: 18 }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{children}</div>
    </div>
  </div>
);

export const TicketDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(`/api/tickets/${id}`);
        const data = await res.json();
        if (data.success) {
          setTicket(data.data);
          setStatus(data.data.status);
          setPriority(data.data.priority);
        } else {
          setError('Ticket nicht gefunden.');
        }
      } catch { setError('Netzwerkfehler.'); }
      finally { setLoading(false); }
    };
    fetchTicket();
  }, [id]);

  const handleSave = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, priority }),
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else { setError(data.error || 'Fehler beim Speichern.'); }
    } catch { setError('Netzwerkfehler.'); } finally { setSaving(false); }
  };

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)',
    fontSize: 14,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--color-text-muted)' }}>
      Lade Ticket...
    </div>
  );

  if (error || !ticket) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 16 }}>
      <p style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{error || 'Ticket nicht gefunden.'}</p>
      <button className="btn-primary" onClick={() => navigate('/tickets')}>← Zurück zur Liste</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Back button */}
      <button
        onClick={() => navigate('/tickets')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: 14, padding: 0, transition: 'color 0.15s' }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--color-primary)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        <ArrowLeft size={16} /> Zurück zu Tickets
      </button>

      {/* Success Banner */}
      {saveSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> Änderungen gespeichert.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

        {/* LEFT — Main Content */}
        <div>
          {/* Ticket header */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>TKT-{ticket.id.substring(0, 6).toUpperCase()}</span>
                  <span className={'badge ' + (PRIORITIES[ticket.priority]?.cls || 'info')}>
                    {PRIORITIES[ticket.priority]?.label || ticket.priority}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600, backgroundColor: `${STATUS_COLORS[ticket.status]}22`, color: STATUS_COLORS[ticket.status] }}>
                    {STATUSES[ticket.status]?.icon}
                    {STATUSES[ticket.status]?.label || ticket.status}
                  </span>
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{ticket.title}</h1>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 16 }}>Beschreibung</h3>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: ticket.description ? 'var(--color-text-main)' : 'var(--color-text-muted)', whiteSpace: 'pre-wrap', minHeight: 60 }}>
              {ticket.description || 'Keine Beschreibung vorhanden.'}
            </div>
          </div>

          {/* Activity placeholder */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 16 }}>Aktivität</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>S</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>System</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>Ticket erstellt</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {new Date(ticket.created_at).toLocaleString('de-CH')}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Kommentar-Funktion kommt in Phase 3.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Ticket Actions */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 16 }}>Bearbeiten</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Status</label>
                <select style={{ ...selectStyle, width: '100%' }} value={status} onChange={e => setStatus(e.target.value)}>
                  {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Priorität</label>
                <select style={{ ...selectStyle, width: '100%' }} value={priority} onChange={e => setPriority(e.target.value)}>
                  {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '10px', marginTop: 4 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Speichern...' : '✓ Änderungen speichern'}
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 4 }}>Details</h3>
            <InfoRow icon={<Tag size={14} />} label="Typ">
              <span className="badge info" style={{ fontSize: 12 }}>{ticket.type}</span>
            </InfoRow>
            <InfoRow icon={<Building2 size={14} />} label="Firma">
              {ticket.company_name || <span style={{ color: 'var(--color-text-muted)' }}>–</span>}
            </InfoRow>
            <InfoRow icon={<User size={14} />} label="Zugewiesen an">
              {ticket.assignee_first_name
                ? `${ticket.assignee_first_name} ${ticket.assignee_last_name}`
                : <span style={{ color: 'var(--color-text-muted)' }}>Nicht zugewiesen</span>}
            </InfoRow>
            <InfoRow icon={<User size={14} />} label="Erstellt von">
              {ticket.customer_first_name
                ? `${ticket.customer_first_name} ${ticket.customer_last_name}`
                : <span style={{ color: 'var(--color-text-muted)' }}>–</span>}
            </InfoRow>
            <InfoRow icon={<Calendar size={14} />} label="Erstellt am">
              {new Date(ticket.created_at).toLocaleDateString('de-CH')}
            </InfoRow>
            <InfoRow icon={<Calendar size={14} />} label="Aktualisiert">
              {new Date(ticket.updated_at).toLocaleDateString('de-CH')}
            </InfoRow>
          </div>
        </div>
      </div>
    </div>
  );
};
