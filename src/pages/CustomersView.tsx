import { useState, useEffect } from 'react';
import { Search, Users } from 'lucide-react';
import { NewCustomerModal } from '../components/NewCustomerModal';
import type { Company } from '../types/entities';

export const CustomersView = () => {
  const [customers, setCustomers] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
  <div style={{ maxWidth: 1200, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Kunden & Mandanten</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>Zentrale Verwaltung aller Firmen und Kontakte.</p>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Kunde suchen..." style={{ padding: '8px 16px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: '14px', width: '250px' }} />
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowModal(true)}>
          <Users size={16} /> Neuer Kunde
        </button>
      </div>
    </div>

    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Firma</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Kontakt</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Jahresumsatz</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px', textTransform: 'uppercase', textAlign: 'right' }}>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Lade Kunden...</td></tr>
          ) : customers.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Keine Kunden gefunden.</td></tr>
          ) : customers.map((customer, i) => (
            <tr key={customer.id} style={{ borderBottom: i === customers.length - 1 ? 'none' : '1px solid var(--color-border)', transition: 'background-color var(--transition-fast)', cursor: 'pointer' }} className="hover-bg-row">
              <td style={{ padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '12px' }}>
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{customer.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>CUS-{customer.id.substring(0, 5)}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '16px 24px' }}>
                <div style={{ fontSize: '14px' }}>{customer.domain || 'Keine Domain'}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{customer.phone || 'Keine Telefonnummer'}</div>
              </td>
              <td style={{ padding: '16px 24px' }}>
                <span className={'badge ' + (customer.is_active ? 'success' : 'danger')}>
                  {customer.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </td>
              <td style={{ padding: '16px 24px', fontWeight: 500 }}>
                 -
              </td>
              <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                <button style={{ color: 'var(--color-primary)', fontWeight: 500, fontSize: '13px' }}>Details ansehen</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {showModal && (
      <NewCustomerModal 
        onClose={() => setShowModal(false)} 
        onSave={() => {
          setShowModal(false);
          fetchCustomers();
        }} 
      />
    )}
  </div>
  );
};
