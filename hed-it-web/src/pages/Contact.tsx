import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const Contact = () => {
  return (
    <div className="page-contact">
      <section className="hero">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="hero-title">Kontaktieren <span className="premium-gradient">Sie uns</span></h1>
            <p className="hero-desc" style={{ margin: '0 auto' }}>Wir freuen uns darauf, von Ihrem Projekt zu hören.</p>
          </motion.div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="calc-grid">
            <div className="calc-main">
              <div className="glass-card" style={{ padding: '48px' }}>
                <h2 style={{ marginBottom: '32px' }}>Schreiben Sie uns</h2>
                <form className="flex flex-col gap-6">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="flex flex-col gap-2">
                      <label style={{ fontSize: '12px', color: '#666' }}>VORNAME</label>
                      <input type="text" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', color: 'white' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label style={{ fontSize: '12px', color: '#666' }}>NACHNAME</label>
                      <input type="text" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', color: 'white' }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: '12px', color: '#666' }}>E-MAIL ADRESSE</label>
                    <input type="email" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', color: 'white' }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: '12px', color: '#666' }}>NACHRICHT</label>
                    <textarea rows={6} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', color: 'white' }}></textarea>
                  </div>
                  <button type="button" className="btn btn-primary" style={{ justifyContent: 'center', padding: '20px' }}>
                    Nachricht senden <Send size={20} />
                  </button>
                </form>
              </div>
            </div>

            <aside className="calc-sidebar">
              <div className="flex flex-col gap-8">
                <div className="calc-item" style={{ cursor: 'default' }}>
                  <Mail color="var(--primary)" size={32} />
                  <h4 style={{ margin: '16px 0 8px' }}>E-Mail</h4>
                  <p className="item-desc">info@hed-it.ch</p>
                </div>
                <div className="calc-item" style={{ cursor: 'default' }}>
                  <Phone color="var(--secondary)" size={32} />
                  <h4 style={{ margin: '16px 0 8px' }}>Telefon</h4>
                  <p className="item-desc">+41 (0) 00 000 00 00</p>
                </div>
                <div className="calc-item" style={{ cursor: 'default' }}>
                  <MapPin color="#ffcc00" size={32} />
                  <h4 style={{ margin: '16px 0 8px' }}>Standort</h4>
                  <p className="item-desc">Schweiz</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
