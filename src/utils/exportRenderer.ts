import { jsPDF } from 'jspdf';
import {
  CardOrientation,
  CardProject,
  CardSide,
  ImageElement,
  TextElement,
  getCanvasMetrics,
} from '../types/card';

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load embedded image asset'));
    img.src = src;
  });
}

function measureTextWithSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number
): number {
  if (!text) return 0;
  if (letterSpacing === 0) {
    return ctx.measureText(text).width;
  }
  let total = 0;
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    total += ctx.measureText(chars[i]).width;
    if (i < chars.length - 1) {
      total += letterSpacing;
    }
  }
  return total;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  maxWidth: number,
  letterSpacing: number
): string[] {
  const paragraphs = rawText.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const w = measureTextWithSpacing(ctx, candidate, letterSpacing);
      if (w <= maxWidth || !currentLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  return lines;
}

function drawTextLineWithSpacing(
  ctx: CanvasRenderingContext2D,
  line: string,
  startX: number,
  y: number,
  letterSpacing: number
) {
  if (letterSpacing === 0) {
    ctx.fillText(line, startX, y);
    return;
  }
  let cursorX = startX;
  const chars = Array.from(line);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    ctx.fillText(ch, cursorX, y);
    cursorX += ctx.measureText(ch).width + letterSpacing;
  }
}

async function drawTextElement(ctx: CanvasRenderingContext2D, el: TextElement) {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate((el.rotation * Math.PI) / 180);

  const fontSpec = `${el.fontStyle} ${el.fontWeight} ${el.fontSize}px "${el.fontFamily}", sans-serif`;
  ctx.font = fontSpec;
  ctx.fillStyle = el.color;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const padX = 4;
  const maxWidth = Math.max(20, el.width - padX * 2);
  const lines = wrapTextLines(ctx, el.text, maxWidth, el.letterSpacing);
  const lineStep = el.fontSize * el.lineHeight;
  const startY = -el.height / 2 + 2;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineW = measureTextWithSpacing(ctx, line, el.letterSpacing);
    let drawX = -el.width / 2 + padX;
    if (el.textAlign === 'center') {
      drawX = -lineW / 2;
    } else if (el.textAlign === 'right') {
      drawX = el.width / 2 - padX - lineW;
    }
    drawTextLineWithSpacing(ctx, line, drawX, startY + i * lineStep, el.letterSpacing);
  }

  ctx.restore();
}

async function drawImageElement(ctx: CanvasRenderingContext2D, el: ImageElement) {
  try {
    const img = await loadImageElement(el.src);
    ctx.save();
    ctx.globalAlpha = el.opacity;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
    ctx.restore();
  } catch {
    // Skip failed asset gracefully without halting export
  }
}

function fillSideBackground(
  ctx: CanvasRenderingContext2D,
  side: CardSide,
  width: number,
  height: number
) {
  const bg = side.background;
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const rad = ((bg.gradientAngle - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const halfDiag = Math.sqrt(width * width + height * height) / 2;
  const x0 = cx - Math.cos(rad) * halfDiag;
  const y0 = cy - Math.sin(rad) * halfDiag;
  const x1 = cx + Math.cos(rad) * halfDiag;
  const y1 = cy + Math.sin(rad) * halfDiag;

  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, bg.gradientStart);
  grad.addColorStop(1, bg.gradientEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Ensures all Google Fonts used on a card side are loaded before offscreen canvas rasterization.
 */
async function ensureSideFontsLoaded(side: CardSide): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    const fontPromises = side.elements
      .filter((el): el is TextElement => el.type === 'text')
      .map((el) =>
        document.fonts.load(`${el.fontStyle} ${el.fontWeight} ${el.fontSize}px "${el.fontFamily}"`)
      );
    await Promise.allSettled(fontPromises);
    await document.fonts.ready;
  } catch {
    // Proceed cleanly even if offline font loading times out
  }
}

/**
 * Renders a CardSide to a PNG data URL at canonical 300 DPI (scale=1) or thumbnail scale (e.g. scale=0.3).
 * Guide overlays (Bleed, Trim, Safe Zone) are intentionally excluded so exports are print-ready.
 */
export async function renderSideToPngDataUrl(
  side: CardSide,
  orientation: CardOrientation,
  scale = 1
): Promise<string> {
  await ensureSideFontsLoaded(side);
  const metrics = getCanvasMetrics(orientation);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(metrics.fullW * scale);
  canvas.height = Math.round(metrics.fullH * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to initialize 2D rendering context.');
  }

  ctx.save();
  ctx.scale(scale, scale);
  fillSideBackground(ctx, side, metrics.fullW, metrics.fullH);

  for (const el of side.elements) {
    if (el.type === 'image') {
      await drawImageElement(ctx, el);
    } else {
      await drawTextElement(ctx, el);
    }
  }
  ctx.restore();

  return canvas.toDataURL('image/png');
}

export function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tapcard-design'
  );
}

export function triggerFileDownload(dataOrBlobUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataOrBlobUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export async function exportPrintReadyPdf(project: CardProject): Promise<void> {
  const metrics = getCanvasMetrics(project.orientation);
  const pdfOrientation = project.orientation === 'horizontal' ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation: pdfOrientation,
    unit: 'in',
    format: [metrics.fullInW, metrics.fullInH],
    compress: true,
  });

  const frontPng = await renderSideToPngDataUrl(project.front, project.orientation, 1);
  doc.addImage(frontPng, 'PNG', 0, 0, metrics.fullInW, metrics.fullInH, undefined, 'FAST');

  if (project.sidedness === 'double') {
    const backPng = await renderSideToPngDataUrl(project.back, project.orientation, 1);
    doc.addPage([metrics.fullInW, metrics.fullInH], pdfOrientation);
    doc.addImage(backPng, 'PNG', 0, 0, metrics.fullInW, metrics.fullInH, undefined, 'FAST');
  }

  const slug = slugifyFilename(project.name);
  doc.save(`${slug}-print-ready-300dpi.pdf`);
}

export function exportProjectJsonBackup(project: CardProject): void {
  const payload = JSON.stringify(
    {
      format: 'tapcard-studio-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
    },
    null,
    2
  );
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const slug = slugifyFilename(project.name);
  triggerFileDownload(url, `${slug}-backup.json`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseProjectJsonBackup(rawText: string): CardProject {
  const parsed = JSON.parse(rawText) as { project?: CardProject } & Partial<CardProject>;
  const candidate = parsed.project ?? (parsed as CardProject);

  if (
    !candidate ||
    typeof candidate !== 'object' ||
    !candidate.front ||
    !candidate.back ||
    !Array.isArray(candidate.front.elements) ||
    !Array.isArray(candidate.back.elements)
  ) {
    throw new Error('This file is not a valid TapCard Studio design backup.');
  }

  return {
    ...candidate,
    id: candidate.id || `proj_${Date.now()}`,
    name: candidate.name || 'Imported Card Design',
    updatedAt: new Date().toISOString(),
    sidedness: candidate.sidedness === 'single' ? 'single' : 'double',
    orientation: candidate.orientation === 'vertical' ? 'vertical' : 'horizontal',
    accepted: Boolean(candidate.accepted),
    guides: candidate.guides || { showBleed: true, showTrim: true, showSafeZone: true },
  };
}
