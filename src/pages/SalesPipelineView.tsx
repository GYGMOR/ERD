import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Eye, ChevronRight, Send, RefreshCw, Plus } from 'lucide-react';
import { getToken } from '../utils/auth';

const API = '/api';
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

const STAGES: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'lead', label: 'Lead', color: 'text-slate-400', bg: 'bg-slate-700/40' },
  { key: 'qualified', label: 'Qualifiziert', color: 'text-blue-400', bg: 'bg-blue-900/20' },
  { key: 'proposal_sent', label: 'Offerte gesendet', color: 'text-purple-400', bg: 'bg-purple-900/20' },
  { key: 'negotiation', label: 'Verhandlung', color: 'text-amber-400', bg: 'bg-amber-900/20' },
  { key: 'won', label: 'Gewonnen ✓', color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
  { key: 'lost', label: 'Verloren', color: 'text-red-400', bg: 'bg-red-900/20' },
];

interface Proposal {
  id: string;
  proposal_number?: string;
  title: string;
  total: number;
  status: string;
  pipeline_stage: string;
  company_name?: string;
  created_at: string;
  is_draft?: boolean;
  sent_at?: string;
}

export function SalesPipelineView() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/proposals?include_draft=true`, { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setProposals(d.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStage = async (id: string, stage: string) => {
    await fetch(`${API}/proposals/${id}/stage`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ stage }) });
    setProposals(ps => ps.map(p => p.id === id ? { ...p, pipeline_stage: stage } : p));
  };

  const sendProposal = async (id: string) => {
    setSending(id);
    try {
      await fetch(`${API}/proposals/${id}/send`, { method: 'POST', headers: authHeaders() });
      load();
    } finally { setSending(null); }
  };

  const stageGroups = STAGES.reduce((acc, s) => {
    acc[s.key] = proposals.filter(p => (p.pipeline_stage || 'lead') === s.key);
    return acc;
  }, {} as Record<string, Proposal[]>);

  const totalPipeline = proposals.filter(p => !['won', 'lost'].includes(p.pipeline_stage || 'lead')).reduce((s, p) => s + parseFloat(String(p.total)), 0);
  const wonValue = stageGroups['won']?.reduce((s, p) => s + parseFloat(String(p.total)), 0) || 0;
  const lostValue = stageGroups['lost']?.reduce((s, p) => s + parseFloat(String(p.total)), 0) || 0;

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><TrendingUp className="text-purple-400" size={20} /></div>
          <div><h1 className="text-2xl font-bold text-white">Sales Pipeline</h1><p className="text-slate-400 text-sm">Offerten und Deals im Überblick</p></div>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-white"><RefreshCw size={18} /></button>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Pipeline-Wert</div>
          <div className="text-2xl font-bold text-white">CHF {totalPipeline.toLocaleString('de-CH', { minimumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-500 mt-1">{proposals.filter(p => !['won', 'lost'].includes(p.pipeline_stage || 'lead')).length} aktive Deals</div>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4">
          <div className="text-xs text-emerald-400 mb-1">Gewonnen</div>
          <div className="text-2xl font-bold text-emerald-400">CHF {wonValue.toLocaleString('de-CH', { minimumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-500 mt-1">{stageGroups['won']?.length || 0} Deals</div>
        </div>
        <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4">
          <div className="text-xs text-red-400 mb-1">Verloren</div>
          <div className="text-2xl font-bold text-red-400">CHF {lostValue.toLocaleString('de-CH', { minimumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-500 mt-1">{stageGroups['lost']?.length || 0} Deals</div>
        </div>
      </div>

      {loading ? <div className="text-slate-400 text-center py-12">Lädt...</div> : (
        <div className="grid grid-cols-6 gap-3 overflow-x-auto">
          {STAGES.map(stage => (
            <div key={stage.key} className={`${stage.bg} border border-slate-700/30 rounded-2xl p-3 min-h-64 min-w-48`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>{stage.label}</div>
                <div className="text-xs text-slate-500">{stageGroups[stage.key]?.length || 0}</div>
              </div>
              <div className="text-xs text-slate-500 mb-3">
                CHF {(stageGroups[stage.key]?.reduce((s, p) => s + parseFloat(String(p.total)), 0) || 0).toLocaleString('de-CH', { minimumFractionDigits: 0 })}
              </div>
              <div className="space-y-2">
                {(stageGroups[stage.key] || []).map(proposal => (
                  <div key={proposal.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                    <div className="text-xs font-semibold text-white truncate mb-1">{proposal.title}</div>
                    <div className="text-xs text-slate-400 truncate">{proposal.company_name}</div>
                    <div className="text-xs font-bold text-white mt-2">CHF {parseFloat(String(proposal.total)).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
                    {proposal.is_draft && (
                      <button onClick={() => sendProposal(proposal.id)} disabled={sending === proposal.id}
                        className="mt-2 w-full flex items-center justify-center gap-1 bg-blue-600/80 hover:bg-blue-500 text-white text-xs py-1.5 rounded-lg font-semibold">
                        <Send size={11} /> {sending === proposal.id ? '...' : 'Senden'}
                      </button>
                    )}
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {STAGES.filter(s => s.key !== stage.key).slice(0, 3).map(s => (
                        <button key={s.key} onClick={() => updateStage(proposal.id, s.key)}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-0.5 rounded-md transition-colors">
                          → {s.label.replace(' ✓', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
