import { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, Tag, Hash, Archive } from 'lucide-react';
import { getTenantId } from '../utils/auth';
import type { Product } from '../types/entities';

export const ProductsView = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newProd, setNewProd] = useState<Partial<Product>>({
    name: '',
    price: '0',
    tax_rate: '8.1',
    unit: 'Stück',
    is_recurring: false,
    is_active: true,
  });

  const tenantId = getTenantId();

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name) return;

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProd,
          tenant_id: tenantId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts([...products, data.data].sort((a, b) => a.name.localeCompare(b.name)));
        setShowModal(false);
        setNewProd({ name: '', price: '0', tax_rate: '8.1', unit: 'Stück', is_recurring: false, is_active: true });
      }
    } catch (err) {
      console.error('Error creating product:', err);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="products-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={24} color="var(--color-primary)" /> Produkte & Leistungen
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Zentraler Katalog aller Artikel, Lizenzen und Dienstleistungen.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Neues Produkt
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Nach Produkten, Kategorien oder SKU suchen..."
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
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Produkte...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
              Keine Produkte gefunden.
            </div>
          ) : filtered.map(p => (
            <div key={p.id} className="card" style={{ opacity: p.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</h3>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Hash size={10} /> {p.sku || 'Keine SKU'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Tag size={10} /> {p.category || 'Standard'}</span>
                    </div>
                  </div>
                </div>
                {!p.is_active && <Archive size={14} color="var(--color-text-muted)" />}
              </div>
              
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16, height: 36, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {p.description || 'Keine Beschreibung verfügbar.'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-main)' }}>
                    {parseFloat(p.price).toFixed(2)} <span style={{ fontSize: 12, fontWeight: 500 }}>CHF</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    pro {p.unit} ({p.tax_rate}% MwSt)
                  </div>
                </div>
                <div>
                  {p.is_recurring && (
                    <span className="badge info" style={{ fontSize: 9, padding: '1px 5px' }}>Wiederkehrend</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Neues Produkt / Leistung</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Produktname *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="input-label">SKU / Nummer</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newProd.sku || ''}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Kategorie</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newProd.category || ''}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="input-label">Preis (CHF) *</label>
                  <input
                    type="number"
                    step="0.05"
                    className="input-field"
                    required
                    value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">MwSt (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field"
                    value={newProd.tax_rate || ''}
                    onChange={(e) => setNewProd({ ...newProd, tax_rate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Einheit</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newProd.unit || ''}
                    onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Beschreibung</label>
                <textarea
                  className="input-field"
                  rows={2}
                  style={{ resize: 'vertical' }}
                  value={newProd.description || ''}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={newProd.is_recurring}
                    onChange={(e) => setNewProd({ ...newProd, is_recurring: e.target.checked })}
                  />
                  <span>Wiederkehrende Leistung</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={newProd.is_active}
                    onChange={(e) => setNewProd({ ...newProd, is_active: e.target.checked })}
                  />
                  <span>Aktiv</span>
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Produkt speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
