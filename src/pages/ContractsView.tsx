import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileSignature, Plus, Search, Filter, Calendar, Clock, ArrowRight, Eye, Calculator } from 'lucide-react';
import { getTenantId, getUser } from '../utils/auth';
import type { Contract, Company } from '../types/entities';
import { ContractPreviewModal } from '../components/ContractPreviewModal';
import { LineItemEditor } from '../components/LineItemEditor';
import type { LineItem } from '../components/LineItemEditor';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: '#666' },
  active: { label: 'Aktiv', color: '#36b37e' },
  expired: { label: 'Abgelaufen', color: '#ff5630' },
  cancelled: { label: 'Gekündigt', color: '#ffab00' },
  archived: { label: 'Archiviert', color: '#0052cc' },
};

export const ContractsView = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newCon, setNewCon] = useState<Partial<Contract>>({
    title: '',
    status: 'active',
    billing_interval: 'monthly',
  });
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const navigate = useNavigate();
  const tenantId = getTenantId();
  const currentUser = getUser();

  const fetchData = async () => {
    try {
      const [conRes, compRes] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/companies'),
      ]);
      const conData = await conRes.json();
      const compData = await compRes.json();
      if (conData.success) {
        setContracts(conData.data);
        const openId = searchParams.get('openContract');
        if (openId) {
          const c = conData.data.find((con: Contract) => con.id === openId);
          if (c) setSelectedContract(c);
          searchParams.delete('openContract');
          setSearchParams(searchParams, { replace: true });
        }
      }
      if (compData.success) setCompanies(compData.data);
    } catch (err) {
      console.error('Error fetching contracts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCon.title) return;

    try {
      const totalAmount = items.reduce((sum: number, item: LineItem) => sum + (item.total_price * (1 + item.tax_rate / 100)), 0);

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCon,
          tenant_id: tenantId,
          assigned_to: currentUser?.id,
          amount: totalAmount,
          items: items
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContracts([data.data, ...contracts]);
        setShowModal(false);
        setNewCon({ title: '', status: 'active', billing_interval: 'monthly' });
      }
    } catch (err) {
      console.error('Error creating contract:', err);
    }
  };

  const filtered = contracts.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="contracts-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSignature size={24} color="var(--color-primary)" /> Verträge
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Verwalten Sie Kundenverträge, Laufzeiten und Abrechnungsintervalle.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Neuer Vertrag
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Nach Verträgen oder Firmen suchen..."
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
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Verträge...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} className="table-compact">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left' }}>Vertrag / Titel</th>
                <th style={{ textAlign: 'left' }}>Firma</th>
                <th style={{ textAlign: 'left' }}>Status</th>
                <th style={{ textAlign: 'left' }}>Laufzeit</th>
                <th style={{ textAlign: 'left' }}>Betrag / Intervall</th>
                <th style={{ textAlign: 'center' }}>Vorschau</th>
                <th style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>Keine Verträge gefunden.</td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover-bg-row">
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.contract_number || '-'}</div>
                  </td>
                  <td>
                    <span 
                      onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.company_id}`); }}
                      style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {c.company_name || '-'}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: `${STATUS_CONFIG[c.status].color}20`, color: STATUS_CONFIG[c.status].color }}>
                      {STATUS_CONFIG[c.status].label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <Calendar size={12} color="var(--color-text-muted)" />
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('de-CH') : '-'}
                      <ArrowRight size={10} color="var(--color-text-muted)" />
                      {c.end_date ? new Date(c.end_date).toLocaleDateString('de-CH') : 'Unbefristet'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.amount ? `${parseFloat(c.amount as string).toFixed(2)} CHF` : '-'}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} /> {c.billing_interval === 'monthly' ? 'Monatlich' : c.billing_interval === 'yearly' ? 'Jährlich' : c.billing_interval}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedContract(c)}
                      className="btn-icon" 
                      title="Vorschau"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
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
          <div className="modal-content" style={{ maxWidth: 840, maxHeight: '95vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calculator color="var(--color-primary)" /> Neuer Vertrag
            </h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Vertragstitel *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={newCon.title}
                  onChange={(e) => setNewCon({ ...newCon, title: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="input-label">Kunde / Firma</label>
                  <select
                    className="input-field"
                    value={newCon.company_id ?? ''}
                    onChange={(e) => setNewCon({ ...newCon, company_id: e.target.value })}
                  >
                    <option value="">Wählen...</option>
                    {companies.map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Vertragstyp</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="z.B. Wartung, Support"
                    value={newCon.contract_type || ''}
                    onChange={(e) => setNewCon({ ...newCon, contract_type: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="input-label">Startdatum</label>
                  <input
                    type="date"
                    className="input-field"
                    onChange={(e) => setNewCon({ ...newCon, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Enddatum (leer = unbefristet)</label>
                  <input
                    type="date"
                    className="input-field"
                    onChange={(e) => setNewCon({ ...newCon, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 12, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Leistungen / Positionen</label>
                <LineItemEditor items={items} onChange={setItems} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label className="input-label">Abrechnungsintervall</label>
                  <select
                    className="input-field"
                    value={newCon.billing_interval || 'monthly'}
                    onChange={(e) => setNewCon({ ...newCon, billing_interval: e.target.value })}
                  >
                    <option value="monthly">Monatlich</option>
                    <option value="quarterly">Quartalsweise</option>
                    <option value="yearly">Jährlich</option>
                    <option value="one_time">Einmalig</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Vertrag erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedContract && (
        <ContractPreviewModal 
          contract={selectedContract} 
          onClose={() => setSelectedContract(null)} 
        />
      )}
    </div>
  );
};
