import { useState, useEffect } from 'react';
import { FileSignature, Calendar, ShieldCheck, Download, Info, ExternalLink, Clock, PenLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { SignaturePad } from '../../components/SignaturePad';
import { getToken } from '../../utils/auth';

export const Contracts = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingContract, setSigningContract] = useState<any | null>(null);
  const [signingStatus, setSigningStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [signedInvoiceNumber, setSignedInvoiceNumber] = useState('');
  const [cancellationSent, setCancellationSent] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await dataService.getPortalContracts();
      if (res.success) setContracts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch contracts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (signatureData: string) => {
    if (!signingContract) return;
    setSigningStatus('saving');
    try {
      const res = await fetch(`/api/portal/contracts/${signingContract.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ signatureData }),
      });
      const data = await res.json();
      if (data.success) {
        setSigningStatus('success');
        setSignedInvoiceNumber(data.invoiceNumber || '');
        fetchContracts();
      } else {
        setSigningStatus('error');
      }
    } catch {
      setSigningStatus('error');
    }
  };

  const handleUpgradeRequest = async (serviceName: string, price: number) => {
    try {
      const res = await fetch('/api/portal/contracts/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ serviceId: serviceName, serviceName, price, type: 'addon' }),
      });
      const data = await res.json();
      if (data.success) setUpgradeRequested(serviceName);
    } catch (err) {
      console.error('Failed to request upgrade', err);
    }
  };

  const handleCancellationRequest = async () => {
    try {
      const activeContract = contracts.find(c => c.source === 'contract' && c.status === 'active');
      const res = await fetch('/api/portal/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          title: 'Vertragskündigung / Vertragsanpassung',
          description: activeContract
            ? `Anfrage zur Kündigung oder Anpassung von Vertrag: ${activeContract.title}`
            : 'Anfrage zur Kündigung oder Anpassung eines bestehenden Vertrags.',
          priority: 'medium',
          type: 'cancellation',
        }),
      });
      const data = await res.json();
      if (data.success) setCancellationSent(true);
    } catch (err) {
      console.error('Failed to submit cancellation request', err);
    }
  };

  const handleDownloadPdf = async (contract: any) => {
    if (contract.source === 'file' && contract.path) {
      window.open(contract.path, '_blank');
      return;
    }
    const token = getToken();
    const res = await fetch(`/api/portal/contracts/${contract.id}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vertrag_${contract.contract_number || contract.id?.substring(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'active').toLowerCase();
    switch (s) {
      case 'active': return <span className="badge success">Aktiv</span>;
      case 'cancelled': return <span className="badge danger">Gekündigt</span>;
      case 'expired': return <span className="badge warning">Abgelaufen</span>;
      case 'pending_signature': return <span className="badge warning" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>Unterschrift ausstehend</span>;
      case 'pending': return <span className="badge info">Anstehend</span>;
      default: return <span className="badge info">{status}</span>;
    }
  };

  const billingLabel = (interval: string) => {
    switch (interval) {
      case 'monthly': return 'Monatlich';
      case 'yearly': return 'Jährlich';
      case 'quarterly': return 'Quartalsweise';
      case 'one_time': return 'Einmalig';
      default: return interval || '-';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Wartungsverträge & SLA
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>
          Übersicht Ihrer aktiven Serviceverträge und Lizenzvereinbarungen.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="card pulse" style={{ height: 120, backgroundColor: 'var(--color-surface-hover)', border: 'none' }} />
          ))
        ) : contracts.length === 0 ? (
          <div className="card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FileSignature size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
            <p style={{ margin: 0 }}>Keine aktiven Verträge gefunden.</p>
          </div>
        ) : (
          contracts.map((contract: any) => {
            const isPending = contract.status === 'pending_signature';
            const borderColor = isPending ? '#f59e0b' : contract.source === 'file' ? 'var(--color-danger)' : 'var(--color-primary)';

            return (
              <div
                key={contract.id}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', padding: 'var(--spacing-lg)',
                  gap: 24, flexWrap: 'wrap',
                  borderLeft: `4px solid ${borderColor}`,
                  ...(isPending ? { background: '#fffbeb' } : {}),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface-hover)',
                    color: isPending ? '#f59e0b' : contract.source === 'file' ? 'var(--color-danger)' : 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, border: '1px solid var(--color-border)',
                  }}>
                    <ShieldCheck size={28} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
                        {contract.name || contract.title}
                      </h3>
                      {contract.source === 'file' ? <span className="badge info">Dokument</span> : getStatusBadge(contract.status)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--color-text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} />
                        {contract.source === 'file' ? 'Hochgeladen:' : 'Start:'} {new Date(contract.date || contract.start_date).toLocaleDateString('de-CH')}
                      </span>
                      {contract.source === 'contract' && contract.billing_interval && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} /> {billingLabel(contract.billing_interval)}
                        </span>
                      )}
                    </div>
                    {isPending && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} /> Bitte prüfen und unterschreiben Sie diesen Vertrag
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 180, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {contract.source === 'file' ? 'Dateityp' : 'Betrag'}
                  </p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: contract.source === 'file' ? 'var(--color-text-main)' : 'var(--color-primary)' }}>
                    {contract.source === 'file' ? 'PDF Dokument' : `CHF ${parseFloat(contract.amount || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}`}
                  </p>
                  {contract.source === 'contract' && contract.billing_interval === 'monthly' && (
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--color-text-muted)' }}>
                      Abrechnung: 20. des Monats
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isPending && (
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 20px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => { setSigningContract(contract); setSigningStatus('idle'); }}
                    >
                      <PenLine size={14} /> Jetzt signieren
                    </button>
                  )}
                  <button
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => handleDownloadPdf(contract)}
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button className="btn-secondary" style={{ padding: 8, display: 'flex' }}>
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SLA Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--spacing-xl)' }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Info size={20} style={{ color: 'var(--color-primary)' }} /> Service Level Agreement (SLA)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Reaktionszeit (P1)', val: '1 Std.', color: '#ff5630' },
                { label: 'Reaktionszeit (P2)', val: '4 Std.', color: '#ffab00' },
                { label: 'Reaktionszeit (P3)', val: 'Nächster Werktag', color: '#0052cc' },
              ].map(sla => (
                <div key={sla.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{sla.label}</span>
                    <span style={{ color: sla.color }}>{sla.val}</span>
                  </div>
                  <div style={{ height: 4, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '100%', backgroundColor: sla.color, opacity: 0.3 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 20, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
                "Ihr SLA garantiert Ihnen bevorzugten Support und feste Lösungszeiten für kritische Systeme. Bei Fragen zu Ihrem Deckungsumfang wenden Sie sich bitte an Ihren Account Manager."
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-text-main)', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <FileSignature size={60} style={{ color: 'white', opacity: 0.05, marginBottom: 16 }} />
          <h4 style={{ margin: '0 0 8px', color: 'white', fontSize: 16, fontWeight: 700 }}>Vertrag kündigen</h4>
          <p style={{ margin: '0 0 24px', color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, lineHeight: 1.5 }}>
            Möchten Sie Ihren Vertrag anpassen oder kündigen?
          </p>
          {cancellationSent ? (
            <p style={{ color: '#86efac', fontSize: 12, fontWeight: 600, margin: 0 }}>✓ Anfrage wurde übermittelt. Wir melden uns bei Ihnen.</p>
          ) : (
            <button
              className="btn-secondary"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              onClick={handleCancellationRequest}
            >
              Anfrage stellen
            </button>
          )}
        </div>
      </div>

      {/* Upgrade / Zusatzservices */}
      <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Zusatzservices anfragen</h3>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--color-text-muted)' }}>Erweitern Sie Ihren bestehenden Servicevertrag um folgende Leistungen.</p>
        {upgradeRequested ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={20} color="#16a34a" />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#15803d' }}>Anfrage für "{upgradeRequested}" wurde übermittelt!</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#166534' }}>Wir prüfen Ihre Anfrage und melden uns in Kürze.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { name: 'Backup & Recovery', price: 29 },
              { name: 'Microsoft 365 Lizenz', price: 12.50 },
              { name: 'Extended Support (24/7)', price: 49 },
            ].map(svc => (
              <div key={svc.name} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{svc.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-primary)', fontWeight: 800 }}>CHF {svc.price.toFixed(2)} / Mt.</p>
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 12, fontWeight: 700, padding: '8px 16px' }}
                  onClick={() => handleUpgradeRequest(svc.name, svc.price)}
                >
                  Anfragen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signing Modal */}
      {signingContract && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: 560, width: '100%' }}>
            {signingStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <CheckCircle2 size={56} color="#16a34a" style={{ marginBottom: 16 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 12px' }}>
                  Vertrag erfolgreich signiert!
                </h2>
                <p style={{ color: '#475569', fontSize: 14, margin: '0 0 8px' }}>
                  Ihr Vertrag <strong>"{signingContract.title}"</strong> wurde digital signiert.
                </p>
                {signedInvoiceNumber && (
                  <p style={{ fontSize: 13, color: '#2563eb', fontWeight: 700, margin: '8px 0 24px' }}>
                    Rechnung {signedInvoiceNumber} wurde automatisch erstellt und per E-Mail zugestellt.
                  </p>
                )}
                <button className="btn-primary" onClick={() => { setSigningContract(null); setSigningStatus('idle'); }}>
                  Schliessen
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  Vertrag digital signieren
                </h2>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{signingContract.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    CHF {parseFloat(signingContract.amount || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })} · {billingLabel(signingContract.billing_interval)}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  Bitte zeichnen Sie Ihre Unterschrift im Feld unten. Mit der Bestätigung akzeptieren Sie die Vertragsbedingungen und eine Rechnung wird automatisch erstellt.
                </p>
                {signingStatus === 'error' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', marginBottom: 16, color: '#b91c1c', fontSize: 13 }}>
                    Fehler beim Signieren. Bitte versuchen Sie es erneut.
                  </div>
                )}
                <SignaturePad
                  onSave={handleSign}
                  onCancel={() => { setSigningContract(null); setSigningStatus('idle'); }}
                />
                {signingStatus === 'saving' && (
                  <div style={{ textAlign: 'center', marginTop: 12, color: '#64748b', fontSize: 13 }}>
                    Wird gespeichert...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
