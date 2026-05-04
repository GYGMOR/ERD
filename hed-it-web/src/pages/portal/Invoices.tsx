import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  status: 'paid' | 'unpaid' | 'overdue' | 'draft';
  total_amount: number;
  due_date: string;
  created_at: string;
}

const Invoices = () => {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setInvoices(data.data);
    } catch (err) {
      console.error('Failed to fetch invoices');
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="portal-invoices">
      <header className="section-header">
        <div>
          <h1 className="premium-gradient">Rechnungen & Zahlungen</h1>
          <p>Verfolgen Sie Ihre Zahlungen und laden Sie Belege herunter.</p>
        </div>
      </header>

      <div className="invoices-table-container">
        <table className="invoices-table">
          <thead>
            <tr>
              <th>Nummer</th>
              <th>Datum</th>
              <th>Fällig am</th>
              <th>Betrag</th>
              <th>Status</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="inv-num"><FileText size={16} /> {inv.invoice_number}</td>
                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                <td className="inv-amount">{inv.total_amount.toFixed(2)} chf</td>
                <td>
                  <span className={`status-pill ${inv.status}`}>
                    {inv.status === 'paid' ? <CheckCircle2 size={14} /> : inv.status === 'overdue' ? <AlertCircle size={14} /> : <Clock size={14} />}
                    {inv.status}
                  </span>
                </td>
                <td>
                  <button className="btn-icon-small"><Download size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="empty-state">Keine Rechnungen gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="billing-settings mt-12">
        <div className="section-title">
          <h3>Zahlungsmethode</h3>
        </div>
        <div className="payment-card">
          <div className="card-info">
            <div className="card-icon"><CreditCard size={24} /></div>
            <div>
              <p className="card-type">Kreditkarte (Standard)</p>
              <p className="card-num">•••• •••• •••• 4242</p>
            </div>
          </div>
          <button className="btn btn-outline">Ändern</button>
        </div>
      </div>

      <style>{`
        .portal-invoices { display: flex; flex-direction: column; gap: 40px; }
        .section-header h1 { font-size: 32px; margin-bottom: 8px; }
        .section-header p { color: var(--text-muted); }

        .invoices-table-container { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; }
        .invoices-table { width: 100%; border-collapse: collapse; text-align: left; }
        .invoices-table th { padding: 20px 24px; background: rgba(255,255,255,0.02); font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
        .invoices-table td { padding: 20px 24px; border-bottom: 1px solid var(--border); font-size: 14px; }
        .invoices-table tr:last-child td { border-bottom: none; }
        
        .inv-num { font-weight: 700; display: flex; align-items: center; gap: 10px; color: var(--primary); }
        .inv-amount { font-weight: 800; }
        
        .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .status-pill.paid { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-pill.unpaid { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-pill.overdue { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .empty-state { text-align: center; color: var(--text-muted); padding: 60px !important; }

        .payment-card { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; }
        .card-info { display: flex; align-items: center; gap: 20px; }
        .card-icon { width: 56px; height: 56px; background: rgba(255,255,255,0.03); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .card-type { font-weight: 700; margin: 0; }
        .card-num { font-size: 13px; color: var(--text-muted); margin: 4px 0 0; }

        .btn-icon-small { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; }
        .btn-icon-small:hover { color: var(--primary); border-color: var(--primary); }
      `}</style>
    </div>
  );
};

export default Invoices;
