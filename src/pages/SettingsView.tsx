import { useState } from 'react';
import { getUser } from '../utils/auth';
import { User, Shield, Bell, Palette, Globe, Save } from 'lucide-react';

const SectionCard = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
  <div className="card" style={{ marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <Icon size={18} />
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
    </div>
    {children}
  </div>
);

const FormField = ({ label, children, hint }: { label: string, children: React.ReactNode, hint?: string }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: 'block', fontWeight: 500, fontSize: 14, marginBottom: 8 }}>{label}</label>
    {children}
    {hint && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>{hint}</p>}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-main)',
  fontSize: 14,
  outline: 'none'
};

export const SettingsView = () => {
  const user = getUser();
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    role: user?.role || 'user'
  });

  const [notifications, setNotifications] = useState({
    newTickets: true,
    ticketUpdates: true,
    mentions: true,
    weeklyDigest: false,
    emailAlerts: true,
  });

  const [platform, setPlatform] = useState({
    companyName: 'Vierkorken GmbH',
    supportEmail: 'support@vierkorken.ch',
    defaultLanguage: 'de',
    timezone: 'Europe/Zurich',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // In production: persist to DB via PATCH /api/users/me
  };

  return (
  <div style={{ maxWidth: 900, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Einstellungen</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Verwalte dein Profil, Benachrichtigungen und Plattform-Konfiguration.</p>
      </div>
      <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={handleSave}>
        <Save size={16} /> {saved ? 'Gespeichert ✓' : 'Speichern'}
      </button>
    </div>

    {saved && (
      <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 24, fontWeight: 500 }}>
        ✓ Einstellungen gespeichert.
      </div>
    )}

    {/* Profile */}
    <SectionCard title="Mein Profil" icon={User}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 28, fontWeight: 700 }}>
          {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{profile.firstName} {profile.lastName}</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{profile.email}</div>
          <span className={'badge ' + (profile.role === 'admin' ? 'danger' : 'info')} style={{ marginTop: 6 }}>{profile.role}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Vorname">
          <input style={inputStyle} value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} />
        </FormField>
        <FormField label="Nachname">
          <input style={inputStyle} value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} />
        </FormField>
      </div>
      <FormField label="E-Mail-Adresse" hint="Wird für Login und Benachrichtigungen verwendet.">
        <input style={inputStyle} type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
      </FormField>
    </SectionCard>

    {/* Security */}
    <SectionCard title="Sicherheit" icon={Shield}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <div style={{ fontWeight: 500 }}>Passwort ändern</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>Setze ein neues, sicheres Passwort für deinen Account.</div>
        </div>
        <button style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 500 }}>
          Ändern
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
        <div>
          <div style={{ fontWeight: 500 }}>Microsoft SSO</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>Login über Azure Active Directory (Entra ID).</div>
        </div>
        <span className="badge success">Konfiguriert</span>
      </div>
    </SectionCard>

    {/* Notifications */}
    <SectionCard title="Benachrichtigungen" icon={Bell}>
      {([
        { key: 'newTickets', label: 'Neue Tickets', hint: 'Benachrichtigung bei jedem neuen Ticket' },
        { key: 'ticketUpdates', label: 'Ticket-Updates', hint: 'Benachrichtigung bei Statusänderungen' },
        { key: 'mentions', label: '@Erwähnungen', hint: 'Wenn du in einem Ticket erwähnt wirst' },
        { key: 'emailAlerts', label: 'E-Mail Alerts', hint: 'Wichtige Alerts per E-Mail erhalten' },
        { key: 'weeklyDigest', label: 'Wöchentliche Zusammenfassung', hint: 'Wöchentlicher Report jeden Montag' },
      ] as const).map(item => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ fontWeight: 500 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{item.hint}</div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 24, cursor: 'pointer' }}>
            <input type="checkbox" checked={notifications[item.key]} onChange={e => setNotifications({...notifications, [item.key]: e.target.checked})} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: 'absolute', inset: 0, backgroundColor: notifications[item.key] ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: 12, transition: 'background-color 0.2s' }}>
              <span style={{ position: 'absolute', width: 18, height: 18, backgroundColor: 'white', borderRadius: '50%', top: 3, left: notifications[item.key] ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </span>
          </label>
        </div>
      ))}
    </SectionCard>

    {/* Platform Settings */}
    <SectionCard title="Plattform & Tenant" icon={Globe}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Firmenname">
          <input style={inputStyle} value={platform.companyName} onChange={e => setPlatform({...platform, companyName: e.target.value})} />
        </FormField>
        <FormField label="Support E-Mail">
          <input style={inputStyle} type="email" value={platform.supportEmail} onChange={e => setPlatform({...platform, supportEmail: e.target.value})} />
        </FormField>
        <FormField label="Standard-Sprache">
          <select style={inputStyle} value={platform.defaultLanguage} onChange={e => setPlatform({...platform, defaultLanguage: e.target.value})}>
            <option value="de">Deutsch (DE)</option>
            <option value="en">English (EN)</option>
            <option value="fr">Français (FR)</option>
          </select>
        </FormField>
        <FormField label="Zeitzone">
          <select style={inputStyle} value={platform.timezone} onChange={e => setPlatform({...platform, timezone: e.target.value})}>
            <option value="Europe/Zurich">Europe/Zurich (GMT+1)</option>
            <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
            <option value="UTC">UTC</option>
          </select>
        </FormField>
      </div>
    </SectionCard>

    {/* Appearance */}
    <SectionCard title="Erscheinungsbild" icon={Palette}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 16 }}>
        Das Farbschema kannst du oben rechts in der Topbar über den Mond/Sonne-Button umschalten.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        {(['system', 'light', 'dark'] as const).map(mode => (
          <button key={mode} style={{ padding: '8px 20px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-border)', backgroundColor: mode === 'system' ? 'var(--color-primary)' : 'transparent', color: mode === 'system' ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
            {mode === 'system' ? 'System' : mode === 'light' ? 'Hell' : 'Dunkel'}
          </button>
        ))}
      </div>
    </SectionCard>
  </div>
  );
};
