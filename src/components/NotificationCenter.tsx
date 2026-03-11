import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Check, 
  Ticket, FolderOpen, FileText, FileSignature, 
  AlertCircle, AlertTriangle, Info, Clock
} from 'lucide-react';
import { getUser } from '../utils/auth';
import type { Notification } from '../types/entities';

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = getUser();

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?userId=${user.id}&role=${user.role}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: user.role })
      });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
    }
    setOpen(false);
  };

  const getIcon = (type: string, priority: string) => {
    const style = { flexShrink: 0, marginTop: 2 };
    if (priority === 'critical') return <AlertCircle size={16} color="var(--color-danger)" style={style} />;
    if (priority === 'high') return <AlertTriangle size={16} color="var(--color-warning)" style={style} />;
    
    switch (type) {
      case 'ticket': return <Ticket size={16} color="var(--color-primary)" style={style} />;
      case 'project': return <FolderOpen size={16} color="var(--color-info)" style={style} />;
      case 'invoice': return <FileText size={16} color="var(--color-success)" style={style} />;
      case 'contract': return <FileSignature size={16} color="#8b5cf6" style={style} />;
      default: return <Info size={16} color="var(--color-text-muted)" style={style} />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
  /* const days = Math.floor(hours / 24); */

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('de-CH');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ 
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          width: 32, height: 32, borderRadius: '50%', 
          color: open ? 'var(--color-primary)' : 'var(--color-text-muted)',
          background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' 
        }}
        className="hover-bg-row"
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span style={{ 
            position: 'absolute', top: 5, right: 5, minWidth: 14, height: 14, 
            backgroundColor: 'var(--color-danger)', color: 'white', borderRadius: '50%', 
            fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--color-surface)', animation: 'pulse 2s infinite'
          }}>
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{ 
          position: 'absolute', right: 0, top: 40, width: 380, maxHeight: 500, 
          display: 'flex', flexDirection: 'column',
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', 
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 1000 
        }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            padding: '14px 18px', borderBottom: '1px solid var(--color-border)' 
          }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Benachrichtigungen</h3>
            {notifications.length > 0 && (
              <button 
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Alle gelesen
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Wird geladen...</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ width: 48, height: 48, backgroundColor: 'var(--color-surface-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Check size={24} />
                </div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Alles erledigt!</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Du hast keine ungelesenen Alerts.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    style={{ 
                      display: 'flex', gap: 12, padding: '14px 18px', 
                      borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
                      transition: 'background 0.1s' 
                    }}
                    className="hover-bg-row"
                  >
                    {getIcon(n.type, n.priority)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: n.priority === 'critical' ? 'var(--color-danger)' : 'var(--color-text-main)' }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} /> {formatTime(n.created_at)}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {n.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
            <button 
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              Schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
