import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';

import { Calculator as CalcIcon, Download, CheckCircle2, User, Users, Building2 } from 'lucide-react';

type ClientType = 'business' | 'association' | 'private';

interface ProjectType {
  id: string;
  name: string;
  price: number;
  desc: string;
}

interface DesignComplexity {
  id: string;
  name: string;
  price: number;
  desc: string;
}

interface Feature {
  id: string;
  name: string;
  price: number;
  desc: string;
}

const CLIENT_TYPES = [
  { id: 'business', name: 'Unternehmen', icon: <Building2 />, desc: 'B2B / B2C Unternehmen & Agenturen', discount: 0 },
  { id: 'association', name: 'Verein', icon: <Users />, desc: 'Vereine & NPOs (-50%)', discount: 0.5 },
  { id: 'private', name: 'Privatperson', icon: <User />, desc: 'Private Projekte & Portfolios (-70%)', discount: 0.7 },
];

const PROJECT_TYPES: ProjectType[] = [
  { id: 'lp', name: 'Landing Page', price: 1500, desc: 'Einseitige Webseite für Produkt oder Dienstleistung' },
  { id: 'corp', name: 'Unternehmenswebseite', price: 3500, desc: 'Mehrseitige Website mit Über uns, Services, Kontakt' },
  { id: 'shop', name: 'Webshop', price: 8000, desc: 'Online-Shop mit Produktverwaltung und Zahlungsabwicklung' },
  { id: 'app', name: 'Web Applikation', price: 12000, desc: 'Massgeschneiderte Web-App für Geschäftsprozesse' },
  { id: 'mobile', name: 'Mobile App', price: 15000, desc: 'Native iOS/Android App oder plattformübergreifend' },
];

const DESIGN_LEVELS: DesignComplexity[] = [
  { id: 'template', name: 'Template Basiert', price: 0, desc: 'Bewährte Vorlagen, schnell und kostengünstig' },
  { id: 'custom', name: 'Individuelles Design', price: 2000, desc: 'Einzigartiges Design nach Ihren Wünschen' },
  { id: 'premium', name: 'Premium / 3D', price: 4500, desc: 'Hochwertige Animationen und 3D-Elemente' },
];

const FEATURES: Feature[] = [
  { id: 'cms', name: 'CMS Integration', price: 1600, desc: 'Inhalte selbst bearbeiten ohne Programmierkenntnisse' },
  { id: 'seo', name: 'SEO Optimierung', price: 1200, desc: 'Bessere Sichtbarkeit in Google & Co.' },
  { id: 'lang', name: 'Mehrsprachigkeit', price: 2100, desc: 'Website in mehreren Sprachen verfügbar' },
  { id: 'stats', name: 'Erweiterte Analyse', price: 800, desc: 'Detaillierte Besucherstatistiken und Conversion-Tracking' },
  { id: 'news', name: 'Newsletter Setup', price: 1200, desc: 'E-Mail Marketing Integration mit Anmeldeformular' },
];

const Calculator = () => {
  const [clientType, setClientType] = useState<ClientType>('business');
  const [projectType, setProjectType] = useState<string>('lp');
  const [designLevel, setDesignLevel] = useState<string>('template');
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const navigate = useNavigate();


  const toggleFeature = (id: string) => {
    const newFeatures = new Set(selectedFeatures);
    if (newFeatures.has(id)) newFeatures.delete(id);
    else newFeatures.add(id);
    setSelectedFeatures(newFeatures);
  };

  const totals = useMemo(() => {
    const basePrice = PROJECT_TYPES.find(p => p.id === projectType)?.price || 0;
    const designPrice = DESIGN_LEVELS.find(d => d.id === designLevel)?.price || 0;
    const featurePrice = Array.from(selectedFeatures).reduce((sum, id) => {
      return sum + (FEATURES.find(f => f.id === id)?.price || 0);
    }, 0);

    const subtotal = basePrice + designPrice + featurePrice;
    const discountFactor = CLIENT_TYPES.find(c => c.id === clientType)?.discount || 0;
    const discountAmount = subtotal * discountFactor;
    const total = subtotal - discountAmount;

    return { subtotal, discountAmount, total };
  }, [clientType, projectType, designLevel, selectedFeatures]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('hed-it.ch | Kosten-Schätzung', 20, 20);
    doc.setFontSize(10);
    doc.text(`Datum: ${new Date().toLocaleDateString('de-CH')}`, 20, 30);
    doc.text(`Kundentyp: ${CLIENT_TYPES.find(c => c.id === clientType)?.name}`, 20, 35);
    
    doc.line(20, 45, 190, 45);
    let y = 55;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Gewählte Optionen:', 20, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    
    const p = PROJECT_TYPES.find(pt => pt.id === projectType);
    doc.text(`${p?.name}`, 20, y);
    doc.text(`CHF ${p?.price.toLocaleString()}`, 160, y);
    y += 7;

    const d = DESIGN_LEVELS.find(dl => dl.id === designLevel);
    doc.text(`Design: ${d?.name}`, 20, y);
    doc.text(`CHF ${d?.price.toLocaleString()}`, 160, y);
    y += 7;

    selectedFeatures.forEach(id => {
      const f = FEATURES.find(ft => ft.id === id);
      doc.text(`Feature: ${f?.name}`, 20, y);
      doc.text(`CHF ${f?.price.toLocaleString()}`, 160, y);
      y += 6;
    });

    y += 10;
    doc.line(20, y, 190, y);
    y += 10;
    
    doc.text('Zwischentotal:', 20, y);
    doc.text(`CHF ${totals.subtotal.toLocaleString()}`, 160, y);
    y += 7;
    
    if (totals.discountAmount > 0) {
      doc.setTextColor(255, 0, 0);
      doc.text(`Rabatt (${clientType === 'association' ? '50%' : '70%'}):`, 20, y);
      doc.text(`- CHF ${totals.discountAmount.toLocaleString()}`, 160, y);
      y += 7;
      doc.setTextColor(0, 0, 0);
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Geschätztes Total:', 20, y + 5);
    doc.text(`CHF ${totals.total.toLocaleString()}`, 160, y + 5);
    
    doc.save(`hed-it-kalkulation.pdf`);
  };

  return (
    <div className="page-calculator">
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="hero-title">Website-<span className="premium-gradient">Kosten-Rechner</span></h1>
            <p className="hero-desc" style={{ margin: '0 auto' }}>Erhalten Sie eine erste Kostenschätzung für Ihr Projekt.</p>
          </motion.div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="calc-grid">
            <div className="calc-main">
              
              {/* 1. Sind Sie... */}
              <div className="calc-section">
                <h3 className="section-step">1. Sind Sie...</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {CLIENT_TYPES.map(c => (
                    <div 
                      key={c.id} 
                      className={`client-card ${clientType === c.id ? 'active' : ''}`}
                      onClick={() => setClientType(c.id as ClientType)}
                    >
                      <div className="client-icon">{c.icon}</div>
                      <h4>{c.name}</h4>
                      <p>{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Projekttyp */}
              <div className="calc-section" style={{ marginTop: '64px' }}>
                <h3 className="section-step">2. Projekttyp</h3>
                <div className="list-options">
                  {PROJECT_TYPES.map(p => (
                    <div 
                      key={p.id} 
                      className={`list-item ${projectType === p.id ? 'active' : ''}`}
                      onClick={() => setProjectType(p.id)}
                    >
                      <div className="radio-circle"></div>
                      <div className="item-info">
                        <span className="item-title">{p.name}</span>
                        <span className="item-subtitle">{p.desc}</span>
                      </div>
                      <span className="item-cost">+ {p.price.toFixed(2)} chf Einmalig</span>

                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Design Komplexität */}
              <div className="calc-section" style={{ marginTop: '64px' }}>
                <h3 className="section-step">3. Design Komplexität</h3>
                <div className="list-options">
                  {DESIGN_LEVELS.map(d => (
                    <div 
                      key={d.id} 
                      className={`list-item ${designLevel === d.id ? 'active' : ''}`}
                      onClick={() => setDesignLevel(d.id)}
                    >
                      <div className="radio-circle"></div>
                      <div className="item-info">
                        <span className="item-title">{d.name}</span>
                        <span className="item-subtitle">{d.desc}</span>
                      </div>
                      <span className="item-cost">{d.price === 0 ? 'Inklusive' : `+ ${d.price.toFixed(2)} chf Einmalig`}</span>

                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Zusätzliche Features */}
              <div className="calc-section" style={{ marginTop: '64px' }}>
                <h3 className="section-step">4. Zusätzliche Features</h3>
                <div className="list-options">
                  {FEATURES.map(f => (
                    <div 
                      key={f.id} 
                      className={`list-item checkbox ${selectedFeatures.has(f.id) ? 'active' : ''}`}
                      onClick={() => toggleFeature(f.id)}
                    >
                      <div className="check-box"></div>
                      <div className="item-info">
                        <span className="item-title">{f.name}</span>
                        <span className="item-subtitle">{f.desc}</span>
                      </div>
                      <span className="item-cost">+ {f.price.toFixed(2)} chf Einmalig</span>

                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="calc-sidebar">
              <div className="summary-card sticky-card">
                <h3 style={{ marginBottom: '24px' }}>Geschätzte Kosten:</h3>
                
                <div className="summary-details">
                   <div className="summary-row">
                      <span>Basis & Design</span>
                      <span>{(PROJECT_TYPES.find(p => p.id === projectType)!.price + DESIGN_LEVELS.find(d => d.id === designLevel)!.price).toFixed(2)} chf Einmalig</span>
                   </div>
                   {selectedFeatures.size > 0 && (
                     <div className="summary-row">
                        <span>Zusatz-Features</span>
                        <span>{Array.from(selectedFeatures).reduce((s, id) => s + FEATURES.find(f => f.id === id)!.price, 0).toFixed(2)} chf Einmalig</span>
                     </div>
                   )}
                   {totals.discountAmount > 0 && (
                     <div className="summary-row discount">
                        <span>Rabatt ({clientType === 'association' ? '50%' : '70%'})</span>
                        <span>- {totals.discountAmount.toFixed(2)} chf Einmalig</span>
                     </div>
                   )}
                </div>


                <div className="final-total">
                   <span className="total-label">Total Schätzung</span>
                   <span className="total-value">{totals.total.toFixed(2)} chf Einmalig</span>


                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
                  Dies ist eine unverbindliche Schätzung. Die finalen Kosten hängen von Ihren spezifischen Anforderungen ab.
                </p>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '32px', justifyContent: 'center' }}
                  onClick={() => {
                    navigate('/configurator', {
                      state: {
                        total: totals.total,
                        clientType: CLIENT_TYPES.find(c => c.id === clientType)?.name,
                        projectTypeName: PROJECT_TYPES.find(p => p.id === projectType)?.name,
                        designLevel: DESIGN_LEVELS.find(d => d.id === designLevel)?.name,
                        features: Array.from(selectedFeatures).map(id => FEATURES.find(f => f.id === id)?.name)
                      }
                    });
                  }}
                >
                  Weiter
                </button>

              </div>
            </aside>
          </div>
        </div>
      </section>

      <style>{`
        .calc-section { background: var(--bg-card); padding: 40px; border-radius: 24px; border: 1px solid var(--border); }
        .section-step { margin-bottom: 24px; font-size: 20px; }
        
        .client-card { 
          padding: 32px; 
          background: rgba(255,255,255,0.02); 
          border: 1px solid var(--border); 
          border-radius: 16px; 
          text-align: center; 
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .client-card:hover { border-color: var(--primary); background: rgba(0,242,255,0.05); }
        .client-card.active { border-color: var(--primary); background: var(--primary); color: #000; }
        .client-card.active p { color: rgba(0,0,0,0.7); }
        .client-icon { font-size: 32px; margin-bottom: 16px; display: flex; justify-content: center; }
        .client-card h4 { margin-bottom: 8px; }
        .client-card p { font-size: 12px; color: var(--text-muted); }

        .list-options { display: flex; flex-direction: column; gap: 12px; }
        .list-item { 
          display: flex; 
          align-items: center; 
          padding: 20px; 
          background: rgba(255,255,255,0.02); 
          border: 1px solid var(--border); 
          border-radius: 12px; 
          cursor: pointer;
          transition: 0.2s;
        }
        .list-item:hover { background: rgba(255,255,255,0.05); }
        .list-item.active { border-color: var(--primary); background: rgba(0,242,255,0.03); }
        
        .radio-circle { width: 16px; height: 16px; border: 2px solid var(--border); border-radius: 50%; margin-right: 20px; position: relative; }
        .list-item.active .radio-circle { border-color: var(--primary); }
        .list-item.active .radio-circle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 6px; height: 6px; background: var(--primary); border-radius: 50%; }

        .check-box { width: 16px; height: 16px; border: 2px solid var(--border); border-radius: 4px; margin-right: 20px; }
        .list-item.active .check-box { border-color: var(--primary); background: var(--primary); }

        .item-info { flex: 1; display: flex; flex-direction: column; }
        .item-title { font-weight: 700; font-size: 16px; }
        .item-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .item-cost { font-weight: 800; color: var(--primary); font-size: 15px; }

        .summary-details { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .summary-row { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-muted); }
        .summary-row.discount { color: #ff4d4d; font-weight: 700; }
        .final-total { border-top: 1px solid var(--border); padding-top: 24px; display: flex; flex-direction: column; gap: 4px; }
        .total-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
        .total-value { font-size: 32px; font-weight: 900; color: var(--primary); }
        
        .sticky-card { position: sticky; top: 120px; }
      `}</style>
    </div>
  );
};

export default Calculator;
