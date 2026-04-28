import { DocumentExplorer } from '../../components/DocumentExplorer';
import { getUser } from '../../utils/auth';

export const Documents = () => {
  const user = getUser();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Dokumenten-Center
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>
          Alle Ihre Dokumente, Pläne und Berichte sicher an einem Ort.
        </p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {user?.company_id ? (
          <DocumentExplorer entityType="company" entityId={user.company_id} />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
            Keine Dokumente verfügbar (Keine Firmenzuordnung gefunden).
          </div>
        )}
      </div>
    </div>
  );
};
