import { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import type { Product } from '../types/entities';

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
}

export const LineItemEditor = ({ items, onChange }: LineItemEditorProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.success) setProducts(data.data);
      });
  }, []);

  const addItem = () => {
    const newItem: LineItem = {
      title: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 8.1,
      total_price: 0
    };
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const updateItem = (index: number, updates: Partial<LineItem>) => {
    const newItems = items.map((item, i) => {
      if (i === index) {
        const updated = { ...item, ...updates };
        updated.total_price = updated.quantity * updated.unit_price;
        return updated;
      }
      return item;
    });
    onChange(newItems);
  };

  const selectProduct = (index: number, product: Product) => {
    updateItem(index, {
      product_id: product.id,
      title: product.name,
      unit_price: parseFloat(product.price || '0'),
      tax_rate: parseFloat(product.tax_rate || '0'),
      description: product.description || ''
    });
    setShowProductPicker(null);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const tax = items.reduce((sum, item) => sum + (item.total_price * (item.tax_rate / 100)), 0);
  const total = subtotal + tax;

  return (
    <div className="line-item-editor">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 40px', gap: 12, marginBottom: 8, padding: '0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Position / Produkt</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Menge</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Preis (Netto)</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Total</span>
        <span></span>
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
                  onFocus={() => setShowProductPicker(index)}
                />
                <button 
                  type="button"
                  onClick={() => setShowProductPicker(showProductPicker === index ? null : index)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}
                >
                  <Search size={14} />
                </button>

                {showProductPicker === index && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                    {products.length === 0 ? (
                      <div style={{ padding: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>Keine Produkte im Katalog.</div>
                    ) : products.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => selectProduct(index, p)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        className="hover-bg-row"
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.category}</div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>CHF {parseFloat(p.price).toFixed(2)}</div>
                      </div>
                    ))}
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
        <div style={{ width: 250 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Zwischensumme:</span>
            <span>CHF {subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>MwSt (Mix):</span>
            <span>CHF {tax.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid var(--color-border)', fontWeight: 800, fontSize: 16 }}>
            <span>Gesamt:</span>
            <span style={{ color: 'var(--color-primary)' }}>CHF {total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
