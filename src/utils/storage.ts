import { CardProject, SavedDraft } from '../types/card';

const ACTIVE_PROJECT_KEY = 'tapcard_studio_active_project_v1';
const SAVED_DRAFTS_KEY = 'tapcard_studio_saved_drafts_v1';

export function loadActiveProject(): CardProject | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CardProject;
    if (!parsed || !parsed.front || !parsed.back) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveProject(project: CardProject): boolean {
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}

export function clearActiveProject(): void {
  try {
    window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
  } catch {
    // Ignore storage access errors in restricted iframes
  }
}

export function loadSavedDrafts(): SavedDraft[] {
  try {
    const raw = window.localStorage.getItem(SAVED_DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedDrafts(drafts: SavedDraft[]): boolean {
  try {
    window.localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(drafts));
    return true;
  } catch {
    return false;
  }
}

export interface ProcessedImageResult {
  src: string;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
}

const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
]);

const ACCEPTED_EXTENSIONS = /\.(png|jpe?g|svg|webp)$/i;

export function processUploadedImageFile(file: File): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    const validMime = ACCEPTED_MIME_TYPES.has(file.type);
    const validExt = ACCEPTED_EXTENSIONS.test(file.name);
    if (!validMime && !validExt) {
      reject(new Error('Unsupported file format. Please upload PNG, JPG, SVG, or WebP.'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Image file exceeds the 10 MB upload limit.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        reject(new Error('Empty image data.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image asset.'));
      img.onload = () => {
        const natW = img.naturalWidth || 400;
        const natH = img.naturalHeight || 400;

        // Preserve SVG vector data URLs directly without rasterization
        if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
          resolve({
            src: dataUrl,
            fileName: file.name,
            naturalWidth: natW,
            naturalHeight: natH,
          });
          return;
        }

        // Normalize oversized raster uploads (>2000px) so localStorage stays responsive
        const maxEdge = 2000;
        if (natW <= maxEdge && natH <= maxEdge) {
          resolve({
            src: dataUrl,
            fileName: file.name,
            naturalWidth: natW,
            naturalHeight: natH,
          });
          return;
        }

        const scale = maxEdge / Math.max(natW, natH);
        const targetW = Math.round(natW * scale);
        const targetH = Math.round(natH * scale);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            src: dataUrl,
            fileName: file.name,
            naturalWidth: natW,
            naturalHeight: natH,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const outType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        resolve({
          src: canvas.toDataURL(outType, 0.92),
          fileName: file.name,
          naturalWidth: targetW,
          naturalHeight: targetH,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
