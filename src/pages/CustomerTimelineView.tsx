import { useState, useEffect } from 'react';
import { Activity, Search, Filter, Clock, User, ChevronDown, MessageSquare, CheckCircle, AlertCircle, FileText, Tag } from 'lucide-react';
import type { TimelineEvent } from '../types/entities';

interface IconConfig { icon: React.ElementType; color: string; bg: string }
const ICON_MAP: Record<string, IconConfig> = {
  ticket_created: { icon: MessageSquare, color: '#0052cc', bg: 'rgba(0, 82, 204, 0.1)' },
  ticket_resolved: { icon: CheckCircle, color: '#36b37e', bg: 'rgba(54, 179, 126, 0.1)' },
  contract_signed: { icon: FileText, color: '#6554c0', bg: 'rgba(101, 84, 192, 0.1)' },
  lead_converted: { icon: Tag, color: '#ffab00', bg: 'rgba(255, 171, 0, 0.1)' },
  invoice_sent: { icon: FileText, color: '#00b8d9', bg: 'rgba(0, 184, 217, 0.1)' },
  critical_alert: { icon: AlertCircle, color: '#ff5630', bg: 'rgba(255, 86, 48, 0.1)' },
};

export const CustomerTimelineView = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const fetchTimeline = async () => {
    try {
      const res = await fetch('/api/timeline');
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  const filtered = events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    e.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="timeline-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={24} color="var(--color-primary)" /> Kunden Timeline & Events
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            Alle wichtigen Ereignisse und Interaktionen über alle Module hinweg.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Ereignisse durchsuchen..."
            className="input-field"
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} /> Alle Typen
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>Lade Timeline...</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Vertical Line */}
          <div style={{ position: 'absolute', left: 40, top: 0, bottom: 0, width: 2, backgroundColor: 'var(--color-border)' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                Keine Ereignisse in der Timeline gefunden.
              </div>
            ) : filtered.map((event) => {
              const config = ICON_MAP[event.event_type] || { icon: Activity, color: '#666', bg: 'var(--color-surface-hover)' };
              const Icon = config.icon;

              return (
                <div key={event.id} style={{ position: 'relative', display: 'flex', gap: 20 }}>
                  {/* Icon Node */}
                  <div style={{ 
                    width: 34, height: 34, borderRadius: '50%', 
                    backgroundColor: config.bg, 
                    color: config.color, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1, 
                    boxShadow: '0 0 0 4px var(--color-background)'
                  }}>
                    <Icon size={16} />
                  </div>

                  {/* Content Card */}
                  <div className="card" style={{ flex: 1, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</h3>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} /> {new Date(event.created_at).toLocaleString('de-CH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                    {event.description && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>{event.description}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>
                         <User size={12} /> System / Automation
                       </div>
                       <button style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                         Verknüpfung anzeigen <ChevronDown size={12} />
                       </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
