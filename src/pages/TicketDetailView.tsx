import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Ticket, Clock, MessageSquare, Send, CheckCircle, User, 
  Building2, Calendar, AlertCircle, ChevronLeft, ArrowLeft,
  Paperclip, MoreVertical, Shield, ExternalLink, RefreshCw
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { getUser } from '../utils/auth';
import { SignaturePad } from '../components/SignaturePad';

const STATUSES: any = {
  open: { label: 'Offen', color: '#ffab00' },
  in_progress: { label: 'In Bearbeitung', color: '#0052cc' },
  resolved: { label: 'Gelöst', color: '#36b37e' },
  closed: { label: 'Geschlossen', color: '#444' }
};

const PRIORITIES: any = {
  low: { label: 'Niedrig', color: '#666' },
  medium: { label: 'Mittel', color: '#0052cc' },
  high: { label: 'Hoch', color: '#ff5630' },
  critical: { label: 'Kritisch', color: '#bf2600' }
};

export const TicketDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getUser();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [activeTab, setActiveTab] = useState('discussion'); // discussion | audit
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [ticketRes, usersRes] = await Promise.all([
          dataService.getTicketById(id!),
          isAdminOrManager ? dataService.getUsers() : Promise.resolve({ success: true, data: [] })
        ]);

        if (ticketRes.success && ticketRes.data) {
          setTicket(ticketRes.data);
          setStatus(ticketRes.data.status);
          setPriority(ticketRes.data.priority);
          setAssigneeId(ticketRes.data.assigned_to || '');
          
          if (ticketRes.data.messages) {
            const mappedComments = ticketRes.data.messages.map((m: any) => ({
              ...m,
              first_name: m.sender?.first_name || 'System',
              last_name: m.sender?.last_name || '',
              role: m.sender?.role || 'system'
            }));
            setComments(mappedComments);
          }
        } else {
          setError('Ticket nicht gefunden.');
        }
        
        if (usersRes.success) {
          setUsers(usersRes.data || []);
        }
      } catch (err) {
        console.error(err);
        setError('Netzwerkfehler.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

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
      } else {
        setError(res.error || 'Fehler beim Speichern.');
      }
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setSaving(false);
    }
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
      } else {
        setError(res.error || 'Fehler beim Übernehmen.');
      }
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setSaving(false);
    }
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
      } else {
        setCommentError(res.error || 'Fehler beim Senden.');
      }
    } catch {
      setCommentError('Netzwerkfehler.');
    } finally {
      setSubmittingComment(false);
    }
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

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <RefreshCw size={32} className="animate-spin" color="var(--color-primary)" />
      <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Ticket wird geladen...</p>
    </div>
  );

  if (error || !ticket) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 16 }}>
      <AlertCircle size={48} color="var(--color-danger)" />
      <p style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{error || 'Ticket konnte nicht geladen werden.'}</p>
      <button className="btn-secondary" onClick={() => navigate('/tickets')}>← Zurück zur Übersicht</button>
    </div>
  );

  return (
    <div className="ticket-detail-page" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header Area */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate('/tickets')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: 13, padding: 0 }}>
          <ArrowLeft size={16} /> Zurück zur Liste
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>TKT-{ticket.id.substring(0, 6).toUpperCase()}</span>
              <span className="badge" style={{ backgroundColor: STATUSES[status]?.color || '#ccc', color: 'white' }}>{STATUSES[status]?.label || status}</span>
              <span className="badge" style={{ backgroundColor: PRIORITIES[priority]?.color || '#ccc', color: 'white' }}>{PRIORITIES[priority]?.label || priority}</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{ticket.title}</h1>
          </div>
          
          <div style={{ display: 'flex', gap: 10 }}>
            {status === 'open' && (
              <button className="btn-secondary" onClick={handleTakeOver} disabled={saving}>Ticket übernehmen</button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Speichert...' : 'Änderungen speichern'}</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* LEFT COLUMN: Discussion & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Main Content Area with Tabs */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              <button 
                onClick={() => setActiveTab('discussion')}
                style={{ padding: '16px 24px', border: 'none', background: activeTab === 'discussion' ? 'var(--color-surface)' : 'transparent', borderBottom: activeTab === 'discussion' ? '2px solid var(--color-primary)' : 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: activeTab === 'discussion' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
              >Diskussion</button>
              <button 
                onClick={() => setActiveTab('audit')}
                style={{ padding: '16px 24px', border: 'none', background: activeTab === 'audit' ? 'var(--color-surface)' : 'transparent', borderBottom: activeTab === 'audit' ? '2px solid var(--color-primary)' : 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: activeTab === 'audit' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
              >Verlauf</button>
            </div>

            {activeTab === 'discussion' ? (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 30, maxHeight: 600, overflowY: 'auto', paddingRight: 10 }}>
                  {comments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                      <MessageSquare size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                      <p>Bisher keine Nachrichten.</p>
                    </div>
                  ) : (
                    comments.map((m: any) => (
                      <div key={m.id} style={{ alignSelf: m.sender_id === currentUser?.id ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <div style={{ display: 'flex', justifyContent: m.sender_id === currentUser?.id ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{m.first_name} {m.last_name}</span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{new Date(m.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</span>
                          {m.is_internal && <span style={{ fontSize: 9, padding: '1px 4px', backgroundColor: 'rgba(255, 171, 0, 0.1)', color: '#ffab00', borderRadius: 4, fontWeight: 700 }}>INTERN</span>}
                        </div>
                        <div style={{ 
                          padding: '12px 16px', borderRadius: 'var(--radius-lg)', 
                          backgroundColor: m.sender_id === currentUser?.id ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                          color: m.sender_id === currentUser?.id ? 'white' : 'var(--color-text-main)',
                          fontSize: 14, lineHeight: 1.5,
                          borderBottomRightRadius: m.sender_id === currentUser?.id ? 2 : 'var(--radius-lg)',
                          borderBottomLeftRadius: m.sender_id === currentUser?.id ? 'var(--radius-lg)' : 2
                        }}>
                          {m.message}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Reply Form */}
                <form onSubmit={handleCommentSubmit} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                  {commentError && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 10 }}>{commentError}</p>}
                  <textarea 
                    className="form-input" 
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
            ) : (
              <div style={{ padding: 24 }}>
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
          </div>

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
                 <select style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid var(--color-border)' }} value={status} onChange={e => setStatus(e.target.value)}>
                   {Object.entries(STATUSES).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}
                 </select>
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Priorität</label>
                 <select style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid var(--color-border)' }} value={priority} onChange={e => setPriority(e.target.value)}>
                   {Object.entries(PRIORITIES).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}
                 </select>
               </div>
               {isAdminOrManager && (
                 <div>
                   <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Zuständig</label>
                   <select style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid var(--color-border)' }} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                     <option value="">Nicht zugewiesen</option>
                     {users.filter(u => ['admin', 'manager', 'employee'].includes(u.role)).map(u => (
                       <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                     ))}
                   </select>
                 </div>
               )}
             </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em', marginBottom: 4 }}>Kundeninfo</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
              <Building2 size={14} color="var(--color-text-muted)" />
              <span onClick={() => navigate(`/customers/${ticket.company_id}`)} style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{ticket.company_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
              <User size={14} color="var(--color-text-muted)" />
              <span style={{ fontSize: 13 }}>{ticket.customer_first_name} {ticket.customer_last_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
              <Calendar size={14} color="var(--color-text-muted)" />
              <span style={{ fontSize: 13 }}>{new Date(ticket.created_at).toLocaleDateString('de-CH')}</span>
            </div>
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
