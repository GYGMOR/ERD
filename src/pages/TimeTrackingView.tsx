import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, FileText, Filter, ChevronDown, Check, Timer, DollarSign, X } from 'lucide-react';
import { getToken } from '../utils/auth';

const API = '/api';

interface TimeEntry {
  id: string;
  company_id?: string;
  company_name?: string;
  project_id?: string;
  project_name?: string;
  description: string;
  hours: number;
  hourly_rate: number;
  date: string;
  invoiced_at?: string;
  invoice_id?: string;
}

interface Company { id: string; name: string; }
interface Project { id: string; name: string; }

const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

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
    fetch(`${API}/companies`, { headers: authHeaders() }).then(r => r.json()).then(d => { if (d.success) setCompanies(d.data || d); });
    fetch(`${API}/projects`, { headers: authHeaders() }).then(r => r.json()).then(d => { if (d.success || Array.isArray(d)) setProjects(d.data || d); });
  }, []);

  const addEntry = async () => {
    if (!form.description || !form.hours) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/time-entries`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...form, hours: parseFloat(form.hours), hourly_rate: parseFloat(form.hourly_rate) || 0 }) });
      setForm({ company_id: '', project_id: '', description: '', hours: '', hourly_rate: '120', date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      load();
    } finally { setSubmitting(false); }
  };

  const deleteEntry = async (id: string) => {
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

  const totalHours = entries.filter(e => selectedIds.has(e.id)).reduce((s, e) => s + parseFloat(String(e.hours)), 0);
  const totalValue = entries.filter(e => selectedIds.has(e.id)).reduce((s, e) => s + parseFloat(String(e.hours)) * parseFloat(String(e.hourly_rate)), 0);
  const allHours = entries.reduce((s, e) => s + parseFloat(String(e.hours)), 0);
  const allValue = entries.reduce((s, e) => s + parseFloat(String(e.hours)) * parseFloat(String(e.hourly_rate)), 0);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === entries.filter(e => !e.invoiced_at).length) setSelectedIds(new Set());
    else setSelectedIds(new Set(entries.filter(e => !e.invoiced_at).map(e => e.id)));
  };

  const grouped = entries.reduce((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc; }, {} as Record<string, TimeEntry[]>);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center"><Clock className="text-blue-400" size={20} /></div>
          <div><h1 className="text-2xl font-bold text-white">Zeiterfassung</h1><p className="text-slate-400 text-sm">Stunden tracken & Rechnungen erstellen</p></div>
        </div>
        <div className="flex gap-3">
          {selectedIds.size > 0 && (
            <button onClick={() => setShowInvoiceModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-sm">
              <FileText size={16} /> Rechnung ({selectedIds.size} Einträge)
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold text-sm">
            <Plus size={16} /> Zeit erfassen
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Stunden gesamt', value: `${allHours.toFixed(1)}h`, icon: Timer, color: 'blue' },
          { label: 'Offener Wert', value: `CHF ${allValue.toFixed(2)}`, icon: DollarSign, color: 'amber' },
          { label: 'Ausgewählt (h)', value: `${totalHours.toFixed(1)}h`, icon: Check, color: 'emerald' },
          { label: 'Ausgewählt (CHF)', value: `CHF ${totalValue.toFixed(2)}`, icon: FileText, color: 'purple' },
        ].map(k => (
          <div key={k.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className="text-xl font-bold text-white">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select value={filterInvoiced} onChange={e => setFilterInvoiced(e.target.value as any)} className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm">
          <option value="all">Alle Einträge</option>
          <option value="open">Nicht verrechnet</option>
          <option value="invoiced">Verrechnet</option>
        </select>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm">
          <option value="">Alle Kunden</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {filterInvoiced === 'open' && entries.length > 0 && (
          <button onClick={toggleAll} className="text-sm text-blue-400 hover:text-blue-300">
            {selectedIds.size === entries.filter(e => !e.invoiced_at).length ? 'Auswahl aufheben' : 'Alle auswählen'}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-white">Neue Zeit erfassen</h3><button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 mb-1 block">Beschreibung *</label><input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm" placeholder="Was wurde gemacht?" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Stunden *</label><input type="number" value={form.hours} onChange={e => setForm(f => ({...f, hours: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm" placeholder="1.5" step="0.25" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Stundensatz (CHF)</label><input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({...f, hourly_rate: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Datum</label><input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Kunde</label>
              <select value={form.company_id} onChange={e => setForm(f => ({...f, company_id: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm">
                <option value="">Kein Kunde</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-400 mb-1 block">Projekt</label>
              <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm">
                <option value="">Kein Projekt</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addEntry} disabled={submitting || !form.description || !form.hours} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-semibold text-sm">
              {submitting ? 'Speichern...' : 'Eintrag speichern'}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-xl text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Entries grouped by date */}
      {loading ? <div className="text-slate-400 text-center py-12">Lädt...</div> : sortedDates.length === 0 ? (
        <div className="text-center py-16 text-slate-500">Keine Zeiteinträge gefunden</div>
      ) : sortedDates.map(date => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-400">
            <span>{new Date(date).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
            <span className="text-slate-600">—</span>
            <span>{grouped[date].reduce((s, e) => s + parseFloat(String(e.hours)), 0).toFixed(1)}h</span>
          </div>
          {grouped[date].map(entry => (
            <div key={entry.id} className={`bg-slate-800/60 border rounded-xl p-4 flex items-center gap-4 ${selectedIds.has(entry.id) ? 'border-blue-500/50' : 'border-slate-700/50'}`}>
              {!entry.invoiced_at && (
                <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleSelect(entry.id)} className="w-4 h-4 accent-blue-500" />
              )}
              {entry.invoiced_at && <div className="w-4 h-4 flex items-center justify-center"><Check size={14} className="text-emerald-400" /></div>}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{entry.description}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {entry.company_name && <span>{entry.company_name} · </span>}
                  {entry.project_name && <span>{entry.project_name} · </span>}
                  CHF {parseFloat(String(entry.hourly_rate)).toFixed(2)}/h
                  {entry.invoiced_at && <span className="ml-2 text-emerald-400">✓ Verrechnet</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">{parseFloat(String(entry.hours)).toFixed(1)}h</div>
                <div className="text-xs text-slate-400">CHF {(parseFloat(String(entry.hours)) * parseFloat(String(entry.hourly_rate))).toFixed(2)}</div>
              </div>
              {!entry.invoiced_at && (
                <button onClick={() => deleteEntry(entry.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Rechnung aus Zeiteinträgen</h3>
            <div className="bg-slate-800 rounded-xl p-4 text-sm space-y-1">
              <div className="flex justify-between text-slate-400"><span>Einträge</span><span className="text-white">{selectedIds.size}</span></div>
              <div className="flex justify-between text-slate-400"><span>Stunden</span><span className="text-white">{totalHours.toFixed(1)}h</span></div>
              <div className="flex justify-between font-bold text-white mt-2 pt-2 border-t border-slate-700"><span>Wert</span><span>CHF {totalValue.toFixed(2)}</span></div>
            </div>
            <div><label className="text-xs text-slate-400 mb-1 block">Rechnungstitel</label>
              <input value={invoiceTitle} onChange={e => setInvoiceTitle(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm" placeholder="Zeiterfassung Mai 2025" />
            </div>
            <div><label className="text-xs text-slate-400 mb-1 block">Stundensatz überschreiben (optional)</label>
              <input type="number" value={hourlyOverride} onChange={e => setHourlyOverride(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm" placeholder="z.B. 150" />
            </div>
            <div className="flex gap-3">
              <button onClick={generateInvoice} disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-xl font-semibold text-sm">
                {submitting ? 'Erstelle...' : 'Offerte erstellen'}
              </button>
              <button onClick={() => setShowInvoiceModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
