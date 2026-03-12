import { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, 
  Clock, RefreshCw, Calendar as CalendarIcon, MapPin
} from 'lucide-react';

const TimeGutter = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div style={{ width: 60, flexShrink: 0, borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      {hours.map(hour => (
        <div key={hour} style={{ height: 100, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', paddingRight: 8, paddingTop: 4 }}>
          {`${hour}:00`}
        </div>
      ))}
    </div>
  );
};

const CalendarGrid = ({ events, onEventClick, view, currentDate }: { 
  events: any[], 
  onEventClick: (event: any) => void, 
  view: string, 
  currentDate: Date 
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const days = view === 'week' ? 
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) + i; 
      d.setDate(diff);
      return d;
    }) : [currentDate];

  return (
    <div style={{ display: 'flex', flex: 1, backgroundColor: 'var(--color-surface)', height: 2400, position: 'relative' }}>
      {days.map((day, idx) => (
        <div 
          key={idx} 
          style={{ 
            flex: 1, borderRight: '1px solid var(--color-border)', position: 'relative',
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px)', backgroundSize: '100% 50px',
            userSelect: 'none'
          }}
        >
          {view === 'week' && (
            <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{day.toLocaleDateString('de-CH', { weekday: 'short' })}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{day.getDate()}</div>
            </div>
          )}

          {hours.map(hour => (
            <div key={hour} style={{ height: 100, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 50, left: 0, right: 0, borderBottom: '1px dashed var(--color-border)', opacity: 0.3 }}></div>
            </div>
          ))}

          {(() => {
            const dayEvents = events
              .filter(e => e.start.toDateString() === day.toDateString())
              .sort((a, b) => a.start.getTime() - b.start.getTime());

            const clusters: any[][] = [];
            let lastEventEnd: number | null = null;

            dayEvents.forEach(event => {
              const start = event.start.getTime();
              const end = event.end.getTime();

              if (lastEventEnd === null || start >= lastEventEnd) {
                clusters.push([event]);
              } else {
                clusters[clusters.length - 1].push(event);
              }
              lastEventEnd = lastEventEnd === null ? end : Math.max(lastEventEnd, end);
            });

            return clusters.flatMap(cluster => {
              const clusterColumns: any[][] = [];
              cluster.forEach(event => {
                let placed = false;
                for (let i = 0; i < clusterColumns.length; i++) {
                  const lastInCol = clusterColumns[i][clusterColumns[i].length - 1];
                  if (event.start.getTime() >= lastInCol.end.getTime()) {
                    clusterColumns[i].push(event);
                    placed = true;
                    break;
                  }
                }
                if (!placed) clusterColumns.push([event]);
              });

              const colCount = clusterColumns.length;
              return clusterColumns.flatMap((col, colIdx) => col.map(event => {
                const startHour = event.start.getHours();
                const startMinutes = event.start.getMinutes();
                const endHour = event.end.getHours();
                const endMinutes = event.end.getMinutes();
                const top = (startHour * 100) + (startMinutes * 100 / 60);
                const height = Math.max(25, ((endHour - startHour) * 100) + ((endMinutes - startMinutes) * 100 / 60));
                
                const width = 100 / colCount;
                const left = colIdx * width;

                return (
                  <div 
                    key={event.id} 
                    onClick={() => onEventClick(event)}
                    style={{ 
                      position: 'absolute', top, height, left: `${left}%`, width: `${width}%`, 
                      backgroundColor: event.color || 'var(--color-primary)', borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px', color: 'white', fontSize: 11, zIndex: 5, overflow: 'hidden', 
                      borderLeft: '3px solid rgba(0,0,0,0.2)',
                      display: 'flex', flexDirection: 'column', gap: 2,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
                      <Clock size={10} /> {`${startHour}:${startMinutes.toString().padStart(2, '0')}`}
                    </div>
                  </div>
                );
              }));
            });
          })()}
        </div>
      ))}
    </div>
  );
};

export const Calendar = () => {
  const [view, setView] = useState('week'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/calendar/events', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.map((e: any) => ({ ...e, start: new Date(e.start_time), end: new Date(e.end_time) })));
      }
    } catch (e) {
      console.error('Failed to fetch events', e);
    } finally {
      setLoading(false);
    }
  };

  const getMonthDays = () => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const days = [];
    const startDay = d.getDay() === 0 ? 6 : d.getDay() - 1; 
    d.setDate(d.getDate() - startDay);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: 20 }}>
      {/* Header */}
      <div className="card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 10, backgroundColor: 'rgba(0, 82, 204, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)' }}>
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Mein Kalender</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Alle vereinbarten Termine auf einen Blick</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-secondary" style={{ padding: 6 }} onClick={() => {
              const step = view === 'day' ? 1 : view === 'week' ? 7 : 0;
              if (step) setCurrentDate(new Date(currentDate.getTime() - step * 86400000));
              else { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }
            }}><ChevronLeft size={16} /></button>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setCurrentDate(new Date())}>Heute</button>
            <button className="btn-secondary" style={{ padding: 6 }} onClick={() => {
              const step = view === 'day' ? 1 : view === 'week' ? 7 : 0;
              if (step) setCurrentDate(new Date(currentDate.getTime() + step * 86400000));
              else { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }
            }}><ChevronRight size={16} /></button>
          </div>
          <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--color-surface-hover)', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {['day', 'week', 'month'].map(m => (
              <button key={m} onClick={() => setView(m)} style={{ 
                padding: '4px 12px', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 12, cursor: 'pointer',
                backgroundColor: view === m ? 'var(--color-surface)' : 'transparent',
                color: view === m ? 'var(--color-primary)' : 'var(--color-text-muted)'
              }}>{m === 'day' ? 'Tag' : m === 'week' ? 'Woche' : 'Monat'}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
        <main className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', position: 'relative' }}>
            {view !== 'month' && <TimeGutter />}
            {loading ? (
               <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={32} className="animate-spin" /></div>
            ) : view === 'month' ? (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--color-border)', gap: 1 }}>
                 {getMonthDays().map((d, i) => (
                   <div key={i} style={{ backgroundColor: d.getMonth() === currentDate.getMonth() ? 'var(--color-surface)' : 'var(--color-surface-hover)', minHeight: 120, padding: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: d.toDateString() === new Date().toDateString() ? 'var(--color-primary)' : 'var(--color-text-muted)', marginBottom: 4 }}>{d.getDate()}</div>
                      {events.filter(e => e.start.toDateString() === d.toDateString()).map(e => (
                        <div key={e.id} onClick={() => setSelectedEvent(e)} style={{ fontSize: 10, padding: '2px 4px', backgroundColor: e.color || 'var(--color-primary)', color: 'white', borderRadius: 2, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'pointer' }}>{e.title}</div>
                      ))}
                   </div>
                 ))}
              </div>
            ) : (
              <CalendarGrid 
                events={events} 
                onEventClick={setSelectedEvent}
                view={view} 
                currentDate={currentDate} 
              />
            )}
          </div>
        </main>

        {/* Sidebar / Detail View */}
        {selectedEvent ? (
          <aside className="card animate-in slide-in-from-right-10 duration-200" style={{ width: 320, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Termindetails</h3>
              <button onClick={() => setSelectedEvent(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Titel</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{selectedEvent.title}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                <div style={{ fontSize: 14 }}>
                  {selectedEvent.start.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}<br />
                  <span style={{ fontWeight: 600 }}>{selectedEvent.start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} - {selectedEvent.end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {selectedEvent.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
                  <div style={{ fontSize: 14 }}>{selectedEvent.location}</div>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Notizen</div>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{selectedEvent.description}</div>
                </div>
              )}

              {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Teilnehmer</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedEvent.participants.map((p: any) => (
                      <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                          {p.first_name?.charAt(0)}{p.last_name?.charAt(0)}
                        </div>
                        <span style={{ fontSize: 13 }}>{p.first_name} {p.last_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        ) : (
          <aside className="card" style={{ width: 320, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div>
              <CalendarIcon size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p style={{ fontSize: 14 }}>Wählen Sie einen Termin aus,<br />um Details anzuzeigen.</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
