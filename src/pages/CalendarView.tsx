import { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  Clock, RefreshCw
} from 'lucide-react';
import { EventModal } from '../components/EventModal';

const SectionHeader = ({ title }: { title: string }) => (
  <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
    {title}
  </h4>
);

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

const CalendarGrid = ({ events, onRangeSelect, onEventClick, view, currentDate }: { 
  events: any[], 
  onRangeSelect: (start: Date, end: Date) => void, 
  onEventClick: (event: any) => void, 
  view: string, 
  currentDate: Date 
}) => {
  const [selection, setSelection] = useState<{ startY: number, currentY: number, isSelecting: boolean, dayIndex: number } | null>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const days = view === 'week' ? 
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) + i; 
      d.setDate(diff);
      return d;
    }) : [currentDate];

  const handleMouseDown = (e: React.MouseEvent, dayIndex: number) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    setSelection({ startY: y, currentY: y, isSelecting: true, dayIndex });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selection?.isSelecting) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      setSelection({ ...selection, currentY: y });
    }
  };

  const handleMouseUp = () => {
    if (selection) {
      const startMinutes = (Math.min(selection.startY, selection.currentY) / 100) * 60;
      const endMinutes = (Math.max(selection.startY, selection.currentY) / 100) * 60;
      
      const targetDate = new Date(days[selection.dayIndex]);
      const startDate = new Date(targetDate);
      startDate.setHours(0, startMinutes, 0, 0);
      
      const endDate = new Date(targetDate);
      endDate.setHours(0, endMinutes, 0, 0);
      
      startDate.setMinutes(Math.floor(startDate.getMinutes() / 15) * 15);
      endDate.setMinutes(Math.ceil(endDate.getMinutes() / 15) * 15);
      
      onRangeSelect(startDate, endDate);
      setSelection(null);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, backgroundColor: 'var(--color-surface)', height: 2400, position: 'relative' }}>
      {days.map((day, idx) => (
        <div 
          key={idx} 
          style={{ 
            flex: 1, borderRight: '1px solid var(--color-border)', position: 'relative',
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px)', backgroundSize: '100% 50px',
            cursor: 'crosshair', userSelect: 'none'
          }}
          onMouseDown={(e) => handleMouseDown(e, idx)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
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

          {selection?.isSelecting && selection.dayIndex === idx && (
             <div style={{ 
               position: 'absolute', top: Math.min(selection.startY, selection.currentY), 
               height: Math.abs(selection.currentY - selection.startY), left: 0, right: 0, 
               backgroundColor: 'rgba(0, 82, 204, 0.2)', border: '1px solid var(--color-primary)',
               zIndex: 10, pointerEvents: 'none'
             }} />
          )}

          {(() => {
            const dayEvents = events
              .filter(e => e.start.toDateString() === day.toDateString())
              .sort((a, b) => a.start.getTime() - b.start.getTime());

            // Simple overlap algorithm
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

                const isTentative = event.availability_status === 'tentative';

                return (
                  <div 
                    key={event.id} 
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                    style={{ 
                      position: 'absolute', top, height, left: `${left}%`, width: `${width}%`, 
                      backgroundColor: event.color || 'var(--color-primary)', borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px', color: 'white', fontSize: 11, zIndex: 5, overflow: 'hidden', 
                      borderLeft: '3px solid rgba(0,0,0,0.2)',
                      display: 'flex', flexDirection: 'column', gap: 2,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      ...(isTentative ? { 
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)',
                        border: '1px solid rgba(255,255,255,0.3)'
                      } : {})
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

export const CalendarView = () => {
  const [view, setView] = useState('day'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date } | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar/events', {
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

  const handleRangeSelect = (start: Date, end: Date) => {
    setEditingEvent(null);
    setDateRange({ start, end });
    setIsModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    setEditingEvent(event);
    setDateRange({ start: event.start, end: event.end });
    setIsModalOpen(true);
  };

  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleSaveEvent = async (eventData: any) => {
    if (!eventData.title) {
        setSaveStatus({ type: 'error', msg: 'Bitte geben Sie einen Titel an.' });
        return;
    }
    
    try {
      const url = editingEvent ? `/api/calendar/events/${editingEvent.id}` : '/api/calendar/events';
      const method = editingEvent ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          ...eventData, 
          start_time: (eventData.start instanceof Date ? eventData.start : new Date(eventData.start)).toISOString(), 
          end_time: (eventData.end instanceof Date ? eventData.end : new Date(eventData.end)).toISOString(),
          availability_status: eventData.availabilityStatus || 'busy',
          is_private: eventData.isPrivate || false,
          reminder_minutes: eventData.reminderMinutes || null
        })
      });

      const data = await res.json();
      if (data.success) {
        setSaveStatus({ type: 'success', msg: 'Termin erfolgreich gespeichert!' });
        fetchEvents();
        setTimeout(() => {
            setIsModalOpen(false);
            setDateRange(null);
            setEditingEvent(null);
            setSaveStatus(null);
        }, 1000);
      } else {
        setSaveStatus({ type: 'error', msg: data.error || 'Fehler beim Speichern.' });
      }
    } catch (e) {
      console.error(e);
      setSaveStatus({ type: 'error', msg: 'Serververbindung fehlgeschlagen.' });
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
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 24 }}>
      <aside style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44 }} onClick={() => { setDateRange({ start: new Date(), end: new Date(Date.now() + 3600000) }); setIsModalOpen(true); }}>
          <Plus size={18} /> <span style={{ marginLeft: 8 }}>Neuer Termin</span>
        </button>

        <div className="card" style={{ padding: 16, flex: 1 }}>
          <SectionHeader title="Nächste Termine" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.slice(0, 8).map(event => (
              <div key={event.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{event.title}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{event.start.toLocaleDateString('de-CH')} {event.start.getHours()}:00</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <header style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {currentDate.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}
          </h2>
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
        </header>

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
                      <div key={e.id} style={{ fontSize: 10, padding: '2px 4px', backgroundColor: e.color || 'var(--color-primary)', color: 'white', borderRadius: 2, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden' }}>{e.title}</div>
                    ))}
                 </div>
               ))}
            </div>
          ) : (
            <CalendarGrid 
              events={events} 
              onRangeSelect={handleRangeSelect} 
              onEventClick={handleEventClick}
              view={view} 
              currentDate={currentDate} 
            />
          )}
        </div>
      </main>

      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }} 
        onSave={handleSaveEvent} 
        saveStatus={saveStatus}
        initialDate={dateRange?.start} 
        endDate={dateRange?.end} 
        event={editingEvent}
      />
    </div>
  );
};
