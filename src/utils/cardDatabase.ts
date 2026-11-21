import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  CardBackground,
  CardElement,
  CardOrientation,
  CardProject,
  CardSide,
  CardSidedness,
  GuideSettings,
  ImageElement,
  TextElement,
} from '../types/card';

export const TAPCARD_STORE_URL =
  'https://thedbcompany.wixsite.com/tapcard/category/all-products';

const CUSTOMER_EMAIL_KEY = 'tapcard_studio_customer_email_v1';
const SUBMITTED_CARDS_KEY = 'tapcard_studio_submitted_cards_v1';

const MAX_ELEMENTS_PER_SIDE = 40;
const MAX_PAYLOAD_BYTES = 900_000;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{3,8}$/;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SavedCardRecord {
  id: string;
  email: string;
  name: string;
  sidedness: CardSidedness;
  orientation: CardOrientation;
  status: 'submitted';
  accepted: boolean;
  destinationUrl: string;
  guides: GuideSettings;
  front: CardSide;
  back: CardSide;
}

export interface SubmittedCardHistoryItem {
  id: string;
  email: string;
  name: string;
  submittedAt: string;
  sidedness: CardSidedness;
  orientation: CardOrientation;
  project: CardProject;
}

export function isValidCustomerEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length >= 5 && trimmed.length <= 254 && EMAIL_RE.test(trimmed);
}

export function extractEmailFromProject(project: CardProject): string {
  const allElements = [...project.front.elements, ...project.back.elements];
  for (const el of allElements) {
    if (el.type === 'text' && el.fieldType === 'email') {
      const candidate = el.text.trim();
      if (isValidCustomerEmail(candidate)) {
        return candidate;
      }
    }
  }
  return '';
}

export function loadSavedCustomerEmail(): string {
  try {
    return window.localStorage.getItem(CUSTOMER_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export function persistCustomerEmail(email: string): void {
  try {
    window.localStorage.setItem(CUSTOMER_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function loadSubmittedCardHistory(): SubmittedCardHistoryItem[] {
  try {
    const raw = window.localStorage.getItem(SUBMITTED_CARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SubmittedCardHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordSubmittedCardLocally(
  item: SubmittedCardHistoryItem
): SubmittedCardHistoryItem[] {
  const next = [item, ...loadSubmittedCardHistory()].slice(0, 15);
  try {
    window.localStorage.setItem(SUBMITTED_CARDS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

function sanitizeId(raw: string, prefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  if (cleaned.length > 0 && SAFE_ID_RE.test(cleaned)) {
    return cleaned;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeHexColor(raw: string, fallback: string): string {
  const trimmed = (raw || '').trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

function sanitizeBackground(bg: CardBackground): CardBackground {
  const angle = Number.isFinite(bg.gradientAngle)
    ? Math.min(360, Math.max(0, Math.round(bg.gradientAngle)))
    : 135;

  return {
    type: bg.type === 'gradient' ? 'gradient' : 'solid',
    color: sanitizeHexColor(bg.color, '#FFFFFF'),
    gradientStart: sanitizeHexColor(bg.gradientStart, '#FFFFFF'),
    gradientEnd: sanitizeHexColor(bg.gradientEnd, '#E2E8F0'),
    gradientAngle: angle,
  };
}

function sanitizeElement(el: CardElement): CardElement {
  const base = {
    id: sanitizeId(el.id, el.type === 'text' ? 'txt' : 'img'),
    type: el.type,
    x: Number.isFinite(el.x) ? Math.round(el.x) : 0,
    y: Number.isFinite(el.y) ? Math.round(el.y) : 0,
    width: Number.isFinite(el.width) ? Math.max(10, Math.round(el.width)) : 120,
    height: Number.isFinite(el.height) ? Math.max(10, Math.round(el.height)) : 40,
    rotation: Number.isFinite(el.rotation) ? Math.round(el.rotation) : 0,
    opacity: Number.isFinite(el.opacity) ? Math.min(1, Math.max(0, el.opacity)) : 1,
    locked: Boolean(el.locked),
  };

  if (el.type === 'text') {
    const textEl: TextElement = {
      ...base,
      type: 'text',
      fieldType: el.fieldType,
      text: (el.text || '').slice(0, 1000),
      fontFamily: (el.fontFamily || 'Plus Jakarta Sans').slice(0, 80),
      fontSize: Number.isFinite(el.fontSize) ? Math.max(8, Math.round(el.fontSize)) : 28,
      fontWeight: el.fontWeight === 700 ? 700 : 400,
      fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal',
      textAlign:
        el.textAlign === 'center' || el.textAlign === 'right' ? el.textAlign : 'left',
      color: sanitizeHexColor(el.color, '#0F172A'),
      letterSpacing: Number.isFinite(el.letterSpacing) ? el.letterSpacing : 0,
      lineHeight: Number.isFinite(el.lineHeight) ? el.lineHeight : 1.25,
    };
    return textEl;
  }

  const imgEl: ImageElement = {
    ...base,
    type: 'image',
    src: el.src || '',
    fileName: (el.fileName || 'graphic').slice(0, 120),
    naturalWidth: Number.isFinite(el.naturalWidth) ? Math.max(1, el.naturalWidth) : 400,
    naturalHeight: Number.isFinite(el.naturalHeight) ? Math.max(1, el.naturalHeight) : 400,
    preserveAspect: el.preserveAspect !== false,
  };
  return imgEl;
}

async function compressDataUrlIfNeeded(dataUrl: string, maxChars: number): Promise<string> {
  if (dataUrl.length <= maxChars || dataUrl.startsWith('data:image/svg+xml')) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(1, Math.round((img.naturalWidth || 400) * scale));
      const h = Math.max(1, Math.round((img.naturalHeight || 400) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/webp', 0.82);
      resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function sanitizeSide(side: CardSide, compressImages: boolean): Promise<CardSide> {
  const limited = side.elements.slice(0, MAX_ELEMENTS_PER_SIDE).map(sanitizeElement);
  if (!compressImages) {
    return {
      background: sanitizeBackground(side.background),
      elements: limited,
    };
  }
  const compressedElements = await Promise.all(
    limited.map(async (el) => {
      if (el.type === 'image') {
        const nextSrc = await compressDataUrlIfNeeded(el.src, 180_000);
        return { ...el, src: nextSrc };
      }
      return el;
    })
  );
  return {
    background: sanitizeBackground(side.background),
    elements: compressedElements,
  };
}

export async function saveCardOrderToDatabase(
  project: CardProject,
  customerEmail: string
): Promise<{ cardId: string; email: string }> {
  const normalizedEmail = customerEmail.trim().toLowerCase();
  if (!isValidCustomerEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const cardId = sanitizeId(
    `card_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    'card'
  );
  const safeName =
    (project.name || 'Untitled Business Card').trim().slice(0, 120) ||
    'Untitled Business Card';

  let front = await sanitizeSide(project.front, false);
  let back = await sanitizeSide(project.back, false);

  const buildDocPayload = (frontSide: CardSide, backSide: CardSide): SavedCardRecord => ({
    id: cardId,
    email: normalizedEmail,
    name: safeName,
    sidedness: project.sidedness === 'single' ? 'single' : 'double',
    orientation: project.orientation === 'vertical' ? 'vertical' : 'horizontal',
    status: 'submitted',
    accepted: true,
    destinationUrl: TAPCARD_STORE_URL,
    guides: {
      showBleed: Boolean(project.guides?.showBleed),
      showTrim: Boolean(project.guides?.showTrim),
      showSafeZone: Boolean(project.guides?.showSafeZone),
    },
    front: frontSide,
    back: backSide,
  });

  let payload = buildDocPayload(front, back);
  const estimatedBytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (estimatedBytes > MAX_PAYLOAD_BYTES) {
    front = await sanitizeSide(project.front, true);
    back = await sanitizeSide(project.back, true);
    payload = buildDocPayload(front, back);
    const reEstimated = new TextEncoder().encode(JSON.stringify(payload)).length;
    if (reEstimated > MAX_PAYLOAD_BYTES) {
      throw new Error(
        'Card artwork exceeds the 1 MB database document limit. Please reduce embedded image sizes.'
      );
    }
  }

  const docPath = `cards/${cardId}`;
  try {
    await setDoc(doc(db, 'cards', cardId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    persistCustomerEmail(normalizedEmail);
    return { cardId, email: normalizedEmail };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}
