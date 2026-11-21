export type CardOrientation = 'horizontal' | 'vertical';
export type CardSidedness = 'single' | 'double';
export type CardSideId = 'front' | 'back';

export type TextFieldType =
  | 'name'
  | 'title'
  | 'company'
  | 'phone'
  | 'email'
  | 'website'
  | 'tagline'
  | 'custom';

export interface CardBackground {
  type: 'solid' | 'gradient';
  color: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
}

export interface BaseElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  fieldType: TextFieldType;
  text: string;
  fontFamily: string;
  fontSize: number; // In 300 DPI canvas px
  fontWeight: 400 | 700;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  letterSpacing: number; // In px at 300 DPI
  lineHeight: number; // Multiplier, e.g. 1.25
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  preserveAspect: boolean;
}

export type CardElement = TextElement | ImageElement;

export interface CardSide {
  background: CardBackground;
  elements: CardElement[];
}

export interface GuideSettings {
  showBleed: boolean;
  showTrim: boolean;
  showSafeZone: boolean;
}

export interface CardProject {
  id: string;
  name: string;
  updatedAt: string;
  sidedness: CardSidedness;
  orientation: CardOrientation;
  accepted: boolean;
  guides: GuideSettings;
  front: CardSide;
  back: CardSide;
}

export interface SavedDraft {
  id: string;
  name: string;
  savedAt: string;
  sidedness: CardSidedness;
  orientation: CardOrientation;
  frontPreviewDataUrl: string;
  backPreviewDataUrl?: string;
  project: CardProject;
}

export interface UploadedAsset {
  id: string;
  fileName: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  addedAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

// Print specifications at 300 DPI
export const PRINT_DPI = 300;
export const BLEED_INCHES = 0.125;
export const SAFE_INSET_INCHES = 0.125;

export interface CanvasMetrics {
  trimInW: number;
  trimInH: number;
  fullInW: number;
  fullInH: number;
  fullW: number;
  fullH: number;
  bleedPx: number;
  safeInsetFromEdgePx: number;
  trimW: number;
  trimH: number;
  safeW: number;
  safeH: number;
}

export function getCanvasMetrics(orientation: CardOrientation): CanvasMetrics {
  const trimInW = orientation === 'horizontal' ? 3.5 : 2.0;
  const trimInH = orientation === 'horizontal' ? 2.0 : 3.5;
  const fullInW = trimInW + BLEED_INCHES * 2; // 3.75 or 2.25
  const fullInH = trimInH + BLEED_INCHES * 2; // 2.25 or 3.75
  const fullW = Math.round(fullInW * PRINT_DPI); // 1125 or 675
  const fullH = Math.round(fullInH * PRINT_DPI); // 675 or 1125
  const bleedPx = BLEED_INCHES * PRINT_DPI; // 37.5
  const safeInsetFromEdgePx = (BLEED_INCHES + SAFE_INSET_INCHES) * PRINT_DPI; // 75
  const trimW = trimInW * PRINT_DPI; // 1050 or 600
  const trimH = trimInH * PRINT_DPI; // 600 or 1050
  const safeW = fullW - safeInsetFromEdgePx * 2; // 975 or 525
  const safeH = fullH - safeInsetFromEdgePx * 2; // 525 or 975

  return {
    trimInW,
    trimInH,
    fullInW,
    fullInH,
    fullW,
    fullH,
    bleedPx,
    safeInsetFromEdgePx,
    trimW,
    trimH,
    safeW,
    safeH,
  };
}

export interface StudioFontOption {
  label: string;
  family: string;
  category: string;
}

export const STUDIO_FONTS: StudioFontOption[] = [
  { label: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans', category: 'Geometric Sans' },
  { label: 'DM Sans', family: 'DM Sans', category: 'Clean Sans' },
  { label: 'Outfit', family: 'Outfit', category: 'Modern Sans' },
  { label: 'Manrope', family: 'Manrope', category: 'Humanist Sans' },
  { label: 'Bricolage Grotesque', family: 'Bricolage Grotesque', category: 'Display Sans' },
  { label: 'Oswald', family: 'Oswald', category: 'Condensed' },
  { label: 'Playfair Display', family: 'Playfair Display', category: 'Editorial Serif' },
  { label: 'Cormorant Garamond', family: 'Cormorant Garamond', category: 'Classic Serif' },
  { label: 'Lora', family: 'Lora', category: 'Book Serif' },
  { label: 'JetBrains Mono', family: 'JetBrains Mono', category: 'Monospace' },
];

export const COLOR_SWATCHES = [
  '#0F172A',
  '#1E293B',
  '#334155',
  '#475569',
  '#FFFFFF',
  '#F8FAFC',
  '#F5F0E8',
  '#E2E8F0',
  '#2563EB',
  '#0284C7',
  '#0F766E',
  '#16A34A',
  '#B45309',
  '#DC2626',
  '#7C3AED',
  '#18181B',
];

export const GRADIENT_PRESETS: Array<{
  label: string;
  start: string;
  end: string;
  angle: number;
}> = [
  { label: 'Alabaster Mist', start: '#FFFFFF', end: '#E2E8F0', angle: 135 },
  { label: 'Midnight Slate', start: '#0F172A', end: '#1E293B', angle: 135 },
  { label: 'Cobalt Depth', start: '#1D4ED8', end: '#0F172A', angle: 120 },
  { label: 'Warm Linen', start: '#FAF7F2', end: '#E8DFD1', angle: 145 },
  { label: 'Forest Pine', start: '#064E3B', end: '#0F172A', angle: 135 },
  { label: 'Copper Dusk', start: '#78350F', end: '#1C1917', angle: 135 },
];
