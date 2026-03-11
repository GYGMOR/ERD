import { useState, useEffect } from 'react';
import { UserPlus, Mail, Phone, Building2 } from 'lucide-react';
import { NewContactModal } from '../components/NewContactModal';
import type { Contact } from '../types/entities';

const getInitials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

const AVATAR_COLORS = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-info)',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#06b6d4',
];

const getColor = (str: string) =>
  AVATAR_COLORS[
    str.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  ];

export const ContactsView = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      if (data.success) setContacts(data.data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Kontakte</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Alle Ansprechpartner und Kontakte deiner Kunden.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kontakt suchen..."
              style={{ padding: '8px 16px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: 14, width: 240, color: 'var(--color-text-main)', outline: 'none' }}
            />
          </div>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowModal(true)}>
            <UserPlus size={16} /> Neuer Kontakt
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Kontakte</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8 }}>{contacts.length}</h2>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Mit E-Mail</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8 }}>{contacts.filter(c => c.email).length}</h2>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--color-info)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Firmen verknüpft</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8 }}>{new Set(contacts.filter(c => c.company_id).map(c => c.company_id)).size}</h2>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Kontakt</th>
              <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Firma</th>
              <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Funktion</th>
              <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>E-Mail</th>
              <th style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Telefon</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Lade Kontakte...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.3 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span style={{ fontWeight: 500 }}>{search ? 'Kein Kontakt gefunden.' : 'Noch keine Kontakte. Erstelle deinen ersten!'}</span>
                    {!search && <button className="btn-primary" style={{ marginTop: 4 }} onClick={() => setShowModal(true)}>Kontakt erstellen</button>}
                  </div>
                </td>
              </tr>
            ) : filtered.map((c, i) => {
              const initials = getInitials(c.first_name, c.last_name);
              const color = getColor(c.id);
              return (
                <tr key={c.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }} className="hover-bg-row">
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</div>
                        {c.role && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{c.role}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {c.company_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 500, fontSize: 14 }}>
                        <Building2 size={14} />
                        {c.company_name}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>–</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {c.role
                      ? <span className="badge info" style={{ fontSize: 12 }}>{c.role}</span>
                      : <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>–</span>}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-main)', textDecoration: 'none', fontSize: 14 }}
                         onClick={e => e.stopPropagation()}>
                        <Mail size={14} style={{ color: 'var(--color-text-muted)' }} />
                        {c.email}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>–</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-main)', textDecoration: 'none', fontSize: 14 }}
                         onClick={e => e.stopPropagation()}>
                        <Phone size={14} style={{ color: 'var(--color-text-muted)' }} />
                        {c.phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <NewContactModal
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchContacts(); }}
        />
      )}
    </div>
  );
};
