import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, FileText, Check, X, Timer } from 'lucide-react';
import { getToken } from '../utils/auth';

const API = '/api';
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

interface TimeEntry {
  id: string; company_id?: string; company_name?: string;
  project_id?: string; project_name?: string; description: string;
  hours: number; hourly_rate: number; date: string;
  invoiced_at?: string; invoice_id?: string;
}
interface Company { id: string; name: string; }
interface Project { id: string; name: string; }

const chf = (n: number) => n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TimeTrackingView() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterInvoiced, setFilterInvoiced] = useState<'all' | 'open' | 'invoiced'>('open');
  const [filterCompany, setFilterCompany] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [hourlyOverride, setHourlyOverride] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ company_id: '', project_id: '', description: '', hours: '', hourly_rate: '120', date: new Date().toISOString().split('T')[0] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterInvoiced === 'open') params.set('invoiced', 'false');
      if (filterInvoiced === 'invoiced') params.set('invoiced', 'true');
      if (filterCompany) params.set('company_id', filterCompany);
      const r = await fetch(`${API}/time-entries?${params}`, { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setEntries(d.data);
    } finally { setLoading(false); }
  }, [filterInvoiced, filterCompany]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch(`${API}/companies`, { headers: authHeaders() }).then(r => r.json()).then(d => setCompanies(d.data || d || []));
    fetch(`${API}/projects`, { headers: authHeaders() }).then(r => r.json()).then(d => setProjects(d.data || d || []));
  }, []);

  const addEntry = async () => {
    if (!form.description || !form.hours) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/time-entries`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...form, hours: parseFloat(form.hours), hourly_rate: parseFloat(form.hourly_rate) || 0 }) });
      setForm({ company_id: '', project_id: '', description: '', hours: '', hourly_rate: '120', date: new Date().toISOString().split('T')[0] });
      setShowForm(false); load();
    } finally { setSubmitting(false); }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return;
    await fetch(`${API}/time-entries/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  const generateInvoice = async () => {
    if (!selectedIds.size) return;
    const firstEntry = entries.find(e => selectedIds.has(e.id));
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/time-entries/to-invoice`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ company_id: firstEntry?.company_id, entry_ids: Array.from(selectedIds), title: invoiceTitle || 'Zeiterfassung', hourly_rate_override: hourlyOverride ? parseFloat(hourlyOverride) : undefined }),
      });
      const d = await r.json();
      if (d.success) { setShowInvoiceModal(false); setSelectedIds(new Set()); load(); }
    } finally { setSubmitting(false); }
  };

  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
  const toggleAll = () => {
    const open = entries.filter(e => !e.invoiced_at);
    if (selectedIds.size === open.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(open.map(e => e.id)));
  };

  const totalHours = entries.filter(e => selectedIds.has(e.id)).reduce((s, e) => s + parseFloat(String(e.hours)), 0);
  const totalValue = entries.filter(e => selectedIds.has(e.id)).reduce((s, e) => s + parseFloat(String(e.hours)) * parseFloat(String(e.hourly_rate)), 0);
  const allHours = entries.reduce((s, e) => s + parseFloat(String(e.hours)), 0);
  const allValue = entries.reduce((s, e) => s + parseFloat(String(e.hours)) * parseFloat(String(e.hourly_rate)), 0);

  const grouped = entries.reduce((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc; }, {} as Record<string, TimeEntry[]>);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: 13, boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Clock size={22} color="var(--color-primary)" /> Zeiterfassung
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '4px 0 0' }}>Stunden tracken & Rechnungen erstellen</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {selectedIds.size > 0 && (
            <button onClick={() => setShowInvoiceModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              <FileText size={15} /> Offerte ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Zeit erfassen
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Stunden gesamt', value: `${allHours.toFixed(1)}h`, color: 'var(--color-primary)' },
          { label: 'Offener Wert', value: `CHF ${chf(allValue)}`, color: '#f59e0b' },
          { label: 'Ausgewählt (h)', value: `${totalHours.toFixed(1)}h`, color: '#10b981' },
          { label: 'Ausgewählt (CHF)', value: `CHF ${chf(totalValue)}`, color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: 18, borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select value={filterInvoiced} onChange={e => setFilterInvoiced(e.target.value as any)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: 13, cursor: 'pointer' }}>
          <option value="all">Alle Einträge</option>
          <option value="open">Nicht verrechnet</option>
          <option value="invoiced">Verrechnet</option>
        </select>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: 13, cursor: 'pointer' }}>
          <option value="">Alle Kunden</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {filterInvoiced === 'open' && entries.length > 0 && (
          <button onClick={toggleAll} style={{ fontSize: 13, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            {selectedIds.size === entries.filter(e => !e.invoiced_at).length ? 'Auswahl aufheben' : 'Alle auswählen'}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Neue Zeit erfassen</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Beschreibung *</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} style={inputStyle} placeholder="Was wurde gemacht?" />
            </div>
            <div>
              <label style={labelStyle}>Stunden *</label>
              <input type="number" value={form.hours} onChange={e => setForm(f => ({...f, hours: e.target.value}))} style={inputStyle} placeholder="1.5" step="0.25" />
            </div>
            <div>
              <label style={labelStyle}>Stundensatz (CHF)</label>
              <input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({...f, hourly_rate: e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Datum</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Kunde</label>
              <select value={form.company_id} onChange={e => setForm(f => ({...f, company_id: e.target.value}))} style={inputStyle}>
                <option value="">Kein Kunde</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Projekt</label>
              <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} style={inputStyle}>
                <option value="">Kein Projekt</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={addEntry} disabled={submitting || !form.description || !form.hours} className="btn-primary">
              {submitting ? 'Speichern...' : 'Eintrag speichern'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Lädt...</div>
      ) : sortedDates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <Timer size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
          <div>Noch keine Zeiteinträge. Klicke auf «Zeit erfassen».</div>
        </div>
      ) : sortedDates.map(date => (
        <div key={date} style={{ marginBottom: 20 }}>
          {/* Date header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)' }}>
              {new Date(date).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {grouped[date].reduce((s, e) => s + parseFloat(String(e.hours)), 0).toFixed(1)}h · CHF {chf(grouped[date].reduce((s, e) => s + parseFloat(String(e.hours)) * parseFloat(String(e.hourly_rate)), 0))}
            </span>
          </div>

          {/* Entries */}
          {grouped[date].map(entry => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 6, borderRadius: 10, border: `1px solid ${selectedIds.has(entry.id) ? 'var(--color-primary)' : 'var(--color-border)'}`, background: selectedIds.has(entry.id) ? 'rgba(76,154,255,0.05)' : 'var(--color-surface)', transition: 'all 0.15s' }}>
              {!entry.invoiced_at ? (
                <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleSelect(entry.id)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
              ) : (
                <Check size={15} color="#10b981" />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {entry.company_name && <span>{entry.company_name}{entry.project_name ? ' · ' : ''}</span>}
                  {entry.project_name && <span>{entry.project_name} · </span>}
                  <span>CHF {chf(parseFloat(String(entry.hourly_rate)))}/h</span>
                  {entry.invoiced_at && <span style={{ color: '#10b981', marginLeft: 8 }}>✓ Verrechnet</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-main)' }}>{parseFloat(String(entry.hours)).toFixed(1)}h</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>CHF {chf(parseFloat(String(entry.hours)) * parseFloat(String(entry.hourly_rate)))}</div>
              </div>
              {!entry.invoiced_at && (
                <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ padding: 28, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>Offerte aus Zeiteinträgen</h3>
            <div style={{ background: 'var(--color-surface-hover)', borderRadius: 10, padding: 14, marginBottom: 18, fontSize: 13 }}>
              {[['Einträge', selectedIds.size], ['Stunden', `${totalHours.toFixed(1)}h`], ['Wert', `CHF ${chf(totalValue)}`]].map(([l, v]) => (
                <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{l}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Offerten-Titel</label>
              <input value={invoiceTitle} onChange={e => setInvoiceTitle(e.target.value)} style={inputStyle} placeholder="Zeiterfassung Mai 2025" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Stundensatz überschreiben (optional)</label>
              <input type="number" value={hourlyOverride} onChange={e => setHourlyOverride(e.target.value)} style={inputStyle} placeholder="z.B. 150" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generateInvoice} disabled={submitting} className="btn-primary" style={{ flex: 1 }}>
                {submitting ? 'Erstelle...' : 'Offerte erstellen'}
              </button>
              <button onClick={() => setShowInvoiceModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
