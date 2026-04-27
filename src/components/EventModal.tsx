import { useState, useEffect } from 'react';
import { X, Clock, MapPin, Users, AlignLeft, Save, Check } from 'lucide-react';
import { dataService } from '../services/dataService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: any) => void;
  initialDate?: Date;
  endDate?: Date;
  event?: any; // The existing event to edit
  saveStatus?: { type: 'success' | 'error', msg: string } | null;
}

export const EventModal = ({ isOpen, onClose, onSave, initialDate, endDate, event: editingEvent, saveStatus }: EventModalProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [event, setEvent] = useState({
    title: '',
    start: initialDate || new Date(),
    end: endDate || new Date((initialDate || new Date()).getTime() + 3600000),
    location: '',
    description: '',
    category: 'Internal',
    color: '#0052CC',
    participants: [] as string[],
    availabilityStatus: 'busy',
    isPrivate: false,
    reminderMinutes: 15
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setEvent({
          title: editingEvent.title || '',
          start: new Date(editingEvent.start),
          end: new Date(editingEvent.end),
          location: editingEvent.location || '',
          description: editingEvent.description || '',
          category: editingEvent.category || 'Internal',
          color: editingEvent.color || '#0052CC',
          participants: editingEvent.participants?.map((p: any) => p.user_id) || [],
          availabilityStatus: editingEvent.availability_status || 'busy',
          isPrivate: editingEvent.is_private || false,
          reminderMinutes: editingEvent.reminder_minutes || 15
        });
      } else {
        const start = initialDate ? new Date(initialDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(start.getTime() + 3600000);
        setEvent({ 
          title: '', 
          start, 
          end, 
          location: '', 
          description: '', 
          category: 'Internal', 
          color: '#0052CC', 
          participants: [],
          availabilityStatus: 'busy',
          isPrivate: false,
          reminderMinutes: 15
        });
      }
      fetchUsers();
    }
  }, [isOpen, initialDate, endDate, editingEvent]);

  const fetchUsers = async () => {
    const res = await dataService.getUsers({ includeCustomers: true });
    if (res.success) setUsers(res.data);
  };

  const toggleParticipant = (userId: string) => {
    setEvent(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  const filteredUsers = users.filter(u => 
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card animate-in zoom-in-95 duration-200" style={{ width: 600, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {editingEvent ? 'Termin bearbeiten' : 'Neuer Termin'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '80vh', overflowY: 'auto', backgroundColor: 'var(--color-surface)' }}>
          <input 
            placeholder="Titel hinzufügen" 
            className="input-premium-flat"
            style={{ 
              fontSize: 24, fontWeight: 600, border: 'none', borderBottom: '2px solid transparent', 
              width: '100%', outline: 'none', padding: '4px 0', transition: 'border-color 0.2s',
              backgroundColor: 'transparent', color: 'var(--color-text-main)'
            }} 
            autoFocus={!editingEvent}
            value={event.title}
            onChange={e => setEvent({...event, title: e.target.value})}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Time selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Clock size={18} style={{ color: 'var(--color-text-muted)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  value={event.start instanceof Date ? event.start.toISOString().slice(0, 16) : ''} 
                  onChange={e => setEvent({...event, start: new Date(e.target.value)})}
                />
                <span>bis</span>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  value={event.end instanceof Date ? event.end.toISOString().slice(0, 16) : ''} 
                  onChange={e => setEvent({...event, end: new Date(e.target.value)})}
                />
              </div>
            </div>

            {/* Availability Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Check size={18} style={{ color: 'var(--color-text-muted)' }} />
              <select 
                className="input-field" 
                style={{ flex: 1 }}
                value={event.availabilityStatus}
                onChange={e => setEvent({...event, availabilityStatus: e.target.value})}
              >
                <option value="busy">Beschäftigt</option>
                <option value="free">Frei</option>
                <option value="tentative">Mit Vorbehalt</option>
                <option value="out_of_office">Abwesend</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={event.isPrivate}
                  onChange={e => setEvent({...event, isPrivate: e.target.checked})}
                /> 
                Privat
              </label>
            </div>

            {/* Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MapPin size={18} style={{ color: 'var(--color-text-muted)' }} />
              <input 
                placeholder="Ort oder Meeting-Link" 
                className="input-field" 
                style={{ flex: 1 }} 
                value={event.location}
                onChange={e => setEvent({...event, location: e.target.value})}
              />
            </div>

            {/* Participants */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Users size={18} style={{ color: 'var(--color-text-muted)' }} />
                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    placeholder="Teilnehmer suchen (Name oder E-Mail)..." 
                    className="input-field"
                    style={{ width: '100%' }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Selected Participants Chips */}
              {event.participants.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 30 }}>
                  {event.participants.map(pid => {
                    const u = users.find(user => user.id === pid);
                    if (!u) return null;
                    return (
                      <div key={pid} style={{ 
                        backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', 
                        padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        {u.first_name} {u.last_name}
                        <button onClick={() => toggleParticipant(pid)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}>
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* User List Dropdown (only if searching) */}
              {searchTerm && (
                <div style={{ 
                  marginLeft: 30, maxHeight: 150, overflowY: 'auto', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)'
                }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 13, color: 'var(--color-text-muted)' }}>Keine Benutzer gefunden.</div>
                  ) : filteredUsers.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => { toggleParticipant(user.id); setSearchTerm(''); }}
                      style={{ 
                        padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: event.participants.includes(user.id) ? 'var(--color-surface-hover)' : 'transparent'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{user.first_name} {user.last_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{user.email}</div>
                      </div>
                      {event.participants.includes(user.id) && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ display: 'flex', gap: 12 }}>
              <AlignLeft size={18} style={{ color: 'var(--color-text-muted)', marginTop: 8 }} />
              <textarea 
                placeholder="Notizen hinzufügen..." 
                className="input-field" 
                rows={4} 
                style={{ flex: 1, resize: 'none' }} 
                value={event.description}
                onChange={e => setEvent({...event, description: e.target.value})}
              />
            </div>
            
            {/* Color & Reminders */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: 30 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#0052CC', '#36B37E', '#FFAB00', '#FF5630', '#6554C0'].map(c => (
                  <button 
                    key={c}
                    type="button"
                    onClick={() => setEvent({...event, color: c})}
                    style={{ 
                      width: 24, height: 24, borderRadius: '50%', backgroundColor: c, 
                      border: event.color === c ? '2px solid var(--color-text-main)' : '2px solid transparent', 
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                    }}
                  >
                    {event.color === c && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Erinnerung:</span>
                <select 
                  className="input-field" 
                  style={{ fontSize: 12, padding: '4px 8px' }}
                  value={event.reminderMinutes}
                  onChange={e => setEvent({...event, reminderMinutes: parseInt(e.target.value)})}
                >
                  <option value={0}>Keine</option>
                  <option value={5}>5 Min</option>
                  <option value={15}>15 Min</option>
                  <option value={30}>30 Min</option>
                  <option value={60}>1 Std</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {saveStatus && (
          <div style={{ 
            padding: '12px 24px', 
            backgroundColor: saveStatus.type === 'success' ? 'rgba(54, 179, 126, 0.1)' : 'rgba(255, 86, 48, 0.1)',
            color: saveStatus.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: 13, fontWeight: 600, borderTop: '1px solid var(--color-border)'
          }}>
            {saveStatus.msg}
          </div>
        )}
        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" onClick={() => onSave(event)}>
            <Save size={16} /> <span style={{ marginLeft: 8 }}>{editingEvent ? 'Aktualisieren' : 'Speichern'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
