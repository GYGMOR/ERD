import { useState, useEffect } from 'react';
import { Target, Plus, Search, MoreVertical, LayoutGrid, List, Phone, Mail, Globe, Filter, ArrowRight } from 'lucide-react';
import { getTenantId, getUser } from '../utils/auth';
import type { Lead } from '../types/entities';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'Neu', color: '#0052cc' },
  contacted: { label: 'Kontaktiert', color: '#00b8d9' },
  interested: { label: 'Interesse', color: '#ffab00' },
  offer_sent: { label: 'Offerte gesendet', color: '#6554c0' },
  won: { label: 'Gewonnen', color: '#36b37e' },
  lost: { label: 'Verloren', color: '#ff5630' },
};

export const LeadsView = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    status: 'new',
    company_name: '',
    contact_name: '',
    contact_email: '',
    industry: '',
  });

  const tenantId = getTenantId();
  const currentUser = getUser();

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success) setLeads(data.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.company_name) return;

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLead,
          tenant_id: tenantId,
          assigned_to: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads([data.data, ...leads]);
        setShowModal(false);
        setNewLead({ status: 'new', company_name: '', contact_name: '', contact_email: '', industry: '' });
      }
    } catch (err) {
      console.error('Error creating lead:', err);
    }
  };

  const updateLeadStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads(leads.map(l => (l.id === id ? { ...l, status: newStatus } : l)));
      }
    } catch (err) {
      console.error('Error updating lead status:', err);
    }
  };

  const filteredLeads = leads.filter(l =>
    l.company_name.toLowerCase().includes(search.toLowerCase()) ||
    l.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="leads-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={24} color="var(--color-primary)" /> Akquise / Leads
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Verwalten Sie Ihre Verkaufspipeline und potenzielle Kunden.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 2, border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setView('kanban')}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: view === 'kanban' ? 'var(--color-surface-hover)' : 'transparent', color: view === 'kanban' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: view === 'list' ? 'var(--color-surface-hover)' : 'transparent', color: view === 'list' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            >
              <List size={16} />
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Neuer Lead
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Leads suchen..."
            className="input-field"
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} /> Filter
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Leads...</div>
      ) : view === 'kanban' ? (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} style={{ minWidth: 280, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: config.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {config.label}
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, backgroundColor: 'var(--color-background)', padding: '1px 6px', borderRadius: 10 }}>
                    {filteredLeads.filter(l => l.status === status).length}
                  </span>
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredLeads.filter(l => l.status === status).map(lead => (
                  <div key={lead.id} className="card" style={{ padding: 12, cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</span>
                      <button style={{ color: 'var(--color-text-muted)' }}><MoreVertical size={14} /></button>
                    </div>
                    {lead.industry && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>{lead.industry}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8 }}>
                      <UserCheck size={12} color="var(--color-text-muted)" />
                      {lead.contact_name || 'Kein Kontakt'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {lead.contact_phone && <a href={`tel:${lead.contact_phone}`} style={{ color: 'var(--color-text-muted)' }}><Phone size={12} /></a>}
                        {lead.contact_email && <a href={`mailto:${lead.contact_email}`} style={{ color: 'var(--color-text-muted)' }}><Mail size={12} /></a>}
                        {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-muted)' }}><Globe size={12} /></a>}
                      </div>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--color-border)', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {lead.assigned_first_name ? lead.assigned_first_name.charAt(0) : '?'}
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
                      {status !== 'won' && (
                        <button
                          onClick={() => updateLeadStatus(lead.id, Object.keys(STATUS_CONFIG)[Object.keys(STATUS_CONFIG).indexOf(status) + 1])}
                          style={{ fontSize: 10, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
                        >
                          Weiter <ArrowRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} className="table-compact">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left' }}>Unternehmen</th>
                <th style={{ textAlign: 'left' }}>Industrie</th>
                <th style={{ textAlign: 'left' }}>Ansprechpartner</th>
                <th style={{ textAlign: 'left' }}>Status</th>
                <th style={{ textAlign: 'left' }}>Zuständig</th>
                <th style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover-bg-row">
                  <td style={{ fontWeight: 600 }}>{lead.company_name}</td>
                  <td>{lead.industry || '-'}</td>
                  <td>{lead.contact_name || '-'}</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: `${STATUS_CONFIG[lead.status].color}20`, color: STATUS_CONFIG[lead.status].color }}>
                      {STATUS_CONFIG[lead.status].label}
                    </span>
                  </td>
                  <td>{lead.assigned_first_name ? `${lead.assigned_first_name} ${lead.assigned_last_name}` : '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }}>Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Neuer Lead</h2>
            <form onSubmit={handleCreateLead}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="input-label">Unternehmen *</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    value={newLead.company_name}
                    onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Industrie</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newLead.industry}
                    onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="input-label">Ansprechpartner</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newLead.contact_name}
                    onChange={(e) => setNewLead({ ...newLead, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">E-Mail</label>
                  <input
                    type="email"
                    className="input-field"
                    value={newLead.contact_email}
                    onChange={(e) => setNewLead({ ...newLead, contact_email: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Notizen</label>
                <textarea
                  className="input-field"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Lead speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
