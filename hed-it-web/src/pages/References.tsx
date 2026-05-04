import React from 'react';
import { motion } from 'framer-motion';

const References = () => {
  const projects = [
    { title: "E-Commerce Re-Design", category: "Webentwicklung", desc: "Kompletter Relaunch eines Schweizer Modehauses inkl. ERP-Schnittstelle.", img: "/hero-visual.png" },
    { title: "Cloud Migration 2.0", category: "Infrastructure", desc: "Vollständige Migration einer Anwaltskanzlei in die Hetzner Cloud.", img: "/hero-visual.png" },
    { title: "B2B Bestellportal", category: "Custom App", desc: "Individuelle Web-Applikation zur Automatisierung von Bestellprozessen.", img: "/hero-visual.png" },
    { title: "Managed IT Setup", category: "Support", desc: "Komplettes IT-Outsourcing für ein mittelständisches Industrieunternehmen.", img: "/hero-visual.png" }
  ];

  return (
    <div className="page-references">
      <section className="hero">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="hero-title">Unsere <span className="premium-gradient">Referenzen</span></h1>
            <p className="hero-desc" style={{ margin: '0 auto' }}>Erfolgsgeschichten, die für sich sprechen.</p>
          </motion.div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="items-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
            {projects.map((p, i) => (
              <motion.div 
                key={i} 
                className="hero-visual" 
                style={{ borderRadius: '24px', overflow: 'hidden' }}
                whileHover={{ scale: 1.02 }}
              >
                <div style={{ padding: '32px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.category}</span>
                  <h3 style={{ margin: '8px 0 16px' }}>{p.title}</h3>
                  <p className="item-desc">{p.desc}</p>
                </div>
                <img src={p.img} alt={p.title} style={{ height: '300px', width: '100%', objectFit: 'cover', opacity: 0.8 }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default References;
