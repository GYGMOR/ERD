import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, Calendar, Clock, CheckCircle2, X, 
  Activity, Ticket, FileText, ChevronRight, AlertCircle, Edit, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, Ticket as TicketEntity } from '../types/entities';
import { isInternal } from '../utils/auth';
import { DocumentExplorer } from '../components/DocumentExplorer';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  planning:    { label: 'Planung',      color: '#8b5cf6', bg: '#8b5cf615', icon: Clock },
  active:      { label: 'Aktiv',        color: 'var(--color-info)',    bg: 'var(--color-info)15', icon: Activity },
  on_hold:     { label: 'Pausiert',     color: 'var(--color-warning)', bg: 'var(--color-warning)15', icon: AlertCircle },
  completed:   { label: 'Abgeschlossen',color: 'var(--color-success)', bg: 'var(--color-success)15', icon: CheckCircle2 },
  cancelled:   { label: 'Abgebrochen',  color: 'var(--color-danger)',  bg: 'var(--color-danger)15', icon: X },
};

const PRIORITY_CLS: Record<string, string> = { low: 'success', medium: 'info', high: 'warning', critical: 'danger' };
const PRIORITY_LABEL: Record<string, string> = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-main)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const EditProjectModal = ({ project, onClose, onSave }: any) => {
  const [form, setForm] = useState({ 
    name: project.name || '', 
    description: project.description || '', 
    status: project.status || 'planning', 
    priority: project.priority || 'medium', 
    start_date: project.start_date ? project.start_date.split('T')[0] : '', 
    end_date: project.end_date ? project.end_date.split('T')[0] : '',
    assigned_to: project.assigned_to || ''
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => { if (d.success) setUsers(d.data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { onSave(); }
      else { setError(data.error || 'Fehler beim Speichern.'); }
    } catch { setError('Netzwerkfehler.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 560, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Projekt bearbeiten</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', lineHeight: 1 }}>✕</button>
        </div>
        {error && <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Projektname *</label>
            <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Beschreibung</label>
            <textarea rows={4} style={{ ...inputStyle, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Verantwortlich</label>
            <select style={inputStyle} value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">-- Nicht zugewiesen --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 500, color: 'var(--color-text-main)' }}>Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 18px' }}>
              {loading ? 'Speichern...' : 'Änderungen speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ProjectDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [tickets, setTickets] = useState<TicketEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'journal' | 'documents'>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [newLog, setNewLog] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);

  const fetchData = async () => {
    try {
      const projApi = isInternal() ? '/api/projects' : '/api/portal/projects';
      const ticketApi = isInternal() ? '/api/tickets' : '/api/portal/tickets';
      
      const [projRes, ticketRes, logsRes] = await Promise.all([
        fetch(projApi),
        fetch(ticketApi),
        fetch(`/api/projects/${id}/logs`)
      ]);
      
      const projData = await projRes.json();
      const ticketData = await ticketRes.json();
      const logsData = await logsRes.json();
      
      if (projData.success) {
        const found = projData.data.find((p: Project) => p.id === id);
        if (found) {
          setProject(found);
          if (ticketData.success) {
            setTickets(ticketData.data.filter((t: TicketEntity) => t.company_id === found.company_id));
          }
          if (logsData.success) {
            setLogs(logsData.data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.trim()) return;
    setSubmittingLog(true);
    try {
      const res = await fetch(`/api/projects/${id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newLog, type: 'note' })
      });
      const data = await res.json();
      if (data.success) {
        setLogs([data.data, ...logs]);
        setNewLog('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingLog(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const exportPDF = () => {
    if (!project) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Projektbericht: ${project.name}`, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Status: ${STATUS_CONFIG[project.status]?.label || project.status}`, 14, 32);
    doc.text(`Priorität: ${PRIORITY_LABEL[project.priority] || project.priority}`, 14, 40);
    doc.text(`Kunde: ${project.company_name || 'Intern'}`, 14, 48);
    doc.text(`Start: ${project.start_date ? new Date(project.start_date).toLocaleDateString('de-CH') : '-'}`, 14, 56);
    doc.text(`Ende: ${project.end_date ? new Date(project.end_date).toLocaleDateString('de-CH') : '-'}`, 14, 64);
    
    doc.setFontSize(14);
    doc.text('Beschreibung', 14, 78);
    doc.setFontSize(10);
    const splitDesc = doc.splitTextToSize(project.description || 'Keine Beschreibung vorhanden.', 180);
    doc.text(splitDesc, 14, 86);
    
    if (tickets.length > 0) {
      doc.setFontSize(14);
      const startY = 96 + (splitDesc.length * 5);
      doc.text('Verknüpfte Tickets', 14, startY);
      
      autoTable(doc, {
        startY: startY + 6,
        head: [['Ticket', 'Status', 'Priorität', 'Datum']],
        body: tickets.map(t => [
          t.title,
          t.status,
          PRIORITY_LABEL[t.priority] || t.priority,
          new Date(t.created_at).toLocaleDateString('de-CH')
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    }
    
    doc.save(`Projektbericht_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Projekt wird geladen...</div>;
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Projekt nicht gefunden</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Das gesuchte Projekt existiert nicht oder Sie haben keine Berechtigung.</p>
        <button className="btn-primary" onClick={() => navigate(isInternal() ? '/projects' : '/portal/projects')}>Zurück zur Übersicht</button>
      </div>
    );
  }

  const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const StatusIcon = sc.icon;
  const isOverdue = project.end_date && new Date(project.end_date) < new Date() && !['completed', 'cancelled'].includes(project.status);

  // Fake milestones for visual impact
  const milestones = [
    { title: 'Projekt Kick-off', date: project.start_date, completed: true },
    { title: 'Infrastruktur Setup', date: null, completed: project.status === 'completed' || project.status === 'active' },
    { title: 'Testing & QA', date: null, completed: project.status === 'completed' },
    { title: 'Go-Live', date: project.end_date, completed: project.status === 'completed' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 64 }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button 
          onClick={() => navigate(isInternal() ? '/projects' : '/portal/projects')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-md)', fontWeight: 500 }}
          className="hover-bg-row"
        >
          <ArrowLeft size={16} /> Zurück
        </button>
        <div style={{ color: 'var(--color-text-muted)' }}>/</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Projekte</div>
        <div style={{ color: 'var(--color-text-muted)' }}>/</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</div>
      </div>

      {/* Header Card */}
      <div className="card" style={{ padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        {/* Decorative background element */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: `radial-gradient(circle, ${sc.color}20 0%, transparent 70%)`, borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span className={'badge ' + (PRIORITY_CLS[project.priority] || 'info')} style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px' }}>
                  {PRIORITY_LABEL[project.priority]} Priorität
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                  <StatusIcon size={14} /> {sc.label}
                </span>
              </div>
              
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.03em', color: 'var(--color-text-main)' }}>
                {project.name}
              </h1>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 14 }}>
                  <Building2 size={16} /> 
                  {project.company_id ? (
                    <span 
                      onClick={() => navigate(`/customers/${project.company_id}`)}
                      style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                      onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {project.company_name}
                    </span>
                  ) : (
                    'Internes Projekt'
                  )}
                </div>
                {project.start_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 14 }}>
                    <Calendar size={16} /> 
                    Start: <span style={{ fontWeight: 600 }}>{new Date(project.start_date).toLocaleDateString('de-CH')}</span>
                  </div>
                )}
                {project.end_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)', fontSize: 14 }}>
                    <Clock size={16} /> 
                    Deadline: <span style={{ fontWeight: 600 }}>{new Date(project.end_date).toLocaleDateString('de-CH')}</span>
                    {isOverdue && <span style={{ fontSize: 12, fontWeight: 700, backgroundColor: 'var(--color-danger)20', color: 'var(--color-danger)', padding: '2px 8px', borderRadius: 'var(--radius-md)' }}>Überfällig</span>}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={16} /> Bericht exportieren (PDF)
              </button>
              {isInternal() && (
                <button className="btn-primary" onClick={() => setShowEdit(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit size={16} /> Projekt bearbeiten
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--color-border)', marginBottom: 32 }}>
        {[
          { id: 'overview', label: 'Übersicht', icon: Activity },
          { id: 'journal', label: 'Journal / Logbuch', icon: FileText, count: logs.length },
          { id: 'tickets', label: 'Verknüpfte Tickets', icon: Ticket, count: tickets.length },
          { id: 'documents', label: 'Dokumente', icon: FileText, count: 0 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 16px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 14,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                position: 'relative'
              }}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && (
                <span style={{ backgroundColor: isActive ? 'var(--color-primary)20' : 'var(--color-surface-hover)', color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 12 }}>
                  {tab.count}
                </span>
              )}
              {isActive && (
                <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: 'var(--color-primary)', borderRadius: '2px 2px 0 0' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Description */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                Projektbeschreibung
              </h3>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
                {project.description || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Keine Beschreibung für dieses Projekt hinterlegt.</span>}
              </div>
            </div>

            {/* Milestones / Progress */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} style={{ color: 'var(--color-primary)' }} />
                Projektphasen & Meilensteine
              </h3>
              
              <div style={{ position: 'relative', paddingLeft: 12 }}>
                <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 2, backgroundColor: 'var(--color-border)', borderRadius: 2 }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {milestones.map((ms, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1 }}>
                      <div style={{ 
                        width: 10, height: 10, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                        backgroundColor: ms.completed ? 'var(--color-success)' : 'var(--color-surface)',
                        border: ms.completed ? 'none' : '2px solid var(--color-border)',
                        boxShadow: ms.completed ? '0 0 0 4px var(--color-surface)' : '0 0 0 4px var(--color-surface)'
                      }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: ms.completed ? 'var(--color-text-main)' : 'var(--color-text-muted)', marginBottom: 4 }}>
                          {ms.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {ms.date ? new Date(ms.date).toLocaleDateString('de-CH') : 'Ausstehend'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stats Card */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Details</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Erstellt am</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{new Date(project.created_at).toLocaleDateString('de-CH')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Fortschritt</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: project.status === 'completed' ? 'var(--color-success)' : 'var(--color-info)' }}>
                    {project.status === 'completed' ? '100%' : 'In Arbeit'}
                  </span>
                </div>
                
                <div style={{ height: 6, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginTop: -4 }}>
                  <div style={{ height: '100%', width: project.status === 'completed' ? '100%' : '65%', backgroundColor: project.status === 'completed' ? 'var(--color-success)' : 'var(--color-info)', borderRadius: 'var(--radius-pill)' }} />
                </div>
              </div>
            </div>
            
            {/* Team / Assignment */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Projektleitung</h3>
              {project.assignee_first_name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                    {project.assignee_first_name[0]}{project.assignee_last_name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{project.assignee_first_name} {project.assignee_last_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Hauptverantwortlich</div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14, fontStyle: 'italic' }}>Niemand zugewiesen.</p>
              )}
            </div>
          </div>
          
        </div>
      )}

      {activeTab === 'journal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          <div>
            {/* Add Log Entry */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Eintrag hinzufügen</h3>
              <form onSubmit={handleAddLog}>
                <textarea 
                  value={newLog}
                  onChange={e => setNewLog(e.target.value)}
                  placeholder="Was gibt es Neues zum Projekt?"
                  style={{ ...inputStyle, minHeight: 100, marginBottom: 12, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary" disabled={submittingLog || !newLog.trim()}>
                    {submittingLog ? 'Wird gespeichert...' : 'Eintrag speichern'}
                  </button>
                </div>
              </form>
            </div>

            {/* Log Timeline */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Verlauf</h3>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
                  Keine Einträge im Logbuch vorhanden.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {logs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: 16 }}>
                      <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 12 }}>
                        {log.first_name[0]}{log.last_name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{log.first_name} {log.last_name}</span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(log.created_at).toLocaleString('de-CH')}</span>
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
                          {log.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Journal-Info</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Das Journal dient der lückenlosen Dokumentation des Projektfortschritts. 
              Hier können wichtige Meilensteine, Notizen und Status-Updates festgehalten werden.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tickets.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <Ticket size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <p>Keine Tickets mit diesem Projekt/Kunden verknüpft.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Ticket</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Priorität</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Datum</th>
                  <th style={{ padding: '12px 20px' }}></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} className="hover-bg-row" style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => navigate(isInternal() ? `/tickets/${t.id}` : `/portal/tickets/${t.id}`)}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{t.title}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-main)' }}>{t.status}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge ${PRIORITY_CLS[t.priority]}`}>{PRIORITY_LABEL[t.priority] || t.priority}</span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: 14 }}>
                      {new Date(t.created_at).toLocaleDateString('de-CH')}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <DocumentExplorer entityType="project" entityId={id!} />
      )}

      {showEdit && (
        <EditProjectModal 
          project={project} 
          onClose={() => setShowEdit(false)} 
          onSave={() => { setShowEdit(false); fetchData(); }} 
        />
      )}
    </div>
  );
};
