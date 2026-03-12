import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket as TicketIcon, Search, X } from 'lucide-react';
import { NewTicketModal } from '../components/NewTicketModal';
import { getUser } from '../utils/auth';
import { dataService } from '../services/dataService';
import type { Ticket } from '../types/entities';

const PRIORITY_CLS: Record<string, string> = { low: 'success', medium: 'info', high: 'warning', critical: 'danger' };
const PRIORITY_LABEL: Record<string, string> = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' };
const STATUS_LABEL: Record<string, string> = { new: 'Neu', open: 'Offen', in_progress: 'In Arbeit', pending: 'Wartend', resolved: 'Gelöst', closed: 'Geschlossen' };
const STATUS_CLS: Record<string, string> = { new: 'info', open: 'warning', in_progress: 'info', pending: 'warning', resolved: 'success', closed: 'success' };

const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = { new: 'var(--color-primary)', open: 'var(--color-warning)', in_progress: 'var(--color-info)', pending: 'var(--color-text-muted)', resolved: 'var(--color-success)', closed: 'var(--color-success)' };
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: colors[status] || 'var(--color-border)', marginRight: 6 }} />;
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-main)',
  fontSize: 13,
  fontWeight: 500,
  outline: 'none',
  cursor: 'pointer',
};

export const TicketsView = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentView, setCurrentView] = useState<'meine' | 'neu' | 'alle'>('alle');

  const currentUser = getUser();
  const isAdminOrManager = currentUser && ['admin', 'manager'].includes(currentUser.role);

  useEffect(() => {
    // Default to 'meine' if employee/manager, 'alle' if admin
    if (currentUser?.role === 'admin') setCurrentView('alle');
    else setCurrentView('meine');
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await dataService.getTickets();
      if (res.success) {
        // Map foreign key objects to the fields expected by the UI
        const mappedData = (res.data || []).map((t: any) => ({
          ...t,
          company_name: t.company?.name || '',
          assignee_first_name: t.assignee?.first_name || '',
          assignee_last_name: t.assignee?.last_name || ''
        }));
        setTickets(mappedData);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const takeTicket = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      const res = await dataService.updateTicket(ticketId, { assignee_id: currentUser.id });
      if (res.success) {
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to take ticket', err);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter(t => {
      // Inbox Logic
      if (currentView === 'meine' && t.assignee_id !== currentUser?.id) return false;
      if (currentView === 'neu' && (t.assignee_id || !['new', 'open'].includes(t.status))) return false;
      // Admin 'alle' has no filter

      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterType && t.type !== filterType) return false;
      if (q && !(
        t.title.toLowerCase().includes(q) ||
        (t.company_name || '').toLowerCase().includes(q) ||
        (t.assignee_first_name || '').toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [tickets, search, filterStatus, filterPriority, filterType]);

  const hasFilters = search || filterStatus || filterPriority || filterType;
  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterType(''); };

  // Computed stats
  const openCount = tickets.filter(t => !['closed', 'resolved'].includes(t.status)).length;
  const criticalCount = tickets.filter(t => t.priority === 'critical' && !['closed', 'resolved'].includes(t.status)).length;
  const resolvedToday = tickets.filter(t => {
    const d = new Date(t.updated_at).toDateString();
    return d === new Date().toDateString() && ['resolved', 'closed'].includes(t.status);
  }).length;

  return (
  <div style={{ maxWidth: 1200, margin: '0 auto' }}>

    {/* Page Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Tickets</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Alle Service-Anfragen und Incidents auf einen Blick.</p>
      </div>
      <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowModal(true)}>
        <TicketIcon size={16} /> Neues Ticket
      </button>
    </div>

    {/* Inbox / View Selector */}
    <div style={{ display: 'flex', gap: 2, backgroundColor: 'var(--color-surface-hover)', padding: 4, borderRadius: 'var(--radius-lg)', marginBottom: 24, width: 'fit-content', border: '1px solid var(--color-border)' }}>
      <button 
        onClick={() => setCurrentView('meine')}
        style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: currentView === 'meine' ? 'var(--color-surface)' : 'transparent', color: currentView === 'meine' ? 'var(--color-primary)' : 'var(--color-text-muted)', boxShadow: currentView === 'meine' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
      >
        Meine Tickets
      </button>
      <button 
        onClick={() => setCurrentView('neu')}
        style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: currentView === 'neu' ? 'var(--color-surface)' : 'transparent', color: currentView === 'neu' ? 'var(--color-primary)' : 'var(--color-text-muted)', boxShadow: currentView === 'neu' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
      >
        Neue Tickets {tickets.filter(t => !t.assignee_id && ['new', 'open'].includes(t.status)).length > 0 && <span className="badge info" style={{ marginLeft: 6, padding: '1px 6px' }}>{tickets.filter(t => !t.assignee_id && ['new', 'open'].includes(t.status)).length}</span>}
      </button>
      {(isAdminOrManager) && (
        <button 
          onClick={() => setCurrentView('alle')}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: currentView === 'alle' ? 'var(--color-surface)' : 'transparent', color: currentView === 'alle' ? 'var(--color-primary)' : 'var(--color-text-muted)', boxShadow: currentView === 'alle' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
        >
          Alle Tickets
        </button>
      )}
    </div>

    {/* Stats mini-cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
      <div className="card" style={{ borderTop: '3px solid var(--color-warning)', padding: '16px 20px' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Offen (Gesamt)</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{openCount}</span>
          {criticalCount > 0 && <span className="badge danger">{criticalCount} kritisch</span>}
        </div>
      </div>
      <div className="card" style={{ borderTop: '3px solid var(--color-info)', padding: '16px 20px' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Meine Tickets</p>
        <span style={{ fontSize: '2rem', fontWeight: 700, marginTop: 6, display: 'block' }}>{tickets.filter(t => t.assignee_id === currentUser?.id).length}</span>
      </div>
      <div className="card" style={{ borderTop: '3px solid var(--color-success)', padding: '16px 20px' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Heute gelöst</p>
        <span style={{ fontSize: '2rem', fontWeight: 700, marginTop: 6, display: 'block', color: 'var(--color-success)' }}>{resolvedToday}</span>
      </div>
    </div>

    {/* Filters Bar */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1', minWidth: 200, maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Ticket suchen..."
          style={{ ...selectStyle, width: '100%', paddingLeft: 34, boxSizing: 'border-box' }}
        />
      </div>

      <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
        <option value="">Alle Status</option>
        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <select style={selectStyle} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
        <option value="">Alle Prioritäten</option>
        {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <select style={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
        <option value="">Alle Typen</option>
        <option value="support">Support</option>
        <option value="incident">Incident</option>
        <option value="change_request">Change Request</option>
        <option value="service_request">Service Request</option>
      </select>

      {hasFilters && (
        <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
          <X size={13} /> Filter löschen
        </button>
      )}

      <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
        {filtered.length} von {tickets.length} Tickets
      </span>
    </div>

    {/* Table */}
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>ID</th>
            <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Betreff</th>
            <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Kunde</th>
            <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Priorität</th>
            <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Zuständig</th>
            <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Erstellt</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Lade Tickets...</td></tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <TicketIcon size={40} style={{ opacity: 0.2 }} />
                  <span style={{ fontWeight: 500 }}>{hasFilters ? 'Keine Tickets für diese Filter.' : 'Noch keine Tickets vorhanden.'}</span>
                  {hasFilters && <button onClick={clearFilters} style={{ fontSize: 13, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Filter löschen</button>}
                </div>
              </td>
            </tr>
          ) : filtered.map((ticket, i) => (
            <tr
              key={ticket.id}
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
              className="hover-bg-row"
            >
              <td style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-primary)', fontSize: 13 }}>TKT-{ticket.id.substring(0, 6).toUpperCase()}</td>
              <td style={{ padding: '14px 24px', fontWeight: 500, maxWidth: 280 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{ticket.type}</div>
              </td>
              <td style={{ padding: '14px 24px', color: 'var(--color-text-muted)', fontSize: 14 }}>{ticket.company_name || '–'}</td>
              <td style={{ padding: '14px 24px' }}>
                <span className={'badge ' + (STATUS_CLS[ticket.status] || 'info')} style={{ fontSize: 12, display: 'flex', alignItems: 'center', width: 'fit-content' }}>
                  <StatusDot status={ticket.status} />
                  {STATUS_LABEL[ticket.status] || ticket.status}
                </span>
              </td>
              <td style={{ padding: '14px 24px' }}>
                <span className={'badge ' + (PRIORITY_CLS[ticket.priority] || 'info')} style={{ fontSize: 12 }}>
                  {PRIORITY_LABEL[ticket.priority] || ticket.priority}
                </span>
              </td>
              <td style={{ padding: '14px 24px', color: 'var(--color-text-muted)', fontSize: 14 }}>
                {ticket.assignee_first_name ? `${ticket.assignee_first_name} ${ticket.assignee_last_name}` : (
                  <button 
                    onClick={(e) => takeTicket(e, ticket.id)}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                  >
                    Übernehmen
                  </button>
                )}
              </td>
              <td style={{ padding: '14px 24px', color: 'var(--color-text-muted)', fontSize: 13 }}>
                {new Date(ticket.created_at).toLocaleDateString('de-CH')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {showModal && (
      <NewTicketModal
        onClose={() => setShowModal(false)}
        onSave={() => { setShowModal(false); fetchTickets(); }}
      />
    )}
  </div>
  );
};
