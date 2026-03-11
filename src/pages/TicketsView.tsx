import { useState, useEffect } from 'react';
import { Ticket as TicketIcon } from 'lucide-react';
import { NewTicketModal } from '../components/NewTicketModal';
import type { Ticket } from '../types/entities';

export const TicketsView = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
  <div style={{ maxWidth: 1200, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Tickets</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>Alle Service-Anfragen und Incidents auf einen Blick.</p>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', fontWeight: 500 }}>
          Filter
        </button>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowModal(true)}>
          <TicketIcon size={16} /> Neues Ticket
        </button>
      </div>
    </div>

    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>ID</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Betreff</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Kunde</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Zuständig</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Letztes Update</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Lade Tickets...</td></tr>
          ) : tickets.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Keine Tickets gefunden.</td></tr>
          ) : tickets.map((ticket, i) => (
            <tr key={ticket.id} style={{ borderBottom: i === tickets.length - 1 ? 'none' : '1px solid var(--color-border)', transition: 'background-color var(--transition-fast)', cursor: 'pointer' }} className="hover-bg-row">
              <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--color-primary)' }}>TICKET-{ticket.id.substring(0,6)}</td>
              <td style={{ padding: '16px 24px', fontWeight: 500 }}>{ticket.title}</td>
              <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)' }}>{ticket.company_name || 'Kein Kunde'}</td>
              <td style={{ padding: '16px 24px' }}>
                <span className={'badge ' + (ticket.priority === 'critical' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'info')}>
                  {ticket.status}
                </span>
              </td>
              <td style={{ padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {ticket.assignee_id ? (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>
                      {ticket.assignee_first_name?.charAt(0) || 'U'}
                    </div>
                  ) : null}
                  <span style={{ color: ticket.assignee_id ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontStyle: ticket.assignee_id ? 'normal' : 'italic' }}>
                    {ticket.assignee_id ? `${ticket.assignee_first_name} ${ticket.assignee_last_name}` : 'Unzugewiesen'}
                  </span>
                </div>
              </td>
              <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)', fontSize: '13px' }}>{new Date(ticket.updated_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {showModal && (
      <NewTicketModal 
        onClose={() => setShowModal(false)} 
        onSave={() => {
          setShowModal(false);
          fetchTickets();
        }} 
      />
    )}
  </div>
  );
};
