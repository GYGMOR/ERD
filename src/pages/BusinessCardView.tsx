import { useState } from 'react';
import { CreditCard, Download, Share2, Phone, Mail, MapPin, QrCode } from 'lucide-react';
import { getUser } from '../utils/auth';

export const BusinessCardView = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const currentUser = getUser();

  // Gross ICT Design Colors
  const gold = "#e5b35a";

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
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 size={16} /> QR Code teilen
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} /> Wallet (vCard)
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
                  <p style={{ fontSize: 14, color: '#ccc', margin: '4px 0', fontWeight: 500 }}>IT Solutions & Managed Services for Businesses</p>
                  <p style={{ fontSize: 14, color: '#ccc', margin: '4px 0', fontWeight: 500 }}>Wir bringen Ihr Unternehmen ins Web.</p>
               </div>
               <div style={{ marginTop: 40 }}>
                  <span style={{ color: gold, fontSize: 15, fontWeight: 600, letterSpacing: '0.1em' }}>WWW.GROSS-ICT.CH</span>
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
           <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
             <div style={{ width: 100, height: 100, backgroundColor: 'white', padding: 8, borderRadius: 8 }}>
                {/* Mock QR Code */}
                <div style={{ width: '100%', height: '100%', border: '4px solid black' }}></div>
             </div>
             <div style={{ flex: 1 }}>
               <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                 Lassen Sie diesen Code von Ihrem Gegenüber scannen, um Ihre Kontaktdaten sofort zu speichern.
               </p>
               <button className="btn-secondary" style={{ width: '100%' }}>In Apple / Google Wallet speichern</button>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};
