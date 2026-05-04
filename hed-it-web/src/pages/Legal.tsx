import React from 'react';
import { motion } from 'framer-motion';

interface LegalProps {
  title: string;
}

const Legal: React.FC<LegalProps> = ({ title }) => {
  return (
    <div className="page-legal">
      <section className="hero">
        <div className="container">
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero-title text-center">
            {title}
          </motion.h1>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="glass-card" style={{ padding: '60px', lineHeight: '1.8' }}>
            <h2>{title} von hed-it.ch</h2>
            <p style={{ marginTop: '24px', color: 'var(--text-muted)' }}>
              Hier stehen die rechtlichen Informationen für {title}. 
              Dies ist ein Platzhalter-Text. Bitte ersetzen Sie diesen durch Ihre offiziellen Dokumente.
            </p>
            <h3 style={{ marginTop: '40px' }}>1. Geltungsbereich</h3>
            <p>Details zum Geltungsbereich Ihrer Dienstleistungen und rechtlichen Rahmenbedingungen.</p>
            
            <h3 style={{ marginTop: '40px' }}>2. Haftungsausschluss</h3>
            <p>Informationen zur Haftung für Inhalte und externe Links.</p>
            
            <h3 style={{ marginTop: '40px' }}>3. Datenschutz</h3>
            <p>Wie wir mit Ihren Daten umgehen und welche Rechte Sie haben.</p>
            
            <div style={{ marginTop: '60px', padding: '20px', border: '1px dashed var(--primary)', borderRadius: '12px' }}>
               <p style={{ fontSize: '14px' }}><strong>Tipp:</strong> Nutzen Sie für die Schweiz einen Generator wie von SwissAnwalt oder ähnlichen Portalen, um rechtssichere Texte zu erstellen.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Legal;
