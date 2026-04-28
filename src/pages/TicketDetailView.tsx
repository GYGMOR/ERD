import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Building2, User, Tag, Calendar, Send, Lock } from 'lucide-react';
import { getUser } from '../utils/auth';
import { dataService } from '../services/dataService';
import type { Ticket } from '../types/entities';
import { SignaturePad } from '../components/SignaturePad';

interface Comment {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  first_name: string;
  last_name: string;
  role: string;
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
  const color = avatarColor(comment.sender_id);
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
          {comment.message}
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
  // Assignment
  const [users, setUsers] = useState<{id: string, first_name: string, last_name: string}[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const isAdminOrManager = currentUser && ['admin', 'manager'].includes(currentUser.role);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [ticketRes, usersRes] = await Promise.all([
          dataService.getTicketById(id!),
          dataService.getUsers(),
        ]);
        
        if (ticketRes.success && ticketRes.data) {
          const t = ticketRes.data;
          // Map nested objects to flat structure for the existing UI
          const mappedTicket = {
            ...t,
            company_name: t.company?.name || '',
            assignee_first_name: t.assignee?.first_name || '',
            assignee_last_name: t.assignee?.last_name || '',
            customer_first_name: t.customer?.first_name || '',
            customer_last_name: t.customer?.last_name || '',
          };
          setTicket(mappedTicket);
          setStatus(t.status);
          setPriority(t.priority);
          setAssigneeId(t.assignee_id || '');
          
          if (t.messages) {
            const mappedComments = t.messages.map((m: any) => ({
              ...m,
              first_name: m.sender?.first_name || 'System',
              last_name: m.sender?.last_name || '',
              role: m.sender?.role || 'system'
            }));
            setComments(mappedComments);
          }
        } else { setError('Ticket nicht gefunden.'); }
        
        if (usersRes.success) setUsers(usersRes.data || []);
      } catch (err) { 
        console.error(err);
        setError('Netzwerkfehler.'); 
      } finally { setLoading(false); }
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
      const res = await dataService.updateTicket(id!, { 
        status, 
        priority, 
        assignee_id: assigneeId === '' ? null : assigneeId 
      });
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else { setError(res.error || 'Fehler beim Speichern.'); }
    } catch { setError('Netzwerkfehler.'); } finally { setSaving(false); }
  };

  const handleTakeOver = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      const res = await dataService.updateTicket(id!, { 
        assignee_id: currentUser.id, 
        status: 'in_progress' 
      });
      if (res.success) {
        setAssigneeId(currentUser.id);
        setStatus('in_progress');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else { setError(res.error || 'Fehler beim Übernehmen.'); }
    } catch { setError('Netzwerkfehler.'); } finally { setSaving(false); }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    if (!currentUser?.id) { setCommentError('Nicht eingeloggt.'); return; }
    setSubmittingComment(true);
    setCommentError('');
    try {
      const res = await dataService.addTicketMessage(id!, {
        ticket_id: id,
        sender_id: currentUser.id,
        message: commentBody.trim(),
        is_internal: isInternal
      });
      if (res.success && res.data) {
        const newCM = {
          ...res.data,
          first_name: currentUser.firstName || '',
          last_name: currentUser.lastName || '',
          role: currentUser.role || ''
        };
        setComments(prev => [...prev, newCM]);
        setCommentBody('');
        setIsInternal(false);
      } else { setCommentError(res.error || 'Fehler beim Senden.'); }
    } catch { setCommentError('Netzwerkfehler.'); } finally { setSubmittingComment(false); }
  };

  const handleSignatureSave = async (dataUrl: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_data: dataUrl })
      });
      if (res.ok) {
        setTicket(prev => prev ? { ...prev, signature_data: dataUrl } : null);
        setShowSignaturePad(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [activeTab, setActiveTab] = useState<'messages' | 'history'>('messages');

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>TKT-{ticket.id.substring(0, 6).toUpperCase()}: {ticket.title}</h1>
           <span className={'badge ' + (PRIORITIES[ticket.priority]?.cls || 'info')}>{PRIORITIES[ticket.priority]?.label || ticket.priority}</span>
         </div>
         <div style={{ display: 'flex', gap: 12, backgroundColor: 'var(--color-surface-hover)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <button 
              onClick={() => setActiveTab('messages')}
              style={{ padding: '6px 16px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 600, backgroundColor: activeTab === 'messages' ? 'var(--color-surface)' : 'transparent', color: activeTab === 'messages' ? 'var(--color-primary)' : 'var(--color-text-muted)', boxShadow: activeTab === 'messages' ? 'var(--shadow-sm)' : 'none' }}
            >Konversation</button>
            <button 
              onClick={() => setActiveTab('history')}
              style={{ padding: '6px 16px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 600, backgroundColor: activeTab === 'history' ? 'var(--color-surface)' : 'transparent', color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-muted)', boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none' }}
            >Historie</button>
         </div>
      </div>

      <div className="grid-responsive" style={{ gridTemplateColumns: 'var(--detail-main-cols, 1fr 320px)', alignItems: 'start' }}>
        <style>{`
          @media (max-width: 1024px) {
            .ticket-detail-page { --detail-main-cols: 1fr; }
          }
        `}</style>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {activeTab === 'messages' ? (
            <div className="card" style={{ padding: 0, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
               <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 24, maxHeight: 600, overflowY: 'auto' }}>
                  {ticket.messages && ticket.messages.map((m: any) => (
                    <div key={m.id} style={{ alignSelf: m.sender_id === currentUser?.id ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, justifyContent: m.sender_id === currentUser?.id ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{m.first_name} {m.last_name}</span>
                        {m.is_internal && <span className="badge warning" style={{ fontSize: 9 }}>Intern</span>}
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{new Date(m.created_at).toLocaleString('de-CH')}</span>
                      </div>
                      <div style={{ 
                        padding: '12px 16px', borderRadius: 'var(--radius-lg)', 
                        backgroundColor: m.sender_id === currentUser?.id ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                        color: m.sender_id === currentUser?.id ? 'white' : 'inherit',
                        fontSize: 14, lineHeight: 1.5,
                        borderBottomRightRadius: m.sender_id === currentUser?.id ? 4 : 'var(--radius-lg)',
                        borderBottomLeftRadius: m.sender_id !== currentUser?.id ? 4 : 'var(--radius-lg)',
                      }}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
               </div>
               <div style={{ padding: 20, borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                  <form onSubmit={handleCommentSubmit}>
                    <textarea 
                      className="input-field" 
                      rows={3} 
                      placeholder="Nachricht schreiben..." 
                      style={{ resize: 'none', marginBottom: 12 }}
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                    ></textarea>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} /> Intern (nur Team)
                      </label>
                      <button className="btn-primary" type="submit" disabled={submittingComment || !commentBody.trim()}>
                        <Send size={16} style={{ marginRight: 8 }} /> {submittingComment ? 'Sendet...' : 'Antworten'}
                      </button>
                    </div>
                  </form>
               </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 24 }}>
               <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Audit Trail</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, backgroundColor: 'var(--color-border)' }}></div>
                  <TimelineItem title="Ticket erstellt" sub={`Durch ${ticket.customer_first_name} ${ticket.customer_last_name}`} date={ticket.created_at} icon={<Clock size={12} />} />
                  {ticket.messages && ticket.messages.map((m: any) => (
                    <TimelineItem key={m.id} title="Neue Nachricht" sub={`Von ${m.first_name} ${m.last_name}`} date={m.created_at} icon={<MessageSquare size={12} />} />
                  ))}
                  {ticket.signature_data && (
                    <TimelineItem title="Lösung bestätigt" sub="Digital signiert durch Kunden" date={ticket.updated_at} icon={<CheckCircle size={12} />} color="#36b37e" />
                  )}
               </div>
            </div>
          )}

          {/* Description */}
          <div className="card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 14 }}>Problembeschreibung</h3>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
              {ticket.description || 'Keine Beschreibung.'}
            </div>
          </div>
          
          {ticket.signature_data && (
            <div className="card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 14 }}>Unterschrift</h3>
              <div style={{ background: '#fcfcfc', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12 }}>
                <img src={ticket.signature_data} alt="Sign" style={{ height: 100, objectFit: 'contain' }} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
             <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 14 }}>Steuerung</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                 <select style={{ ...selectStyle, width: '100%' }} value={status} onChange={e => setStatus(e.target.value)}>
                   {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                 </select>
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Priorität</label>
                 <select style={{ ...selectStyle, width: '100%' }} value={priority} onChange={e => setPriority(e.target.value)}>
                   {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                 </select>
               </div>
               {isAdminOrManager && (
                 <div>
                   <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Zuständig</label>
                   <select style={{ ...selectStyle, width: '100%' }} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                     <option value="">Nicht zugewiesen</option>
                     {users.filter(u => ['admin', 'manager', 'employee'].includes((u as any).role)).map(u => (
                       <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                     ))}
                   </select>
                 </div>
               )}
               <button className="btn-primary" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
                 {saving ? 'Speichert...' : '✓ Änderungen speichern'}
               </button>
             </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 4 }}>Kundeninfo</h3>
            <InfoRow icon={<Building2 size={14} />} label="Firma">
              <span onClick={() => navigate(`/customers/${ticket.company_id}`)} style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>{ticket.company_name}</span>
            </InfoRow>
            <InfoRow icon={<User size={14} />} label="Kontakt">
              {ticket.customer_first_name} {ticket.customer_last_name}
            </InfoRow>
            <InfoRow icon={<Calendar size={14} />} label="Erstellt">
              {new Date(ticket.created_at).toLocaleDateString('de-CH')}
            </InfoRow>
          </div>
          
          {!ticket.signature_data && (ticket.status === 'resolved' || ticket.status === 'closed') && (
            <button className="btn-secondary" style={{ width: '100%', padding: '12px' }} onClick={() => setShowSignaturePad(true)}>
              ✍ Unterschrift einholen
            </button>
          )}
        </div>
      </div>

      {showSignaturePad && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <SignaturePad onSave={handleSignatureSave} onCancel={() => setShowSignaturePad(false)} />
        </div>
      )}
    </div>
  );
};

const TimelineItem = ({ title, sub, date, icon, color }: any) => (
  <div style={{ display: 'flex', gap: 16, marginBottom: 24, position: 'relative' }}>
    <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: color || 'var(--color-surface)', border: `2px solid ${color || 'var(--color-border)'}`, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0' }}>{sub}</p>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(date).toLocaleString('de-CH')}</span>
    </div>
  </div>
);
