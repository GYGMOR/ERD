import { useState, useEffect, useMemo } from 'react';
import { Plus, LayoutGrid, List, Calendar, Building2, Folder } from 'lucide-react';
import { getTenantId } from '../utils/auth';
import type { Project, Company } from '../types/entities';

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planning:    { label: 'Planung',      color: '#8b5cf6', bg: '#8b5cf620' },
  active:      { label: 'Aktiv',        color: 'var(--color-info)',    bg: 'var(--color-info)20' },
  on_hold:     { label: 'Pausiert',     color: 'var(--color-warning)', bg: 'var(--color-warning)20' },
  completed:   { label: 'Abgeschlossen',color: 'var(--color-success)', bg: 'var(--color-success)20' },
  cancelled:   { label: 'Abgebrochen',  color: 'var(--color-danger)',  bg: 'var(--color-danger)20' },
};
const PRIORITY_CLS: Record<string, string> = { low: 'success', medium: 'info', high: 'warning', critical: 'danger' };
const PRIORITY_LABEL: Record<string, string> = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' };

const KANBAN_COLUMNS = ['planning', 'active', 'on_hold', 'completed'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-main)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

// ─── New Project Modal ────────────────────────────────────────────────────────
const NewProjectModal = ({ onClose, onSave }: { onClose: () => void; onSave: () => void }) => {
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', priority: 'medium', company_id: '', start_date: '', end_date: '' });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(d => { if (d.success) setCompanies(d.data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const tenantId = getTenantId();
    if (!tenantId) { setError('Session abgelaufen. Bitte neu einloggen.'); setLoading(false); return; }
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tenant_id: tenantId, company_id: form.company_id || null }),
      });
      const data = await res.json();
      if (data.success) { onSave(); }
      else { setError(data.error || 'Fehler beim Erstellen.'); }
    } catch { setError('Netzwerkfehler.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 560, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Neues Projekt</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', lineHeight: 1 }}>✕</button>
        </div>
        {error && <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Projektname *</label>
            <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Website Relaunch" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Beschreibung</label>
            <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Kurze Projektbeschreibung..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Status</label>
              <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Priorität</label>
              <select style={inputStyle} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Kunde</label>
            <select style={inputStyle} value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}>
              <option value="">-- Kein Kunde --</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Startdatum</label>
              <input type="date" style={inputStyle} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Enddatum</label>
              <input type="date" style={inputStyle} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 500, color: 'var(--color-text-main)' }}>Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 18px' }}>
              {loading ? 'Erstellen...' : 'Projekt erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Project Card (Kanban) ───────────────────────────────────────────────────
const ProjectCard = ({ project, onStatusChange }: { project: Project; onStatusChange: (id: string, status: string) => void }) => {
  const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const isOverdue = project.end_date && new Date(project.end_date) < new Date() && !['completed', 'cancelled'].includes(project.status);

  return (
    <div className="card" style={{ padding: 16, cursor: 'default', marginBottom: 0, border: `1px solid var(--color-border)` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span className={'badge ' + (PRIORITY_CLS[project.priority] || 'info')} style={{ fontSize: 11 }}>{PRIORITY_LABEL[project.priority]}</span>
        <select
          value={project.status}
          onChange={e => onStatusChange(project.id, e.target.value)}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, border: 'none', backgroundColor: sc.bg, color: sc.color, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, lineHeight: 1.3 }}>{project.name}</div>
      {project.description && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {project.description}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
        {project.company_name && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
            <Building2 size={11} /> {project.company_name}
          </span>
        )}
        {project.end_date && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
            <Calendar size={11} /> {isOverdue ? '⚠ ' : ''}{new Date(project.end_date).toLocaleDateString('de-CH')}
          </span>
        )}
        {project.ticket_count > 0 && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>🎫 {project.ticket_count}</span>
        )}
      </div>
    </div>
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────
export const ProjectsView = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) setProjects(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleStatusChange = async (id: string, status: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  };

  const filtered = useMemo(() => {
    if (!search) return projects;
    const q = search.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(q) || (p.company_name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }, [projects, search]);

  const stats = {
    active: projects.filter(p => p.status === 'active').length,
    planning: projects.filter(p => p.status === 'planning').length,
    overdue: projects.filter(p => p.end_date && new Date(p.end_date) < new Date() && !['completed', 'cancelled'].includes(p.status)).length,
  };

  const btnModeStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
    backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface)',
    color: active ? 'white' : 'var(--color-text-main)',
    fontWeight: 500, fontSize: 13, cursor: 'pointer',
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Projekte</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Projekte verwalten und Fortschritte verfolgen.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." style={{ padding: '8px 12px 8px 32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: 13, color: 'var(--color-text-main)', outline: 'none', width: 200 }} />
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <button style={btnModeStyle(viewMode === 'kanban')} onClick={() => setViewMode('kanban')}><LayoutGrid size={14} /> Kanban</button>
          <button style={btnModeStyle(viewMode === 'list')} onClick={() => setViewMode('list')}><List size={14} /> Liste</button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Neues Projekt
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ borderTop: '3px solid var(--color-info)', padding: '16px 20px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Aktiv</p>
          <span style={{ fontSize: '2rem', fontWeight: 700, marginTop: 6, display: 'block', color: 'var(--color-info)' }}>{stats.active}</span>
        </div>
        <div className="card" style={{ borderTop: '3px solid #8b5cf6', padding: '16px 20px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>In Planung</p>
          <span style={{ fontSize: '2rem', fontWeight: 700, marginTop: 6, display: 'block', color: '#8b5cf6' }}>{stats.planning}</span>
        </div>
        <div className="card" style={{ borderTop: '3px solid var(--color-danger)', padding: '16px 20px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Überfällig</p>
          <span style={{ fontSize: '2rem', fontWeight: 700, marginTop: 6, display: 'block', color: stats.overdue > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{stats.overdue}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Projekte...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 64 }}>
          <Folder size={52} style={{ margin: '0 auto', opacity: 0.2, display: 'block' }} />
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 500, marginTop: 16 }}>
            {search ? 'Kein Projekt gefunden.' : 'Noch keine Projekte. Erstelle dein erstes Projekt!'}
          </p>
          {!search && <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>Projekt erstellen</button>}
        </div>
      ) : viewMode === 'kanban' ? (
        // ── Kanban View ──────────────────────────────────────────────────────
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
          {KANBAN_COLUMNS.map(col => {
            const sc = STATUS_CONFIG[col];
            const colProjects = filtered.filter(p => p.status === col);
            return (
              <div key={col}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: sc.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{sc.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, backgroundColor: 'var(--color-border)', borderRadius: 10, padding: '1px 7px' }}>{colProjects.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 100, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-lg)', padding: 10 }}>
                  {colProjects.map(p => (
                    <ProjectCard key={p.id} project={p} onStatusChange={handleStatusChange} />
                  ))}
                  {colProjects.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>Leer</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ── List View ────────────────────────────────────────────────────────
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Projekt</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Kunde</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Priorität</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Enddatum</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.planning;
                const isOverdue = p.end_date && new Date(p.end_date) < new Date() && !['completed', 'cancelled'].includes(p.status);
                return (
                  <tr key={p.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{p.description}</div>}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 14, color: 'var(--color-text-muted)' }}>{p.company_name || '–'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}><span className={'badge ' + (PRIORITY_CLS[p.priority] || 'info')} style={{ fontSize: 12 }}>{PRIORITY_LABEL[p.priority]}</span></td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
                      {p.end_date ? `${isOverdue ? '⚠ ' : ''}${new Date(p.end_date).toLocaleDateString('de-CH')}` : '–'}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--color-text-muted)' }}>{new Date(p.created_at).toLocaleDateString('de-CH')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchProjects(); }} />}
    </div>
  );
};
