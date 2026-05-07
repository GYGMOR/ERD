import { useState, useEffect, useRef } from 'react';
import { Plus, Send, Eye, Trash2, FileText, CheckCircle2, XCircle, Clock, RefreshCw, PenTool, X } from 'lucide-react';
import { getToken, getTenantId } from '../utils/auth';
import type { Company } from '../types/entities';
import { LineItemEditor } from '../components/LineItemEditor';
import type { LineItem } from '../components/LineItemEditor';

interface Proposal {
  id: string;
  proposal_number: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  total: number;
  subtotal: number;
  tax_total: number;
  discount_percent: number;
  company_id: string;
  company_name?: string;
  notes?: string;
  valid_until?: string;
  items: LineItem[];
  created_at: string;
  signed_at?: string;
  contract_id?: string;
}

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  draft:     { label: 'Entwurf',    badge: 'warning' },
  sent:      { label: 'Gesendet',   badge: 'info' },
  accepted:  { label: 'Akzeptiert', badge: 'success' },
  rejected:  { label: 'Abgelehnt', badge: 'danger' },
  converted: { label: 'Signiert',   badge: 'success' },
};

const INTERVAL_LABEL: Record<string, string> = {
  one_time:  'Einmalig',
  monthly:   'Monatlich',
  quarterly: 'Quartalsweise',
  yearly:    'Jährlich',
};

// ─── New Proposal Modal ───────────────────────────────────────────────────────
const NewProposalModal = ({ onClose, onSave }: { onClose: () => void; onSave: () => void }) => {
  const [form, setForm] = useState({ title: '', company_id: '', notes: '', valid_until: '', discount_percent: '0' });
  const [items, setItems] = useState<LineItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendNow, setSendNow] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch('/api/companies', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json()).then(d => { if (d.success) setCompanies(d.data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { setError('Bitte mindestens eine Position hinzufügen.'); return; }
    setLoading(true); setError('');
    try {
      const token = getToken();
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...form, items, tenant_id: getTenantId() }),
      });
      const data = await res.json();
      if (data.success) {
        if (sendNow && data.data?.id) {
          await fetch(`/api/proposals/${data.data.id}/send`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        }
        onSave();
      } else setError(data.error || 'Fehler beim Erstellen.');
    } catch { setError('Netzwerkfehler.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
      <div className="card" style={{ width: '100%', maxWidth: 900, padding: 32, marginTop: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={22} color="var(--color-primary)" /> Neue Offerte erstellen
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={22} /></button>
        </div>
        {error && <div style={{ padding: 12, background: 'var(--color-danger)', color: 'white', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Titel *</label>
              <input required className="input-field" style={{ width: '100%' }} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="z.B. Unternehmenswebsite + Hosting" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Gültig bis</label>
              <input className="input-field" type="date" style={{ width: '100%' }} value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Firma *</label>
              <select required className="input-field" style={{ width: '100%' }} value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}>
                <option value="">-- Firma auswählen --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Rabatt (%)</label>
              <input className="input-field" type="number" min="0" max="100" style={{ width: '100%' }} value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Positionen</label>
            <LineItemEditor items={items} onChange={setItems} discountPercent={parseFloat(form.discount_percent) || 0} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Notizen / Bemerkungen</label>
            <textarea className="input-field" style={{ width: '100%', minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optionale Hinweise für den Kunden..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={sendNow}
                onChange={e => setSendNow(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <Send size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                Direkt an Kunden senden
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>(Status → Gesendet, erscheint im Portal)</span>
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Abbrechen</button>
              <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 24px', gap: 8, display: 'flex', alignItems: 'center' }}>
                {loading ? 'Erstellen...' : sendNow ? <><Send size={16} /> Erstellen & Senden</> : <><Plus size={16} /> Als Entwurf speichern</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const ProposalDetailModal = ({ proposal, onClose, onRefresh }: { proposal: Proposal; onClose: () => void; onRefresh: () => void }) => {
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const items: LineItem[] = typeof proposal.items === 'string' ? JSON.parse(proposal.items) : (proposal.items || []);
  const grouped = items.reduce((g: Record<string, LineItem[]>, item) => {
    const k = item.billing_interval || 'one_time';
    if (!g[k]) g[k] = [];
    g[k].push(item);
    return g;
  }, {});

  const handleSend = async () => {
    setSending(true);
    const token = getToken();
    await fetch(`/api/proposals/${proposal.id}/send`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    setSending(false);
    onRefresh();
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm(`Offerte "${proposal.title}" wirklich löschen?`)) return;
    setDeleting(true);
    const token = getToken();
    await fetch(`/api/proposals/${proposal.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    setDeleting(false);
    onRefresh();
    onClose();
  };

  const st = STATUS_MAP[proposal.status] || { label: proposal.status, badge: 'info' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
      <div className="card" style={{ width: '100%', maxWidth: 780, padding: 32, marginTop: 20, marginBottom: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{proposal.title}</h2>
              <span className={`badge ${st.badge}`}>{st.label}</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
              {proposal.proposal_number} · {proposal.company_name || '–'} · {new Date(proposal.created_at).toLocaleDateString('de-CH')}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={22} /></button>
        </div>

        {/* Items by billing group */}
        {Object.entries(grouped).map(([interval, grpItems]) => (
          <div key={interval} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{INTERVAL_LABEL[interval] || interval}</span>
              {interval !== 'one_time' && <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 20, fontWeight: 700 }}>WIEDERKEHREND</span>}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12 }}>Position</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12 }}>Menge</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12 }}>Preis</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {grpItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{item.description}</div>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>CHF {(item.unit_price || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>CHF {(item.total_price || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <div style={{ width: 280, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--color-text-muted)' }}>
              <span>Zwischensumme:</span><span>CHF {parseFloat(String(proposal.subtotal || 0)).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
            {parseFloat(String(proposal.discount_percent)) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a', fontWeight: 600 }}>
                <span>Rabatt ({proposal.discount_percent}%):</span>
                <span>−CHF {(parseFloat(String(proposal.subtotal)) * parseFloat(String(proposal.discount_percent)) / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: 'var(--color-text-muted)' }}>
              <span>MwSt:</span><span>CHF {parseFloat(String(proposal.tax_total || 0)).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid var(--color-border)', fontWeight: 800, fontSize: 18 }}>
              <span>Total:</span><span style={{ color: 'var(--color-primary)' }}>CHF {parseFloat(String(proposal.total || 0)).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {proposal.notes && (
          <div style={{ marginTop: 20, padding: 16, background: 'var(--color-surface-hover)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
            <strong>Notizen:</strong> {proposal.notes}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
          <button onClick={handleDelete} disabled={deleting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 6, border: '1px solid var(--color-danger)', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <Trash2 size={14} /> {deleting ? 'Löschen...' : 'Löschen'}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Schliessen</button>
            {proposal.status === 'draft' && (
              <button onClick={handleSend} disabled={sending} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
                <Send size={14} /> {sending ? 'Wird gesendet...' : 'An Kunde senden'}
              </button>
            )}
          </div>
        </div>

        {proposal.status === 'converted' && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8, color: '#16a34a', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> Offerte wurde signiert — Vertrag & Rechnungen wurden automatisch erstellt.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────
export const QuotesView = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Proposal | null>(null);

  const fetchProposals = async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch('/api/proposals', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (data.success) setProposals(data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProposals(); }, []);

  const counts = {
    draft: proposals.filter(p => p.status === 'draft').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    converted: proposals.filter(p => p.status === 'converted').length,
    total: parseFloat(proposals.filter(p => p.status === 'converted').reduce((s, p) => s + parseFloat(String(p.total || 0)), 0).toFixed(2)),
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Offerten</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Erstelle und verwalte Angebote für deine Kunden.</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowNew(true)}>
          <Plus size={16} /> Neue Offerte
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Entwürfe', value: counts.draft, color: 'var(--color-warning)', icon: <Clock size={18} /> },
          { label: 'Gesendet', value: counts.sent, color: 'var(--color-primary)', icon: <Send size={18} /> },
          { label: 'Signiert', value: counts.converted, color: 'var(--color-success)', icon: <CheckCircle2 size={18} /> },
          { label: 'Umsatz (signiert)', value: `CHF ${counts.total.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`, color: 'var(--color-success)', icon: <FileText size={18} /> },
        ].map(s => (
          <div key={s.label} className="card" style={{ borderTop: `3px solid ${s.color}`, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: s.color, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
              {['Nr.', 'Kunde & Titel', 'Total', 'Abrechnung', 'Status', 'Erstellt', ''].map(h => (
                <th key={h} style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Lade Offerten...</td></tr>
            ) : proposals.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Noch keine Offerten. Erstelle die erste!</td></tr>
            ) : proposals.map((p, i) => {
              const items: LineItem[] = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
              const intervals = [...new Set(items.map(it => it.billing_interval || 'one_time'))];
              const st = STATUS_MAP[p.status] || { label: p.status, badge: 'info' };
              return (
                <tr key={p.id} onClick={() => setSelected(p)} style={{ borderBottom: i < proposals.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }} className="hover-bg-row">
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-primary)', fontSize: 13 }}>{p.proposal_number}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600 }}>{p.company_name || '–'}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.title}</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 700 }}>CHF {parseFloat(String(p.total || 0)).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {intervals.map(iv => (
                        <span key={iv} style={{ fontSize: 10, padding: '2px 8px', background: iv === 'one_time' ? 'rgba(100,100,100,0.1)' : 'rgba(59,130,246,0.1)', color: iv === 'one_time' ? 'var(--color-text-muted)' : '#3b82f6', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {INTERVAL_LABEL[iv] || iv}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}><span className={`badge ${st.badge}`}>{st.label}</span></td>
                  <td style={{ padding: '14px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>{new Date(p.created_at).toLocaleDateString('de-CH')}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Eye size={14} /> Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNew && <NewProposalModal onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); fetchProposals(); }} />}
      {selected && <ProposalDetailModal proposal={selected} onClose={() => setSelected(null)} onRefresh={fetchProposals} />}
    </div>
  );
};
