import { Download, Search, Filter, HardDrive, FileText, Image as ImageIcon, FileCode } from 'lucide-react';

export const Documents = () => {
  const docs = [
    { name: 'Vertrag_TechWave_2024.pdf', type: 'contract', size: '2.4 MB', date: '12.01.2024' },
    { name: 'Rechnung_RE-2026-001.pdf', type: 'invoice', size: '156 KB', date: '01.02.2026' },
    { name: 'Projektplan_Migration.pdf', type: 'project', size: '4.8 MB', date: '15.02.2026' },
    { name: 'Netzwerkplan_Zuerich.png', type: 'image', size: '8.2 MB', date: '03.03.2026' },
    { name: 'Offerte_Cloud_Backup.pdf', type: 'offer', size: '1.1 MB', date: '10.03.2026' },
    { name: 'Handbuch_Nexus_V1.pdf', type: 'guide', size: '12.4 MB', date: '01.01.2026' },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'contract': return <FileText style={{ color: 'var(--color-primary)' }} />;
      case 'invoice': return <FileText style={{ color: 'var(--color-success)' }} />;
      case 'project': return <FileText style={{ color: 'var(--color-warning)' }} />;
      case 'image': return <ImageIcon style={{ color: 'var(--color-secondary)' }} />;
      case 'offer': return <FileText style={{ color: 'var(--color-success)' }} />;
      default: return <FileCode style={{ color: 'var(--color-text-muted)' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Dokumenten-Center
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>
            Alle Ihre Dokumente, Pläne und Berichte sicher an einem Ort.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input type="text" placeholder="Suchen..." className="input-field" style={{ paddingLeft: 40, height: 40, width: 250 }} />
           </div>
           <button className="btn-secondary" style={{ height: 40, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={14} /> Filter
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
         <div className="card" style={{ backgroundColor: 'var(--color-text-main)', border: 'none', padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
               <p style={{ margin: '0 0 4px 0', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.1em' }}>Speicherplatz</p>
               <h4 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700 }}>1.2 GB / 50 GB</h4>
               <div style={{ height: 6, width: 160, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', backgroundColor: 'var(--color-primary)', width: '15%' }}></div>
               </div>
            </div>
            <HardDrive size={100} style={{ position: 'absolute', right: -20, opacity: 0.1 }} />
         </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
         <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                     <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Dateiname</th>
                     <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Typ</th>
                     <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Grösse</th>
                     <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Datum</th>
                     <th style={{ padding: '12px 24px' }}></th>
                  </tr>
               </thead>
               <tbody>
                  {docs.map((doc, i) => (
                     <tr key={i} className="hover-bg-row" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '16px 24px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ padding: 8, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)' }}>
                                 {getIcon(doc.type)}
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)' }}>{doc.name}</span>
                           </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                           <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>{doc.type}</span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: 12, color: 'var(--color-text-muted)' }}>{doc.size}</td>
                        <td style={{ padding: '16px 24px', fontSize: 12, color: 'var(--color-text-muted)' }}>{doc.date}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                           <button className="btn-secondary" style={{ padding: 8, borderRadius: 8 }}>
                              <Download size={16} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
