import { useState, useEffect } from 'react';
import { Calculator, Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, FileText, Download, PieChart, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { getTenantId } from '../utils/auth';
import type { AccountingEntry } from '../types/entities';

interface TypeConfig { label: string; color: string; icon: React.ElementType }
const TYPE_CONFIG: Record<string, TypeConfig> = {
  income: { label: 'Einnahme', color: '#36b37e', icon: ArrowUpRight },
  expense: { label: 'Ausgabe', color: '#ff5630', icon: ArrowDownLeft },
  invoice: { label: 'Rechnung', color: '#0052cc', icon: FileText },
};

export const AccountingView = () => {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<AccountingEntry>>({
    title: '',
    entry_type: 'income',
    amount: '0',
    currency: 'CHF',
    date: new Date().toISOString().split('T')[0],
  });

  const tenantId = getTenantId();

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/accounting');
      const data = await res.json();
      if (data.success) setEntries(data.data);
    } catch (err) {
      console.error('Error fetching accounting entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.title || !newEntry.amount) return;

    try {
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEntry,
          tenant_id: tenantId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEntries([data.data, ...entries]);
        setShowModal(false);
        setNewEntry({ title: '', entry_type: 'income', amount: '0', currency: 'CHF', date: new Date().toISOString().split('T')[0] });
      }
    } catch (err) {
      console.error('Error creating entry:', err);
    }
  };

  const filtered = entries.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalIncome = entries.filter(e => e.entry_type === 'income').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const totalExpense = entries.filter(e => e.entry_type === 'expense').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const balance = totalIncome - totalExpense;

  // Mock data for charts
  const revenueData = [
    { name: 'Jan', income: 4500, expense: 3200 },
    { name: 'Feb', income: 5200, expense: 3100 },
    { name: 'Mar', income: 4800, expense: 3800 },
    { name: 'Apr', income: 6100, expense: 4200 },
    { name: 'Mai', income: 5900, expense: 3900 },
    { name: 'Jun', income: 7200, expense: 4500 },
  ];

  return (
    <div className="accounting-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calculator size={24} color="var(--color-primary)" /> Finanzen & Buchhaltung
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Verwalten Sie Ihre Einnahmen, Ausgaben und behalten Sie den Cashflow im Auge.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary">
             <Download size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Buchung erfassen
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Gesamtumsatz (MTD)</div>
            <div style={{ padding: 6, borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(54, 179, 126, 0.1)', color: '#36b37e' }}><TrendingUp size={16} /></div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>CHF {totalIncome.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#36b37e' }}>
            <span>+12.5%</span> <span style={{ color: 'var(--color-text-muted)' }}>vs. Vormonat</span>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ausgaben</div>
            <div style={{ padding: 6, borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255, 86, 48, 0.1)', color: '#ff5630' }}><ArrowDownLeft size={16} /></div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>CHF {totalExpense.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#ff5630' }}>
            <span>+4.2%</span> <span style={{ color: 'var(--color-text-muted)' }}>vs. Vormonat</span>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Gewinn / Saldo</div>
            <div style={{ padding: 6, borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0, 82, 204, 0.1)', color: 'var(--color-primary)' }}><PieChart size={16} /></div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: balance >= 0 ? 'var(--color-text-main)' : 'var(--color-danger)' }}>
            CHF {balance.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>Verfügbarer Cashflow</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Umsatzentwicklung</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#36b37e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#36b37e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--color-text-muted)" />
                <YAxis fontSize={11} stroke="var(--color-text-muted)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                />
                <Area type="monotone" dataKey="income" stroke="#36b37e" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name="Einnahmen" />
                <Area type="monotone" dataKey="expense" stroke="#ff5630" fill="transparent" strokeWidth={1} strokeDasharray="4 4" name="Ausgaben" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Ausgaben nach Typ</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Lizenzen', value: 1200 },
                { name: 'Hardware', value: 850 },
                { name: 'Marketing', value: 450 },
                { name: 'Sonstiges', value: 300 },
              ]} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={11} stroke="var(--color-text-muted)" width={80} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {[0,1,2,3].map((_val, index) => (
                    <Cell key={`cell-${index}`} fill={['#0052cc', '#6554c0', '#00b8d9', '#ffab00'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buchungen suchen..."
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
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Buchungen...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} className="table-compact">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left' }}>Datum</th>
                <th style={{ textAlign: 'left' }}>Titel / Referenz</th>
                <th style={{ textAlign: 'left' }}>Typ</th>
                <th style={{ textAlign: 'left' }}>Firma</th>
                <th style={{ textAlign: 'right' }}>Betrag</th>
                <th style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>Keine Buchungen gefunden.</td>
                </tr>
              ) : filtered.map(item => {
                const Config = TYPE_CONFIG[item.entry_type] || TYPE_CONFIG.income;
                const Icon = Config.icon;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover-bg-row">
                    <td>{new Date(item.date).toLocaleDateString('de-CH')}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.description || '-'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: Config.color, fontWeight: 600, fontSize: 12 }}>
                        <Icon size={14} /> {Config.label}
                      </div>
                    </td>
                    <td>{item.company_name || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: item.entry_type === 'expense' ? '#ff5630' : item.entry_type === 'income' ? '#36b37e' : 'inherit' }}>
                      {item.entry_type === 'expense' ? '-' : ''}{parseFloat(item.amount).toFixed(2)} {item.currency}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ padding: '4px 8px' }}>Details</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Neue Buchung erfassen</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Titel / Verwendungszweck *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="input-label">Buchungstyp</label>
                  <select
                    className="input-field"
                    value={newEntry.entry_type}
                    onChange={(e) => setNewEntry({ ...newEntry, entry_type: e.target.value })}
                  >
                    <option value="income">Einnahme</option>
                    <option value="expense">Ausgabe</option>
                    <option value="invoice">Rechnung (Eingang/Ausgang)</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Datum</label>
                  <input
                    type="date"
                    className="input-field"
                    required
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label className="input-label">Betrag (CHF) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    required
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Kunde / Firma (Optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Suche..."
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
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
