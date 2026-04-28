import { useState } from 'react';
import { CreditCard, Download, Share2, Phone, Mail, MapPin, QrCode } from 'lucide-react';
import { getUser } from '../utils/auth';

export const BusinessCardView = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const currentUser = getUser();

  // Gross ICT Design Colors
  const gold = "#e5b35a";

  const generateVCard = () => {
    if (!currentUser) return '';
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${currentUser.firstName} ${currentUser.lastName}`,
      `N:${currentUser.lastName};${currentUser.firstName};;;`,
      'ORG:Gross ICT',
      'TITLE:Web Solutions Engineer',
      'TEL;TYPE=CELL:+41 76 480 42 16',
      `EMAIL;TYPE=INTERNET:${currentUser.email}`,
      'ADR;TYPE=WORK:;;Neuhushof 3;Zell;LU;6144;Switzerland',
      'URL:https://www.gross-ict.ch',
      'END:VCARD'
    ].join('\n');
  };

  return (
    <div className="card-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={24} color="var(--color-primary)" /> Digitale Visitenkarte
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Ihre professionelle Präsenz im Gross ICT Design.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => {
            const vCard = generateVCard();
            const blob = new Blob([vCard], { type: 'text/vcard' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentUser?.firstName}_${currentUser?.lastName}.vcf`;
            a.click();
          }}>
            <Download size={16} /> Visitenkarte (.vcf)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, padding: '40px 0' }}>
        
        <div className="card-container" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
            
            {/* FRONT */}
            <div className="card-front" style={{ padding: '40px 50px', textAlign: 'left' }}>
              <div style={{ marginTop: 'auto', marginBottom: 40 }}>
                <h2 style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                  {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Joel Hediger'}
                </h2>
                <p style={{ fontSize: 16, color: '#888', marginTop: 4, fontWeight: 400 }}>
                  {currentUser?.role === 'admin' ? 'Web Solutions Engineer' : currentUser?.role || 'Engineer'}
                </p>
              </div>

              <div style={{ padding: '24px 0', borderTop: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Phone size={16} color={gold} fill={gold} fillOpacity={0.1} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>+41 76 480 42 16</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Mail size={16} color={gold} fill={gold} fillOpacity={0.1} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>joel.hediger@gross-ict.ch</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MapPin size={16} color={gold} fill={gold} fillOpacity={0.1} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Neuhushof 3, 6144 Zell LU</span>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', opacity: 0.8 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                   <span style={{ color: gold, fontSize: 18, fontWeight: 400 }}>()</span>
                   <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.05em' }}>Gross ICT</span>
                 </div>
              </div>
            </div>

            {/* BACK */}
            <div className="card-back" style={{ padding: 40 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ color: gold, fontSize: 44, fontWeight: 300 }}>()</span>
                  <span style={{ fontSize: 38, fontWeight: 600, letterSpacing: '0.02em' }}>Gross ICT</span>
               </div>
                <div style={{ textAlign: 'center' }}>
                   <p style={{ color: gold, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 20 }}>Visitenkarte Scannen</p>
                   <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 'var(--radius-lg)', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateVCard())}`} 
                        alt="Contact QR Code" 
                        style={{ width: 180, height: 180 }}
                      />
                   </div>
                   <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 20 }}>NexusService • www.gross-ict.ch</p>
                </div>
            </div>

          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Tipp: Klicken Sie auf die Karte, um die Rückseite zu sehen.
        </p>

        <div className="card" style={{ width: '100%', maxWidth: 500, padding: 20 }}>
           <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
             <QrCode size={18} /> Schnell-Zugriff
           </h3>
           <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
             <div style={{ width: 140, height: 140, backgroundColor: 'white', padding: 8, borderRadius: 8, border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generateVCard())}`} 
                  alt="QR Code" 
                  style={{ width: '100%', height: '100%' }}
                />
             </div>
             <div style={{ flex: 1, minWidth: 200 }}>
               <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                 Lassen Sie diesen Code von Ihrem Gegenüber scannen, um Ihre Kontaktdaten sofort zu speichern.
               </p>
               <button 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={() => {
                  const vCard = generateVCard();
                  const blob = new Blob([vCard], { type: 'text/vcard' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${currentUser?.firstName}_${currentUser?.lastName}.vcf`;
                  a.click();
                }}
               >
                 In Kontakte speichern
               </button>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};
