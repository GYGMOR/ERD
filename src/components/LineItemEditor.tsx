import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Search, Package, ChevronDown, ChevronUp, X, Tag, RefreshCw } from 'lucide-react';
import type { Product } from '../types/entities';
import { getToken } from '../utils/auth';

export interface LineItem {
  id?: string;
  product_id?: string;
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  tax_rate: number;
  total_price: number;
  billing_interval?: string;
  is_recurring?: boolean;
}

const BILLING_INTERVALS = [
  { value: 'one_time',   label: 'Einmalig' },
  { value: 'monthly',   label: 'Monatlich' },
  { value: 'quarterly', label: 'Quartalsweise' },
  { value: 'yearly',    label: 'Jährlich' },
];

const INTERVAL_COLORS: Record<string, string> = {
  one_time:   '#64748b',
  monthly:    '#3b82f6',
  quarterly:  '#8b5cf6',
  yearly:     '#10b981',
};

interface LineItemEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  discountPercent?: number;
}

export const LineItemEditor = ({ items, onChange, discountPercent = 0 }: LineItemEditorProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getToken();
    fetch('/api/products', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => setProducts(d.success ? d.data.filter((p: Product) => !((p as any).is_folder)) : []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (showCatalog) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showCatalog]);

  const addBlankItem = () => {
    onChange([...items, { title: '', quantity: 1, unit: 'Stk.', unit_price: 0, tax_rate: 8.1, total_price: 0, billing_interval: 'one_time', is_recurring: false }]);
  };

  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const updateItem = (i: number, updates: Partial<LineItem>) => {
    onChange(items.map((item, idx) => {
      if (idx !== i) return item;
      const u = { ...item, ...updates };
      u.total_price = u.quantity * u.unit_price;
      return u;
    }));
  };

  const addFromProduct = (product: Product) => {
    const interval = (product as any).is_recurring
      ? ((product.unit === 'Monat' || product.unit === 'monatlich') ? 'monthly'
        : (product.unit === 'Jahr' || product.unit === 'jährlich') ? 'yearly' : 'monthly')
      : 'one_time';
    const newItem: LineItem = {
      product_id: product.id,
      title: product.name,
      description: product.description || '',
      quantity: 1,
      unit: product.unit || 'Stk.',
      unit_price: parseFloat(product.price || '0'),
      tax_rate: parseFloat(product.tax_rate || '8.1'),
      total_price: parseFloat(product.price || '0'),
      billing_interval: interval,
      is_recurring: !!(product as any).is_recurring,
    };
    onChange([...items, newItem]);
    setShowCatalog(false);
  };

  // Categories from products
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  // Totals
  const subtotal = items.reduce((s, i) => s + i.total_price, 0);
  const discountAmt = subtotal * (discountPercent / 100);
  const discountedSubtotal = subtotal - discountAmt;
  const tax = items.reduce((s, i) => s + i.total_price * ((i.tax_rate || 8.1) / 100), 0) * (1 - discountPercent / 100);
  const total = discountedSubtotal + tax;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: showCatalog ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>
      {/* ── Left: Line items ── */}
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 120px 100px 32px', gap: 10, flex: 1, paddingRight: 10 }}>
            {['Bezeichnung', 'Menge', 'Preis CHF', 'Abrechnung', 'Total', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
            ))}
          </div>
          <button type="button" onClick={() => setShowCatalog(!showCatalog)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: showCatalog ? 'var(--color-primary)' : 'var(--color-surface)', color: showCatalog ? '#fff' : 'var(--color-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Package size={13} /> Katalog {showCatalog ? <X size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0', border: '1px dashed var(--color-border)', borderRadius: 10, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Keine Positionen. Klicke auf «Katalog» oder «Position hinzufügen».
            </div>
          )}

          {items.map((item, i) => (
            <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden', background: 'var(--color-surface)' }}>
              {/* Main row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 120px 100px 32px', gap: 10, padding: '10px 12px', alignItems: 'center' }}>
                {/* Title */}
                <div>
                  <input type="text" value={item.title} onChange={e => updateItem(i, { title: e.target.value })}
                    style={inputStyle} placeholder="Bezeichnung..." />
                  {item.product_id && (
                    <div style={{ fontSize: 10, color: 'var(--color-primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Package size={9} /> Aus Katalog
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <input type="number" value={item.quantity} min="0.01" step="0.01"
                  onChange={e => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                  style={inputStyle} />

                {/* Price */}
                <input type="number" value={item.unit_price} step="0.05"
                  onChange={e => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })}
                  style={inputStyle} />

                {/* Billing interval */}
                <select value={item.billing_interval || 'one_time'}
                  onChange={e => updateItem(i, { billing_interval: e.target.value, is_recurring: e.target.value !== 'one_time' })}
                  style={{ ...inputStyle, color: INTERVAL_COLORS[item.billing_interval || 'one_time'], fontWeight: 600 }}>
                  {BILLING_INTERVALS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>

                {/* Total */}
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--color-text-main)' }}>
                  {(item.total_price || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 2 }}>
                  <button type="button" onClick={() => setExpandedItem(expandedItem === i ? null : i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 3 }}>
                    {expandedItem === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button type="button" onClick={() => removeItem(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 3, opacity: 0.7 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded row: description + unit */}
              {expandedItem === i && (
                <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, paddingTop: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Beschreibung (optional)</label>
                    <textarea value={item.description || ''} onChange={e => updateItem(i, { description: e.target.value })} rows={2}
                      style={{ ...inputStyle, resize: 'none', fontSize: 12 }} placeholder="Zusätzliche Details..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Einheit</label>
                    <select value={item.unit || 'Stk.'} onChange={e => updateItem(i, { unit: e.target.value })} style={inputStyle}>
                      {['Stk.', 'Stunden', 'Tage', 'Monat', 'Jahr', 'Pauschal', 'km', 'kg', 'Lizenz'].map(u => <option key={u}>{u}</option>)}
                    </select>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4, marginTop: 8 }}>MwSt %</label>
                    <input type="number" value={item.tax_rate} step="0.1" onChange={e => updateItem(i, { tax_rate: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add blank item */}
          <button type="button" onClick={addBlankItem}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, border: '1px dashed var(--color-border)', borderRadius: 10, background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <Plus size={16} /> Position manuell hinzufügen
          </button>
        </div>

        {/* Totals */}
        <div style={{ marginTop: 20, padding: 18, background: 'var(--color-surface-hover)', borderRadius: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 280 }}>
            {[
              { label: 'Zwischensumme', value: subtotal, show: true, color: 'var(--color-text-muted)' },
              { label: `Rabatt (${discountPercent}%)`, value: -discountAmt, show: discountPercent > 0, color: '#16a34a' },
              { label: 'MwSt (8.1%)', value: tax, show: true, color: 'var(--color-text-muted)' },
            ].filter(r => r.show).map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: r.color }}>
                <span>{r.label}</span>
                <span>{r.value < 0 ? '−' : ''}CHF {Math.abs(r.value).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid var(--color-border)', fontWeight: 800, fontSize: 16 }}>
              <span>Total CHF</span>
              <span style={{ color: 'var(--color-primary)' }}>{total.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Product Catalog Panel ── */}
      {showCatalog && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)', overflow: 'hidden', position: 'sticky', top: 80, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
          {/* Panel Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={14} color="var(--color-primary)" /> Produkt-Katalog
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{filtered.length} Artikel</span>
            </div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Suchen..." style={{ width: '100%', paddingLeft: 30, padding: '7px 10px 7px 28px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            {/* Category pills */}
            {categories.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setCatFilter('')}
                  style={{ padding: '3px 9px', borderRadius: 20, border: '1px solid var(--color-border)', background: !catFilter ? 'var(--color-primary)' : 'var(--color-surface)', color: !catFilter ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                  Alle
                </button>
                {categories.map(c => (
                  <button type="button" key={c} onClick={() => setCatFilter(catFilter === c ? '' : c)}
                    style={{ padding: '3px 9px', borderRadius: 20, border: '1px solid var(--color-border)', background: catFilter === c ? 'var(--color-primary)' : 'var(--color-surface)', color: catFilter === c ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)', fontSize: 13 }}>
                {products.length === 0
                  ? <><Package size={28} style={{ opacity: 0.2, marginBottom: 8 }} /><div>Noch keine Produkte im Katalog.<br /><small>Unter «Produkte» anlegen.</small></div></>
                  : 'Keine Übereinstimmung.'}
              </div>
            ) : filtered.map(p => (
              <div key={p.id} onClick={() => addFromProduct(p)}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    {p.category && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Tag size={9} color="var(--color-text-muted)" />
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.category}</span>
                      </div>
                    )}
                    {p.description && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      {p.unit && <span style={{ fontSize: 10, background: 'rgba(76,154,255,0.1)', color: 'var(--color-primary)', borderRadius: 5, padding: '1px 6px' }}>/{p.unit}</span>}
                      {(p as any).is_recurring && <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 5, padding: '1px 6px' }}>Wiederkehrend</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-primary)' }}>
                      CHF {parseFloat(p.price || '0').toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.tax_rate}% MwSt</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer tip */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Klick auf ein Produkt → wird direkt hinzugefügt
          </div>
        </div>
      )}
    </div>
  );
};
