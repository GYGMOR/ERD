import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw, Send } from 'lucide-react';
import { getToken } from '../utils/auth';

const API = '/api';
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

const STAGES = [
  { key: 'lead',          label: 'Lead',              color: '#8c9bab', bg: 'rgba(140,155,171,0.08)', border: 'rgba(140,155,171,0.2)' },
  { key: 'qualified',     label: 'Qualifiziert',      color: '#4c9aff', bg: 'rgba(76,154,255,0.08)', border: 'rgba(76,154,255,0.2)' },
  { key: 'proposal_sent', label: 'Offerte gesendet',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
  { key: 'negotiation',   label: 'Verhandlung',       color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  { key: 'won',           label: 'Gewonnen ✓',        color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  { key: 'lost',          label: 'Verloren',          color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
];

interface Proposal {
  id: string; proposal_number?: string; title: string; total: number;
  status: string; pipeline_stage: string; company_name?: string;
  created_at: string; is_draft?: boolean; sent_at?: string;
}

const chf = (n: number) => n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const chf2 = (n: number) => n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SalesPipelineView() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/proposals`, { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setProposals(d.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStage = async (id: string, stage: string) => {
    setMovingId(id);
    await fetch(`${API}/proposals/${id}/stage`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ stage }) });
    setProposals(ps => ps.map(p => p.id === id ? { ...p, pipeline_stage: stage } : p));
    setMovingId(null);
  };

  const sendProposal = async (id: string) => {
    setSending(id);
    await fetch(`${API}/proposals/${id}/send`, { method: 'POST', headers: authHeaders() });
    load();
    setSending(null);
  };

  const stageGroups = STAGES.reduce((acc, s) => {
    acc[s.key] = proposals.filter(p => (p.pipeline_stage || 'lead') === s.key);
    return acc;
  }, {} as Record<string, Proposal[]>);

  const activeDeals = proposals.filter(p => !['won', 'lost'].includes(p.pipeline_stage || 'lead'));
  const totalPipeline = activeDeals.reduce((s, p) => s + parseFloat(String(p.total || 0)), 0);
  const wonValue = stageGroups['won']?.reduce((s, p) => s + parseFloat(String(p.total || 0)), 0) || 0;
  const lostValue = stageGroups['lost']?.reduce((s, p) => s + parseFloat(String(p.total || 0)), 0) || 0;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <TrendingUp size={22} color="var(--color-primary)" /> Sales Pipeline
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '4px 0 0' }}>Offerten und Deals im Überblick</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted)' }}>
          <RefreshCw size={14} /> Aktualisieren
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pipeline-Wert', value: `CHF ${chf(totalPipeline)}`, sub: `${activeDeals.length} aktive Deals`, color: 'var(--color-primary)' },
          { label: 'Gewonnen', value: `CHF ${chf(wonValue)}`, sub: `${stageGroups['won']?.length || 0} Deals`, color: '#10b981' },
          { label: 'Verloren', value: `CHF ${chf(lostValue)}`, sub: `${stageGroups['lost']?.length || 0} Deals`, color: '#ef4444' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: 18, borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Lädt...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, overflowX: 'auto', minWidth: 900 }}>
          {STAGES.map(stage => (
            <div key={stage.key} style={{ background: stage.bg, border: `1px solid ${stage.border}`, borderRadius: 14, padding: 12, minHeight: 280 }}>
              {/* Stage Header */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: stage.color }}>{stage.label}</span>
                  <span style={{ fontSize: 11, background: 'var(--color-surface)', border: `1px solid ${stage.border}`, color: stage.color, borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>{stageGroups[stage.key]?.length || 0}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
                  CHF {chf(stageGroups[stage.key]?.reduce((s, p) => s + parseFloat(String(p.total || 0)), 0) || 0)}
                </div>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(stageGroups[stage.key] || []).map(proposal => (
                  <div key={proposal.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, opacity: movingId === proposal.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-main)', marginBottom: 3, lineHeight: 1.3 }}>{proposal.title}</div>
                    {proposal.company_name && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>{proposal.company_name}</div>}
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8 }}>CHF {chf2(parseFloat(String(proposal.total || 0)))}</div>

                    {proposal.is_draft && (
                      <button onClick={() => sendProposal(proposal.id)} disabled={sending === proposal.id}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6, opacity: sending === proposal.id ? 0.6 : 1 }}>
                        <Send size={11} /> {sending === proposal.id ? 'Senden...' : 'Senden'}
                      </button>
                    )}

                    {/* Move buttons */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {STAGES.filter(s => s.key !== stage.key).map(s => (
                        <button key={s.key} onClick={() => updateStage(proposal.id, s.key)}
                          style={{ fontSize: 10, background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          → {s.label.replace(' ✓', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {(stageGroups[stage.key] || []).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--color-text-muted)', opacity: 0.5 }}>Leer</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
