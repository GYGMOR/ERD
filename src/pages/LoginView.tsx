import { Link } from 'react-router-dom';

export const LoginView = () => (
  <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)', position: 'absolute', top: 0, left: 0, zIndex: 100 }}>
    <div className="card" style={{ width: 400, padding: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: 48, height: 48, backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-lg)', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700 }}>
          N
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Willkommen bei NexService</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '14px' }}>Bitte logge dich ein, um fortzufahren.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-muted)' }}>E-Mail Adresse</label>
          <input type="email" placeholder="bruce@wayne.com" style={{ width: '100%', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '14px', outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-muted)' }}>
            Passwort
            <a href="#" style={{ fontWeight: 400 }}>Passwort vergessen?</a>
          </label>
          <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '14px', outline: 'none' }} />
        </div>
        
        <Link to="/" style={{ width: '100%', marginTop: '8px' }}>
          <button className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
            Anmelden
          </button>
        </Link>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
        Du hast noch kein Kundenkonto? <a href="#" style={{ fontWeight: 500 }}>Support kontaktieren</a>
      </div>
    </div>
  </div>
);
