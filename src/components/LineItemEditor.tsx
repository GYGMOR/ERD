import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Tag } from 'lucide-react';
import type { Product } from '../types/entities';
import { getToken } from '../utils/auth';

export interface LineItem {
  id?: string;
  product_id?: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total_price: number;
}

interface LineItemEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  discountPercent?: number;
}

export const LineItemEditor = ({ items, onChange, discountPercent = 0 }: LineItemEditorProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = getToken();
    fetch('/api/products', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(data => {
        setProducts(data.success ? data.data : []);
      })
      .catch(() => setProducts([]));
  }, []);

  const addItem = () => {
    onChange([...items, { title: '', quantity: 1, unit_price: 0, tax_rate: 8.1, total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<LineItem>) => {
    const newItems = items.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, ...updates };
      updated.total_price = updated.quantity * updated.unit_price;
      return updated;
    });
    onChange(newItems);
  };

  const selectProduct = (index: number, product: Product) => {
    updateItem(index, {
      product_id: product.id,
      title: product.name,
      unit_price: parseFloat(product.price || '0'),
      tax_rate: parseFloat(product.tax_rate || '8.1'),
      description: product.description || '',
    });
    setShowProductPicker(null);
    setSearch('');
  };

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmt = subtotal * (discountPercent / 100);
  const discountedSubtotal = subtotal - discountAmt;
  const tax = items.reduce((sum, item) => sum + (item.total_price * (item.tax_rate / 100)), 0);
  const taxOnDiscounted = tax * (1 - discountPercent / 100);
  const total = discountedSubtotal + taxOnDiscounted;

  return (
    <div className="line-item-editor">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 40px', gap: 12, marginBottom: 8, padding: '0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Position / Produkt</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Menge</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Preis (Netto)</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Total</span>
        <span />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 40px', gap: 12, alignItems: 'start' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Produkt oder Leistung..."
                  value={item.title}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                  onFocus={() => { setShowProductPicker(index); setSearch(''); }}
                />
                <button
                  type="button"
                  onClick={() => setShowProductPicker(showProductPicker === index ? null : index)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}
                >
                  <Search size={14} />
                </button>

                {showProductPicker === index && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4 }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Suchen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 12, padding: '6px 10px' }}
                        autoFocus
                      />
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {filteredProducts.length === 0 ? (
                        <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {products.length === 0 ? 'Keine Produkte im Katalog vorhanden.' : 'Kein Treffer.'}
                        </div>
                      ) : filteredProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => selectProduct(index, p)}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          className="hover-bg-row"
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                            {p.category && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Tag size={10} color="var(--color-text-muted)" />
                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.category}</span>
                              </div>
                            )}
                            {p.description && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.description}</div>}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-primary)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                            CHF {parseFloat(p.price || '0').toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                type="number"
                className="input-field"
                value={item.quantity}
                min="0.01"
                step="0.01"
                onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
              />
              <input
                type="number"
                className="input-field"
                value={item.unit_price}
                step="0.05"
                onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
              />
              <div style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, fontSize: 14 }}>
                {(item.total_price || 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                style={{ height: 40, background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', opacity: 0.6 }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', backgroundColor: 'var(--color-surface-hover)', border: '1px dashed var(--color-border)', borderRadius: 4, color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13, justifyContent: 'center' }}
        >
          <Plus size={16} /> Position hinzufügen
        </button>
      </div>

      <div style={{ marginTop: 24, padding: 20, backgroundColor: 'var(--color-surface-hover)', borderRadius: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Zwischensumme:</span>
            <span>CHF {subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {discountPercent > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
              <span>Rabatt ({discountPercent}%):</span>
              <span>−CHF {discountAmt.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>MwSt (8.1%):</span>
            <span>CHF {taxOnDiscounted.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid var(--color-border)', fontWeight: 800, fontSize: 16 }}>
            <span>Gesamt{discountPercent > 0 ? ' (nach Rabatt)' : ''}:</span>
            <span style={{ color: 'var(--color-primary)' }}>CHF {total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
