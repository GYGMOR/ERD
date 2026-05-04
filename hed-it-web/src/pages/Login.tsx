import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, botVerificationChecked: true })
      });

      const data = await response.json();

      if (data.requires2FA) {
        setStep('2fa');
        setTempUserId(data.userId);
      } else if (data.success) {
        login(data.token, data.user);
        navigate('/portal');
      } else {
        setError(data.error || 'Login fehlgeschlagen');
      }
    } catch (err) {
      setError('Verbindung zum Server fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId, code: twoFactorCode })
      });

      const data = await response.json();

      if (data.success) {
        login(data.token, data.user);
        navigate('/portal');
      } else {
        setError(data.error || 'Ungültiger Code');
      }
    } catch (err) {
      setError('Verbindung zum Server fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-login">
      <div className="container" style={{ maxWidth: '450px', padding: '120px 20px' }}>
        <motion.div 
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <h2 className="premium-gradient" style={{ fontSize: '32px', marginBottom: '12px' }}>Willkommen zurück</h2>
            <p style={{ color: 'var(--text-muted)' }}>Loggen Sie sich in Ihr Kundenportal ein.</p>
          </div>

          {error && (
            <motion.div 
              className="error-box"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.form 
                key="login-form"
                onSubmit={handleLoginSubmit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="input-group">
                  <label><Mail size={16} /> E-Mail Adresse</label>
                  <input 
                    type="email" 
                    placeholder="name@firma.ch" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label><Lock size={16} /> Passwort</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button className="btn btn-primary w-full" disabled={isLoading} style={{ marginTop: '12px' }}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Anmelden'} <ArrowRight size={20} />
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="2fa-form"
                onSubmit={handle2FAVerify}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center" style={{ marginBottom: '24px' }}>
                  <Shield size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />

                  <h4>Zweistufige Verifizierung</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Bitte geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
                  </p>
                </div>
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="000 000" 
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '4px' }}
                    required
                  />
                </div>
                <button className="btn btn-primary w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Verifizieren & Anmelden'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-link w-full mt-4" 
                  onClick={() => setStep('login')}
                  style={{ color: 'var(--text-muted)', fontSize: '13px' }}
                >
                  Zurück zum Login
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="text-center mt-8">
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Noch kein Konto? <Link to="/contact" className="nav-link" style={{ color: 'var(--primary)' }}>Kontaktieren Sie uns</Link>
          </p>
        </div>
      </div>

      <style>{`
        .page-login { min-height: 90vh; display: flex; align-items: center; justify-content: center; }
        .login-card { 
          background: var(--bg-card); 
          border: 1px solid var(--border); 
          border-radius: 24px; 
          padding: 48px; 
          box-shadow: 0 40px 100px rgba(0,0,0,0.3);
        }
        .input-group { margin-bottom: 24px; }
        .input-group label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }
        .input-group input { 
          width: 100%; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid var(--border); 
          border-radius: 12px; 
          padding: 14px 18px; 
          color: white; 
          outline: none;
          transition: all 0.3s ease;
        }
        .input-group input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-glow); }
        .error-box { 
          background: rgba(239, 68, 68, 0.1); 
          border: 1px solid rgba(239, 68, 68, 0.2); 
          color: #ef4444; 
          padding: 12px; 
          border-radius: 8px; 
          font-size: 14px; 
          margin-bottom: 24px; 
          text-align: center;
        }
        .btn-link { background: none; border: none; cursor: pointer; text-decoration: underline; }
      `}</style>
    </div>
  );
};

export default Login;
