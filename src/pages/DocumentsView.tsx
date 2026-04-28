import { DocumentExplorer } from '../components/DocumentExplorer';

export const DocumentsView = () => {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>Dokumentenverwaltung</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Zentrale Übersicht aller hochgeladenen Dateien und Dokumente.</p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <DocumentExplorer entityType="general" entityId="00000000-0000-0000-0000-000000000000" />
      </div>
    </div>
  );
};
