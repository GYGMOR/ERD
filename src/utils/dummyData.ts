export const revData = [
  { name: 'Jan', revenue: 12000 },
  { name: 'Feb', revenue: 19000 },
  { name: 'Mar', revenue: 15000 },
  { name: 'Apr', revenue: 22000 },
  { name: 'May', revenue: 28000 },
  { name: 'Jun', revenue: 35000 },
  { name: 'Jul', revenue: 42000 },
];

export const ticketData = [
  { name: 'Offen', value: 24, color: '#0052cc' },
  { name: 'Kritisch', value: 5, color: '#ff5630' },
  { name: 'Pending', value: 12, color: '#ffab00' },
  { name: 'Erledigt', value: 45, color: '#36b37e' },
];

export const dummyTickets = [
  { id: 'T-1042', title: 'Serverausfall in Region EU-West', customer: 'Acme Corp', status: 'Kritisch', priority: 'Hoch', assignee: 'Joel H.', updated: 'vor 10 Min' },
  { id: 'T-1041', title: 'Neuer Benutzer-Zugang benötigt', customer: 'Wayne Ent.', status: 'Offen', priority: 'Niedrig', assignee: 'Unassigned', updated: 'vor 2 Std' },
  { id: 'T-1040', title: 'Fehler beim PDF Export', customer: 'Globex Inc', status: 'In Bearbeitung', priority: 'Mittel', assignee: 'Sarah M.', updated: 'vor 4 Std' },
  { id: 'T-1039', title: 'API Limit erreicht', customer: 'Stark Ind.', status: 'Pending', priority: 'Hoch', assignee: 'Joel H.', updated: 'Gestern' },
  { id: 'T-1038', title: 'Rechnung Q3 anpassen', customer: 'Acme Corp', status: 'Erledigt', priority: 'Niedrig', assignee: 'Finance Team', updated: 'Vorgestern' },
];

export const dummyCustomers = [
  { id: 'C-001', name: 'Acme Corporation', email: 'contact@acmecorp.com', phone: '+41 44 123 45 67', status: 'Aktiv', arr: 'CHF 12,000' },
  { id: 'C-002', name: 'Wayne Enterprises', email: 'bruce@wayne.com', phone: '+41 79 987 65 43', status: 'Aktiv', arr: 'CHF 45,000' },
  { id: 'C-003', name: 'Stark Industries', email: 'tony@stark.com', phone: '+41 43 555 12 34', status: 'Inaktiv', arr: 'CHF 0' },
  { id: 'C-004', name: 'Globex Inc', email: 'info@globex.com', phone: '+41 31 111 22 33', status: 'Aktiv', arr: 'CHF 8,500' },
];

export const dummyQuotes = [
  { id: 'Q-2041', customer: 'Acme Corporation', title: 'Server Upgrade Q3', amount: 'CHF 12,400', status: 'Gesendet', date: '11.03.2026', validUntil: '11.04.2026' },
  { id: 'Q-2040', customer: 'Wayne Enterprises', title: 'Security Audit & Penetration Test', amount: 'CHF 8,900', status: 'Akzeptiert', date: '08.03.2026', validUntil: '08.04.2026' },
  { id: 'Q-2039', customer: 'Globex Inc', title: 'Neue SLA Vereinbarung', amount: 'CHF 1,200', status: 'Entwurf', date: '10.03.2026', validUntil: '10.04.2026' },
  { id: 'Q-2038', customer: 'Stark Industries', title: 'Cloud Migration AWS', amount: 'CHF 45,000', status: 'Abgelehnt', date: '01.03.2026', validUntil: '01.04.2026' },
];
