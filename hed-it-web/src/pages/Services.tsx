import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Cloud, Shield, Zap, Search, CheckCircle2 } from 'lucide-react';

const Services = () => {
  const serviceDetails = [
    {
      title: "Webentwicklung & Apps",
      desc: "Wir entwickeln maßgeschneiderte digitale Lösungen, die nicht nur gut aussehen, sondern Ergebnisse liefern. Von der High-End Corporate Website bis zur komplexen E-Commerce Plattform nutzen wir modernste Tech-Stacks wie React und Next.js.",
      features: ["Custom UI/UX Design", "Performance Optimierung", "Shopify & E-Commerce", "Progressive Web Apps"],
      icon: <Globe size={48} color="var(--primary)" />,
      img: "/hero-visual.png",
      reverse: false
    },
    {
      title: "Managed Cloud & Hosting",
      desc: "Skalierbarkeit und Sicherheit stehen bei uns an erster Stelle. Wir migrieren Ihre Infrastruktur in die Hetzner Cloud oder implementieren Microsoft 365 für Ihren modernen Workspace. Alles gemanagt, sicher und hochverfügbar.",
      features: ["Hetzner Cloud Setup", "Microsoft 365 Migration", "Server Management", "Backup Strategien"],
      icon: <Cloud size={48} color="var(--secondary)" />,
      img: "/hero-visual.png",
      reverse: true
    },
    {
      title: "SEO & Digitaler Erfolg",
      desc: "Sichtbarkeit ist der Schlüssel zum Erfolg. Wir optimieren Ihre technische Struktur und den Content so, dass Sie bei Google ganz oben landen und Ihre Zielgruppe wirklich erreichen.",
      features: ["Technical SEO", "Keyword Strategie", "Core Web Vitals", "Analysen & Reports"],
      icon: <Search size={48} color="#ffcc00" />,
      img: "/hero-visual.png",
      reverse: false
    }
  ];

  return (
    <div className="page-services">
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="hero-title">Unsere <span className="premium-gradient">Expertise</span></h1>
            <p className="hero-desc" style={{ margin: '0 auto' }}>Digitale Exzellenz für anspruchsvolle Unternehmen.</p>
          </motion.div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          {serviceDetails.map((s, i) => (
            <motion.div 
              key={i} 
              className={`service-row ${s.reverse ? 'reverse' : ''}`}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            >
              <div className="service-content">
                <div style={{ marginBottom: '24px' }}>{s.icon}</div>
                <h2>{s.title}</h2>
                <p>{s.desc}</p>
                <ul className="service-features">
                  {s.features.map((f, j) => (
                    <li key={j}><CheckCircle2 size={18} color="var(--primary)" /> {f}</li>
                  ))}
                </ul>
              </div>
              <div className="service-image">
                <img src={s.img} alt={s.title} style={s.reverse ? { filter: 'hue-rotate(90deg)' } : {}} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- Call to Action --- */}
      <section className="section" style={{ background: 'var(--bg-main)' }}>
        <div className="container text-center">
          <h2 style={{ fontSize: '42px', marginBottom: '24px' }}>Haben Sie ein spezielles Anliegen?</h2>
          <p className="hero-desc" style={{ margin: '0 auto 40px' }}>Wir finden die passende Lösung für Ihre IT-Herausforderung.</p>
          <div className="flex justify-center gap-4">
             <a href="/contact" className="btn btn-primary">Jetzt anfragen</a>
             <a href="/calculator" className="btn btn-outline">Projekt kalkulieren</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
