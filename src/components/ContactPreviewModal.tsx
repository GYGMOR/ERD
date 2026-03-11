import { X, Mail, Phone, Building2, Calendar } from 'lucide-react';
import type { Contact } from '../types/entities';

interface ContactPreviewModalProps {
  contact: Contact;
  onClose: () => void;
}

export const ContactPreviewModal = ({ contact, onClose }: ContactPreviewModalProps) => {
  const avatarColor = (s: string) => {
    const colors = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-info)', '#8b5cf6', '#ec4899'];
    return colors[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: 500, padding: 0, overflow: 'hidden' }}>
        {/* Header/Avatar */}
        <div style={{ padding: '32px 32px 24px', backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', position: 'relative', textAlign: 'center' }}>
          <button onClick={onClose} style={{ position: 'absolute', right: 20, top: 20, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          
          <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: avatarColor(contact.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 28, margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
          </div>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text-main)' }}>
            {contact.first_name} {contact.last_name}
          </h2>
          <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 14, marginTop: 4 }}>
            {contact.role || 'Kontaktperson'}
          </p>
        </div>

        {/* Info Body */}
        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0,82,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                <Mail size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-Mail Adresse</div>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: 15 }}>{contact.email}</a>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>Keine E-Mail</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(54,179,126,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)', flexShrink: 0 }}>
                <Phone size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telefonnummer</div>
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500, fontSize: 15 }}>{contact.phone}</a>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>Keine Nummer</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,171,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)', flexShrink: 0 }}>
                <Building2 size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Firma / Unternehmen</div>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{contact.company_name || 'Einzelperson / Unbekannt'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(102,102,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <Calendar size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Erstellt am</div>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{new Date(contact.created_at).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 24px' }}>Schliessen</button>
        </div>
      </div>
    </div>
  );
};
