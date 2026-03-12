import { useState, useEffect } from 'react';
import { 
  Shield, Bell, Globe, Save, Database, Mail, 
  Layout, Users as UsersIcon, Calendar as CalendarIcon, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';

const SectionHeader = ({ title, description }: { title: string, description?: string }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>{title}</h3>
    {description && <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>{description}</p>}
  </div>
);

const FormField = ({ label, children, hint, required }: { label: string, children: React.ReactNode, hint?: string, required?: boolean }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--color-text-main)' }}>
      {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.4 }}>{hint}</p>}
  </div>
);

const TabButton = ({ active, label, icon: Icon, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
      borderRadius: 'var(--radius-md)', width: '100%', textAlign: 'left',
      backgroundColor: active ? 'rgba(0, 82, 204, 0.08)' : 'transparent',
      color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
      fontWeight: active ? 600 : 500, fontSize: 13, transition: 'all 0.2s',
      marginBottom: 2
    }}
  >
    <Icon size={16} />
    <span>{label}</span>
  </button>
);

export const SettingsView = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form States
  const [general, setGeneral] = useState({
    companyName: 'NexService IT Solutions',
    supportPhone: '+41 44 123 45 67',
    supportEmail: 'support@nexservice.ch',
    address: 'Bahnhofstrasse 1, 8001 Zürich',
    language: 'de'
  });

  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: 'tool',
    user: 'postgres',
    password: '',
    ssl: false
  });

  const [emailConfig, setEmailConfig] = useState({
    provider: 'smtp', // smtp, m365, gmail
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    encryption: 'tls',
    senderName: 'NexService Support',
    senderEmail: '',
    clientId: '',
    clientSecret: '',
    tenantId: ''
  });

  const [calendarSettings, setCalendarSettings] = useState({
    defaultView: 'week',
    timeInterval: '15',
    workStart: '08:00',
    workEnd: '18:00',
    weekStart: '1' // 1 = Monday
  });

  const [notifySettings, setNotifySettings] = useState({
    inAppTickets: true,
    inAppCalendar: true,
    emailTickets: false,
    emailCalendar: true,
    reminderMinutes: '15'
  });

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (e) {
      console.error('Failed to fetch users');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const { data } = await res.json();
      if (data) {
        const gen = { ...general };
        const db = { ...dbConfig };
        const mail = { ...emailConfig };
        const cal = { ...calendarSettings };
        const notif = { ...notifySettings };

        data.forEach((item: any) => {
          if (item.category === 'general' && gen.hasOwnProperty(item.key)) (gen as any)[item.key] = item.value;
          if (item.category === 'system' && db.hasOwnProperty(item.key)) (db as any)[item.key] = item.value;
          if (item.category === 'email' && mail.hasOwnProperty(item.key)) (mail as any)[item.key] = item.value;
          if (item.category === 'calendar' && cal.hasOwnProperty(item.key)) (cal as any)[item.key] = item.value;
          if (item.category === 'notifications' && notif.hasOwnProperty(item.key)) (notif as any)[item.key] = item.value;
        });
        setGeneral(gen);
        setDbConfig(db);
        setEmailConfig(mail);
        setCalendarSettings(cal);
        setNotifySettings(notif);
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  const handleSave = async (category: string, config: any) => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(config)) {
        if (value === '********') continue; // Skip saving masked secrets
        await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            category, 
            key, 
            value,
            is_secret: key.toLowerCase().includes('password') || key.toLowerCase().includes('pass') || key.toLowerCase().includes('secret')
          })
        });
      }
      alert('Einstellungen für ' + category + ' gespeichert!');
    } catch (e) {
      alert('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test-db', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(dbConfig)
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.success ? 'Erfolgreich verbunden!' : data.error });
    } catch (e) {
      setTestResult({ success: false, message: 'Verbindung zum Backend fehlgeschlagen.' });
    } finally {
      setTestLoading(false);
    }
  };

  const sendTestEmail = async () => {
    const recipient = prompt('Empfänger E-Mail Adresse:');
    if (!recipient) return;

    setTestLoading(true);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...emailConfig, recipientEmail: recipient })
      });
      const data = await res.json();
      alert(data.success ? data.message : 'Fehler: ' + data.error);
    } catch (e) {
      alert('Test fehlgeschlagen.');
    } finally {
      setTestLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Allgemeine Informationen" description="Stammdaten und Branding für deine Organisation." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <FormField label="Organisation / Firmenname" required>
                <input className="input-field" value={general.companyName} onChange={e => setGeneral({...general, companyName: e.target.value})} />
              </FormField>
              <FormField label="Standard Support E-Mail">
                <input className="input-field" value={general.supportEmail} onChange={e => setGeneral({...general, supportEmail: e.target.value})} />
              </FormField>
              <FormField label="Support Telefonnummer">
                <input className="input-field" value={general.supportPhone} onChange={e => setGeneral({...general, supportPhone: e.target.value})} />
              </FormField>
              <FormField label="Sprache">
                <select className="input-field" value={general.language} onChange={e => setGeneral({...general, language: e.target.value})}>
                  <option value="de">Deutsch (Schweiz)</option>
                  <option value="en">English (US)</option>
                  <option value="fr">Français</option>
                </select>
              </FormField>
            </div>
            <FormField label="Adresse">
              <textarea className="input-field" rows={3} style={{ resize: 'none' }} value={general.address} onChange={e => setGeneral({...general, address: e.target.value})} />
            </FormField>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => handleSave('general', general)} disabled={saving}>
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 
                <span style={{ marginLeft: 8 }}>Speichern</span>
              </button>
            </div>
          </div>
        );
      case 'system':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Datenbank-Einstellungen" description="Verwalte die Verbindung zur Hauptdatenbank (PostgreSQL)." />
            
            <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 24, borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                <span style={{ fontWeight: 600 }}>Status: System konfiguriert</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16 }}>
              <FormField label="Host">
                <input className="input-field" value={dbConfig.host} onChange={e => setDbConfig({...dbConfig, host: e.target.value})} />
              </FormField>
              <FormField label="Port">
                <input className="input-field" value={dbConfig.port} onChange={e => setDbConfig({...dbConfig, port: e.target.value})} />
              </FormField>
            </div>
            <FormField label="Datenbankname">
              <input className="input-field" value={dbConfig.database} onChange={e => setDbConfig({...dbConfig, database: e.target.value})} />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Benutzername">
                <input className="input-field" value={dbConfig.user} onChange={e => setDbConfig({...dbConfig, user: e.target.value})} />
              </FormField>
              <FormField label="Passwort">
                <input className="input-field" type="password" placeholder="********" value={dbConfig.password} onChange={e => setDbConfig({...dbConfig, password: e.target.value})} />
              </FormField>
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-secondary" onClick={testConnection} disabled={testLoading}>
                {testLoading ? 'Teste...' : 'Verbindung testen'}
              </button>
              <button className="btn-primary" onClick={() => handleSave('system', dbConfig)}>
                Speichern
              </button>
            </div>

            {testResult && (
              <div style={{ 
                marginTop: 16, padding: 12, borderRadius: 'var(--radius-md)', 
                backgroundColor: testResult.success ? 'rgba(54, 179, 126, 0.1)' : 'rgba(255, 86, 48, 0.1)',
                color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)',
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500
              }}>
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {testResult.message}
              </div>
            )}
          </div>
        );
      case 'email':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="E-Mail-Server" description="Konfiguriere SMTP oder Microsoft 365 für den Postausgang." />
            
            <FormField label="E-Mail Provider">
              <select className="input-field" value={emailConfig.provider} onChange={e => setEmailConfig({...emailConfig, provider: e.target.value})}>
                <option value="smtp">Standard SMTP / IMAP</option>
                <option value="m365">Microsoft 365 (OAuth2)</option>
                <option value="gmail">Google Workspace</option>
              </select>
            </FormField>

            {emailConfig.provider === 'smtp' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16 }}>
                  <FormField label="SMTP Host">
                    <input className="input-field" placeholder="smtp.gmail.com" value={emailConfig.smtpHost} onChange={e => setEmailConfig({...emailConfig, smtpHost: e.target.value})} />
                  </FormField>
                  <FormField label="Port">
                    <input className="input-field" placeholder="587" value={emailConfig.smtpPort} onChange={e => setEmailConfig({...emailConfig, smtpPort: e.target.value})} />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <FormField label="SMTP Benutzer">
                    <input className="input-field" value={emailConfig.smtpUser} onChange={e => setEmailConfig({...emailConfig, smtpUser: e.target.value})} />
                  </FormField>
                  <FormField label="SMTP Passwort">
                    <input className="input-field" type="password" placeholder="********" value={emailConfig.smtpPass} onChange={e => setEmailConfig({...emailConfig, smtpPass: e.target.value})} />
                  </FormField>
                </div>
              </>
            ) : (
              <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <SectionHeader title="Microsoft 365 Konfiguration" />
                <FormField label="Client ID">
                  <input className="input-field" value={emailConfig.clientId} onChange={e => setEmailConfig({...emailConfig, clientId: e.target.value})} />
                </FormField>
                <FormField label="Client Secret">
                  <input className="input-field" type="password" placeholder="********" value={emailConfig.clientSecret} onChange={e => setEmailConfig({...emailConfig, clientSecret: e.target.value})} />
                </FormField>
                <FormField label="Tenant ID (optional)">
                  <input className="input-field" value={emailConfig.tenantId} onChange={e => setEmailConfig({...emailConfig, tenantId: e.target.value})} />
                </FormField>
              </div>
            )}

            <SectionHeader title="Absender" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Absender Name">
                <input className="input-field" value={emailConfig.senderName} onChange={e => setEmailConfig({...emailConfig, senderName: e.target.value})} />
              </FormField>
              <FormField label="Absender E-Mail">
                <input className="input-field" placeholder="no-reply@ihreduain.ch" value={emailConfig.senderEmail} onChange={e => setEmailConfig({...emailConfig, senderEmail: e.target.value})} />
              </FormField>
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={sendTestEmail} disabled={testLoading}>Test-Mail senden</button>
              <button className="btn-primary" onClick={() => handleSave('email', emailConfig)} disabled={saving}>Speichern</button>
            </div>
          </div>
        );
      case 'portal':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Kundenportal" description="Design und Zugangsberechtigungen für Kunden." />
            <FormField label="Portal aktiv">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" defaultChecked /> <span>Kunden können sich einloggen</span>
              </div>
            </FormField>
            <FormField label="Willkommensnachricht">
              <textarea className="input-field" rows={4} placeholder="Willkommen in Ihrem Support-Center..." />
            </FormField>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => handleSave('portal', { active: true })}>Speichern</button>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Benutzer & Rollen" description="Verwalte den Zugriff für dein Team." />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 0' }}>Benutzer</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <span style={{ fontWeight: 600 }}>{user.first_name} {user.last_name}</span>
                    </td>
                    <td><span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{user.email}</span></td>
                    <td>
                      <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, backgroundColor: 'rgba(0, 82, 204, 0.1)', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 700 }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></div>
                        <span style={{ fontSize: 12 }}>Aktiv</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'calendar':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Kalender-Einstellungen" description="Lege Standardwerte für die interne Zeitplanung fest." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <FormField label="Standard-Ansicht">
                <select className="input-field" value={calendarSettings.defaultView} onChange={e => setCalendarSettings({...calendarSettings, defaultView: e.target.value})}>
                  <option value="day">Tag</option>
                  <option value="week">Woche</option>
                  <option value="month">Monat</option>
                </select>
              </FormField>
              <FormField label="Zeitintervall">
                <select className="input-field" value={calendarSettings.timeInterval} onChange={e => setCalendarSettings({...calendarSettings, timeInterval: e.target.value})}>
                  <option value="15">15 Minuten</option>
                  <option value="30">30 Minuten</option>
                  <option value="60">1 Stunde</option>
                </select>
              </FormField>
              <FormField label="Arbeitsbeginn">
                <input type="time" className="input-field" value={calendarSettings.workStart} onChange={e => setCalendarSettings({...calendarSettings, workStart: e.target.value})} />
              </FormField>
              <FormField label="Arbeitsende">
                <input type="time" className="input-field" value={calendarSettings.workEnd} onChange={e => setCalendarSettings({...calendarSettings, workEnd: e.target.value})} />
              </FormField>
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => handleSave('calendar', calendarSettings)} disabled={saving}>
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 
                <span style={{ marginLeft: 8 }}>Speichern</span>
              </button>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Benachrichtigungen" description="Wähle aus, worüber du informiert werden möchtest." />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                <SectionHeader title="In-App Benachrichtigungen" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <input type="checkbox" checked={notifySettings.inAppTickets} onChange={e => setNotifySettings({...notifySettings, inAppTickets: e.target.checked})} />
                  <span>Ticket-Updates & Zuweisungen</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="checkbox" checked={notifySettings.inAppCalendar} onChange={e => setNotifySettings({...notifySettings, inAppCalendar: e.target.checked})} />
                  <span>Kalender-Einladungen</span>
                </label>
              </div>

              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                <SectionHeader title="E-Mail Benachrichtigungen" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <input type="checkbox" checked={notifySettings.emailTickets} onChange={e => setNotifySettings({...notifySettings, emailTickets: e.target.checked})} />
                  <span>Ticket-Benachrichtigungen per Mail</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="checkbox" checked={notifySettings.emailCalendar} onChange={e => setNotifySettings({...notifySettings, emailCalendar: e.target.checked})} />
                  <span>Terminbestätigungen per Mail</span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => handleSave('notifications', notifySettings)} disabled={saving}>Speichern</button>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Sicherheit & Zugriff" description="Schütze dein Konto und verwalte Berechtigungen." />
            
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 24 }}>
              <SectionHeader title="Passwort ändern" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                <FormField label="Aktuelles Passwort">
                  <input type="password" placeholder="********" className="input-field" />
                </FormField>
                <FormField label="Neues Passwort">
                  <input type="password" placeholder="********" className="input-field" />
                </FormField>
                <button className="btn-secondary" style={{ alignSelf: 'start' }}>Passwort aktualisieren</button>
              </div>
            </div>

            <SectionHeader title="Aktive Sitzungen" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Windows • Chrome</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Zürich, Schweiz • Aktuelle Sitzung</div>
                </div>
                <button className="btn-secondary" disabled style={{ fontSize: 12 }}>Sitzung beenden</button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <RefreshCw size={48} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>Dieser Einstellungsbereich ({activeTab}) wird gerade vorbereitet.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px 1fr', gap: 40 }}>
      {/* Sidebar Nav */}
      <aside>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Einstellungen</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>System & Konfiguration</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <TabButton active={activeTab === 'general'} label="Allgemein" icon={Globe} onClick={() => setActiveTab('general')} />
          <TabButton active={activeTab === 'system'} label="System / DB" icon={Database} onClick={() => setActiveTab('system')} />
          <TabButton active={activeTab === 'email'} label="E-Mail" icon={Mail} onClick={() => setActiveTab('email')} />
          <TabButton active={activeTab === 'portal'} label="Kundenportal" icon={Layout} onClick={() => setActiveTab('portal')} />
          <TabButton active={activeTab === 'users'} label="Benutzer & Rollen" icon={UsersIcon} onClick={() => setActiveTab('users')} />
          <TabButton active={activeTab === 'calendar'} label="Kalender" icon={CalendarIcon} onClick={() => setActiveTab('calendar')} />
          <TabButton active={activeTab === 'notifications'} label="Notifications" icon={Bell} onClick={() => setActiveTab('notifications')} />
          <TabButton active={activeTab === 'security'} label="Sicherheit" icon={Shield} onClick={() => setActiveTab('security')} />
        </div>
      </aside>

      {/* Content Area */}
      <main className="card" style={{ alignSelf: 'start', padding: 32, minHeight: 600 }}>
        {renderTabContent()}
      </main>
    </div>
  );
};

