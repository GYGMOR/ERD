import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Save, RotateCcw, Eye, X, Check } from 'lucide-react';
import { getToken } from '../utils/auth';

const API = '/api';
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

const TEMPLATE_TYPES = [
  { key: 'offer_sent', label: 'Offerte gesendet', description: 'Geht an Kunden wenn eine Offerte verschickt wird', vars: ['{{firstName}}', '{{proposalNumber}}', '{{total}}', '{{portalLink}}'] },
  { key: 'invoice_reminder_before', label: 'Erinnerung vor Fälligkeit', description: '1 Tag vor dem Fälligkeitsdatum', vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}', '{{portalLink}}'] },
  { key: 'invoice_overdue_1', label: 'Zahlungserinnerung (1. Tag)', description: '1 Tag nach Fälligkeit', vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}'] },
  { key: 'mahnung_1', label: '1. Mahnung', description: '7 Tage überfällig', vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}'] },
  { key: 'mahnung_2', label: '2. Mahnung (letzte)', description: '14 Tage überfällig', vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}'] },
  { key: 'payment_confirmed', label: 'Zahlung bestätigt', description: 'Nach Markierung als bezahlt', vars: ['{{firstName}}', '{{invoiceNumber}}', '{{amount}}'] },
  { key: 'contract_renewal_30', label: 'Vertrag läuft aus (30 Tage)', description: 'Kundeninfo über Vertragsende', vars: ['{{firstName}}', '{{contractName}}', '{{endDate}}'] },
  { key: 'welcome', label: 'Willkommen', description: 'Neuer Portal-Account', vars: ['{{firstName}}', '{{email}}', '{{portalLink}}'] },
];

const DEFAULT_TEMPLATES: Record<string, { subject: string; body_html: string }> = {
  offer_sent: {
    subject: 'Ihre Offerte {{proposalNumber}} von HED-IT',
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e293b;padding:32px;text-align:center"><h1 style="color:#fff;margin:0">HED-IT</h1></div>
  <div style="padding:32px;background:#f8fafc">
    <p>Guten Tag {{firstName}}</p>
    <p>Vielen Dank für Ihr Interesse. Ich freue mich, Ihnen unsere Offerte <strong>{{proposalNumber}}</strong> zu unterbreiten.</p>
    <p style="font-size:24px;font-weight:bold;color:#1e293b">CHF {{total}}</p>
    <a href="{{portalLink}}" style="display:inline-block;background:#1e293b;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px">Offerte ansehen & signieren →</a>
    <p style="margin-top:24px;color:#64748b;font-size:13px">Fragen? Antworten Sie einfach auf diese E-Mail oder rufen Sie mich an.</p>
    <p style="color:#64748b;font-size:13px">Mit freundlichen Grüssen<br><strong>Joel Hediger</strong><br>HED-IT · joel.hediger@hed-it.ch</p>
  </div>
</div>`
  },
  payment_confirmed: {
    subject: 'Zahlung bestätigt – Rechnung {{invoiceNumber}}',
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e293b;padding:32px;text-align:center"><h1 style="color:#fff;margin:0">HED-IT</h1></div>
  <div style="padding:32px;background:#f0fdf4">
    <div style="font-size:48px;text-align:center;margin-bottom:16px">✅</div>
    <h2 style="text-align:center;color:#16a34a">Zahlung eingegangen!</h2>
    <p>Guten Tag {{firstName}}</p>
    <p>Ihre Zahlung von <strong>CHF {{amount}}</strong> für Rechnung <strong>{{invoiceNumber}}</strong> wurde erfolgreich verbucht.</p>
    <p style="color:#64748b;font-size:13px">Vielen Dank für Ihr Vertrauen.<br>Mit freundlichen Grüssen<br><strong>Joel Hediger</strong><br>HED-IT</p>
  </div>
</div>`
  },
};

interface Template {
  id: string;
  type: string;
  subject: string;
  body_html: string;
}

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
    const def = DEFAULT_TEMPLATES[selectedType];
    setSubject(existing?.subject || def?.subject || '');
    setBodyHtml(existing?.body_html || def?.body_html || '');
    setSaved(false);
  }, [selectedType, templates]);

  const save = async () => {
    setSaving(true);
    await fetch(`${API}/email-templates`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ type: selectedType, subject, body_html: bodyHtml }) });
    setSaving(false); setSaved(true);
    load();
    setTimeout(() => setSaved(false), 3000);
  };

  const resetToDefault = () => {
    const def = DEFAULT_TEMPLATES[selectedType];
    if (def) { setSubject(def.subject); setBodyHtml(def.body_html); }
  };

  const typeInfo = TEMPLATE_TYPES.find(t => t.key === selectedType)!;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center"><Mail className="text-indigo-400" size={20} /></div>
        <div><h1 className="text-2xl font-bold text-white">E-Mail Vorlagen</h1><p className="text-slate-400 text-sm">Alle automatischen E-Mails anpassen</p></div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Template list */}
        <div className="col-span-4 space-y-2">
          {TEMPLATE_TYPES.map(t => {
            const hasCustom = templates.some(tmpl => tmpl.type === t.key);
            return (
              <button key={t.key} onClick={() => setSelectedType(t.key)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedType === t.key ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-800/40 border-slate-700/30 hover:border-slate-600'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{t.label}</span>
                  {hasCustom && <span className="text-[10px] bg-indigo-900/40 text-indigo-400 px-2 py-0.5 rounded-full">Angepasst</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{t.description}</div>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="col-span-8 space-y-4">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{typeInfo.label}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{typeInfo.description}</p>
              </div>
              <div className="flex gap-2">
                {DEFAULT_TEMPLATES[selectedType] && (
                  <button onClick={resetToDefault} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-700 px-3 py-1.5 rounded-lg">
                    <RotateCcw size={12} /> Standard
                  </button>
                )}
                <button onClick={() => setPreview(!preview)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-700 px-3 py-1.5 rounded-lg">
                  <Eye size={12} /> {preview ? 'Editor' : 'Vorschau'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Betreff</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm" />
            </div>

            {/* Variables */}
            <div className="flex flex-wrap gap-2">
              {typeInfo.vars.map(v => (
                <button key={v} onClick={() => setBodyHtml(h => h + v)}
                  className="text-[11px] bg-slate-700 hover:bg-slate-600 text-blue-300 px-2 py-1 rounded-lg font-mono cursor-pointer">
                  {v}
                </button>
              ))}
            </div>

            {preview ? (
              <div className="border border-slate-700 rounded-xl overflow-hidden">
                <iframe srcDoc={bodyHtml} className="w-full h-80 bg-white" title="E-Mail Vorschau" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">HTML Inhalt</label>
                <textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={16}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm font-mono text-xs" />
              </div>
            )}

            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-semibold text-sm">
              {saved ? <><Check size={16} /> Gespeichert</> : saving ? 'Speichern...' : <><Save size={16} /> Vorlage speichern</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
