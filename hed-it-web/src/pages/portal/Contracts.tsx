import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  Globe, 
  Server,
  Download,
  AlertCircle,
  X,
  PenTool,
  Loader2
} from 'lucide-react';


import { useAuth } from '../../context/AuthContext';

interface Contract {
  id: string;
  contract_number: string;
  title: string;
  status: 'active' | 'expired' | 'pending';
  start_date: string;
  end_date?: string;
  total_amount: number;
  payment_cycle: string;
}

const Contracts = () => {
  const { token } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setContracts(data.data);
    } catch (err) {
      console.error('Failed to fetch contracts');
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleUpgrade = async () => {
    setIsSigning(true);
    // Simulate signature and API call
    setTimeout(() => {
      setIsSigning(false);
      setShowUpgradeModal(false);
      alert('Upgrade erfolgreich gebucht! Wir haben ein Ticket für die Einrichtung erstellt.');
    }, 2000);
  };

  const UPGRADES = [
    { id: 'newsletter', name: 'Newsletter System', price: '49.00 chf', desc: 'Professionelles E-Mail Marketing System inkl. Vorlagen.' },
    { id: 'seo', name: 'SEO Paket Pro', price: '120.00 chf', desc: 'Monatliche Optimierung für Top-Rankings bei Google.' },
    { id: 'security', name: 'Extended Security', price: '29.00 chf', desc: 'WAF & DDoS Schutz mit 24/7 Überwachung.' },
  ];

  return (
    <div className="portal-contracts">
      <header className="section-header">
        <div>
          <h1 className="premium-gradient">Ihre Verträge</h1>
          <p>Übersicht über alle aktiven Abonnements und Services.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpgradeModal(true)}>
          <Plus size={20} /> Service hinzufügen
        </button>
      </header>

      <div className="contracts-grid">
        {contracts.map((contract) => (
          <motion.div 
            key={contract.id} 
            className="contract-card"
            whileHover={{ translateY: -4 }}
          >
            <div className="contract-header">
              <div className="contract-icon">
                <FileText size={24} />
              </div>
              <span className={`status-badge ${contract.status}`}>{contract.status}</span>
            </div>
            <div className="contract-body">
              <h3>{contract.title}</h3>
              <p className="contract-num">{contract.contract_number}</p>
              
              <div className="contract-info">
                <div className="info-row">
                  <Calendar size={14} />
                  <span>Seit: {new Date(contract.start_date).toLocaleDateString()}</span>
                </div>
                <div className="info-row">
                  <Globe size={14} />
                  <span>Abrechnung: {contract.payment_cycle}</span>
                </div>
              </div>
            </div>
            <div className="contract-footer">
              <div className="price-tag">
                <span className="price">{contract.total_amount.toFixed(2)} chf</span>
                <span className="freq">/Monat</span>
              </div>
              <button className="btn-icon"><Download size={18} /></button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showUpgradeModal && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content upgrade-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="modal-header">
                <h3>Zusatz-Service buchen</h3>
                <button className="close-btn" onClick={() => setShowUpgradeModal(false)}><X size={20} /></button>
              </div>

              {!selectedUpgrade ? (
                <div className="upgrade-options">
                  <p>Wählen Sie eine Erweiterung für Ihr Projekt:</p>
                  {UPGRADES.map((up) => (
                    <div 
                      key={up.id} 
                      className="upgrade-item"
                      onClick={() => setSelectedUpgrade(up.id)}
                    >
                      <div className="up-info">
                        <h4>{up.name}</h4>
                        <p>{up.desc}</p>
                      </div>
                      <div className="up-price">{up.price}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="upgrade-confirm">
                  <div className="confirm-header">
                    <CheckCircle2 size={48} className="text-primary" />
                    <h4>Bestätigung erforderlich</h4>
                    <p>Durch die Bestätigung wird der Service "{UPGRADES.find(u => u.id === selectedUpgrade)?.name}" zu Ihren bestehenden Verträgen hinzugefügt.</p>
                  </div>
                  
                  <div className="signature-area">
                    <p className="label">Online-Signatur (Digitale Bestätigung)</p>
                    <div className="signature-pad">
                      <PenTool size={32} />
                      <p>Klicken Sie zum Bestätigen & Signieren</p>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button className="btn btn-outline" onClick={() => setSelectedUpgrade(null)}>Zurück</button>
                    <button className="btn btn-primary" onClick={handleUpgrade} disabled={isSigning}>
                      {isSigning ? <Loader2 className="animate-spin" /> : 'Jetzt kostenpflichtig buchen'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .portal-contracts { display: flex; flex-direction: column; gap: 40px; }
        .section-header { display: flex; justify-content: space-between; align-items: flex-end; }
        .section-header h1 { font-size: 32px; margin-bottom: 8px; }
        .section-header p { color: var(--text-muted); }

        .contracts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 32px; }
        .contract-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 32px; display: flex; flex-direction: column; gap: 24px; }
        
        .contract-header { display: flex; justify-content: space-between; align-items: center; }
        .contract-icon { width: 48px; height: 48px; background: rgba(0, 242, 255, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .status-badge { padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .status-badge.active { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .contract-body h3 { font-size: 20px; margin: 0; }
        .contract-num { font-size: 13px; color: var(--text-muted); margin: 4px 0 0; }
        .contract-info { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
        .info-row { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--text-muted); }

        .contract-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; border-top: 1px solid var(--border); }
        .price { font-size: 20px; font-weight: 900; color: white; }
        .freq { font-size: 12px; color: var(--text-muted); margin-left: 4px; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background: #08080a; border: 1px solid var(--border); border-radius: 32px; padding: 40px; max-width: 600px; width: 100%; position: relative; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .modal-header h3 { margin: 0; font-size: 24px; }
        .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; }

        .upgrade-item { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 16px; cursor: pointer; transition: all 0.3s; }
        .upgrade-item:hover { border-color: var(--primary); background: var(--primary-glow); }
        .up-info h4 { margin: 0; font-size: 16px; }
        .up-info p { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }
        .up-price { font-weight: 800; color: var(--primary); }

        .upgrade-confirm { text-align: center; }
        .confirm-header { margin-bottom: 32px; }
        .confirm-header h4 { font-size: 20px; margin: 16px 0 8px; }
        .confirm-header p { color: var(--text-muted); font-size: 14px; line-height: 1.6; }

        .signature-area { margin-bottom: 32px; text-align: left; }
        .signature-area .label { font-size: 13px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; }
        .signature-pad { background: rgba(0,0,0,0.3); border: 2px dashed var(--border); border-radius: 16px; height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--text-muted); cursor: pointer; }
        .signature-pad:hover { border-color: var(--primary); color: var(--primary); }

        .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .btn-icon { width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--border); background: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default Contracts;
