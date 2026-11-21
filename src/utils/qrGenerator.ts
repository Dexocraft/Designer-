import QRCode from 'qrcode';
import { CardProject, TextElement } from '../types/card';

export interface VCardData {
  fullName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  website: string;
}

export interface QrCodeOptions {
  mode: 'url' | 'vcard';
  url: string;
  vcard: VCardData;
  darkColor: string;
  lightColor: string;
  transparentBg: boolean;
}

function escapeVCardValue(val: string): string {
  return val
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .trim();
}

export function normalizeQrUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function buildVCardString(vcard: VCardData): string {
  const fullName = vcard.fullName.trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  if (fullName) {
    lines.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`);
    lines.push(`FN:${escapeVCardValue(fullName)}`);
  }
  if (vcard.company.trim()) {
    lines.push(`ORG:${escapeVCardValue(vcard.company)}`);
  }
  if (vcard.title.trim()) {
    lines.push(`TITLE:${escapeVCardValue(vcard.title)}`);
  }
  if (vcard.phone.trim()) {
    lines.push(`TEL;TYPE=CELL,VOICE:${vcard.phone.trim()}`);
  }
  if (vcard.email.trim()) {
    lines.push(`EMAIL;TYPE=INTERNET:${vcard.email.trim()}`);
  }
  if (vcard.website.trim()) {
    lines.push(`URL:${normalizeQrUrl(vcard.website)}`);
  }
  lines.push('END:VCARD');
  return lines.join('\n');
}

export function extractVCardFromProject(project: CardProject): VCardData {
  const allTexts = [...project.front.elements, ...project.back.elements].filter(
    (el): el is TextElement => el.type === 'text'
  );
  const pick = (fieldType: TextElement['fieldType']) =>
    allTexts.find((el) => el.fieldType === fieldType)?.text.trim() ?? '';

  return {
    fullName: pick('name'),
    company: pick('company'),
    title: pick('title'),
    phone: pick('phone'),
    email: pick('email'),
    website: pick('website'),
  };
}

export function hasValidQrContent(options: QrCodeOptions): boolean {
  if (options.mode === 'url') {
    return options.url.trim().length > 0;
  }
  const { fullName, company, phone, email, website } = options.vcard;
  return Boolean(
    fullName.trim() || company.trim() || phone.trim() || email.trim() || website.trim()
  );
}

export async function generateQrCodeDataUrl(options: QrCodeOptions): Promise<string> {
  const payload =
    options.mode === 'url'
      ? normalizeQrUrl(options.url)
      : buildVCardString(options.vcard);

  if (!payload) {
    throw new Error('Please enter a URL or at least one vCard detail.');
  }

  return QRCode.toDataURL(payload, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: options.darkColor || '#0F172A',
      light: options.transparentBg ? '#00000000' : options.lightColor || '#FFFFFF',
    },
  });
}
