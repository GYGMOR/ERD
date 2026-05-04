import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight,
  Activity
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Aktive Verträge', value: '2', icon: <CheckCircle2 className="text-success" />, trend: '+1 neu' },
    { label: 'Offene Tickets', value: '1', icon: <Clock className="text-primary" />, trend: 'In Bearbeitung' },
    { label: 'Offene Rechnungen', value: '0', icon: <AlertCircle className="text-muted" />, trend: 'Alles bezahlt' },
  ];

  return (
    <div className="portal-dashboard">
      <header className="dashboard-header">
        <h1 className="premium-gradient">Guten Tag, {user?.firstName}!</h1>
        <p>Hier finden Sie eine Übersicht über Ihre digitalen Services und Anfragen.</p>
      </header>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <h3 className="stat-value">{stat.value}</h3>
              <span className="stat-trend">{stat.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-section main-section">
          <div className="section-header">
            <h3>Letzte Aktivitäten</h3>
            <button className="btn-text">Alle ansehen <ArrowUpRight size={16} /></button>
          </div>
          <div className="activity-list">
            {[
              { title: 'Ticket #1042 geschlossen', time: 'Vor 2 Stunden', type: 'ticket' },
              { title: 'Rechnung RE-2024-001 bezahlt', time: 'Gestern', type: 'invoice' },
              { title: 'Vertrag ISMP Managed Hosting aktiviert', time: 'Vor 3 Tagen', type: 'contract' },
            ].map((act, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-dot ${act.type}`}></div>
                <div className="activity-info">
                  <p className="activity-title">{act.title}</p>
                  <p className="activity-time">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="dashboard-section side-section">
          <div className="section-header">
            <h3>System-Status</h3>
            <Activity size={16} className="text-success" />
          </div>
          <div className="status-card">
            <div className="status-row">
              <span>Webseite</span>
              <span className="badge success">Online</span>
            </div>
            <div className="status-row">
              <span>E-Mail (M365)</span>
              <span className="badge success">Online</span>
            </div>
            <div className="status-row">
              <span>Hosting-Infrastruktur</span>
              <span className="badge success">Optimal</span>
            </div>
          </div>
          <div className="support-cta">
            <p>Probleme mit einem Service?</p>
            <button className="btn btn-outline w-full mt-2" style={{ padding: '10px' }}>Support kontaktieren</button>
          </div>
        </aside>
      </div>

      <style>{`
        .portal-dashboard { display: flex; flex-direction: column; gap: 40px; }
        .dashboard-header h1 { font-size: 36px; margin-bottom: 8px; }
        .dashboard-header p { color: var(--text-muted); }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
        .stat-card { 
          background: var(--bg-card); 
          border: 1px solid var(--border); 
          border-radius: 20px; 
          padding: 24px; 
          display: flex; 
          gap: 20px; 
          align-items: center; 
        }
        .stat-icon { width: 56px; height: 56px; background: rgba(255,255,255,0.03); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .stat-label { font-size: 13px; color: var(--text-muted); margin: 0; }
        .stat-value { font-size: 28px; margin: 4px 0; }
        .stat-trend { font-size: 12px; color: var(--primary); font-weight: 600; }

        .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; }
        .dashboard-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 32px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .section-header h3 { font-size: 18px; margin: 0; }
        .btn-text { background: none; border: none; color: var(--primary); display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }

        .activity-list { display: flex; flex-direction: column; gap: 24px; }
        .activity-item { display: flex; gap: 16px; align-items: center; }
        .activity-dot { width: 10px; height: 10px; border-radius: 50%; }
        .activity-dot.ticket { background: var(--primary); box-shadow: 0 0 10px var(--primary-glow); }
        .activity-dot.invoice { background: #10b981; box-shadow: 0 0 10px rgba(16,185,129,0.3); }
        .activity-dot.contract { background: var(--secondary); box-shadow: 0 0 10px var(--secondary-glow); }
        .activity-title { font-weight: 600; font-size: 15px; margin: 0; }
        .activity-time { font-size: 12px; color: var(--text-muted); margin: 0; }

        .status-card { display: flex; flex-direction: column; gap: 16px; }
        .status-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
        .badge { padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .badge.success { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
        .support-cta { margin-top: 32px; padding-top: 32px; border-top: 1px solid var(--border); text-align: center; font-size: 14px; color: var(--text-muted); }

        @media (max-width: 992px) {
          .dashboard-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
