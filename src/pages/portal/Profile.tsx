import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Shield, Save, Key, Lock, Camera } from 'lucide-react';
import { getUser } from '../../utils/auth';

export const Profile = () => {
  const user = getUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: ''
  });

  useEffect(() => {
    // Use local user data from auth utility (populated on login)
    const userData = getUser();
    if (userData) {
      setProfile(userData);
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: '',
        position: userData.role || ''
      });
    }
    setLoading(false);
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API call for now or implement if needed
    setTimeout(() => {
      setSaving(false);
      alert('Profil erfolgreich aktualisiert.');
    }, 1000);
  };

  if (loading) return (
    <div className="pulse" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ height: 180, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-xl)' }}></div>
      <div style={{ height: 400, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-xl)' }}></div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', paddingBottom: 80 }}>
      <div style={{ position: 'relative' }}>
         <div style={{ 
           height: 180, 
           width: '100%', 
           background: 'linear-gradient(135deg, var(--color-primary) 0%, #4a90e2 100%)', 
           borderRadius: 'var(--radius-xl)', 
           boxShadow: 'var(--shadow-lg)', 
           position: 'relative', 
           overflow: 'hidden' 
         }}>
            <div style={{ position: 'absolute', top: -100, right: -100, width: 250, height: 250, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
            <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
         </div>
         
         <div style={{ position: 'absolute', bottom: -50, left: 40, display: 'flex', alignItems: 'flex-end', gap: 24 }}>
            <div style={{ position: 'relative' }}>
               <div style={{ width: 120, height: 120, borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', padding: 6, boxShadow: 'var(--shadow-xl)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', position: 'relative', overflow: 'hidden' }}>
                     <User size={60} strokeWidth={1} />
                     <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' }}>
                        <Camera style={{ color: 'white' }} size={24} />
                     </div>
                  </div>
               </div>
               <div style={{ position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, borderRadius: 10, backgroundColor: 'var(--color-primary)', border: '4px solid var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: 'var(--shadow-sm)' }}>
                  <Shield size={14} fill="currentColor" />
               </div>
            </div>
            <div style={{ paddingBottom: 16 }}>
               <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{user?.firstName} {user?.lastName}</h1>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'white', letterSpacing: '0.05em', backdropFilter: 'blur(4px)' }}>{user?.role}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, fontWeight: 500 }}>{profile?.email}</span>
               </div>
            </div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-xl)', marginTop: 60 }}>
         <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
               <h3 style={{ margin: '0 0 32px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <User size={20} style={{ color: 'var(--color-primary)' }} /> Persönliche Informationen
               </h3>
               
               <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="input-label">Vorname</label>
                        <div style={{ position: 'relative' }}>
                           <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                           <input 
                              type="text" 
                              className="input-field" 
                              style={{ paddingLeft: 40, height: 44 }}
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                           />
                        </div>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="input-label">Nachname</label>
                        <div style={{ position: 'relative' }}>
                           <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                           <input 
                              type="text" 
                              className="input-field" 
                              style={{ paddingLeft: 40, height: 44 }}
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                           />
                        </div>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="input-label">E-Mail Adresse</label>
                        <div style={{ position: 'relative' }}>
                           <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                           <input 
                              type="email" 
                              className="input-field" 
                              style={{ paddingLeft: 40, height: 44, backgroundColor: 'var(--color-surface-hover)', cursor: 'not-allowed' }}
                              value={formData.email}
                              readOnly
                           />
                        </div>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="input-label">Telefonnummer</label>
                        <div style={{ position: 'relative' }}>
                           <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                           <input 
                              type="text" 
                              className="input-field" 
                              style={{ paddingLeft: 40, height: 44 }}
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                           />
                        </div>
                     </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
                     <button 
                        type="submit" 
                        disabled={saving}
                        className="btn-primary"
                        style={{ padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700 }}
                     >
                        {saving ? 'Wird gespeichert...' : <><Save size={16} /> Profil speichern</>}
                     </button>
                  </div>
               </form>
            </div>

            <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
               <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Lock size={20} style={{ color: 'var(--color-warning)' }} /> Sicherheit & Passwort
               </h3>
               <p style={{ margin: '0 0 24px 0', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 600 }}>
                  Ändern Sie regelmäßig Ihr Passwort, um die Sicherheit Ihres Kontos zu gewährleisten. Verwenden Sie ein starkes Passwort mit Sonderzeichen.
               </p>
               
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                     <Key size={16} /> Passwort zurücksetzen
                  </button>
                  <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                     Zwei-Faktor Auth. aktivieren
                  </button>
               </div>
            </div>
         </div>

         <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div className="card" style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-text-main)', border: 'none', color: 'white', position: 'relative', overflow: 'hidden' }}>
               <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700 }}>Ihre Firma</h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                     <Building size={28} />
                  </div>
                  <div>
                     <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>TechWave AG</p>
                     <p style={{ margin: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>Unternehmens-Kunde</p>
                  </div>
               </div>
               
               <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                     <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                     <span style={{ color: 'var(--color-success)', fontWeight: 800, textTransform: 'uppercase' }}>Premium Support</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                     <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kunde seit</span>
                     <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700 }}>Januar 2024</span>
                  </div>
               </div>
            </div>

            <div className="card" style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
               <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>Datenschutz</h3>
               <p style={{ margin: '0 0 24px 0', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "Wir behandeln Ihre Daten mit höchster Sorgfalt und gemäss DSGVO / DSG. Ihre Passwörter werden verschlüsselt gespeichert."
               </p>
               <button style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Datenschutzbestimmungen <ArrowRight size={14} />
               </button>
            </div>
         </aside>
      </div>
    </div>
  );
};

import { ArrowRight } from 'lucide-react';
