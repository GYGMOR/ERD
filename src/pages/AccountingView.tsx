import { useState, useEffect } from 'react';
import {
  Calculator, Plus, Search, ArrowUpRight, ArrowDownLeft, FileText,
  TrendingUp, CheckCircle2, AlertCircle, Clock, XCircle, Trash2,
  BarChart2, Globe, Megaphone, Laptop, Phone, Car, BookOpen,
  Building2, Package, Users, Shield, MoreHorizontal, Download,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { getToken } from '../utils/auth';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Entry {
  id: string; title: string; description?: string; entry_type: string;
  amount: string; currency: string; date: string; company_name?: string;
  invoice_number?: string; status?: string; due_date?: string;
  invoice_id?: string; category?: string; receipt_note?: string; created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { value: 'Hosting / Server',     icon: Globe,        color: '#3b82f6' },
  { value: 'Werbung / Marketing',  icon: Megaphone,    color: '#f59e0b' },
  { value: 'Software / Tools',     icon: Laptop,       color: '#8b5cf6' },
  { value: 'Telefon / Internet',   icon: Phone,        color: '#06b6d4' },
  { value: 'Fahrtkosten',          icon: Car,          color: '#10b981' },
  { value: 'Weiterbildung',        icon: BookOpen,     color: '#f97316' },
  { value: 'Büro / Miete',         icon: Building2,    color: '#64748b' },
  { value: 'Material / Hardware',  icon: Package,      color: '#ec4899' },
  { value: 'Fremdleistungen',      icon: Users,        color: '#14b8a6' },
  { value: 'Versicherungen',       icon: Shield,       color: '#6366f1' },
  { value: 'Sonstiges',            icon: MoreHorizontal, color: '#94a3b8' },
];

const STATUS_CFG: Record<string, { label: string; color: string; Icon: any }> = {
  paid:    { label: 'Bezahlt',    color: '#10b981', Icon: CheckCircle2 },
  open:    { label: 'Offen',      color: '#f59e0b', Icon: Clock },
  sent:    { label: 'Versendet',  color: '#3b82f6', Icon: Clock },
  overdue: { label: 'Überfällig', color: '#ef4444', Icon: AlertCircle },
  draft:   { label: 'Entwurf',    color: '#94a3b8', Icon: XCircle },
};

const TABS = ['Übersicht', 'Rechnungen', 'Ausgaben', 'MwSt', 'Berichte', 'Ziele', 'Audit'] as const;
type Tab = typeof TABS[number];

const fmt = (n: number) => n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Component ───────────────────────────────────────────────────────────────
export const AccountingView = () => {
  const token = getToken();
  const h = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [tab, setTab] = useState<Tab>('Übersicht');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [aging, setAging] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [mwst, setMwst] = useState<any>(null);
  const [mwstYear, setMwstYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [goalYear, setGoalYear] = useState(new Date().getFullYear());
  const [newGoalMonth, setNewGoalMonth] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [search, setSearch] = useState('');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expense, setExpense] = useState({ title: '', description: '', amount: '', category: 'Hosting / Server', date: new Date().toISOString().split('T')[0], receipt_note: '' });

  const fetchAll = async () => {
    setLoading(true);
    const [entriesRes, metricsRes, agingRes, forecastRes] = await Promise.all([
      fetch('/api/accounting', { headers: h }).then(r => r.json()),
      fetch('/api/finance/metrics', { headers: h }).then(r => r.json()),
      fetch('/api/accounting/aging', { headers: h }).then(r => r.json()),
      fetch('/api/accounting/forecast', { headers: h }).then(r => r.json()),
    ]);
    if (entriesRes.success) setEntries(entriesRes.data);
    if (metricsRes.success) setMetrics(metricsRes.data);
    if (agingRes.success) setAging(agingRes.data);
    if (forecastRes.success) setForecast(forecastRes.data);
    setLoading(false);
  };

  const fetchMwst = async (year: number) => {
    const r = await fetch(`/api/accounting/mwst?year=${year}`, { headers: h }).then(r => r.json());
    if (r.success) setMwst(r.data);
  };

  const fetchGoals = async (year: number) => {
    const r = await fetch(`/api/revenue-goals?year=${year}`, { headers: h }).then(r => r.json());
    if (r.success) setGoals(r.data);
  };

  const fetchAudit = async () => {
    const r = await fetch(`/api/audit-log?limit=50`, { headers: h }).then(r => r.json());
    if (r.success) setAuditLog(r.data);
  };

  const saveGoal = async () => {
    if (!newGoalAmount) return;
    setSavingGoal(true);
    await fetch('/api/revenue-goals', { method: 'POST', headers: h, body: JSON.stringify({ year: goalYear, month: newGoalMonth ? parseInt(newGoalMonth) : null, target_amount: parseFloat(newGoalAmount) }) });
    setSavingGoal(false); setNewGoalAmount(''); setNewGoalMonth('');
    fetchGoals(goalYear);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchMwst(mwstYear); }, [mwstYear]);
  useEffect(() => { fetchGoals(goalYear); }, [goalYear]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'Audit') fetchAudit(); }, [tab]);

  const markPaid = async (entry: Entry) => {
    if (!entry.invoice_id) return;
    setMarkingPaid(entry.invoice_id);
    const newStatus = entry.status === 'paid' ? 'open' : 'paid';
    const r = await fetch(`/api/invoices/${entry.invoice_id}/status`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: newStatus }) });
    const data = await r.json();
    if (data.success) setEntries(prev => prev.map(e => e.invoice_id === entry.invoice_id ? { ...e, status: newStatus } : e));
    setMarkingPaid(null);
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Buchung löschen?')) return;
    await fetch(`/api/accounting/${id}`, { method: 'DELETE', headers: h });
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/accounting', { method: 'POST', headers: h, body: JSON.stringify({ ...expense, entry_type: 'expense' }) });
    const data = await r.json();
    if (data.success) { setEntries(prev => [data.data, ...prev]); setShowExpenseModal(false); setExpense({ title: '', description: '', amount: '', category: 'Hosting / Server', date: new Date().toISOString().split('T')[0], receipt_note: '' }); }
  };

  const exportCSV = () => {
    const rows = [['Datum','Titel','Typ','Kategorie','Firma','Betrag CHF','Status']];
    entries.forEach(e => rows.push([e.date, e.title, e.entry_type, e.category || '', e.company_name || '', parseFloat(e.amount).toFixed(2), e.status || '']));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + csv);
    a.download = `buchhaltung-${new Date().getFullYear()}.csv`; a.click();
  };

  // Derived numbers
  const invoices = entries.filter(e => e.entry_type === 'invoice');
  const expenses = entries.filter(e => e.entry_type === 'expense');
  const paidRev = invoices.filter(e => e.status === 'paid').reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  const openRev = invoices.filter(e => e.status !== 'paid').reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  const overdueCount = invoices.filter(e => e.status === 'overdue').length;
  const expByCat = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((s, e) => s + parseFloat(e.amount || '0'), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const filteredInvoices = invoices.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || (e.company_name || '').toLowerCase().includes(search.toLowerCase()) || (e.invoice_number || '').toLowerCase().includes(search.toLowerCase()));
  const filteredExpenses = expenses.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || (e.category || '').toLowerCase().includes(search.toLowerCase()));

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Calculator size={22} color="var(--color-primary)" /> Finanzen & Buchhaltung
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '4px 0 0' }}>Rechnungen · Ausgaben · MwSt · Berichte</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 13 }}>
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setShowExpenseModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Ausgabe erfassen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {/* ── TAB: Übersicht ── */}
      {tab === 'Übersicht' && (
        <div>
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Umsatz (bezahlt)', value: `CHF ${fmt(paidRev)}`, color: '#10b981', sub: `${invoices.filter(e => e.status === 'paid').length} Rechnungen`, Icon: TrendingUp },
              { label: 'Ausstehend', value: `CHF ${fmt(openRev)}`, color: '#f59e0b', sub: `${invoices.filter(e => e.status !== 'paid').length} offen`, Icon: Clock },
              { label: 'Überfällig', value: String(overdueCount), color: overdueCount > 0 ? '#ef4444' : 'var(--color-text-main)', sub: overdueCount > 0 ? 'Sofort handeln!' : 'Alles gut ✓', Icon: AlertCircle },
              { label: 'Ausgaben', value: `CHF ${fmt(totalExp)}`, color: '#ef4444', sub: `${expenses.length} Buchungen`, Icon: ArrowDownLeft },
              { label: 'Gewinn (netto)', value: `CHF ${fmt(paidRev - totalExp)}`, color: paidRev - totalExp >= 0 ? '#10b981' : '#ef4444', sub: 'Einnahmen – Ausgaben', Icon: BarChart2 },
            ].map(kpi => (
              <div key={kpi.label} className="card" style={{ padding: 18, borderLeft: `3px solid ${kpi.color}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{kpi.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Umsatz nach Monat</h3>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics?.revenueByMonth || []}>
                    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="month" fontSize={11} stroke="var(--color-text-muted)" />
                    <YAxis fontSize={11} stroke="var(--color-text-muted)" />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v: any) => [`CHF ${fmt(parseFloat(v))}`, 'Umsatz']} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#g)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Forecast (3 Monate)</h3>
              {forecast?.forecast?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {forecast.forecast.map((f: any) => (
                    <div key={f.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{f.month}</span>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>CHF {fmt(f.total)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Total 3 Monate</span>
                    <span style={{ fontWeight: 800, color: '#10b981' }}>CHF {fmt(forecast.forecast.reduce((s: number, f: any) => s + f.total, 0))}</span>
                  </div>
                </div>
              ) : <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Keine aktiven Verträge gefunden.</div>}
            </div>
          </div>

          {/* Aging summary */}
          {aging && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Offene Forderungen – Alter</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {[
                  { label: 'Noch nicht fällig', total: aging.totals.current, color: '#10b981', count: aging.buckets.current.length },
                  { label: '1–30 Tage', total: aging.totals.d30, color: '#f59e0b', count: aging.buckets.d30.length },
                  { label: '31–60 Tage', total: aging.totals.d60, color: '#f97316', count: aging.buckets.d60.length },
                  { label: '61–90 Tage', total: aging.totals.d90, color: '#ef4444', count: aging.buckets.d90.length },
                  { label: '90+ Tage', total: aging.totals.d90plus, color: '#7f1d1d', count: aging.buckets.d90plus.length },
                ].map(b => (
                  <div key={b.label} style={{ textAlign: 'center', padding: 14, borderRadius: 8, background: 'var(--color-surface-hover)', borderTop: `3px solid ${b.color}` }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>{b.label}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: b.color }}>CHF {fmt(b.total)}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{b.count} Rechnung{b.count !== 1 ? 'en' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Rechnungen ── */}
      {tab === 'Rechnungen' && (
        <div>
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Suchen..." className="input-field" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Datum', 'Rechnung', 'Firma', 'Status', 'Mahnung', 'Fällig', 'Betrag', 'Aktion'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Betrag' || h === 'Aktion' ? 'right' : 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Lädt...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Keine Rechnungen.</td></tr>
                ) : filteredInvoices.map(inv => {
                  const s = STATUS_CFG[inv.status || 'open'] || STATUS_CFG.open;
                  const isOverdue = inv.status === 'overdue';
                  const mahnungLvl = (inv as any).mahnung_level || 0;
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)', background: isOverdue ? 'rgba(239,68,68,0.03)' : undefined }}>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{inv.date ? new Date(inv.date).toLocaleDateString('de-CH') : '–'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.title}</div>
                        {inv.invoice_number && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{inv.invoice_number}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-muted)' }}>{inv.company_name || '–'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: s.color, background: `${s.color}18`, padding: '3px 8px', borderRadius: 20 }}>
                          <s.Icon size={11} /> {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {mahnungLvl > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>Stufe {mahnungLvl}</span>
                        ) : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>–</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: isOverdue ? '#ef4444' : 'var(--color-text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('de-CH') : '–'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: 13, color: inv.status === 'paid' ? '#10b981' : isOverdue ? '#ef4444' : 'inherit' }}>
                        CHF {fmt(parseFloat(inv.amount))}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {inv.invoice_id && (
                          <button onClick={() => markPaid(inv)} disabled={markingPaid === inv.invoice_id}
                            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                              background: inv.status === 'paid' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                              color: inv.status === 'paid' ? '#ef4444' : '#10b981' }}>
                            {markingPaid === inv.invoice_id ? '...' : inv.status === 'paid' ? 'Offen' : 'Bezahlt ✓'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Ausgaben ── */}
      {tab === 'Ausgaben' && (
        <div>
          {/* Category summary */}
          {expByCat.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              {expByCat.map(cat => {
                const Icon = cat.icon;
                return (
                  <div key={cat.value} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: `${cat.color}18`, color: cat.color, borderRadius: 8, padding: 8, flexShrink: 0 }}><Icon size={18} /></div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{cat.value}</div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>CHF {fmt(cat.total)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginBottom: 14, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Ausgaben suchen..." className="input-field" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Datum', 'Titel', 'Kategorie', 'Notiz', 'Betrag', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Betrag' || h === '' ? 'right' : 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Lädt...</td></tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Keine Ausgaben erfasst. Klicke auf «Ausgabe erfassen».</td></tr>
                ) : filteredExpenses.map(exp => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
                  const Icon = cat.icon;
                  return (
                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{new Date(exp.date).toLocaleDateString('de-CH')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{exp.title}</div>
                        {exp.description && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{exp.description}</div>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: cat.color, background: `${cat.color}15`, padding: '3px 8px', borderRadius: 20 }}>
                          <Icon size={11} /> {cat.value}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-muted)' }}>{exp.receipt_note || '–'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>–CHF {fmt(parseFloat(exp.amount))}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button onClick={() => deleteEntry(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: MwSt ── */}
      {tab === 'MwSt' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontWeight: 600 }}>Jahr:</span>
            {[new Date().getFullYear() - 1, new Date().getFullYear()].map(y => (
              <button key={y} onClick={() => setMwstYear(y)}
                style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--color-border)', cursor: 'pointer', fontWeight: 700,
                  background: mwstYear === y ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: mwstYear === y ? '#fff' : 'var(--color-text-main)' }}>
                {y}
              </button>
            ))}
          </div>
          {mwst ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[1, 2, 3, 4].map(q => {
                const qData = mwst.quarters.find((r: any) => r.quarter === q);
                return (
                  <div key={q} className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--color-text-muted)' }}>Q{q} {mwstYear}</div>
                    {qData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: 'Bruttoumsatz', value: `CHF ${fmt(parseFloat(qData.brutto))}`, bold: false },
                          { label: 'Nettoumsatz (ohne MwSt)', value: `CHF ${fmt(parseFloat(qData.netto))}`, bold: false },
                          { label: 'MwSt 8.1% (abzuführen)', value: `CHF ${fmt(parseFloat(qData.mwst))}`, bold: true, color: '#3b82f6' },
                          { label: 'Anzahl Rechnungen', value: qData.count, bold: false },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                            <span style={{ fontWeight: row.bold ? 800 : 600, color: (row as any).color }}>{String(row.value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Keine bezahlten Rechnungen in Q{q}.</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color: 'var(--color-text-muted)' }}>Lädt...</div>}

          {mwst?.quarters?.length > 0 && (
            <div className="card" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Jahrestotal {mwstYear}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Bruttoumsatz', value: mwst.quarters.reduce((s: number, q: any) => s + parseFloat(q.brutto || 0), 0), color: 'inherit' },
                  { label: 'Nettoumsatz', value: mwst.quarters.reduce((s: number, q: any) => s + parseFloat(q.netto || 0), 0), color: 'inherit' },
                  { label: 'Total MwSt abzuführen', value: mwst.quarters.reduce((s: number, q: any) => s + parseFloat(q.mwst || 0), 0), color: '#3b82f6' },
                ].map(row => (
                  <div key={row.label} style={{ textAlign: 'center', padding: 14, background: 'var(--color-surface-hover)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>{row.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: row.color }}>CHF {fmt(row.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Berichte ── */}
      {tab === 'Berichte' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Aging detail */}
          {aging && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Offene Forderungen – Detail</h3>
              {(['d90plus', 'd90', 'd60', 'd30', 'current'] as const).map(bucket => {
                const labels: Record<string, string> = { current: 'Noch nicht fällig', d30: '1–30 Tage überfällig', d60: '31–60 Tage', d90: '61–90 Tage', d90plus: '90+ Tage – Kritisch' };
                const colors: Record<string, string> = { current: '#10b981', d30: '#f59e0b', d60: '#f97316', d90: '#ef4444', d90plus: '#7f1d1d' };
                const rows: any[] = aging.buckets[bucket];
                if (rows.length === 0) return null;
                return (
                  <div key={bucket} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors[bucket], marginBottom: 8, textTransform: 'uppercase' }}>{labels[bucket]} ({rows.length})</div>
                    {rows.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-surface-hover)', borderRadius: 6, marginBottom: 4 }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title || r.invoice_number}</span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>{r.company_name}</span>
                          {r.mahnung_level > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: '#ef4444', fontWeight: 700 }}>Mahnung Stufe {r.mahnung_level}</span>}
                        </div>
                        <div style={{ fontWeight: 800, color: colors[bucket] }}>CHF {fmt(parseFloat(r.amount))}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Jahresabschluss */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Jahresabschluss {new Date().getFullYear()}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { label: 'Einnahmen (bezahlt)', value: paidRev, color: '#10b981' },
                { label: 'Ausgaben', value: totalExp, color: '#ef4444' },
                { label: 'Gewinn vor Steuern', value: paidRev - totalExp, color: paidRev - totalExp >= 0 ? '#10b981' : '#ef4444' },
              ].map(r => (
                <div key={r.label} style={{ padding: 16, background: 'var(--color-surface-hover)', borderRadius: 8, textAlign: 'center', borderTop: `3px solid ${r.color}` }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>{r.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: r.color }}>CHF {fmt(r.value)}</div>
                </div>
              ))}
            </div>
            <button onClick={exportCSV} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 13 }}>
              <Download size={14} /> Als CSV exportieren (für Treuhänder)
            </button>
          </div>

          {/* Ausgaben nach Kategorie chart */}
          {expByCat.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Ausgaben nach Kategorie</h3>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expByCat} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="value" type="category" fontSize={11} width={130} stroke="var(--color-text-muted)" />
                    <Tooltip formatter={(v: any) => [`CHF ${fmt(parseFloat(v))}`, 'Betrag']} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {expByCat.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Expense Modal ── */}
      {/* ── TAB: Ziele ── */}
      {tab === 'Ziele' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Umsatzziele {goalYear}</h3>
            <select value={goalYear} onChange={e => setGoalYear(parseInt(e.target.value))} className="input-field" style={{ width: 100 }}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Add goal */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Monat (leer = Jahresziel)</label>
              <select value={newGoalMonth} onChange={e => setNewGoalMonth(e.target.value)} className="input-field" style={{ width: 140 }}>
                <option value="">Jahresziel</option>
                {['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Ziel CHF</label>
              <input type="number" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className="input-field" placeholder="z.B. 5000" style={{ width: 140 }} />
            </div>
            <button onClick={saveGoal} disabled={savingGoal || !newGoalAmount} className="btn-primary" style={{ height: 40 }}>
              {savingGoal ? 'Speichern...' : 'Ziel setzen'}
            </button>
          </div>

          {/* Goals list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 16 }}>
            {goals.map(g => {
              const monthLabel = g.month ? ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][g.month-1] : 'Jahresziel';
              const actual = g.month
                ? invoices.filter(inv => inv.status === 'paid' && new Date(inv.date).getMonth() + 1 === g.month && new Date(inv.date).getFullYear() === goalYear).reduce((s, e) => s + parseFloat(e.amount || '0'), 0)
                : paidRev;
              const pct = Math.min(100, Math.round((actual / parseFloat(g.target_amount)) * 100));
              const color = pct >= 100 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
              return (
                <div key={g.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>{monthLabel} {goalYear}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{pct}%</div>
                  <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, margin: '8px 0' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Ist: CHF {fmt(actual)}</span>
                    <span style={{ fontWeight: 600 }}>Ziel: CHF {fmt(parseFloat(g.target_amount))}</span>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && <div style={{ color: 'var(--color-text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>Noch keine Ziele gesetzt.</div>}
          </div>
        </div>
      )}

      {/* ── TAB: Audit ── */}
      {tab === 'Audit' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Aktivitäts-Protokoll</h3>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)' }}>
                  {['Zeitpunkt','Benutzer','Aktion','Ressource','Details'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLog.map((log, i) => (
                  <tr key={log.id} style={{ borderTop: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-hover)' }}>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(log.created_at).toLocaleString('de-CH', { day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' })}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>{log.user_email || '–'}</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{log.action}</span></td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>{log.resource_type}{log.resource_id ? ` #${log.resource_id.substring(0,8)}` : ''}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>{log.details ? JSON.stringify(log.details).substring(0,80) : '–'}</td>
                  </tr>
                ))}
                {auditLog.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Keine Einträge.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 520, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Ausgabe erfassen</h3>
            <form onSubmit={saveExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>Kategorie *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EXPENSE_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const sel = expense.category === cat.value;
                    return (
                      <button type="button" key={cat.value} onClick={() => setExpense({ ...expense, category: cat.value })}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: `1px solid ${sel ? cat.color : 'var(--color-border)'}`, background: sel ? `${cat.color}18` : 'var(--color-surface)', color: sel ? cat.color : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 400 }}>
                        <Icon size={12} /> {cat.value}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input className="input-field" placeholder="Titel / Beschreibung *" value={expense.title} onChange={e => setExpense({ ...expense, title: e.target.value })} required />
              <input className="input-field" placeholder="Details (optional)" value={expense.description} onChange={e => setExpense({ ...expense, description: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input-field" type="number" placeholder="Betrag CHF *" value={expense.amount} onChange={e => setExpense({ ...expense, amount: e.target.value })} required min="0" step="0.01" />
                <input className="input-field" type="date" value={expense.date} onChange={e => setExpense({ ...expense, date: e.target.value })} />
              </div>
              <input className="input-field" placeholder="Beleg-Notiz (z.B. Rechnungsnr., Lieferant)" value={expense.receipt_note} onChange={e => setExpense({ ...expense, receipt_note: e.target.value })} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer' }}>Abbrechen</button>
                <button type="submit" className="btn-primary">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
