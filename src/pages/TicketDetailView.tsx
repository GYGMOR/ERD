import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Building2, User, Tag, Calendar, Send, Lock } from 'lucide-react';
import { getUser } from '../utils/auth';
import type { Ticket } from '../types/entities';

interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
}

const PRIORITIES: Record<string, { label: string; cls: string }> = {
  low:      { label: 'Niedrig',  cls: 'success' },
  medium:   { label: 'Mittel',   cls: 'info' },
  high:     { label: 'Hoch',     cls: 'warning' },
  critical: { label: 'Kritisch', cls: 'danger' },
};

const STATUSES: Record<string, { label: string; icon: React.ReactNode }> = {
  new:         { label: 'Neu',         icon: <AlertCircle size={14} /> },
  open:        { label: 'Offen',       icon: <Clock size={14} /> },
  in_progress: { label: 'In Arbeit',   icon: <Clock size={14} /> },
  pending:     { label: 'Wartend',     icon: <Clock size={14} /> },
  resolved:    { label: 'Gelöst',      icon: <CheckCircle size={14} /> },
  closed:      { label: 'Geschlossen', icon: <CheckCircle size={14} /> },
};

const STATUS_COLORS: Record<string, string> = {
  new: 'var(--color-primary)', open: 'var(--color-warning)', in_progress: 'var(--color-info)',
  pending: 'var(--color-text-muted)', resolved: 'var(--color-success)', closed: 'var(--color-success)',
};

const AVATAR_COLORS = ['var(--color-primary)', 'var(--color-success)', '#8b5cf6', '#ec4899', 'var(--color-warning)', 'var(--color-info)'];
const avatarColor = (s: string) => AVATAR_COLORS[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const InfoRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
    <div style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0, width: 18 }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{children}</div>
    </div>
  </div>
);

// ─── Comment Bubble ───────────────────────────────────────────────────────────
const CommentBubble = ({ comment }: { comment: Comment }) => {
  const initials = `${(comment.first_name || '?').charAt(0)}${(comment.last_name || '').charAt(0)}`.toUpperCase();
  const color = avatarColor(comment.user_id);
  const isInternal = comment.is_internal;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{comment.first_name} {comment.last_name}</span>
          {isInternal && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-warning)', fontWeight: 600, backgroundColor: 'var(--color-warning)15', padding: '2px 6px', borderRadius: 6 }}>
              <Lock size={10} /> Intern
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {new Date(comment.created_at).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isInternal ? 'var(--color-warning)10' : 'var(--color-surface-hover)',
          border: isInternal ? '1px solid var(--color-warning)40' : '1px solid var(--color-border)',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          color: 'var(--color-text-main)',
        }}>
          {comment.body}
        </div>
      </div>
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────
export const TicketDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getUser();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ticketRes, commentsRes] = await Promise.all([
          fetch(`/api/tickets/${id}`),
          fetch(`/api/tickets/${id}/comments`),
        ]);
        const [ticketData, commentsData] = await Promise.all([ticketRes.json(), commentsRes.json()]);
        if (ticketData.success) {
          setTicket(ticketData.data);
          setStatus(ticketData.data.status);
          setPriority(ticketData.data.priority);
        } else { setError('Ticket nicht gefunden.'); }
        if (commentsData.success) setComments(commentsData.data);
      } catch { setError('Netzwerkfehler.'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [id]);

  // Auto-scroll to bottom of comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

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

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    if (!currentUser?.id) { setCommentError('Nicht eingeloggt.'); return; }
    setSubmittingComment(true);
    setCommentError('');
    try {
      const res = await fetch(`/api/tickets/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, body: commentBody.trim(), is_internal: isInternal }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, data.data]);
        setCommentBody('');
        setIsInternal(false);
      } else { setCommentError(data.error || 'Fehler beim Senden.'); }
    } catch { setCommentError('Netzwerkfehler.'); } finally { setSubmittingComment(false); }
  };

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)',
    fontSize: 14, fontWeight: 500, outline: 'none', cursor: 'pointer',
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

      {/* Back */}
      <button onClick={() => navigate('/tickets')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: 14, padding: 0, transition: 'color 0.15s' }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--color-primary)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
        <ArrowLeft size={16} /> Zurück zu Tickets
      </button>

      {/* Success Banner */}
      {saveSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> Änderungen gespeichert.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

        {/* LEFT */}
        <div>
          {/* Ticket header card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>TKT-{ticket.id.substring(0, 6).toUpperCase()}</span>
              <span className={'badge ' + (PRIORITIES[ticket.priority]?.cls || 'info')}>{PRIORITIES[ticket.priority]?.label || ticket.priority}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600, backgroundColor: `${STATUS_COLORS[ticket.status]}22`, color: STATUS_COLORS[ticket.status] }}>
                {STATUSES[ticket.status]?.icon} {STATUSES[ticket.status]?.label || ticket.status}
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{ticket.title}</h1>
          </div>

          {/* Description */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 14 }}>Beschreibung</h3>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: ticket.description ? 'var(--color-text-main)' : 'var(--color-text-muted)', whiteSpace: 'pre-wrap', minHeight: 48 }}>
              {ticket.description || 'Keine Beschreibung vorhanden.'}
            </div>
          </div>

          {/* Activity / Comments */}
          <div className="card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 20 }}>
              Aktivität ({comments.length})
            </h3>

            {/* Comment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 420, overflowY: 'auto', paddingRight: 4, marginBottom: 24 }}>
              {/* System event: ticket created */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                    <strong style={{ color: 'var(--color-text-main)' }}>System</strong> — Ticket erstellt
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {new Date(ticket.created_at).toLocaleString('de-CH')}
                  </div>
                </div>
              </div>

              {comments.map(c => (
                <CommentBubble key={c.id} comment={c} />
              ))}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment input form */}
            <form onSubmit={handleCommentSubmit}>
              {commentError && (
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 12, fontSize: 13 }}>{commentError}</div>
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: currentUser ? avatarColor(currentUser.id) : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {currentUser ? `${currentUser.firstName?.charAt(0) || ''}${currentUser.lastName?.charAt(0) || ''}`.toUpperCase() : '?'}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={commentBody}
                    onChange={e => setCommentBody(e.target.value)}
                    placeholder="Kommentar hinzufügen..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-main)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommentSubmit(e as unknown as React.FormEvent); }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted)', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={e => setIsInternal(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: 'var(--color-warning)' }}
                      />
                      <Lock size={12} /> Interner Kommentar
                    </label>
                    <button type="submit" disabled={submittingComment || !commentBody.trim()} className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}>
                      <Send size={13} /> {submittingComment ? 'Senden...' : 'Senden'} <span style={{ opacity: 0.65, fontSize: 11 }}>⌘⏎</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Actions */}
          <div className="card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 14 }}>Bearbeiten</h3>
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
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 4 }}>Details</h3>
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
