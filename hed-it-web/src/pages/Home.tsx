import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Globe, Cloud, Zap, Shield, Layout, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  const competence = [
    {
      icon: <Layout size={32} color="var(--primary)" />,
      title: "Web-Development",
      desc: "Maßgeschneiderte Webseiten & Apps mit modernsten Frameworks wie React und Next.js.",
      color: "var(--primary)"
    },
    {
      icon: <Cloud size={32} color="var(--secondary)" />,
      title: "Cloud Migration",
      desc: "Nahtlose Umstellung Ihrer Infrastruktur auf Hetzner Cloud oder Microsoft 365.",
      color: "var(--secondary)"
    },
    {
      icon: <Shield size={32} color="#00ff88" />,
      title: "Cyber Security",
      desc: "Schutz Ihrer digitalen Assets durch modernste Sicherheits-Audits und Monitoring.",
      color: "#00ff88"
    }
  ];

  return (
    <div className="page-home">
      <header className="hero">
        <div className="container hero-grid">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="hero-tag">Schweizer IT-Partner</span>
            <h1 className="hero-title">
              Wir bauen die <br />
              <span className="premium-gradient">digitale Zukunft.</span>
            </h1>
            <p className="hero-desc">
              Herausragende Webentwicklung, skalierbare Cloud-Lösungen und erstklassiger Support. 
              Wir begleiten Sie von der ersten Idee bis zum stabilen Betrieb.
            </p>
            <div className="flex gap-4">
              <Link to="/calculator" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Projekt kalkulieren <Rocket size={20} />
              </Link>
              <Link to="/services" className="btn btn-outline" style={{ textDecoration: 'none' }}>
                Unsere Expertise
              </Link>
            </div>
          </motion.div>

          <motion.div 
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            <div style={{ position: 'relative' }}>
              <img src="/hero-visual.png" alt="IT Excellence" />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
                zIndex: -1
              }} />
            </div>
          </motion.div>
        </div>
      </header>

      {/* --- Kernkompetenzen Section --- */}
      <section className="section section-dark">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '64px', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '42px', marginBottom: '16px' }}>Unsere Kernkompetenzen</h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '600px' }}>
                Wir kombinieren strategisches Denken mit technischer Exzellenz, um Lösungen zu schaffen, die wirklich funktionieren.
              </p>
            </div>
            <Link to="/services" className="nav-link" style={{ fontWeight: 'bold' }}>Alle Dienstleistungen ansehen →</Link>
          </div>

          <div className="items-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            {competence.map((c, i) => (
              <motion.div 
                key={i} 
                className="calc-item" 
                style={{ padding: '48px', borderBottom: `4px solid ${c.color}` }}
                whileHover={{ translateY: -10 }}
              >
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '16px', 
                  background: 'rgba(255,255,255,0.03)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginBottom: '32px'
                }}>
                  {c.icon}
                </div>
                <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>{c.title}</h3>
                <p className="item-desc" style={{ fontSize: '15px' }}>{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Why hed-it Section --- */}
      <section className="section" style={{ padding: '240px 0' }}> {/* Even more spacing */}
        <div className="container">
          <div className="hero-grid" style={{ gap: '120px', alignItems: 'center' }}>
            <div>
              <span className="hero-tag" style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--secondary)', borderColor: 'rgba(124, 58, 237, 0.2)' }}>Hinter den Kulissen</span>
              <h2 style={{ fontSize: '62px', marginBottom: '40px', lineHeight: 1 }}>Echte Expertise <br />ist persönlich.</h2>
              <p className="hero-desc" style={{ fontSize: '20px', lineHeight: '1.9', marginBottom: '48px' }}>
                Als inhabergeführtes Unternehmen stehe ich mit meinem Namen für die Qualität jedes Projekts. 
                Wir verstehen IT nicht als reinen Kostenfaktor, sondern als strategischen Wettbewerbsvorteil. 
                Persönliche Betreuung auf Augenhöhe ist bei uns Standard.
              </p>
              <div className="flex flex-col gap-8">
                 <div className="flex gap-12">
                    <div>
                       <h2 style={{ fontSize: '52px', color: 'var(--primary)', lineHeight: 1 }}>100%</h2>
                       <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>Fokus auf Qualität</p>
                    </div>
                    <div>
                       <h2 style={{ fontSize: '52px', color: 'var(--secondary)', lineHeight: 1 }}>24/7</h2>
                       <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>Support & Monitoring</p>
                    </div>
                 </div>
                 <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '20px' }}>
                    <li className="flex gap-4 items-center" style={{ fontSize: '17px', fontWeight: 600 }}><Zap size={22} color="var(--primary)" /> Zertifizierte Partner von Hetzner & Microsoft</li>
                    <li className="flex gap-4 items-center" style={{ fontSize: '17px', fontWeight: 600 }}><Zap size={22} color="var(--primary)" /> 100% Individualität statt Standard-Lösungen</li>
                 </ul>
              </div>
            </div>

            <motion.div 
              className="ceo-visual"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              style={{ position: 'relative' }}
            >
               <div style={{ 
                 width: '100%', 
                 height: '600px', 
                 background: 'var(--bg-card)', 
                 borderRadius: '40px', 
                 border: '2px solid var(--primary)',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 overflow: 'hidden',
                 boxShadow: '0 50px 100px rgba(0,0,0,0.4)'
               }}>
                 <div className="text-center">
                    <p style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>Platzhalter für CEO Foto</p>
                    <h3 className="premium-gradient">Joel Hediger</h3>
                    <p style={{ fontSize: '14px', opacity: 0.5 }}>Inhaber & Experte</p>
                 </div>
               </div>
               <div style={{
                 position: 'absolute',
                 bottom: '-40px',
                 right: '-40px',
                 width: '300px',
                 height: '300px',
                 background: 'var(--secondary-glow)',
                 filter: 'blur(80px)',
                 zIndex: -1,
                 opacity: 0.4
               }} />
            </motion.div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Home;
