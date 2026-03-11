import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Phone, Mail, MapPin, Ticket, FileText, Users, FileSignature, Plus } from 'lucide-react';
import { QuotePreviewModal } from '../components/QuotePreviewModal';
import { ContractPreviewModal } from '../components/ContractPreviewModal';
import { ContactPreviewModal } from '../components/ContactPreviewModal';
import type { Company, Ticket as TicketType, Invoice, Contact, Contract } from '../types/entities';

type Tab = 'tickets' | 'invoices' | 'contracts' | 'contacts';

const PRIORITY_CLS: Record<string, string> = { low: 'success', medium: 'info', high: 'warning', critical: 'danger' };
const PRIORITY_LABEL: Record<string, string> = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' };
const STATUS_LABEL: Record<string, string> = { new: 'Neu', open: 'Offen', in_progress: 'In Arbeit', pending: 'Wartend', resolved: 'Gelöst', closed: 'Geschlossen' };
const INV_CLS: Record<string, string> = { paid: 'success', sent: 'info', draft: 'warning', overdue: 'danger', cancelled: 'danger' };
const INV_LABEL: Record<string, string> = { paid: 'Bezahlt', sent: 'Gesendet', draft: 'Entwurf', overdue: 'Überfällig', cancelled: 'Storniert' };

const AVATAR_COLORS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-info)', '#8b5cf6', '#ec4899'];
const avatarColor = (s: string) => AVATAR_COLORS[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

interface CompanyDetailData {
  company: Company;
  tickets: TicketType[];
  invoices: Invoice[];
  contracts: Contract[];
  contacts: Contact[];
}

const TabButton = ({ active, icon: Icon, label, count, onClick }: {
  active: boolean; icon: React.ElementType; label: string; count: number; onClick: () => void
}) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
    color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontWeight: active ? 600 : 500, fontSize: 14, cursor: 'pointer',
    background: 'none', border: 'none', borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
    transition: 'all 0.15s',
  }}>
    <Icon size={15} /> {label}
    <span style={{ backgroundColor: active ? 'var(--color-primary)' : 'var(--color-border)', color: active ? 'white' : 'var(--color-text-muted)', borderRadius: 10, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{count}</span>
  </button>
);

export const CustomerDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CompanyDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const [selectedQuote, setSelectedQuote] = useState<Invoice | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/companies/${id}`);
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError('Firma nicht gefunden.');
      } catch { setError('Netzwerkfehler.'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--color-text-muted)' }}>Lade Firma...</div>;
  if (error || !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 16 }}>
      <p style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{error}</p>
      <button className="btn-primary" onClick={() => navigate('/customers')}>← Zurück</button>
    </div>
  );

  const { company, tickets, invoices, contracts = [], contacts = [] } = data;
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(String(i.amount || '0')), 0);
  const openTickets = tickets.filter(t => !['closed', 'resolved'].includes(t.status)).length;


  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Back */}
      <button onClick={() => navigate('/customers')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: 14, padding: 0 }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--color-primary)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
        <ArrowLeft size={16} /> Zurück zu Kunden
      </button>

      {/* Header Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          {/* Company Avatar */}
          <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 28, fontWeight: 800, flexShrink: 0 }}>
            {company.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{company.name}</h1>
              <span className={company.is_active ? 'badge success' : 'badge danger'}>{company.is_active ? 'Aktiv' : 'Inaktiv'}</span>
              {company.industry && <span className="badge info">{company.industry}</span>}
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {company.website && (
                <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontSize: 14, textDecoration: 'none' }}>
                  <Globe size={14} /> {company.website}
                </a>
              )}
              {company.phone && (
                <a href={`tel:${company.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 14, textDecoration: 'none' }}>
                  <Phone size={14} /> {company.phone}
                </a>
              )}
              {(company.city || company.country) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 14 }}>
                  <MapPin size={14} /> {[company.city, company.country].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
          {/* KPI mini-cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', minWidth: 80 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-warning)', lineHeight: 1 }}>{openTickets}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>Offene Tickets</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', minWidth: 80 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)', lineHeight: 1 }}>
                {totalRevenue > 0 ? (totalRevenue >= 1000 ? `${(totalRevenue / 1000).toFixed(1)}k` : totalRevenue.toFixed(0)) : '0'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>CHF Bezahlt</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', minWidth: 80 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{contacts.length}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>Kontakte</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: '0 4px' }}>
        <button className="btn-primary" onClick={() => navigate('/tickets?company=' + id)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 16px' }}>
          <Plus size={16} /> Neues Ticket
        </button>
        <button className="btn-secondary" onClick={() => navigate('/quotes?company=' + id)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 16px' }}>
          <Plus size={16} /> Neue Offerte
        </button>
        <button className="btn-secondary" onClick={() => navigate('/contracts?company=' + id)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 16px' }}>
          <Plus size={16} /> Neuer Vertrag
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
        <TabButton active={activeTab === 'tickets'} icon={Ticket} label="Tickets" count={tickets.length} onClick={() => setActiveTab('tickets')} />
        <TabButton active={activeTab === 'invoices'} icon={FileText} label="Rechnungen" count={invoices.length} onClick={() => setActiveTab('invoices')} />
        <TabButton active={activeTab === 'contracts'} icon={FileSignature} label="Verträge" count={contracts.length} onClick={() => setActiveTab('contracts')} />
        <TabButton active={activeTab === 'contacts'} icon={Users} label="Kontakte" count={contacts.length} onClick={() => setActiveTab('contacts')} />
      </div>

      {/* Tab: Tickets */}
      {activeTab === 'tickets' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tickets.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Keine Tickets für diese Firma.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Titel</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Priorität</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, i) => (
                  <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} style={{ borderBottom: i === tickets.length - 1 ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.1s' }} className="hover-bg-row">
                    <td style={{ padding: '12px 20px', fontWeight: 500, color: 'var(--color-primary)', fontSize: 13 }}>TKT-{t.id.substring(0, 6).toUpperCase()}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 500 }}>{t.title}</td>
                    <td style={{ padding: '12px 20px' }}><span className="badge info" style={{ fontSize: 12 }}>{STATUS_LABEL[t.status] || t.status}</span></td>
                    <td style={{ padding: '12px 20px' }}><span className={'badge ' + (PRIORITY_CLS[t.priority] || 'info')} style={{ fontSize: 12 }}>{PRIORITY_LABEL[t.priority] || t.priority}</span></td>
                    <td style={{ padding: '12px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>{new Date(t.created_at).toLocaleDateString('de-CH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {invoices.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Keine Rechnungen für diese Firma.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Nr.</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Titel</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Betrag</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Fälligkeit</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} 
                    onClick={() => setSelectedQuote(inv)}
                    style={{ borderBottom: i === invoices.length - 1 ? 'none' : '1px solid var(--color-border)', cursor: 'pointer' }}
                    className="hover-bg-row"
                  >
                    <td style={{ padding: '12px 20px', fontWeight: 500, color: 'var(--color-primary)', fontSize: 13 }}>INV-{inv.id.substring(0, 6)}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 500 }}>{inv.title}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 600 }}>CHF {parseFloat(String(inv.amount || '0')).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 20px' }}><span className={'badge ' + (INV_CLS[inv.status] || 'info')} style={{ fontSize: 12 }}>{INV_LABEL[inv.status] || inv.status}</span></td>
                    <td style={{ padding: '12px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('de-CH') : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Contracts */}
      {activeTab === 'contracts' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {contracts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Keine Verträge für diese Firma.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Nr.</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Titel</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Betrag</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Intervall</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Beginn</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c, i) => (
                  <tr key={c.id} 
                    onClick={() => setSelectedContract(c)}
                    style={{ borderBottom: i === contracts.length - 1 ? 'none' : '1px solid var(--color-border)', cursor: 'pointer' }}
                    className="hover-bg-row"
                  >
                    <td style={{ padding: '12px 20px', fontWeight: 500, color: 'var(--color-primary)', fontSize: 13 }}>{c.contract_number || 'VER-' + c.id.substring(0, 6)}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 500 }}>{c.title}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 600 }}>CHF {parseFloat(String(c.amount || '0')).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 20px' }}><span className="badge info" style={{ fontSize: 12, textTransform: 'capitalize' }}>{c.billing_interval}</span></td>
                    <td style={{ padding: '12px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>{c.start_date ? new Date(c.start_date).toLocaleDateString('de-CH') : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Contacts */}
      {activeTab === 'contacts' && (
        <div>
          {contacts.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>Keine Kontakte für diese Firma.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {contacts.map(c => (
                <div 
                  key={c.id} 
                  className="card hover-bg-row" 
                  onClick={() => setSelectedContact(c)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 16, transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: avatarColor(c.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                    {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.first_name} {c.last_name}</div>
                    {c.role && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{c.role}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                      {c.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Mail size={12} /> {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-muted)', fontSize: 12 }}>
                          <Phone size={12} /> {c.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedQuote && (
        <QuotePreviewModal 
          quote={selectedQuote} 
          onClose={() => setSelectedQuote(null)} 
        />
      )}

      {selectedContract && (
        <ContractPreviewModal 
          contract={selectedContract} 
          onClose={() => setSelectedContract(null)} 
        />
      )}

      {selectedContact && (
        <ContactPreviewModal 
          contact={selectedContact} 
          onClose={() => setSelectedContact(null)} 
        />
      )}
    </div>
  );
};
