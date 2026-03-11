import { useState, useEffect } from 'react';
import { Mail, Plus, Search, Send, Users, BarChart3, Clock, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { getTenantId } from '../utils/auth';
import type { Newsletter } from '../types/entities';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: '#666' },
  scheduled: { label: 'Geplant', color: '#0052cc' },
  sending: { label: 'Wird gesendet', color: '#ffab00' },
  sent: { label: 'Versendet', color: '#36b37e' },
};

export const NewsletterView = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Partial<Newsletter>>({
    subject: '',
    status: 'draft',
    recipient_count: 0,
  });

  const tenantId = getTenantId();

  const fetchNewsletters = async () => {
    try {
      const res = await fetch('/api/newsletters');
      const data = await res.json();
      if (data.success) setNewsletters(data.data);
    } catch (err) {
      console.error('Error fetching newsletters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.subject) return;

    try {
      const res = await fetch('/api/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          tenant_id: tenantId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewsletters([data.data, ...newsletters]);
        setShowModal(false);
        setNewCampaign({ subject: '', status: 'draft', recipient_count: 0 });
      }
    } catch (err) {
      console.error('Error creating newsletter:', err);
    }
  };

  const filtered = newsletters.filter(n =>
    n.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="newsletter-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={24} color="var(--color-primary)" /> Newsletter & Marketing
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Erstellen und verwalten Sie Ihre E-Mail-Kampagnen und Abonnenten.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Neue Kampagne
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0, 82, 204, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0052cc' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Abonnenten</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>1,284</div>
          </div>
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(54, 179, 126, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#36b37e' }}>
            <Send size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Gesendet (MTD)</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>8,450</div>
          </div>
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255, 171, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffab00' }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Öffnungsrate</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>24.2%</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Nach Kampagnen suchen..."
            className="input-field"
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Kampagnen...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} className="table-compact">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left' }}>Kampagne / Betreff</th>
                <th style={{ textAlign: 'left' }}>Status</th>
                <th style={{ textAlign: 'left' }}>Empfänger</th>
                <th style={{ textAlign: 'left' }}>Datum</th>
                <th style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>Keine Kampagnen gefunden.</td>
                </tr>
              ) : filtered.map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover-bg-row">
                  <td>
                    <div style={{ fontWeight: 600 }}>{n.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>ID: {n.id.substring(0, 8)}...</div>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: `${STATUS_CONFIG[n.status].color}20`, color: STATUS_CONFIG[n.status].color }}>
                      {STATUS_CONFIG[n.status].label}
                    </span>
                  </td>
                  <td>{n.recipient_count || 0}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <Clock size={12} color="var(--color-text-muted)" />
                      {n.sent_at ? new Date(n.sent_at).toLocaleString('de-CH') : n.scheduled_at ? new Date(n.scheduled_at).toLocaleString('de-CH') : 'Nicht geplant'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn-secondary" style={{ padding: '6px' }} title="Bearbeiten"><Edit size={14} /></button>
                      <button className="btn-secondary" style={{ padding: '6px' }} title="Löschen"><Trash2 size={14} /></button>
                      <button className="btn-secondary" style={{ padding: '6px' }}><MoreVertical size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Neue E-Mail Kampagne</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">E-Mail Betreff *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="z.B. Unser Newsletter Q1 2024"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Inhalt (HTML / Text)</label>
                <textarea
                  className="input-field"
                  rows={6}
                  style={{ resize: 'vertical' }}
                  placeholder="Schreiben Sie hier Ihren Newsletter-Inhalt..."
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                />
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Tipp: Sie können Platzhalter wie {'{{name}}'} verwenden.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label className="input-label">Zielgruppe / Liste</label>
                  <select className="input-field">
                    <option value="all">Alle Abonnenten</option>
                    <option value="leads">Nur Leads</option>
                    <option value="customers">Bestehende Kunden</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Sende-Option</label>
                  <select className="input-field">
                    <option value="draft">Als Entwurf speichern</option>
                    <option value="now">Sofort senden</option>
                    <option value="schedule">Sendezeitpunkt planen</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Kampagne erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
