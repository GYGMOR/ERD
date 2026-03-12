import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Calendar, Clock, ArrowRight, Activity, Files } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) setProjects(data);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress': return <span className="badge info italic">In Arbeit</span>;
      case 'completed': return <span className="badge success">Abgeschlossen</span>;
      case 'planning': return <span className="badge info">In Planung</span>;
      case 'on_hold': return <span className="badge warning">Pausiert</span>;
      default: return <span className="badge info">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Meine Projekte
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>
            Verfolgen Sie den Fortschritt Ihrer aktuellen IT-Projekte und Rollouts.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="card pulse" style={{ height: 200, backgroundColor: 'var(--color-surface-hover)', border: 'none' }}></div>
          ))
        ) : projects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1' }} className="card">
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <FolderOpen size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <p style={{ margin: 0 }}>Aktuell keine aktiven Projekte vorhanden.</p>
            </div>
          </div>
        ) : (
          projects.map((p: any) => (
            <div 
              key={p.id} 
              className="card hover-bg-row"
              style={{ display: 'flex', flexDirection: 'column', padding: 'var(--spacing-lg)', cursor: 'pointer', height: '100%' }}
              onClick={() => navigate(`/portal/projects/${p.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                {getStatusBadge(p.status)}
                <div style={{ padding: 6, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-muted)' }}>
                  <FolderOpen size={16} />
                </div>
              </div>
              
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-text-main)' }}>
                {p.name}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 20px 0', flex: 1, lineHeight: 1.5, fontStyle: 'italic' }}>
                {p.description || 'Keine Beschreibung verfügbar.'}
              </p>

              <div style={{ paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Fortschritt</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)' }}>65%</span>
                </div>
                <div style={{ height: 6, width: '100%', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                   <div style={{ height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-pill)', width: '65%' }}></div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 11 }}>
                    <Calendar size={12} /> 
                    <span>{p.start_date ? new Date(p.start_date).toLocaleDateString() : '-'}</span>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && projects.length > 0 && (
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--spacing-xl)' }}>
            <div className="card">
               <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} style={{ color: 'var(--color-primary)' }} /> Letzte Meilensteine
               </h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                     { label: 'Cloud Migration abgeschlossen', date: 'Vorgestern', icon: <Activity size={12} style={{ color: 'var(--color-success)' }} /> },
                     { label: 'UAT Phase gestartet', date: 'Vor 4 Tagen', icon: <Clock size={12} style={{ color: 'var(--color-primary)' }} /> },
                     { label: 'Kick-off Meeting', date: 'Vor 2 Wochen', icon: <Activity size={12} style={{ color: 'var(--color-text-muted)' }} /> },
                  ].map((m, i) => (
                     <div key={i} style={{ display: 'flex', gap: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                           {m.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                           <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{m.label}</p>
                           <p style={{ margin: '2px 0 0 0', fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{m.date}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
            
            <div className="card">
               <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Files size={18} style={{ color: 'var(--color-primary)' }} /> Projekt Dokumente
               </h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                     { name: 'Projektplan_V2.pdf', size: '1.4 MB' },
                     { name: 'Pflichtenheft_Nexus.docx', size: '840 KB' },
                     { name: 'Infrastruktur_Schema.png', size: '4.2 MB' },
                  ].map((f, i) => (
                     <div key={i} className="hover-bg-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                           <div style={{ padding: 6, borderRadius: 4, backgroundColor: 'rgba(0, 82, 204, 0.05)', color: 'var(--color-primary)', display: 'flex' }}>
                              <Files size={14} />
                           </div>
                           <span style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>{f.size}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
