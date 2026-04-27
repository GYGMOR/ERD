import { X, Building2, Calendar, Info, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../types/entities';

interface ProjectPreviewModalProps {
  project: Project;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  planning:    { label: 'Planung',      color: '#8b5cf6', bg: '#8b5cf615', icon: <Clock size={16} /> },
  active:      { label: 'Aktiv',        color: 'var(--color-info)',    bg: 'var(--color-info)15', icon: <Clock size={16} /> },
  on_hold:     { label: 'Pausiert',     color: 'var(--color-warning)', bg: 'var(--color-warning)15', icon: <Clock size={16} /> },
  completed:   { label: 'Abgeschlossen',color: 'var(--color-success)', bg: 'var(--color-success)15', icon: <CheckCircle2 size={16} /> },
  cancelled:   { label: 'Abgebrochen',  color: 'var(--color-danger)',  bg: 'var(--color-danger)15', icon: <X size={16} /> },
};

const PRIORITY_CLS: Record<string, string> = { low: 'success', medium: 'info', high: 'warning', critical: 'danger' };
const PRIORITY_LABEL: Record<string, string> = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' };

export const ProjectPreviewModal = ({ project, onClose }: ProjectPreviewModalProps) => {
  const navigate = useNavigate();
  const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const isOverdue = project.end_date && new Date(project.end_date) < new Date() && !['completed', 'cancelled'].includes(project.status);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 650, padding: 0, overflow: 'hidden' }}>
        {/* Header Section */}
        <div style={{ padding: '24px 32px', backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', right: 24, top: 24, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className={'badge ' + (PRIORITY_CLS[project.priority] || 'info')} style={{ fontSize: 11, fontWeight: 700 }}>
              {PRIORITY_LABEL[project.priority]} Priorität
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
              {sc.icon} {sc.label}
            </span>
          </div>
          
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: 'var(--color-text-main)' }}>
            {project.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 14 }}>
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
            {project.end_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)', fontSize: 14, fontWeight: isOverdue ? 600 : 400 }}>
                <Calendar size={16} /> {isOverdue ? 'Überfällig: ' : 'Deadline: '}{new Date(project.end_date).toLocaleDateString('de-CH')}
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div style={{ padding: 32 }}>
          <div style={{ marginBottom: 32 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={14} /> Beschreibung
            </h4>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
              {project.description || 'Keine Beschreibung vorhanden für dieses Projekt.'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Projekt-Details</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Erstellt am:</span>
                  <span style={{ fontWeight: 600 }}>{new Date(project.created_at).toLocaleDateString('de-CH')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Startdatum:</span>
                  <span style={{ fontWeight: 600 }}>{project.start_date ? new Date(project.start_date).toLocaleDateString('de-CH') : '–'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Verbunden mit:</span>
                  <span style={{ fontWeight: 600 }}>{project.company_name || 'Keine Firma'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Statistiken</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Tickets:</span>
                  <span style={{ fontWeight: 600 }}>{project.ticket_count || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Fortschritt:</span>
                  <span style={{ fontWeight: 600, color: project.status === 'completed' ? 'var(--color-success)' : 'var(--color-info)' }}>
                    {project.status === 'completed' ? '100%' : 'In Arbeit'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Actions */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: 'var(--color-surface-hover)' }}>
          <button onClick={onClose} className="btn-secondary">Schliessen</button>
          <button className="btn-primary" onClick={() => navigate(`/projects/${project.id}`)}>
            Zum Vollbild-Modus
          </button>
        </div>
      </div>
    </div>
  );
};
