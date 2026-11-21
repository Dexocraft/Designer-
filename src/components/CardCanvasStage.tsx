import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Maximize,
  Minus,
  Plus,
  Redo2,
  RotateCw,
  Save,
  SlidersHorizontal,
  Undo2,
  Wrench,
} from 'lucide-react';
import {
  CardBackground,
  CardElement,
  CardOrientation,
  CardProject,
  CardSideId,
  CardSidedness,
  getCanvasMetrics,
} from '../types/card';
import { AdSlot } from './AdSlot';

interface CardCanvasStageProps {
  project: CardProject;
  activeSide: CardSideId;
  selectedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onSelectSide: (side: CardSideId) => void;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<CardElement>, recordHistory?: boolean) => void;
  onCommitElementHistory: () => void;
  onChangeSidedness: (sidedness: CardSidedness) => void;
  onChangeOrientation: (orientation: CardOrientation) => void;
  onToggleGuide: (guide: 'showBleed' | 'showTrim' | 'showSafeZone') => void;
  onUndo: () => void;
  onRedo: () => void;
  onQuickSaveDraft: () => void;
  onOpenMobileTools: () => void;
  onOpenMobileInspector: () => void;
}

type DragMode =
  | {
      kind: 'move';
      id: string;
      startClientX: number;
      startClientY: number;
      origX: number;
      origY: number;
    }
  | {
      kind: 'resize';
      id: string;
      handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
      startClientX: number;
      startClientY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
      preserveAspect: boolean;
    }
  | {
      kind: 'rotate';
      id: string;
      centerX: number;
      centerY: number;
      startAngleRad: number;
      origRotation: number;
    };

interface SnapLines {
  vertical: number[];
  horizontal: number[];
}

function getBackgroundCss(bg: CardBackground): string {
  if (bg.type === 'solid') return bg.color;
  return `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientStart}, ${bg.gradientEnd})`;
}

export function CardCanvasStage({
  project,
  activeSide,
  selectedId,
  canUndo,
  canRedo,
  onSelectSide,
  onSelectElement,
  onUpdateElement,
  onCommitElementHistory,
  onChangeSidedness,
  onChangeOrientation,
  onToggleGuide,
  onUndo,
  onRedo,
  onQuickSaveDraft,
  onOpenMobileTools,
  onOpenMobileInspector,
}: CardCanvasStageProps) {
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 820, height: 560 });
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<SnapLines>({ vertical: [], horizontal: [] });
  const [activeRotationBadge, setActiveRotationBadge] = useState<number | null>(null);

  const dragRef = useRef<DragMode | null>(null);
  const hasDraggedRef = useRef(false);

  const metrics = useMemo(() => getCanvasMetrics(project.orientation), [project.orientation]);
  const sideData = project[activeSide];

  // Observe container dimensions to fit the print card cleanly inside desktop or Wix iframe viewports
  useEffect(() => {
    const node = stageContainerRef.current;
    if (!node) return;
    const updateSize = () => {
      setContainerSize({
        width: Math.max(260, node.clientWidth),
        height: Math.max(240, node.clientHeight),
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const fitScale = useMemo(() => {
    const padX = containerSize.width < 520 ? 36 : 88;
    const padY = containerSize.height < 420 ? 44 : 88;
    const availW = Math.max(180, containerSize.width - padX);
    const availH = Math.max(180, containerSize.height - padY);
    const raw = Math.min(availW / metrics.fullW, availH / metrics.fullH);
    return Math.max(0.2, Math.min(raw, 1.15));
  }, [containerSize, metrics.fullW, metrics.fullH]);

  const effectiveScale = fitScale * zoomMultiplier;
  const displayWidth = Math.round(metrics.fullW * effectiveScale);
  const displayHeight = Math.round(metrics.fullH * effectiveScale);

  // Clear inline editing when switching sides or deselecting
  useEffect(() => {
    if (!selectedId || selectedId !== editingTextId) {
      setEditingTextId(null);
    }
  }, [selectedId, editingTextId, activeSide]);

  // Global pointer move/up handlers for smooth dragging, resizing, and rotating
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      hasDraggedRef.current = true;

      if (drag.kind === 'move') {
        const dx = (e.clientX - drag.startClientX) / effectiveScale;
        const dy = (e.clientY - drag.startClientY) / effectiveScale;
        const el = sideData.elements.find((item) => item.id === drag.id);
        if (!el) return;

        let nextX = drag.origX + dx;
        let nextY = drag.origY + dy;

        const snapThreshold = 10;
        const vTargets = [
          metrics.fullW / 2,
          metrics.bleedPx,
          metrics.fullW - metrics.bleedPx,
          metrics.safeInsetFromEdgePx,
          metrics.fullW - metrics.safeInsetFromEdgePx,
        ];
        const hTargets = [
          metrics.fullH / 2,
          metrics.bleedPx,
          metrics.fullH - metrics.bleedPx,
          metrics.safeInsetFromEdgePx,
          metrics.fullH - metrics.safeInsetFromEdgePx,
        ];

        for (const sibling of sideData.elements) {
          if (sibling.id === el.id) continue;
          vTargets.push(sibling.x, sibling.x + sibling.width / 2, sibling.x + sibling.width);
          hTargets.push(sibling.y, sibling.y + sibling.height / 2, sibling.y + sibling.height);
        }

        const matchedV: number[] = [];
        const matchedH: number[] = [];

        if (!e.altKey) {
          // Check X snapping (left, center, right)
          const elLeft = nextX;
          const elCenterX = nextX + el.width / 2;
          const elRight = nextX + el.width;

          let bestDistX = snapThreshold + 1;
          let snapDeltaX = 0;
          let snapLineX: number | null = null;

          for (const target of vTargets) {
            for (const anchor of [elLeft, elCenterX, elRight]) {
              const dist = Math.abs(anchor - target);
              if (dist < bestDistX) {
                bestDistX = dist;
                snapDeltaX = target - anchor;
                snapLineX = target;
              }
            }
          }
          if (snapLineX !== null) {
            nextX += snapDeltaX;
            matchedV.push(snapLineX);
          }

          // Check Y snapping (top, middle, bottom)
          const elTop = nextY;
          const elCenterY = nextY + el.height / 2;
          const elBottom = nextY + el.height;

          let bestDistY = snapThreshold + 1;
          let snapDeltaY = 0;
          let snapLineY: number | null = null;

          for (const target of hTargets) {
            for (const anchor of [elTop, elCenterY, elBottom]) {
              const dist = Math.abs(anchor - target);
              if (dist < bestDistY) {
                bestDistY = dist;
                snapDeltaY = target - anchor;
                snapLineY = target;
              }
            }
          }
          if (snapLineY !== null) {
            nextY += snapDeltaY;
            matchedH.push(snapLineY);
          }
        }

        setSnapLines({ vertical: matchedV, horizontal: matchedH });
        onUpdateElement(
          drag.id,
          { x: Math.round(nextX), y: Math.round(nextY) },
          false
        );
      } else if (drag.kind === 'resize') {
        const dx = (e.clientX - drag.startClientX) / effectiveScale;
        const dy = (e.clientY - drag.startClientY) / effectiveScale;
        const minSize = 24;

        let x = drag.origX;
        let y = drag.origY;
        let w = drag.origW;
        let h = drag.origH;

        if (drag.handle.includes('e')) {
          w = Math.max(minSize, drag.origW + dx);
        }
        if (drag.handle.includes('s')) {
          h = Math.max(minSize, drag.origH + dy);
        }
        if (drag.handle.includes('w')) {
          const nextW = Math.max(minSize, drag.origW - dx);
          x = drag.origX + (drag.origW - nextW);
          w = nextW;
        }
        if (drag.handle.includes('n')) {
          const nextH = Math.max(minSize, drag.origH - dy);
          y = drag.origY + (drag.origH - nextH);
          h = nextH;
        }

        if (drag.preserveAspect) {
          const ratio = drag.origW / drag.origH;
          if (drag.handle === 'n' || drag.handle === 's') {
            w = h * ratio;
          } else {
            const nextH = w / ratio;
            if (drag.handle.includes('n')) {
              y = drag.origY + (drag.origH - nextH);
            }
            h = nextH;
          }
        }

        onUpdateElement(
          drag.id,
          {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(w),
            height: Math.round(h),
          },
          false
        );
      } else if (drag.kind === 'rotate') {
        const currentAngle = Math.atan2(
          e.clientY - drag.centerY,
          e.clientX - drag.centerX
        );
        let deg =
          drag.origRotation + ((currentAngle - drag.startAngleRad) * 180) / Math.PI;
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        } else {
          deg = Math.round(deg);
        }
        while (deg > 180) deg -= 360;
        while (deg < -180) deg += 360;
        setActiveRotationBadge(deg);
        onUpdateElement(drag.id, { rotation: deg }, false);
      }
    };

    const handlePointerUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setSnapLines({ vertical: [], horizontal: [] });
      setActiveRotationBadge(null);
      if (hasDraggedRef.current) {
        onCommitElementHistory();
      }
      hasDraggedRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [effectiveScale, metrics, sideData.elements, onUpdateElement, onCommitElementHistory]);

  const startMove = (e: React.PointerEvent, el: CardElement) => {
    if (editingTextId === el.id) return;
    e.stopPropagation();
    onSelectElement(el.id);
    if (el.locked) return;
    hasDraggedRef.current = false;
    dragRef.current = {
      kind: 'move',
      id: el.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: el.x,
      origY: el.y,
    };
  };

  const startResize = (
    e: React.PointerEvent,
    el: CardElement,
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  ) => {
    e.stopPropagation();
    if (el.locked) return;
    hasDraggedRef.current = false;
    dragRef.current = {
      kind: 'resize',
      id: el.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
      preserveAspect: el.type === 'image' && el.preserveAspect,
    };
  };

  const startRotate = (e: React.PointerEvent, el: CardElement) => {
    e.stopPropagation();
    if (el.locked || !canvasWrapperRef.current) return;
    const rect = canvasWrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + (el.x + el.width / 2) * effectiveScale;
    const centerY = rect.top + (el.y + el.height / 2) * effectiveScale;
    const startAngleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    hasDraggedRef.current = false;
    setActiveRotationBadge(Math.round(el.rotation));
    dragRef.current = {
      kind: 'rotate',
      id: el.id,
      centerX,
      centerY,
      startAngleRad,
      origRotation: el.rotation,
    };
  };

  const handleSizeInverse = 1 / effectiveScale;
  const resizeHandles: Array<{
    key: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    style: React.CSSProperties;
    cursor: string;
  }> = [
    { key: 'nw', style: { top: 0, left: 0 }, cursor: 'nwse-resize' },
    { key: 'n', style: { top: 0, left: '50%' }, cursor: 'ns-resize' },
    { key: 'ne', style: { top: 0, left: '100%' }, cursor: 'nesw-resize' },
    { key: 'e', style: { top: '50%', left: '100%' }, cursor: 'ew-resize' },
    { key: 'se', style: { top: '100%', left: '100%' }, cursor: 'nwse-resize' },
    { key: 's', style: { top: '100%', left: '50%' }, cursor: 'ns-resize' },
    { key: 'sw', style: { top: '100%', left: 0 }, cursor: 'nesw-resize' },
    { key: 'w', style: { top: '50%', left: 0 }, cursor: 'ew-resize' },
  ];

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Workspace Document Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 lg:px-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mobile Panel Launchers */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={onOpenMobileTools}
              className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Tools</span>
            </button>
            <button
              type="button"
              onClick={onOpenMobileInspector}
              className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Inspector</span>
            </button>
          </div>

          {/* Sidedness Switch */}
          <div
            role="group"
            aria-label="Card sidedness"
            className="flex items-center rounded-lg bg-slate-100 p-0.5"
          >
            <button
              type="button"
              onClick={() => onChangeSidedness('single')}
              className={`min-h-[34px] whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors ${
                project.sidedness === 'single'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1-Sided
            </button>
            <button
              type="button"
              onClick={() => onChangeSidedness('double')}
              className={`min-h-[34px] whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors ${
                project.sidedness === 'double'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2-Sided
            </button>
          </div>

          {/* Orientation Switch */}
          <div
            role="group"
            aria-label="Card orientation"
            className="flex items-center rounded-lg bg-slate-100 p-0.5"
          >
            <button
              type="button"
              onClick={() => onChangeOrientation('horizontal')}
              className={`min-h-[34px] whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors ${
                project.orientation === 'horizontal'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Horizontal (3.5&quot;×2&quot;)
            </button>
            <button
              type="button"
              onClick={() => onChangeOrientation('vertical')}
              className={`min-h-[34px] whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors ${
                project.orientation === 'vertical'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vertical (2&quot;×3.5&quot;)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Y)"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onQuickSaveDraft}
            className="flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Save className="h-3.5 w-3.5 text-slate-500" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Stage Sub-Bar: Front/Back Side Switcher, Guide Toggles & Zoom */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50 px-3 py-1.5 lg:px-4">
        <div className="flex items-center gap-2">
          {project.sidedness === 'double' ? (
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => onSelectSide('front')}
                className={`min-h-[32px] whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors ${
                  activeSide === 'front'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Front Side
              </button>
              <button
                type="button"
                onClick={() => onSelectSide('back')}
                className={`min-h-[32px] whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors ${
                  activeSide === 'back'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Back Side
              </button>
            </div>
          ) : (
            <span className="px-1 text-xs font-semibold text-slate-700">
              Front Side Only
            </span>
          )}
        </div>

        {/* Guide Line Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleGuide('showBleed')}
            aria-pressed={project.guides.showBleed}
            className={`flex min-h-[32px] items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
              project.guides.showBleed
                ? 'border-slate-300 bg-white text-slate-900'
                : 'border-transparent bg-transparent text-slate-500 hover:bg-white/60'
            }`}
          >
            <span className="inline-block w-3.5 border-t-2 border-dashed border-red-500" />
            <span>Bleed</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleGuide('showTrim')}
            aria-pressed={project.guides.showTrim}
            className={`flex min-h-[32px] items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
              project.guides.showTrim
                ? 'border-slate-300 bg-white text-slate-900'
                : 'border-transparent bg-transparent text-slate-500 hover:bg-white/60'
            }`}
          >
            <span className="inline-block w-3.5 border-t-2 border-sky-600" />
            <span>Trim</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleGuide('showSafeZone')}
            aria-pressed={project.guides.showSafeZone}
            className={`flex min-h-[32px] items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
              project.guides.showSafeZone
                ? 'border-slate-300 bg-white text-slate-900'
                : 'border-transparent bg-transparent text-slate-500 hover:bg-white/60'
            }`}
          >
            <span className="inline-block w-3.5 border-t-2 border-dotted border-emerald-600" />
            <span>Safe Zone</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoomMultiplier((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomMultiplier(1)}
            title="Reset zoom to fit"
            className="font-mono-tabular flex h-8 min-w-[54px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            {Math.round(zoomMultiplier * 100)}%
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoomMultiplier((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Fit card to view"
            title="Fit to screen"
            onClick={() => setZoomMultiplier(1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Maximize className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Central Drafting Mat & Interactive Card Canvas */}
      <div
        ref={stageContainerRef}
        onPointerDown={() => {
          onSelectElement(null);
          setEditingTextId(null);
        }}
        className="drafting-mat studio-scroll relative flex flex-1 items-center justify-center overflow-auto p-6"
      >
        <div className="flex flex-col items-center">
          {/* Scaled Wrapper */}
          <div
            ref={canvasWrapperRef}
            style={{ width: displayWidth, height: displayHeight }}
            className="relative shrink-0 shadow-[0_18px_42px_-12px_rgba(15,23,42,0.22),0_0_0_1px_rgba(15,23,42,0.08)]"
          >
            {/* Canonical 300 DPI Coordinate Canvas */}
            <div
              style={{
                width: metrics.fullW,
                height: metrics.fullH,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top left',
                background: getBackgroundCss(sideData.background),
              }}
              className="relative overflow-hidden select-none"
            >
              {/* Card Elements */}
              {sideData.elements.map((el) => {
                const isSelected = el.id === selectedId;
                const isEditing = el.id === editingTextId;

                return (
                  <div
                    key={el.id}
                    onPointerDown={(e) => startMove(e, el)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (el.type === 'text' && !el.locked) {
                        setEditingTextId(el.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      transform: `rotate(${el.rotation}deg)`,
                      opacity: el.opacity,
                      cursor: el.locked ? 'not-allowed' : isEditing ? 'text' : 'move',
                    }}
                    className={`touch-none ${
                      isSelected ? 'z-20' : 'hover:outline hover:outline-blue-400/60'
                    }`}
                  >
                    {el.type === 'image' ? (
                      <img
                        src={el.src}
                        alt={el.fileName}
                        draggable={false}
                        className="pointer-events-none h-full w-full object-fill"
                      />
                    ) : isEditing ? (
                      <textarea
                        autoFocus
                        value={el.text}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          onUpdateElement(el.id, { text: e.target.value }, false)
                        }
                        onBlur={() => {
                          setEditingTextId(null);
                          onCommitElementHistory();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingTextId(null);
                            onCommitElementHistory();
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '2px 4px',
                          fontFamily: `"${el.fontFamily}", sans-serif`,
                          fontSize: `${el.fontSize}px`,
                          fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle,
                          textAlign: el.textAlign,
                          color: el.color,
                          letterSpacing: `${el.letterSpacing}px`,
                          lineHeight: el.lineHeight,
                          background: 'rgba(255, 255, 255, 0.14)',
                          border: 'none',
                          outline: 'none',
                          resize: 'none',
                          overflow: 'hidden',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '2px 4px',
                          fontFamily: `"${el.fontFamily}", sans-serif`,
                          fontSize: `${el.fontSize}px`,
                          fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle,
                          textAlign: el.textAlign,
                          color: el.color,
                          letterSpacing: `${el.letterSpacing}px`,
                          lineHeight: el.lineHeight,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {el.text}
                      </div>
                    )}

                    {/* Selection Bounding Box, Resize Handles & Rotation Handle */}
                    {isSelected && !isEditing && (
                      <div
                        style={{
                          outline: `${Math.max(1.5, 2 * handleSizeInverse)}px solid #2563EB`,
                        }}
                        className="pointer-events-none absolute inset-0"
                      >
                        {!el.locked && (
                          <>
                            {/* Rotation Stem & Handle */}
                            <div
                              style={{
                                left: '50%',
                                top: -36 * handleSizeInverse,
                                width: 2 * handleSizeInverse,
                                height: 36 * handleSizeInverse,
                                transform: 'translateX(-50%)',
                              }}
                              className="absolute bg-blue-600"
                            />
                            <button
                              type="button"
                              aria-label="Rotate element"
                              onPointerDown={(e) => startRotate(e, el)}
                              style={{
                                left: '50%',
                                top: -48 * handleSizeInverse,
                                width: 24 * handleSizeInverse,
                                height: 24 * handleSizeInverse,
                                transform: 'translate(-50%, -50%)',
                              }}
                              className="pointer-events-auto absolute flex cursor-grab items-center justify-center rounded-full border border-blue-600 bg-white text-blue-600 shadow-sm active:cursor-grabbing"
                            >
                              <RotateCw
                                style={{
                                  width: 13 * handleSizeInverse,
                                  height: 13 * handleSizeInverse,
                                }}
                              />
                            </button>

                            {activeRotationBadge !== null && (
                              <div
                                style={{
                                  left: '50%',
                                  top: -82 * handleSizeInverse,
                                  transform: `translateX(-50%) scale(${handleSizeInverse})`,
                                }}
                                className="font-mono-tabular absolute rounded bg-slate-900 px-2 py-0.5 text-xs font-medium text-white shadow"
                              >
                                {activeRotationBadge}°
                              </div>
                            )}

                            {/* 8 Resize Handles */}
                            {resizeHandles.map((h) => (
                              <div
                                key={h.key}
                                onPointerDown={(e) => startResize(e, el, h.key)}
                                style={{
                                  ...h.style,
                                  width: 12 * handleSizeInverse,
                                  height: 12 * handleSizeInverse,
                                  borderWidth: 2 * handleSizeInverse,
                                  transform: 'translate(-50%, -50%)',
                                  cursor: h.cursor,
                                }}
                                className="pointer-events-auto absolute rounded-xs border-blue-600 bg-white shadow-xs"
                              />
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Smart Snap Guides Overlay */}
              {snapLines.vertical.map((xPos, i) => (
                <div
                  key={`sv_${i}`}
                  style={{
                    left: xPos,
                    width: Math.max(1, 1.5 * handleSizeInverse),
                  }}
                  className="pointer-events-none absolute top-0 bottom-0 z-30 bg-blue-500/80"
                />
              ))}
              {snapLines.horizontal.map((yPos, i) => (
                <div
                  key={`sh_${i}`}
                  style={{
                    top: yPos,
                    height: Math.max(1, 1.5 * handleSizeInverse),
                  }}
                  className="pointer-events-none absolute right-0 left-0 z-30 bg-blue-500/80"
                />
              ))}

              {/* Print Guides Layer (Automatically excluded from exports) */}
              <svg
                viewBox={`0 0 ${metrics.fullW} ${metrics.fullH}`}
                className="pointer-events-none absolute inset-0 z-40 h-full w-full"
              >
                {/* Bleed Zone Tint + Outer Dashed Red Line */}
                {project.guides.showBleed && (
                  <>
                    <path
                      fill="rgba(239, 68, 68, 0.08)"
                      fillRule="evenodd"
                      d={`M 0 0 H ${metrics.fullW} V ${metrics.fullH} H 0 Z M ${metrics.bleedPx} ${metrics.bleedPx} V ${metrics.fullH - metrics.bleedPx} H ${metrics.fullW - metrics.bleedPx} V ${metrics.bleedPx} Z`}
                    />
                    <rect
                      x={1}
                      y={1}
                      width={metrics.fullW - 2}
                      height={metrics.fullH - 2}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth={Math.max(2, 2 * handleSizeInverse)}
                      strokeDasharray={`${10 * handleSizeInverse} ${7 * handleSizeInverse}`}
                    />
                  </>
                )}

                {/* Trim Cut Line */}
                {project.guides.showTrim && (
                  <rect
                    x={metrics.bleedPx}
                    y={metrics.bleedPx}
                    width={metrics.trimW}
                    height={metrics.trimH}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth={Math.max(1.5, 1.8 * handleSizeInverse)}
                  />
                )}

                {/* Inner Safe Margin */}
                {project.guides.showSafeZone && (
                  <rect
                    x={metrics.safeInsetFromEdgePx}
                    y={metrics.safeInsetFromEdgePx}
                    width={metrics.safeW}
                    height={metrics.safeH}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={Math.max(1.5, 1.8 * handleSizeInverse)}
                    strokeDasharray={`${5 * handleSizeInverse} ${6 * handleSizeInverse}`}
                  />
                )}
              </svg>
            </div>
          </div>

          {/* Crisp single-line spec bar under the card */}
          <div className="font-mono-tabular mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span>
              Trim {metrics.trimInW.toFixed(1)}&quot; × {metrics.trimInH.toFixed(1)}&quot;
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Bleed {metrics.fullInW.toFixed(2)}&quot; × {metrics.fullInH.toFixed(2)}&quot;
            </span>
            <span aria-hidden="true">·</span>
            <span>300 DPI ({metrics.fullW} × {metrics.fullH} px)</span>
            <span aria-hidden="true">·</span>
            <span className="font-sans text-slate-500">Double-click text to edit inline</span>
          </div>

          {/* Inline Stage Ad Banner */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-4 w-full max-w-2xl"
          >
            <AdSlot variant="banner" initialIndex={4} />
          </div>
        </div>

        {/* Dismissible Corner Floating Ad on desktop stage */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-4 bottom-4 z-30 hidden xl:block"
        >
          <AdSlot variant="floating" initialIndex={5} />
        </div>
      </div>
    </section>
  );
}
