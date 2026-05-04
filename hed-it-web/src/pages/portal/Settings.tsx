import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Key, 
  Smartphone, 
  CheckCircle2, 
  Loader2,
  Copy,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
  const { user, token } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'verify'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetch2FAStatus = async () => {
    try {
      const response = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setIs2FAEnabled(data.user.two_factor_enabled);
      }
    } catch (err) {
      console.error('Failed to fetch user status');
    }
  };

  useEffect(() => {
    fetch2FAStatus();
  }, []);

  const handleStartSetup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setQrCode(data.qrCodeUrl);
        setSecret(data.secret);
        setSetupStep('qr');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Setup fehlgeschlagen' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });
      const data = await response.json();
      if (data.success) {
        setIs2FAEnabled(true);
        setSetupStep('idle');
        setMessage({ type: 'success', text: '2FA erfolgreich aktiviert' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Ungültiger Code' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Verifizierung fehlgeschlagen' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="portal-settings">
      <header className="settings-header">
        <h1 className="premium-gradient">Einstellungen</h1>
        <p>Verwalten Sie Ihr Konto und Ihre Sicherheitseinstellungen.</p>
      </header>

      <div className="settings-grid">
        <section className="settings-section">
          <div className="section-title">
            <Key size={20} />
            <h3>Passwort & Sicherheit</h3>
          </div>

          <div className="security-card">
            <div className="security-item">
              <div className="item-info">
                <Shield size={24} className={is2FAEnabled ? 'text-success' : 'text-muted'} />
                <div>
                  <p className="item-title">Zweistufige Verifizierung (2FA)</p>
                  <p className="item-desc">Zusätzlicher Schutz für Ihr Konto mit Google Authenticator.</p>
                </div>
              </div>
              <div className="item-action">
                {is2FAEnabled ? (
                  <span className="status-badge success"><CheckCircle2 size={14} /> Aktiviert</span>
                ) : (
                  <button className="btn btn-outline" onClick={handleStartSetup}>Einrichten</button>
                )}
              </div>
            </div>

            {setupStep !== 'idle' && (
              <motion.div 
                className="setup-container"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                {setupStep === 'qr' ? (
                  <div className="qr-setup">
                    <p>1. Scannen Sie diesen QR-Code mit Ihrer App:</p>
                    <div className="qr-frame">
                      {qrCode && <img src={qrCode} alt="QR Code" />}
                    </div>
                    <div className="secret-box">
                      <span>Manueller Code: <code>{secret}</code></span>
                      <button className="copy-btn"><Copy size={14} /></button>
                    </div>
                    <button className="btn btn-primary w-full mt-6" onClick={() => setSetupStep('verify')}>
                      Weiter <ArrowRight size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="verify-setup">
                    <p>2. Geben Sie den 6-stelligen Code aus der App ein:</p>
                    <div className="code-input">
                      <input 
                        type="text" 
                        maxLength={6}
                        placeholder="000 000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <button className="btn btn-primary w-full mt-4" onClick={handleVerifySetup} disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin" /> : 'Aktivieren'}
                    </button>
                    <button className="btn btn-text w-full mt-2" onClick={() => setSetupStep('qr')}>Zurück zum QR-Code</button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </section>

        <section className="settings-section">
          <div className="section-title">
            <Smartphone size={20} />
            <h3>Geräte & Sitzungen</h3>
          </div>
          <div className="device-card">
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Keine weiteren aktiven Sitzungen gefunden.</p>
          </div>
        </section>
      </div>

      {message && (
        <div className={`toast ${message.type}`}>
          {message.text}
        </div>
      )}

      <style>{`
        .portal-settings { display: flex; flex-direction: column; gap: 40px; }
        .settings-header h1 { font-size: 32px; margin-bottom: 8px; }
        .settings-header p { color: var(--text-muted); }

        .settings-grid { display: grid; gap: 32px; }
        .settings-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 32px; }
        .section-title { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; color: var(--primary); }
        .section-title h3 { font-size: 18px; margin: 0; color: white; }

        .security-card { display: flex; flex-direction: column; gap: 24px; }
        .security-item { display: flex; justify-content: space-between; align-items: center; }
        .item-info { display: flex; gap: 16px; align-items: flex-start; }
        .item-title { font-weight: 700; margin: 0; }
        .item-desc { font-size: 13px; color: var(--text-muted); margin: 4px 0 0; }
        
        .status-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; }
        .status-badge.success { background: rgba(16,185,129,0.1); color: #10b981; }

        .setup-container { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border); overflow: hidden; }
        .qr-setup { text-align: center; }
        .qr-frame { background: white; padding: 20px; border-radius: 16px; display: inline-block; margin: 16px 0; }
        .qr-frame img { width: 180px; height: 180px; }
        
        .secret-box { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; display: flex; justify-content: center; align-items: center; gap: 12px; font-size: 13px; }
        .secret-box code { color: var(--primary); font-weight: 700; }
        .copy-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; }

        .code-input { margin: 24px 0; }
        .code-input input { 
          width: 100%; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid var(--border); 
          border-radius: 12px; 
          padding: 16px; 
          text-align: center; 
          font-size: 24px; 
          letter-spacing: 8px;
          color: white;
          outline: none;
        }

        .toast { position: fixed; bottom: 40px; right: 40px; padding: 16px 24px; border-radius: 12px; color: white; z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .toast.success { background: #10b981; }
        .toast.error { background: #ef4444; }
      `}</style>
    </div>
  );
};

export default Settings;
