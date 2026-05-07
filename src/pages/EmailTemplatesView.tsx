import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Save, RotateCcw, Eye, Check } from 'lucide-react';
import { getToken } from '../utils/auth';

const API = '/api';
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

const TEMPLATE_TYPES = [
  { key: 'offer_sent',           label: 'Offerte gesendet',          desc: 'Wenn eine Offerte verschickt wird',        vars: ['{{firstName}}', '{{proposalNumber}}', '{{total}}'] },
  { key: 'invoice_reminder_before', label: 'Erinnerung vor Fälligkeit', desc: '1 Tag vor dem Fälligkeitsdatum',         vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}'] },
  { key: 'invoice_overdue_1',    label: 'Zahlungserinnerung',         desc: '1 Tag nach Fälligkeit',                   vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}'] },
  { key: 'mahnung_1',            label: '1. Mahnung',                 desc: '7 Tage überfällig',                       vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}'] },
  { key: 'mahnung_2',            label: '2. Mahnung (letzte)',         desc: '14 Tage überfällig',                      vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}'] },
  { key: 'payment_confirmed',    label: 'Zahlung bestätigt',          desc: 'Nach Markierung als bezahlt',             vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}'] },
  { key: 'contract_renewal_30',  label: 'Vertrag läuft aus (30 Tage)',desc: '30 Tage vor Vertragsende',                vars: ['{{firstName}}', '{{contractName}}', '{{endDate}}'] },
  { key: 'welcome',              label: 'Willkommen',                 desc: 'Neuer Portal-Account',                    vars: ['{{firstName}}', '{{email}}', '{{portalLink}}'] },
];

const DEFAULTS: Record<string, { subject: string; body_html: string }> = {
  offer_sent: {
    subject: 'Ihre Offerte {{proposalNumber}} von HED-IT',
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc">
  <div style="background:#1e293b;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">HED-IT</h1>
    <p style="color:#94a3b8;margin:8px 0 0;font-size:13px">IT-Dienstleistungen & Webentwicklung</p>
  </div>
  <div style="padding:32px;background:#fff">
    <p style="font-size:15px;color:#1e293b">Guten Tag {{firstName}}</p>
    <p style="color:#475569">Vielen Dank für Ihr Interesse. Ich freue mich, Ihnen unsere Offerte <strong>{{proposalNumber}}</strong> zu unterbreiten.</p>
    <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
      <p style="font-size:28px;font-weight:800;color:#1e293b;margin:0">CHF {{total}}</p>
    </div>
    <a href="https://portal.hed-it.ch/portal/offers" style="display:inline-block;background:#1e293b;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700">Offerte ansehen & signieren →</a>
    <p style="margin-top:24px;color:#64748b;font-size:13px">Mit freundlichen Grüssen<br><strong>Joel Hediger</strong><br>HED-IT · joel.hediger@hed-it.ch</p>
  </div>
</div>`,
  },
  payment_confirmed: {
    subject: 'Zahlung bestätigt – Rechnung {{invoiceNumber}}',
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e293b;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0">HED-IT</h1>
  </div>
  <div style="padding:32px;background:#f0fdf4">
    <div style="font-size:48px;text-align:center;margin-bottom:16px">✅</div>
    <h2 style="text-align:center;color:#16a34a">Zahlung eingegangen!</h2>
    <p>Guten Tag {{firstName}}</p>
    <p>Ihre Zahlung von <strong>CHF {{amount}}</strong> für Rechnung <strong>{{invoiceNumber}}</strong> wurde erfolgreich verbucht.</p>
    <p style="color:#64748b;font-size:13px">Vielen Dank!<br><strong>Joel Hediger</strong> · HED-IT</p>
  </div>
</div>`,
  },
};

interface Template { id: string; type: string; subject: string; body_html: string; }

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: 13, boxSizing: 'border-box' };

export function EmailTemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedType, setSelectedType] = useState(TEMPLATE_TYPES[0].key);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/email-templates`, { headers: authHeaders() });
    const d = await r.json();
    if (d.success) setTemplates(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const existing = templates.find(t => t.type === selectedType);
    const def = DEFAULTS[selectedType];
    setSubject(existing?.subject || def?.subject || '');
    setBodyHtml(existing?.body_html || def?.body_html || '');
    setSaved(false);
    setPreview(false);
  }, [selectedType, templates]);

  const save = async () => {
    setSaving(true);
    await fetch(`${API}/email-templates`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ type: selectedType, subject, body_html: bodyHtml }) });
    setSaving(false); setSaved(true); load();
    setTimeout(() => setSaved(false), 3000);
  };

  const resetToDefault = () => {
    const def = DEFAULTS[selectedType];
    if (def) { setSubject(def.subject); setBodyHtml(def.body_html); }
    else { setSubject(''); setBodyHtml(''); }
  };

  const typeInfo = TEMPLATE_TYPES.find(t => t.key === selectedType)!;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
          <Mail size={22} color="var(--color-primary)" /> E-Mail Vorlagen
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '4px 0 0' }}>Alle automatischen E-Mails anpassen</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Template List */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-muted)', marginBottom: 10 }}>Vorlagen</div>
          {TEMPLATE_TYPES.map(t => {
            const hasCustom = templates.some(tmpl => tmpl.type === t.key);
            const isActive = selectedType === t.key;
            return (
              <button key={t.key} onClick={() => setSelectedType(t.key)} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 4, borderRadius: 10, border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`, background: isActive ? 'rgba(76,154,255,0.08)' : 'var(--color-surface)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)' }}>{t.label}</span>
                  {hasCustom && <span style={{ fontSize: 10, background: 'rgba(76,154,255,0.15)', color: 'var(--color-primary)', borderRadius: 8, padding: '1px 6px', fontWeight: 700 }}>Angepasst</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="card" style={{ padding: 24 }}>
          {/* Editor Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{typeInfo.label}</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>{typeInfo.desc}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {DEFAULTS[selectedType] && (
                <button onClick={resetToDefault} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <RotateCcw size={13} /> Standard
                </button>
              )}
              <button onClick={() => setPreview(!preview)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: preview ? 'var(--color-primary)' : 'var(--color-surface)', color: preview ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12 }}>
                <Eye size={13} /> {preview ? 'Editor' : 'Vorschau'}
              </button>
            </div>
          </div>

          {/* Betreff */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Betreff</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} placeholder="E-Mail Betreff..." />
          </div>

          {/* Variables */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Verfügbare Variablen — Klick zum Einfügen</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {typeInfo.vars.map(v => (
                <button key={v} onClick={() => setBodyHtml(h => h + v)}
                  style={{ fontFamily: 'monospace', fontSize: 12, background: 'rgba(76,154,255,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(76,154,255,0.2)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {preview ? (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Vorschau</label>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden', height: 380 }}>
                <iframe srcDoc={bodyHtml} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title="E-Mail Vorschau" />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>HTML Inhalt</label>
              <textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={14}
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={save} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {saved ? <><Check size={15} /> Gespeichert!</> : saving ? 'Speichern...' : <><Save size={15} /> Vorlage speichern</>}
            </button>
            {saved && <span style={{ fontSize: 12, color: '#10b981' }}>Die Vorlage wird ab sofort für alle automatischen E-Mails verwendet.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
