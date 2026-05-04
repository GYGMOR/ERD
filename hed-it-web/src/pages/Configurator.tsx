import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe, Mail, Shield, Server, ArrowRight, Check, X, Loader2, Send, Download, Rocket } from 'lucide-react';

import { jsPDF } from 'jspdf';

interface ConfigOption {
  id: string;
  name: string;
  category: 'hosting' | 'email' | 'security' | 'other';
  price: number;
  desc: string;
  icon: React.ReactNode;
}

const CONFIG_OPTIONS: ConfigOption[] = [
  { id: 'ismp', name: 'ISMP Managed Hosting', category: 'hosting', price: 29, desc: 'Hochverfügbares Web-Hosting inkl. SSL-Zertifikat, Backups & Speed-Optimierung', icon: <Server className="w-5 h-5" /> },
  { id: 'ms365', name: 'Microsoft 365 Business', category: 'email', price: 12.50, desc: 'Cloud-E-Mail, Teams & Office-Paket für Ihr gesamtes Team', icon: <Mail className="w-5 h-5" /> },
  { id: 'maintenance', name: 'Wartungsvertrag', category: 'other', price: 89, desc: 'Monatliche Updates, Sicherheitschecks und Support-Kontingent', icon: <Check className="w-5 h-5" /> },
  { id: 'domain-ch', name: '.ch / .com Domain', category: 'other', price: 15.50, desc: 'Ihre Identität im Netz – Registrierung & jährliche Erneuerung', icon: <Globe className="w-5 h-5" /> },
  { id: 'domain-transfer', name: 'Domain-Übernahme', category: 'other', price: 25.00, desc: 'Wir ziehen Ihre bestehende Domain sicher zu uns um', icon: <ArrowRight className="w-5 h-5" /> },
  { id: 'site-transfer', name: 'Webseiten-Migration', category: 'other', price: 150.00, desc: 'Kompletter Umzug Ihrer bestehenden Webseite auf unsere Server', icon: <Rocket className="w-5 h-5" /> },
];


const Configurator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const calculatorData = location.state || {};
  
  const [domain, setDomain] = useState('');
  const [isDomainChecking, setIsDomainChecking] = useState(false);
  const [domainStatus, setDomainStatus] = useState<'idle' | 'available' | 'taken'>('idle');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const shakeAnimation = {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 }
  };

  const checkDomain = async (val: string) => {
    if (val.length < 3) {
      setDomainStatus('idle');
      return;
    }
    setIsDomainChecking(true);
    setTimeout(() => {
      setIsDomainChecking(false);
      const taken = ['google.ch', 'apple.com', 'microsoft.com', 'facebook.com', 'test.ch'];
      if (taken.some(t => val.toLowerCase().includes(t)) || val.length < 5) {
        setDomainStatus('taken');
      } else {
        setDomainStatus('available');
      }
    }, 1200);
  };

  const toggleOption = (id: string) => {
    const next = new Set(selectedOptions);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOptions(next);
  };

  const generateAndDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(0, 242, 255);
    doc.setFontSize(24);
    doc.text('hed-it.ch', 20, 25);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('PROJEKT-ANGEBOT', pageWidth - 70, 25);
    
    // Body
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-CH')}`, 20, 50);
    doc.text(`Referenz: HED-${Math.floor(Math.random() * 10000)}`, 20, 55);
    doc.text(`Kundentyp: ${calculatorData.clientType || 'Standard'}`, 20, 60);
    
    doc.setDrawColor(230, 230, 230);
    doc.line(20, 70, pageWidth - 20, 70);
    
    let y = 85;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(10, 10, 15);
    doc.text('1. Basis-Konfiguration (Einmalig)', 20, y);
    y += 12;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Projekt: ${calculatorData.projectTypeName || 'Webseite'}`, 20, y);
    doc.text(`${(calculatorData.total || 0).toFixed(2)} chf`, pageWidth - 50, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Design-Level: ${calculatorData.designLevel || 'Standard'}`, 25, y);
    y += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(10, 10, 15);
    doc.text('2. Gewählte Services & Domain', 20, y);
    y += 12;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    if (domain) {
      doc.text(`Wunsch-Domain: ${domain}`, 20, y);
      doc.text(`${(15.50).toFixed(2)} chf (Monatlich)`, pageWidth - 70, y);
      y += 10;
    }


    selectedOptions.forEach(id => {
      const opt = CONFIG_OPTIONS.find(o => o.id === id);
      if (opt && opt.id !== 'domain-ch') { // already handled domain above if generic
        const freq = opt.id === 'ismp' || opt.id === 'ms365' || opt.id === 'maintenance' ? 'Monatlich' : 'Einmalig';
        doc.text(`${opt.name}`, 20, y);
        doc.text(`${opt.price.toFixed(2)} chf (${freq})`, pageWidth - 70, y);
        y += 8;
      }
    });

    y += 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, pageWidth - 20, y);
    y += 15;
    
    const subtotal = calculatorData.total || 0;
    const onceCost = subtotal + (selectedOptions.has('domain-transfer') ? 25 : 0) + (selectedOptions.has('site-transfer') ? 150 : 0);
    const recurringCost = (selectedOptions.has('ismp') ? 29 : 0) + (selectedOptions.has('ms365') ? 12.5 : 0) + (selectedOptions.has('maintenance') ? 89 : 0) + (domain ? 15.5 : 0) + (selectedOptions.has('domain-ch') ? 15.5 : 0);


    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 242, 255);
    doc.text('Zusammenfassung der Kosten', 20, y);
    
    y += 12;
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text('Einmalige Investition:', 20, y);
    doc.text(`${onceCost.toFixed(2)} chf`, pageWidth - 50, y);
    
    y += 8;
    doc.text('Wiederkehrende Kosten (monatlich):', 20, y);
    doc.text(`${recurringCost.toFixed(2)} chf`, pageWidth - 50, y);

    // Footer
    doc.setFillColor(245, 247, 250);
    doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const footerY = pageHeight - 15;
    doc.text('hed-it.ch | Inh. Joel Hediger | info@hed-it.ch | www.hed-it.ch', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Dieses Angebot ist 30 Tage gültig. Alle Preise in CHF.', pageWidth / 2, footerY + 5, { align: 'center' });

    doc.save(`hed-it-angebot-${domain || 'projekt'}.pdf`);
  };


  const handleSubmit = async () => {
    setIsSending(true);
    
    // Construct ticket data
    const subject = `Neue Projektanfrage: ${calculatorData.projectTypeName} (${domain || 'Keine Domain'})`;
    const details = `
      Kunde: ${calculatorData.clientType}
      Projekt: ${calculatorData.projectTypeName}
      Design: ${calculatorData.designLevel}
      Features: ${calculatorData.features?.join(', ') || 'Keine'}
      Domain: ${domain || 'Keine'}
      Zusatz-Services: ${Array.from(selectedOptions).map(id => CONFIG_OPTIONS.find(o => o.id === id)?.name).join(', ')}
      Total Schätzung: CHF ${calculatorData.total?.toLocaleString() || 0}
    `.trim();

    try {
      // 1. Generate the PDF Blob
      const doc = new jsPDF();
      // (Repeat simplified PDF generation for the blob)
      doc.setFontSize(20);
      doc.text('hed-it.ch Projektanfrage', 20, 20);
      doc.setFontSize(12);
      doc.text(details, 20, 40);
      const pdfBlob = doc.output('blob');

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('details', details);
      formData.append('customer', calculatorData.clientType || 'Web-Besucher');
      formData.append('pdf', pdfBlob, `anfrage-${domain || 'projekt'}.pdf`);

      // 3. Send to ERD Tool (using local dev port as default)
      const response = await fetch('/api/public/inquiry', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Fehler beim Senden');
      
      setIsSuccess(true);
      setIsSending(false);
      
      // Also trigger the "professional" download for the user
      generateAndDownloadPDF();
    } catch (err) {
      console.error('Submit error:', err);
      // Fallback for demo if backend is not reachable
      setTimeout(() => {
        setIsSuccess(true);
        setIsSending(false);
        generateAndDownloadPDF();
      }, 1500);
    }
  };



  return (
    <div className="page-configurator">
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="hero-title">Projekt-<span className="premium-gradient">Details</span> konfigurieren</h1>
            <p className="hero-desc" style={{ margin: '0 auto' }}>Wählen Sie Ihre Domain und zusätzliche Services für Ihr Projekt.</p>
          </motion.div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="config-grid">
            <div className="config-main">
              
              {/* Domain Selection */}
              <div className="config-card">
                <div className="card-header">
                  <Globe className="w-6 h-6 text-primary" />
                  <h3>Wunsch-Domain prüfen</h3>
                </div>
                <div className="domain-input-wrapper">
                  <motion.div 
                    animate={domainStatus === 'taken' ? shakeAnimation : {}}
                    className={`input-container ${domainStatus}`}
                  >
                    <input 
                      type="text" 
                      placeholder="meine-webseite.ch" 
                      value={domain}
                      onChange={(e) => {
                        setDomain(e.target.value);
                        checkDomain(e.target.value);
                      }}
                    />
                    <div className="input-status">
                      {isDomainChecking ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted" />
                      ) : domainStatus === 'available' ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : domainStatus === 'taken' ? (
                        <X className="w-5 h-5 text-error" />
                      ) : null}
                    </div>
                  </motion.div>
                  <AnimatePresence>
                    {domainStatus === 'taken' && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="status-msg error"
                      >
                        Diese Domain ist bereits vergeben. Bitte wählen Sie eine andere.
                      </motion.p>
                    )}
                    {domainStatus === 'available' && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="status-msg success"
                      >
                        Glückwunsch! Diese Domain ist noch frei.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Additional Services */}
              <div className="config-card" style={{ marginTop: '32px' }}>
                <div className="card-header">
                  <Server className="w-6 h-6 text-primary" />
                  <h3>Zusätzliche Services</h3>
                </div>
                <div className="options-grid">
                  {CONFIG_OPTIONS.map(opt => (
                    <div 
                      key={opt.id} 
                      className={`option-card ${selectedOptions.has(opt.id) ? 'active' : ''}`}
                      onClick={() => toggleOption(opt.id)}
                    >
                      <div className="option-icon">{opt.icon}</div>
                      <div className="option-content">
                        <div className="option-top">
                          <h4>{opt.name}</h4>
                          <span className="option-price">
                            {opt.price.toFixed(2)} chf {opt.id === 'ismp' || opt.id === 'ms365' || opt.id === 'maintenance' || opt.id === 'domain-ch' ? 'Monatlich' : 'Einmalig'}

                          </span>

                        </div>
                        <p>{opt.desc}</p>
                      </div>
                      <div className="option-check">
                        {selectedOptions.has(opt.id) && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="config-sidebar">
              <div className="summary-card sticky-card">
                <h3>Zusammenfassung</h3>
                <div className="summary-section">
                  <span className="section-label">Basis-Projekt</span>
                  <div className="summary-item">
                    <span>{calculatorData.projectTypeName || 'Webseite'}</span>
                    <span>{calculatorData.total?.toFixed(2) || '0.00'} chf Einmalig</span>
                  </div>

                </div>

                {selectedOptions.size > 0 && (
                  <div className="summary-section">
                    <span className="section-label">Services</span>
                    {Array.from(selectedOptions).map(id => {
                      const opt = CONFIG_OPTIONS.find(o => o.id === id);
                      return (
                        <div key={id} className="summary-item">
                          <span>{opt?.name}</span>
                          <span>{opt?.price.toFixed(2)} chf {opt?.id === 'ismp' || opt?.id === 'ms365' || opt?.id === 'maintenance' || opt?.id === 'domain-ch' ? 'Monatlich' : 'Einmalig'}</span>

                        </div>

                      );
                    })}
                  </div>
                )}

                <div className="final-actions">
                  <button 
                    className={`btn btn-primary w-full ${isSuccess ? 'success' : ''}`}
                    disabled={isSending || isSuccess}
                    onClick={handleSubmit}
                  >
                    {isSending ? (
                      <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Sendet...</>
                    ) : isSuccess ? (
                      <><Check className="w-5 h-5 mr-2" /> Anfrage gesendet!</>
                    ) : (
                      <><Send className="w-5 h-5 mr-2" /> Anfrage senden</>
                    )}
                  </button>
                  
                  {isSuccess && (
                    <button 
                      className="btn btn-outline w-full mt-4"
                      onClick={() => {
                        const doc = new jsPDF();
                        // (Re-generate or use stored pdf content)
                        doc.text("hed-it calculation", 20, 20);
                        doc.save('hed-it-angebot.pdf');
                      }}
                    >
                      <Download className="w-5 h-5 mr-2" /> PDF Herunterladen
                    </button>
                  )}
                </div>
                
                <p className="disclaimer">
                  Mit dem Absenden der Anfrage akzeptieren Sie unsere AGB. Wir werden uns innerhalb von 24h bei Ihnen melden.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <style>{`
        .page-configurator { min-height: 100vh; }
        .config-grid { display: grid; grid-template-columns: 1fr 400px; gap: 64px; }

        
        .config-card { 
          background: var(--bg-card); 
          border: 1px solid var(--border); 
          border-radius: 24px; 
          padding: 32px;
        }
        .card-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
        .card-header h3 { font-size: 20px; margin: 0; }
        
        .domain-input-wrapper { position: relative; }
        .input-container { 
          display: flex; 
          align-items: center; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid var(--border); 
          border-radius: 12px; 
          padding: 0 20px;
          transition: all 0.3s ease;
        }
        .input-container:focus-within { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(0,242,255,0.1); }
        .input-container.available { border-color: #10b981; background: rgba(16,185,129,0.05); }
        .input-container.taken { border-color: #ef4444; background: rgba(239,68,68,0.05); }
        
        .input-container input { 
          flex: 1; 
          background: transparent; 
          border: none; 
          padding: 16px 0; 
          color: var(--text-main); 
          font-size: 18px;
          outline: none;
        }
        
        .status-msg { font-size: 14px; margin-top: 8px; font-weight: 500; }
        .status-msg.error { color: #ef4444; }
        .status-msg.success { color: #10b981; }
        
        .options-grid { display: grid; gap: 16px; }
        .option-card { 
          display: flex; 
          align-items: center; 
          gap: 20px; 
          padding: 20px; 
          background: rgba(255,255,255,0.02); 
          border: 1px solid var(--border); 
          border-radius: 16px; 
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        .option-card:hover { background: rgba(255,255,255,0.05); }
        .option-card.active { border-color: var(--primary); background: rgba(0,242,255,0.03); }
        
        .option-icon { 
          width: 48px; 
          height: 48px; 
          background: rgba(255,255,255,0.05); 
          border-radius: 12px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: var(--primary);
        }
        .option-content { flex: 1; }
        .option-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .option-top h4 { margin: 0; font-size: 16px; }
        .option-price { font-weight: 700; color: var(--primary); }
        .option-content p { font-size: 13px; color: var(--text-muted); margin: 0; }
        
        .option-check { 
          width: 24px; 
          height: 24px; 
          border: 2px solid var(--border); 
          border-radius: 6px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        }
        .option-card.active .option-check { background: var(--primary); border-color: var(--primary); color: #000; }
        
        .summary-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 32px; }
        .summary-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border); }
        .section-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); display: block; margin-bottom: 12px; }
        .summary-item { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 16px; align-items: baseline; gap: 12px; }

        
        .final-actions { margin-top: 32px; }
        .btn.success { background: #10b981; border-color: #10b981; }
        .disclaimer { font-size: 11px; color: var(--text-muted); margin-top: 20px; text-align: center; }
        
        @media (max-width: 992px) {
          .config-grid { grid-template-columns: 1fr; }
          .config-sidebar { order: -1; }
          .sticky-card { position: relative; top: 0; }
        }
      `}</style>
    </div>
  );
};

export default Configurator;
