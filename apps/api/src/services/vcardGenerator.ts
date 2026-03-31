/**
 * Liberty Field App — VCard & Contact Export Utilities
 *
 * Generates vCard 3.0 files and CSV exports from contact records.
 */

interface ContactRecord {
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  roleType: string;
  notes: string | null;
}

/**
 * Generate a vCard 3.0 string for a single contact.
 */
export function generateVCard(contact: ContactRecord): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(contact.name)}`,
    `N:${parseLastName(contact.name)};${parseFirstName(contact.name)};;;`,
  ];

  if (contact.company) {
    lines.push(`ORG:${escapeVCard(contact.company)}`);
  }
  if (contact.title) {
    lines.push(`TITLE:${escapeVCard(contact.title)}`);
  }
  if (contact.phone) {
    lines.push(`TEL;TYPE=WORK:${contact.phone}`);
  }
  if (contact.email) {
    lines.push(`EMAIL;TYPE=WORK:${contact.email}`);
  }
  if (contact.notes) {
    lines.push(`NOTE:${escapeVCard(contact.notes)}`);
  }

  // Add role type as a category
  lines.push(`CATEGORIES:${contact.roleType}`);
  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Convert an array of contacts to CSV format.
 */
export function contactsToCsv(contacts: ContactRecord[]): string {
  const headers = ['Name', 'Title', 'Phone', 'Email', 'Company', 'Role', 'Notes'];
  const rows = contacts.map((c) => [
    csvEscape(c.name),
    csvEscape(c.title || ''),
    csvEscape(c.phone || ''),
    csvEscape(c.email || ''),
    csvEscape(c.company || ''),
    csvEscape(c.roleType),
    csvEscape(c.notes || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ─── Helpers ────────────────────────────────

function escapeVCard(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

function csvEscape(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

function parseLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}
