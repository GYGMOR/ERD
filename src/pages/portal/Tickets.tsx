import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Plus, Search, Filter, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { getUser } from '../../utils/auth';

export const Tickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const user = getUser();
        if (!user?.id) { setLoading(false); return; }

        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) setTickets(data);
      } catch (err) {
        console.error('Failed to fetch tickets', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return <span className="badge info">Neu</span>;
      case 'open': return <span className="badge warning">Offen</span>;
      case 'in_progress': return <span className="badge info">In Arbeit</span>;
      case 'resolved': return <span className="badge success">Erledigt</span>;
      case 'closed': return <span className="badge success">Geschlossen</span>;
      case 'pending': return <span className="badge warning">Wartend</span>;
      default: return <span className="badge info">{status}</span>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />;
      case 'high': return <AlertCircle size={14} style={{ color: 'var(--color-warning)' }} />;
      case 'medium': return <AlertCircle size={14} style={{ color: 'var(--color-primary)' }} />;
      default: return <AlertCircle size={14} style={{ color: 'var(--color-text-muted)' }} />;
    }
  };

  const filteredTickets = tickets.filter((t: any) => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ticket_number?.toString().includes(searchTerm)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Support Tickets
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            Verwalten Sie Ihre Anfragen und kommunizieren Sie mit unserem Team.
          </p>
        </div>
        <button 
          onClick={() => navigate('/portal/tickets/new')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 'fit-content' }}
        >
          <Plus size={16} /> Neues Ticket erstellen
        </button>
      </div>

      <div className="card" style={{ padding: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Nach Ticketnummer oder Titel suchen..." 
              className="input-field"
              style={{ paddingLeft: 34 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <Filter size={14} /> Filter
            </button>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, padding: 0 }}>
               <Clock size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Ticket</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Priorität</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Datum</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Letzte Antwort</th>
                <th style={{ padding: '12px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="pulse">
                    <td colSpan={6} style={{ padding: '20px 16px' }}>
                      <div style={{ height: 12, backgroundColor: 'var(--color-surface-hover)', borderRadius: 4, width: '100%' }}></div>
                    </td>
                  </tr>
                ))
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <Ticket size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
                    <p style={{ margin: 0 }}>Keine Tickets gefunden.</p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t: any) => (
                  <tr 
                    key={t.id} 
                    className="hover-bg-row"
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                    onClick={() => navigate(`/portal/tickets/${t.id}`)}
                  >
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {getStatusBadge(t.status)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)' }}>
                          {t.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>#{t.ticket_number || t.id.substring(0,6)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getPriorityIcon(t.priority)}
                        <span style={{ fontSize: 12, color: 'var(--color-text-main)' }}>{t.priority}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {new Date(t.created_at).toLocaleDateString('de-CH')}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {t.updated_at ? new Date(t.updated_at).toLocaleDateString('de-CH') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                       <MessageSquare size={14} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
