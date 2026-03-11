import { useState, useEffect } from 'react';
import { UserPlus, UserX, UserCheck } from 'lucide-react';
import { getTenantId } from '../utils/auth';

interface User {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ROLES: Record<string, { label: string; cls: string }> = {
  admin:    { label: 'Admin',     cls: 'danger' },
  manager:  { label: 'Manager',  cls: 'warning' },
  employee: { label: 'Mitarbeiter', cls: 'info' },
  client:   { label: 'Kunde',    cls: 'success' },
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-main)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

// ─── New User Modal ──────────────────────────────────────────────────────────
const NewUserModal = ({ onClose, onSave }: { onClose: () => void; onSave: () => void }) => {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role: 'employee', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const tenantId = getTenantId();
    if (!tenantId) { setError('Session abgelaufen.'); setLoading(false); return; }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tenant_id: tenantId }),
      });
      const data = await res.json();
      if (data.success) { onSave(); }
      else { setError(data.error || 'Fehler beim Erstellen.'); }
    } catch { setError('Netzwerkfehler.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Neuer Benutzer</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)' }}>✕</button>
        </div>
        {error && <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Vorname *</label>
              <input required style={inputStyle} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Max" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nachname *</label>
              <input required style={inputStyle} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Mustermann" />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>E-Mail *</label>
            <input required type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="max@firma.ch" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Rolle</label>
              <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Passwort *</label>
              <input required type="password" style={inputStyle} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 Zeichen" minLength={8} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 500, color: 'var(--color-text-main)' }}>Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 18px' }}>
              {loading ? 'Erstellen...' : 'Benutzer erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── User Management Page ────────────────────────────────────────────────────
export const UsersView = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleActive = async (user: User) => {
    setSaving(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const data = await res.json();
      if (data.success) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch { console.error('Failed to toggle user'); } finally { setSaving(null); }
  };

  const changeRole = async (user: User, role: string) => {
    setSaving(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u));
    } catch { console.error('Failed to change role'); } finally { setSaving(null); }
  };

  const initials = (u: User) => `${u.first_name.charAt(0)}${u.last_name.charAt(0)}`.toUpperCase();
  const COLORS = ['var(--color-primary)', 'var(--color-success)', '#8b5cf6', '#ec4899', 'var(--color-warning)', 'var(--color-info)'];
  const avatarColor = (id: string) => COLORS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

  const selectStyle: React.CSSProperties = {
    fontSize: 12, padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', fontWeight: 500, cursor: 'pointer', outline: 'none',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Benutzerverwaltung</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Benutzer verwalten, Rollen vergeben und Zugänge steuern.</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Neuer Benutzer
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 24 }}>
        {Object.entries(ROLES).map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{v.label}</p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 6 }}>{users.filter(u => u.role === k).length}</h2>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '13px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Benutzer</th>
              <th style={{ padding: '13px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>E-Mail</th>
              <th style={{ padding: '13px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Rolle</th>
              <th style={{ padding: '13px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '13px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Erstellt</th>
              <th style={{ padding: '13px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Lade Benutzer...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Keine Benutzer vorhanden.</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i === users.length - 1 ? 'none' : '1px solid var(--color-border)', opacity: saving === u.id ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                <td style={{ padding: '13px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: avatarColor(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {initials(u)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>ID: {u.id.substring(0, 8)}…</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '13px 20px', color: 'var(--color-text-muted)', fontSize: 14 }}>{u.email}</td>
                <td style={{ padding: '13px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={'badge ' + (ROLES[u.role]?.cls || 'info')} style={{ fontSize: 12 }}>{ROLES[u.role]?.label || u.role}</span>
                    <select style={selectStyle} value={u.role} onChange={e => changeRole(u, e.target.value)} disabled={saving === u.id}>
                      {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </td>
                <td style={{ padding: '13px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: u.is_active ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: u.is_active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                      {u.is_active ? 'Aktiv' : 'Deaktiviert'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {new Date(u.created_at).toLocaleDateString('de-CH')}
                </td>
                <td style={{ padding: '13px 20px' }}>
                  <button
                    onClick={() => toggleActive(u)}
                    disabled={saving === u.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius-md)', border: `1px solid ${u.is_active ? 'var(--color-danger)' : 'var(--color-success)'}`, backgroundColor: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: u.is_active ? 'var(--color-danger)' : 'var(--color-success)', transition: 'all 0.15s' }}
                  >
                    {u.is_active ? <><UserX size={13} /> Deaktivieren</> : <><UserCheck size={13} /> Aktivieren</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <NewUserModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchUsers(); }} />}
    </div>
  );
};
