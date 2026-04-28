import { useState } from 'react';
import { Mail, KeyRound, Shield } from 'lucide-react';

export const ClientLoginView = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        // Double check if role is customer/client
        const role = data.user.role;
        if (role !== 'customer' && role !== 'client') {
            setErrorMsg('Dieser Zugang ist nur für Kunden. Bitte nutzen Sie den internen Login.');
            return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin();
      } else {
        setErrorMsg(data.error || 'Login fehlgeschlagen');
      }
    } catch (err) {
      setErrorMsg('Serververbindung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      position: 'absolute', top: 0, left: 0, zIndex: 100 
    }}>
      <style>{`
        @media (max-width: 480px) {
          .client-login-card { padding: 24px !important; width: 95% !important; }
        }
      `}</style>
      <div className="card client-login-card animate-in fade-in zoom-in duration-300" style={{ width: '90%', maxWidth: 420, padding: 40, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            width: 64, height: 64, backgroundColor: 'var(--color-primary)', borderRadius: 16, 
            margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: 'white', fontSize: 32, fontWeight: 700, boxShadow: '0 10px 15px -3px rgba(0, 82, 204, 0.3)'
          }}>
            N
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-main)' }}>Kundenportal</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 8, fontSize: 14 }}>Melden Sie sich an, um Ihre Tickets und Projekte zu verwalten.</p>
        </div>

        {errorMsg && (
          <div style={{ 
            padding: '12px 16px', marginBottom: 20, backgroundColor: 'rgba(255, 86, 48, 0.1)', 
            borderLeft: '4px solid var(--color-danger)', color: 'var(--color-danger)', fontSize: 13, fontWeight: 500 
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)' }}>E-Mail Adresse</label>
            <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                    type="email" 
                    placeholder="ihre@email.de" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: 14, outline: 'none' }} 
                />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)' }}>
              Passwort
              <a href="#" style={{ fontWeight: 400, color: 'var(--color-primary)' }}>Passwort vergessen?</a>
            </label>
            <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                    type="password" 
                    placeholder="••••••••" 
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: 14, outline: 'none' }} 
                />
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 600, marginTop: 10 }}>
            {loading ? 'Anmelden...' : 'Im Portal anmelden'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Shield size={14} /> Sicherer Zugang für unsere Partner & Kunden
        </div>
      </div>
    </div>
  );
};
