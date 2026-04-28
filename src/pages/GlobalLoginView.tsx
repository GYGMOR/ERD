import { useState } from 'react';
import { Mail, KeyRound, CheckCircle2, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/msalConfig';

export const GlobalLoginView = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [botVerificationChecked, setBotVerificationChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: Token/NewPass
  const [resetMsg, setResetMsg] = useState({ type: '', text: '' });

  const { instance } = useMsal();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!botVerificationChecked) {
      setErrorMsg('Bitte bestätige, dass du kein Roboter bist.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, botVerificationChecked })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin();
      } else {
        setErrorMsg(data.error || 'Login fehlgeschlagen');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Serververbindung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = () => {
    // Switch from Popup to Redirect for better SPA reliability on GH Pages
    instance.loginRedirect(loginRequest).catch((e: unknown) => {
      console.error('MSAL Login Redirect failed:', e);
      setErrorMsg('Microsoft Login konnte nicht gestartet werden.');
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (data.success) {
        setResetStep(2);
        setResetMsg({ type: 'success', text: data.message });
      } else {
        setResetMsg({ type: 'error', text: data.error });
      }
    } catch (err) {
      setResetMsg({ type: 'error', text: 'Fehler beim Senden der Anfrage.' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, token: resetToken, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setResetMsg({ type: 'success', text: data.message });
        setTimeout(() => {
          setShowForgotModal(false);
          setResetStep(1);
          setResetEmail('');
          setResetToken('');
          setNewPassword('');
        }, 3000);
      } else {
        setResetMsg({ type: 'error', text: data.error });
      }
    } catch (err) {
      setResetMsg({ type: 'error', text: 'Fehler beim Zurücksetzen des Passworts.' });
    }
  };

  return (
    <div className="login-wrapper" style={{ height: '100vh', width: '100vw', display: 'flex', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 900px) {
          .login-brand-side { display: none; }
          .login-form-side { flex: 1; width: 100%; }
        }
        @media (max-width: 480px) {
          .login-form-container { padding: 20px; }
          .login-form-side { padding: 20px; }
        }
      `}</style>
      
      {/* Left Side - Brand & Graphics */}
      <div className="login-brand-side" style={{ flex: 1, backgroundColor: 'var(--color-primary)', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', color: 'white' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,82,204,1) 0%, rgba(7,71,166,1) 100%)', zIndex: 0 }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{ width: 48, height: 48, backgroundColor: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: 24, fontWeight: 700 }}>
              N
            </div>
            <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>NexService</span>
          </div>
          <h1 style={{ fontSize: '3rem', fontWeight: 600, lineHeight: 1.1, marginBottom: '24px' }}>
            Die All-in-One <br/> Business Plattform.
          </h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '500px', lineHeight: 1.5 }}>
            Logge dich in deinen Tenant ein, um Tickets, Kunden und Offerten an einem Ort zu verwalten.
          </p>
        </div>
        
        {/* Placeholder Abstract Shapes */}
        <div style={{ position: 'absolute', right: '-10%', bottom: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', right: '5%', bottom: '5%', width: '30vw', height: '30vw', borderRadius: '50%', border: '40px solid rgba(255,255,255,0.05)', zIndex: 0 }}></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-form-side" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', position: 'relative' }}>
        <div className="login-form-container" style={{ width: '100%', maxWidth: '400px' }}>
          
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>Willkommen zurück</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Bitte melde dich mit deinen Zugangsdaten an.</p>
            {errorMsg && (
              <div style={{ padding: '12px', marginTop: '16px', backgroundColor: 'rgba(255, 86, 48, 0.1)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} />
                {errorMsg}
              </div>
            )}
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Email Input */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>Arbeits-E-Mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com" 
                  required
                  style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '15px', outline: 'none' }} 
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>
                Passwort
                <button 
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{ background: 'none', border: 'none', padding: 0, fontWeight: 500, color: 'var(--color-primary)', cursor: 'pointer', fontSize: '13px' }}>
                  Passwort vergessen?
                </button>
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '15px', outline: 'none' }} 
                />
              </div>
            </div>

            {/* Bot Verification Box */}
            <div 
              style={{ 
                padding: '12px', 
                backgroundColor: 'var(--color-surface-hover)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => setBotVerificationChecked(!botVerificationChecked)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '3px', 
                  border: '2px solid var(--color-border)',
                  backgroundColor: botVerificationChecked ? 'var(--color-success)' : 'white',
                  borderColor: botVerificationChecked ? 'var(--color-success)' : 'var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}>
                  {botVerificationChecked && <CheckCircle2 size={14} color="white" />}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Ich bin kein Roboter</span>
              </div>
              <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" width="24" height="24" alt="reCAPTCHA" style={{ opacity: 0.6 }} />
            </div>
            
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : 'Anmelden'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
            <span style={{ padding: '0 16px', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>ODER</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
          </div>

          <button 
            type="button" 
            onClick={handleMicrosoftLogin}
            className="hover-bg-row"
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontSize: '15px', 
              fontWeight: 600, 
              backgroundColor: 'var(--color-surface)', 
              color: 'var(--color-text-main)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              transition: 'background-color 0.2s',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Mit Microsoft anmelden
          </button>

          <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Die Authentifizierung erfolgt sicher über deinen Unternehmens-Tenant.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card animate-in zoom-in-95 duration-200" style={{ width: 400, padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Passwort vergessen?</h3>
              <button onClick={() => setShowForgotModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            {resetMsg.text && (
              <div style={{ padding: '12px', marginBottom: '20px', borderRadius: 'var(--radius-md)', fontSize: '14px', backgroundColor: resetMsg.type === 'success' ? 'rgba(54, 179, 126, 0.1)' : 'rgba(255, 86, 48, 0.1)', color: resetMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {resetMsg.text}
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>Gib deine E-Mail-Adresse ein, um einen Reset-Code zu erhalten.</p>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>E-Mail Adresse</label>
                  <input 
                    type="email" 
                    required
                    className="input-field"
                    placeholder="name@company.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                  Code anfordern
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>6-stelliger Code</label>
                  <input 
                    type="text" 
                    required
                    className="input-field"
                    placeholder="123456"
                    maxLength={6}
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Neues Passwort</label>
                  <input 
                    type="password" 
                    required
                    className="input-field"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                  Passwort speichern
                </button>
                <button type="button" onClick={() => setResetStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', cursor: 'pointer' }}>
                  Zurück
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
