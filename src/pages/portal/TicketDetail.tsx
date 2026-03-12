import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, Paperclip, 
  AlertCircle, MoreVertical, User
} from 'lucide-react';
import { getUser } from '../../utils/auth';

export const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/portal/tickets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch ticket detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/portal/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          message: newComment
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewComment('');
        fetchTicket();
      }
    } catch (err) {
      console.error('Failed to send comment', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="card pulse" style={{ padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ height: 24, backgroundColor: 'var(--color-surface-hover)', borderRadius: 4, width: '30%' }}></div>
      <div style={{ height: 150, backgroundColor: 'var(--color-surface-hover)', borderRadius: 8, width: '100%' }}></div>
    </div>
  );

  if (!ticket) return (
    <div className="card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      Ticket nicht gefunden.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/portal/tickets')}
            className="btn-secondary"
            style={{ padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{ticket.title}</h2>
              <span className={`badge ${ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'info'}`}>
                {ticket.status}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Ticket #{ticket.ticket_number || ticket.id.substring(0,6)} • Erstellt am {new Date(ticket.created_at).toLocaleDateString('de-CH')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
           <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
             <AlertCircle size={14} /> Ticket schliessen
           </button>
           <button className="btn-secondary" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <MoreVertical size={16} />
           </button>
        </div>
      </header>

      <div className="card" style={{ flex: 1, minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Description / Initial Message */}
        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(0, 82, 204, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-surface)' }}>
              <User size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Beschreibung</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Initialer Eintrag</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {ticket.description}
              </div>
            </div>
          </div>
        </div>

        {/* Chat / Conversation */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {ticket.messages?.map((comment: any) => {
            const isMe = comment.sender_id === user?.id;
            return (
              <div key={comment.id} style={{ display: 'flex', gap: 16, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-surface)', backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-surface-hover)', flexShrink: 0 }}>
                  {isMe ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                  ) : (
                    <User size={16} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '80%', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 4px' }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{isMe ? 'Sie' : (comment.first_name ? `${comment.first_name} ${comment.last_name}` : 'Support System')}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{new Date(comment.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                  </div>
                  <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: 16, 
                    fontSize: 13, 
                    lineHeight: 1.5, 
                    backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-surface)', 
                    color: isMe ? 'white' : 'var(--color-text-main)',
                    border: isMe ? 'none' : '1px solid var(--color-border)',
                    borderTopRightRadius: isMe ? 2 : 16,
                    borderTopLeftRadius: isMe ? 16 : 2,
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {comment.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Reply Box */}
        <div style={{ padding: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <form onSubmit={handleSendComment} style={{ position: 'relative' }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ihre Antwort schreiben..."
              disabled={sending}
              style={{ 
                width: '100%',
                minHeight: 80,
                maxHeight: 200,
                padding: '12px',
                paddingRight: 100,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment(e);
                }
              }}
            />
            <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                type="button" 
                style={{ padding: 8, color: 'var(--color-text-muted)', display: 'flex' }}
                title="Datei anhängen"
              >
                <Paperclip size={18} />
              </button>
              <button 
                type="submit" 
                disabled={sending || !newComment.trim()}
                className="btn-primary"
                style={{ borderRadius: '50%', width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Support ist online</span>
             </div>
             <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto', fontStyle: 'italic', margin: 0 }}>Tipp: Mit Shift + Enter für Zeilenumbruch</p>
          </div>
        </div>
      </div>
    </div>
  );
};
