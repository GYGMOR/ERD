import { useState, useEffect } from 'react';
import { Calculator, Plus, Search, ArrowUpRight, ArrowDownLeft, FileText, PieChart, TrendingUp, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { getToken } from '../utils/auth';

interface Entry {
  id: string;
  title: string;
  description?: string;
  entry_type: 'income' | 'expense' | 'invoice';
  amount: string;
  currency: string;
  date: string;
  company_name?: string;
  invoice_number?: string;
  status?: string;
  due_date?: string;
  invoice_id?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paid:    { label: 'Bezahlt',    color: '#10b981', icon: CheckCircle2 },
  open:    { label: 'Offen',      color: '#f59e0b', icon: Clock },
  sent:    { label: 'Versendet',  color: '#3b82f6', icon: Clock },
  overdue: { label: 'Überfällig', color: '#ef4444', icon: AlertCircle },
  draft:   { label: 'Entwurf',    color: '#94a3b8', icon: XCircle },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  income:  { label: 'Einnahme',  color: '#10b981', icon: ArrowUpRight },
  expense: { label: 'Ausgabe',   color: '#ef4444', icon: ArrowDownLeft },
  invoice: { label: 'Rechnung',  color: '#3b82f6', icon: FileText },
};

export const AccountingView = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [newEntry, setNewEntry] = useState({ title: '', description: '', entry_type: 'income', amount: '', currency: 'CHF', date: new Date().toISOString().split('T')[0] });

  const token = getToken();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounting', { headers });
      const data = await res.json();
      if (data.success) setEntries(data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchEntries();
    fetch('/api/finance/metrics', { headers }).then(r => r.json()).then(d => { if (d.success) setMetrics(d.data); });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/accounting', { method: 'POST', headers, body: JSON.stringify(newEntry) });
    const data = await res.json();
    if (data.success) { setEntries([data.data, ...entries]); setShowModal(false); setNewEntry({ title: '', description: '', entry_type: 'income', amount: '', currency: 'CHF', date: new Date().toISOString().split('T')[0] }); }
  };

  const markPaid = async (entry: Entry) => {
    if (!entry.invoice_id) return;
    setMarkingPaid(entry.invoice_id);
    const newStatus = entry.status === 'paid' ? 'open' : 'paid';
    const res = await fetch(`/api/invoices/${entry.invoice_id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: newStatus }) });
    const data = await res.json();
    if (data.success) {
      setEntries(prev => prev.map(e => e.invoice_id === entry.invoice_id ? { ...e, status: newStatus } : e));
    }
    setMarkingPaid(null);
  };

  const filtered = entries.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || (e.company_name || '').toLowerCase().includes(search.toLowerCase()) || (e.invoice_number || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || (filterStatus === 'invoice' && e.entry_type === 'invoice') || (filterStatus !== 'invoice' && e.status === filterStatus);
    return matchSearch && matchStatus;
  });

  const invoices = entries.filter(e => e.entry_type === 'invoice');
  const paidRevenue = invoices.filter(e => e.status === 'paid').reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  const openRevenue = invoices.filter(e => e.status !== 'paid').reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  const overdueCount = invoices.filter(e => e.status === 'overdue').length;
  const manualIncome = entries.filter(e => e.entry_type === 'income').reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  const totalRevenue = paidRevenue + manualIncome;

  return (
    <div className="accounting-page" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Calculator size={24} color="var(--color-primary)" /> Finanzen & Buchhaltung
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>Rechnungen, Einnahmen und offene Beträge</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Buchung erfassen
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Umsatz (bezahlt)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>CHF {totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} /> Bezahlte Rechnungen + Einnahmen</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Ausstehend</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>CHF {openRevenue.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{invoices.filter(e => e.status !== 'paid').length} offene Rechnungen</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: overdueCount > 0 ? '3px solid #ef4444' : undefined }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: overdueCount > 0 ? '#ef4444' : 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Überfällig</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: overdueCount > 0 ? '#ef4444' : 'var(--color-text-main)' }}>{overdueCount}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Rechnungen nicht bezahlt</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Rechnungen Total</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{invoices.length}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><PieChart size={12} /> {invoices.filter(e => e.status === 'paid').length} bezahlt</div>
        </div>
      </div>

      {/* Chart */}
      {metrics?.revenueByMonth?.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Umsatzentwicklung (dieses Jahr)</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.revenueByMonth}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" fontSize={11} stroke="var(--color-text-muted)" />
                <YAxis fontSize={11} stroke="var(--color-text-muted)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v: any) => [`CHF ${parseFloat(v).toFixed(2)}`, 'Umsatz']} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Suchen..." className="input-field" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'invoice', 'open', 'paid', 'overdue'].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filterStatus === f ? 'var(--color-primary)' : 'var(--color-surface)', color: filterStatus === f ? '#fff' : 'var(--color-text-main)' }}>
              {f === 'all' ? 'Alle' : f === 'invoice' ? 'Rechnungen' : f === 'open' ? 'Offen' : f === 'paid' ? 'Bezahlt' : 'Überfällig'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>Datum</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>Titel / Nr.</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>Firma</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>Typ</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>Status</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>Fällig</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>Betrag</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Buchungen...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Keine Einträge gefunden.</td></tr>
            ) : filtered.map(item => {
              const TConf = TYPE_CONFIG[item.entry_type] || TYPE_CONFIG.income;
              const TIcon = TConf.icon;
              const SConf = item.status ? (STATUS_CONFIG[item.status] || STATUS_CONFIG.open) : null;
              const SIcon = SConf?.icon;
              const isOverdue = item.status === 'overdue';
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isOverdue ? 'rgba(239,68,68,0.03)' : undefined }}>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>{new Date(item.date).toLocaleDateString('de-CH')}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                    {item.invoice_number && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.invoice_number}</div>}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>{item.company_name || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: TConf.color }}>
                      <TIcon size={13} /> {TConf.label}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {SConf && SIcon ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: SConf.color }}>
                        <SIcon size={13} /> {SConf.label}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: isOverdue ? '#ef4444' : 'var(--color-text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                    {item.due_date ? new Date(item.due_date).toLocaleDateString('de-CH') : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: item.entry_type === 'expense' ? '#ef4444' : item.status === 'paid' ? '#10b981' : 'inherit' }}>
                    CHF {parseFloat(item.amount).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {item.entry_type === 'invoice' && item.invoice_id && (
                      <button
                        onClick={() => markPaid(item)}
                        disabled={markingPaid === item.invoice_id}
                        style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: item.status === 'paid' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: item.status === 'paid' ? '#ef4444' : '#10b981' }}>
                        {markingPaid === item.invoice_id ? '...' : item.status === 'paid' ? 'Als offen markieren' : 'Als bezahlt markieren'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Manual booking modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 480, padding: 28 }}>
            <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Buchung erfassen</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input-field" placeholder="Titel *" value={newEntry.title} onChange={e => setNewEntry({ ...newEntry, title: e.target.value })} required />
              <input className="input-field" placeholder="Beschreibung" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} />
              <select className="input-field" value={newEntry.entry_type} onChange={e => setNewEntry({ ...newEntry, entry_type: e.target.value })}>
                <option value="income">Einnahme</option>
                <option value="expense">Ausgabe</option>
              </select>
              <input className="input-field" type="number" placeholder="Betrag *" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} required min="0" step="0.01" />
              <input className="input-field" type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
