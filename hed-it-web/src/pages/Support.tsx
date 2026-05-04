import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, MessageSquare, Send, Mail } from 'lucide-react';

const Support = () => {
  const faqs = [
    { q: "Wie lange dauert ein durchschnittliches Web-Projekt?", a: "Je nach Komplexität zwischen 4 und 8 Wochen von der Planung bis zum Go-Live." },
    { q: "Sind meine Daten bei Hetzner Cloud sicher?", a: "Ja, wir nutzen ISO-zertifizierte Rechenzentren in Deutschland und der Schweiz für maximale Datensicherheit." },
    { q: "Was beinhaltet das monatliche Wartungspaket?", a: "Sicherheits-Updates, Performance-Checks, regelmäßige Backups und technischer Support bei Fragen." },
    { q: "Können Sie meine bestehende E-Mail-Infrastruktur migrieren?", a: "Absolut. Wir migrieren Ihre Postfächer nahtlos zu Microsoft 365 oder unserem Standard-Business-Hosting." }
  ];

  return (
    <div className="page-support">
      <section className="hero">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="hero-title">Support <span className="premium-gradient">Portal</span></h1>
            <p className="hero-desc" style={{ margin: '0 auto' }}>Häufig gestellte Fragen und direkte Ticket-Erstellung.</p>
          </motion.div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="calc-grid">
            <div className="calc-main">
              <h2 style={{ marginBottom: '32px', fontSize: '32px' }}>Häufig gestellte Fragen</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {faqs.map((faq, i) => (
                  <div key={i} className="calc-item" style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <HelpCircle color="var(--primary)" />
                      <div>
                        <h4 style={{ marginBottom: '8px' }}>{faq.q}</h4>
                        <p className="item-desc">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="calc-sidebar">
              <div className="summary-card">
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MessageSquare size={24} color="var(--secondary)" /> Ticket erstellen
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
                  Beschreiben Sie Ihr Anliegen. Wir melden uns innerhalb von 24h bei Ihnen.
                </p>
                <form className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Name</label>
                    <input type="text" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', color: 'white' }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Betreff</label>
                    <input type="text" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', color: 'white' }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Nachricht</label>
                    <textarea rows={5} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', color: 'white' }}></textarea>
                  </div>
                  <button type="button" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: '16px' }}>
                    Ticket absenden <Send size={18} />
                  </button>
                </form>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Support;
