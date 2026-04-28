import { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  Calendar as CalendarIcon, List, LayoutGrid, Clock, Filter,
  Users as UsersIcon, MapPin, AlignLeft
} from 'lucide-react';
import { EventModal } from '../components/EventModal';
import { dataService } from '../services/dataService';
import { getTenantId, getUser } from '../utils/auth';

// ─── Constants & Styles ──────────────────────────────────────────────────────
const DAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const VIEW_MODES = [
  { id: 'month', label: 'Monat', icon: LayoutGrid },
  { id: 'week', label: 'Woche', icon: CalendarIcon },
  { id: 'day', label: 'Tag', icon: List }
];

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

// ─── Calendar Components ─────────────────────────────────────────────────────

const MonthCell = ({ date, isCurrentMonth, isToday, events, onClick }: any) => (
  <div 
    onClick={() => onClick(date)}
    style={{ 
      minHeight: 'min(120px, 15vh)',
      padding: '8px',
      backgroundColor: isToday ? 'rgba(0, 82, 204, 0.03)' : (isCurrentMonth ? 'var(--color-surface)' : 'var(--color-surface-hover)'),
      borderRight: '1px solid var(--color-border)',
      borderBottom: '1px solid var(--color-border)',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    }}
    className="calendar-cell-hover"
  >
    <div style={{ 
      fontSize: 12, 
      fontWeight: isToday ? 800 : 500, 
      color: isToday ? 'var(--color-primary)' : (isCurrentMonth ? 'var(--color-text-main)' : 'var(--color-text-muted)'),
      marginBottom: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
      height: 24,
      borderRadius: '50%',
      backgroundColor: isToday ? 'rgba(0, 82, 204, 0.1)' : 'transparent'
    }}>
      {date.getDate()}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.slice(0, 4).map((e: any) => (
        <div 
          key={e.id} 
          style={{ 
            fontSize: 10, 
            padding: '2px 6px', 
            backgroundColor: e.color || 'var(--color-primary)', 
            color: 'white', 
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 600
          }}
        >
          {new Date(e.start_time).getHours()}:{new Date(e.start_time).getMinutes().toString().padStart(2, '0')} {e.title}
        </div>
      ))}
      {events.length > 4 && (
        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: 4 }}>
          + {events.length - 4} weitere
        </div>
      )}
    </div>
  </div>
);

export const CalendarView = () => {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetching Logic
  useEffect(() => {
    const init = async () => {
      const user = getUser();
      if (user) setSelectedUserIds([user.id]);
      const res = await dataService.getUsers();
      if (res.success) {
        setAllUsers(res.data.filter((u: any) => ['admin', 'manager', 'employee'].includes(u.role)));
      }
    };
    init();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await dataService.getCalendarEvents({ userIds: selectedUserIds });
      if (res.success) setEvents(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [selectedUserIds]);

  // Calendar Math
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Monday
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = [];
    
    const d = new Date(firstDay);
    d.setDate(d.getDate() - startOffset);
    
    // Fill 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const handleDayClick = (date: Date) => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(10, 0, 0, 0);
    setEditingEvent(null);
    setCurrentDate(date);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      const payload = {
        ...data,
        tenant_id: getTenantId(),
        start_time: data.start.toISOString(),
        end_time: data.end.toISOString()
      };
      const res = editingEvent 
        ? await dataService.updateCalendarEvent(editingEvent.id, payload)
        : await dataService.createCalendarEvent(payload);
      
      if (res.success) {
        setSaveStatus({ type: 'success', msg: 'Gespeichert' });
        fetchEvents();
        setTimeout(() => { setIsModalOpen(false); setSaveStatus(null); }, 800);
      }
    } catch (e) { setSaveStatus({ type: 'error', msg: 'Fehler' }); }
  };

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - (day === 0 ? 6 : day - 1); // Adjust for Monday start
    start.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  const TimeGrid = ({ dates }: { dates: Date[] }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${dates.length}, 1fr)`, backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ padding: '12px' }}></div>
        {dates.map((d, i) => (
          <div key={i} style={{ padding: '12px', textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{DAYS_DE[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: d.toDateString() === new Date().toDateString() ? 'var(--color-primary)' : 'inherit' }}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'grid', gridTemplateColumns: `60px repeat(${dates.length}, 1fr)` }}>
        {/* Time Labels */}
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(24, 60px)' }}>
          {HOURS.map(h => (
            <div key={h} style={{ height: 60, padding: '8px', fontSize: 10, textAlign: 'right', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
              {h}:00
            </div>
          ))}
        </div>
        {/* Columns */}
        {dates.map((date, colIdx) => (
          <div key={colIdx} style={{ position: 'relative', borderLeft: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', height: 24 * 60 }}>
            {HOURS.map(h => <div key={h} style={{ height: 60, borderBottom: h === 23 ? 'none' : '1px solid var(--color-border-subtle)' }}></div>)}
            {/* Events */}
            {events.filter(e => new Date(e.start_time).toDateString() === date.toDateString()).map(e => {
              const start = new Date(e.start_time);
              const end = new Date(e.end_time);
              const top = (start.getHours() * 60) + start.getMinutes();
              const height = Math.max(30, ((end.getTime() - start.getTime()) / 60000));
              return (
                <div 
                  key={e.id}
                  onClick={() => { setEditingEvent(e); setIsModalOpen(true); }}
                  style={{ 
                    position: 'absolute', left: 4, right: 4, top, height, 
                    backgroundColor: (e.color || 'var(--color-primary)') + 'dd',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '4px 8px',
                    color: 'white', fontSize: 11, fontWeight: 700, zIndex: 5, overflow: 'hidden', cursor: 'pointer'
                  }}
                >
                  {start.getHours()}:{start.getMinutes().toString().padStart(2, '0')} {e.title}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="calendar-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Bar */}
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '0 0 20px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 20,
        flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {currentDate.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}
          </h1>
          <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--color-surface-hover)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <button className="btn-icon-sm" onClick={() => {
              const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d);
            }}><ChevronLeft size={16} /></button>
            <button style={{ padding: '0 12px', border: 'none', background: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => setCurrentDate(new Date())}>Heute</button>
            <button className="btn-icon-sm" onClick={() => {
              const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d);
            }}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', gap: 2, backgroundColor: 'var(--color-surface-hover)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            {VIEW_MODES.map(m => (
              <button 
                key={m.id}
                onClick={() => setView(m.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  backgroundColor: view === m.id ? 'var(--color-surface)' : 'transparent',
                  color: view === m.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  boxShadow: view === m.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <m.icon size={14} />
                <span className="mobile-hide">{m.label}</span>
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> <span className="mobile-hide">Termin</span>
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', gap: 24, overflow: 'hidden' }}>
        
        {/* Left Sidebar - Mobile Overlay? */}
        <aside className="mobile-hide" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UsersIcon size={14} /> Team Kalender
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allUsers.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => setSelectedUserIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: selectedUserIds.includes(u.id) ? 600 : 400 }}>{u.first_name} {u.last_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 16 }}>Agenda</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.filter(e => new Date(e.start_time) >= new Date()).slice(0, 10).map(e => (
                <div key={e.id} style={{ borderLeft: `3px solid ${e.color || 'var(--color-primary)'}`, padding: '4px 12px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{e.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                    {new Date(e.start_time).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(e.start_time).getHours()}:00
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Calendar Main Grid */}
        <div style={{ ...cardStyle, flex: 1, position: 'relative', overflow: 'hidden' }}>
          {view === 'month' && (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', overflowY: 'auto' }}>
              {/* Calendar Grid */}
              <div style={{ flex: isMobile ? 'none' : 1, borderRight: isMobile ? 'none' : '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  {DAYS_DE.map(d => (
                    <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--color-border)', gap: '0px' }}>
                  {monthDays.map((d, i) => {
                    const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                    const isToday = d.toDateString() === new Date().toDateString();
                    const isSelected = d.toDateString() === selectedDay.toDateString();
                    const dayEvents = events.filter(e => new Date(e.start_time).toDateString() === d.toDateString());
                    
                    return (
                      <div 
                        key={i} 
                        onClick={() => { setSelectedDay(d); if (!isMobile) handleDayClick(d); }}
                        style={{ 
                          minHeight: isMobile ? '50px' : 'min(120px, 15vh)',
                          padding: '4px',
                          backgroundColor: isSelected ? 'rgba(0, 82, 204, 0.08)' : (isToday ? 'rgba(0, 82, 204, 0.03)' : (isCurrentMonth ? 'var(--color-surface)' : 'var(--color-surface-hover)')),
                          borderRight: '1px solid var(--color-border)',
                          borderBottom: '1px solid var(--color-border)',
                          position: 'relative',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: isToday || isSelected ? 800 : 500, 
                          width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isSelected ? 'var(--color-primary)' : (isToday ? 'rgba(0, 82, 204, 0.1)' : 'transparent'),
                          color: isSelected ? 'white' : (isToday ? 'var(--color-primary)' : (isCurrentMonth ? 'var(--color-text-main)' : 'var(--color-text-muted)')),
                          marginBottom: 4
                        }}>
                          {d.getDate()}
                        </div>
                        {!isMobile && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {dayEvents.slice(0, 3).map(e => (
                              <div key={e.id} style={{ fontSize: 9, padding: '2px 4px', backgroundColor: e.color || 'var(--color-primary)', color: 'white', borderRadius: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {e.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && <div style={{ fontSize: 8, color: 'var(--color-text-muted)', textAlign: 'center' }}>+ {dayEvents.length - 3}</div>}
                          </div>
                        )}
                        {isMobile && dayEvents.length > 0 && (
                          <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginTop: 2 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Agenda View (Outlook Style) */}
              {isMobile && (
                <div style={{ padding: 16, backgroundColor: 'var(--color-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>{selectedDay.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                    <button className="btn-primary" onClick={() => handleDayClick(selectedDay)} style={{ padding: '4px 8px', fontSize: 12 }}>
                       <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {events.filter(e => new Date(e.start_time).toDateString() === selectedDay.toDateString()).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13, backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                        Keine Termine für diesen Tag.
                      </div>
                    ) : (
                      events.filter(e => new Date(e.start_time).toDateString() === selectedDay.toDateString()).map(e => (
                        <div 
                          key={e.id} 
                          onClick={() => { setEditingEvent(e); setIsModalOpen(true); }}
                          style={{ 
                            display: 'flex', gap: 12, padding: 12, borderRadius: 'var(--radius-md)', 
                            backgroundColor: 'var(--color-surface-hover)', borderLeft: `4px solid ${e.color || 'var(--color-primary)'}`,
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ minWidth: 45, fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                            {new Date(e.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
                            {e.description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{e.description}</div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {view === 'week' && <TimeGrid dates={weekDays} />}
          {view === 'day' && <TimeGrid dates={[currentDate]} />}

          {loading && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(2px)' }}>
              <RefreshCw size={24} className="animate-spin" color="var(--color-primary)" />
            </div>
          )}
        </div>
      </div>

      <EventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        saveStatus={saveStatus}
        initialDate={currentDate}
        event={editingEvent}
      />
      
      <style>{`
        .calendar-cell-hover:hover {
          background-color: var(--color-surface-hover) !important;
        }
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </div>
  );
};

const RefreshCw = ({ size, className, color }: any) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={className} style={{ animation: 'spin 1s linear infinite' }}
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
  </svg>
);
