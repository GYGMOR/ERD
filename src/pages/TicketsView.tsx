import { Ticket } from 'lucide-react';
import { dummyTickets } from '../utils/dummyData';

export const TicketsView = () => (
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
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Ticket size={16} /> Neues Ticket
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
          {dummyTickets.map((ticket, i) => (
            <tr key={ticket.id} style={{ borderBottom: i === dummyTickets.length - 1 ? 'none' : '1px solid var(--color-border)', transition: 'background-color var(--transition-fast)', cursor: 'pointer' }} className="hover-bg-row">
              <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--color-primary)' }}>{ticket.id}</td>
              <td style={{ padding: '16px 24px', fontWeight: 500 }}>{ticket.title}</td>
              <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)' }}>{ticket.customer}</td>
              <td style={{ padding: '16px 24px' }}>
                <span className={'badge ' + (ticket.status === 'Kritisch' ? 'danger' : ticket.status === 'Offen' ? 'info' : ticket.status === 'Pending' ? 'warning' : ticket.status === 'Erledigt' ? 'success' : '')} style={{ backgroundColor: ticket.status === 'In Bearbeitung' ? 'rgba(0, 82, 204, 0.1)' : undefined, color: ticket.status === 'In Bearbeitung' ? 'var(--color-primary)' : undefined }}>
                  {ticket.status}
                </span>
              </td>
              <td style={{ padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {ticket.assignee !== 'Unassigned' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>
                      {ticket.assignee.charAt(0)}
                    </div>
                  )}
                  <span style={{ color: ticket.assignee === 'Unassigned' ? 'var(--color-text-muted)' : 'var(--color-text-main)', fontStyle: ticket.assignee === 'Unassigned' ? 'italic' : 'normal' }}>
                    {ticket.assignee}
                  </span>
                </div>
              </td>
              <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)', fontSize: '13px' }}>{ticket.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
