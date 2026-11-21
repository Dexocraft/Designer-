import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Bold,
  Copy,
  Image as ImageIcon,
  Italic,
  Layers,
  Lock,
  Maximize2,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import {
  COLOR_SWATCHES,
  CardElement,
  CardOrientation,
  CardSideId,
  STUDIO_FONTS,
  getCanvasMetrics,
} from '../types/card';
import { AdSlot } from './AdSlot';

export type AlignAction =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom';

export type LayerAction = 'forward' | 'backward' | 'front' | 'back';

interface RightInspectorProps {
  selectedElement: CardElement | null;
  elements: CardElement[];
  orientation: CardOrientation;
  activeSide: CardSideId;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<CardElement>, recordHistory?: boolean) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onAlignElement: (id: string, action: AlignAction) => void;
  onReorderLayer: (id: string, action: LayerAction) => void;
  onFitImageSafeZone: (id: string) => void;
}

export function RightInspector({
  selectedElement,
  elements,
  orientation,
  activeSide,
  onSelectElement,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onAlignElement,
  onReorderLayer,
  onFitImageSafeZone,
}: RightInspectorProps) {
  const metrics = getCanvasMetrics(orientation);

  if (!selectedElement) {
    return (
      <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-white lg:w-[292px] lg:shrink-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Properties &amp; Layers
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Select any item on the {activeSide === 'front' ? 'Front' : 'Back'} canvas to style it.
          </p>
        </div>

        <div className="studio-scroll flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                {activeSide === 'front' ? 'Front' : 'Back'} Layers ({elements.length})
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-500">Top to bottom</span>
            </div>

            {elements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                No elements on this side yet. Add text blocks or upload artwork from the left panel.
              </div>
            ) : (
              <div className="space-y-1.5">
                {[...elements].reverse().map((el) => (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => onSelectElement(el.id)}
                    className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs transition-colors hover:border-blue-400 hover:bg-blue-50/30"
                  >
                    {el.type === 'text' ? (
                      <Type className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                      {el.type === 'text' ? el.text || 'Empty Text' : el.fileName}
                    </span>
                    {el.locked && <Lock className="h-3 w-3 shrink-0 text-slate-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-700">Print Guide Reference</h3>
            <dl className="mt-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-600">
                  <span className="inline-block w-4 border-t-2 border-dashed border-red-500" />
                  <span>Full Bleed</span>
                </dt>
                <dd className="font-mono-tabular text-slate-900">
                  {metrics.fullInW.toFixed(2)}&quot; × {metrics.fullInH.toFixed(2)}&quot;
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-600">
                  <span className="inline-block w-4 border-t-2 border-sky-600" />
                  <span>Cut Trim Size</span>
                </dt>
                <dd className="font-mono-tabular text-slate-900">
                  {metrics.trimInW.toFixed(1)}&quot; × {metrics.trimInH.toFixed(1)}&quot;
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-600">
                  <span className="inline-block w-4 border-t-2 border-dotted border-emerald-600" />
                  <span>Safe Margin</span>
                </dt>
                <dd className="font-mono-tabular text-slate-900">0.125&quot; inset</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Export Resolution</dt>
                <dd className="font-mono-tabular text-slate-900">
                  {metrics.fullW} × {metrics.fullH} px (300 DPI)
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <AdSlot variant="sidebar" initialIndex={2} />
      </aside>
    );
  }

  const elementIndex = elements.findIndex((el) => el.id === selectedElement.id);
  const isFirst = elementIndex <= 0;
  const isLast = elementIndex === elements.length - 1;

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-white lg:w-[292px] lg:shrink-0">
      {/* Header with quick duplicate / lock / delete */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {selectedElement.type === 'text' ? (
            <Type className="h-4 w-4 text-blue-600" />
          ) : (
            <ImageIcon className="h-4 w-4 text-emerald-600" />
          )}
          <span className="font-display text-sm font-semibold text-slate-900">
            {selectedElement.type === 'text' ? 'Text Element' : 'Image Asset'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onUpdateElement(selectedElement.id, { locked: !selectedElement.locked }, true)
            }
            title={selectedElement.locked ? 'Unlock position' : 'Lock position'}
            aria-label={selectedElement.locked ? 'Unlock element' : 'Lock element'}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              selectedElement.locked
                ? 'bg-amber-50 text-amber-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {selectedElement.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onDuplicateElement(selectedElement.id)}
            title="Duplicate element"
            aria-label="Duplicate element"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteElement(selectedElement.id)}
            title="Delete element"
            aria-label="Delete element"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="studio-scroll flex-1 space-y-5 overflow-y-auto p-4">
        {/* Text Content & Typography */}
        {selectedElement.type === 'text' && (
          <>
            <div>
              <label
                htmlFor="inspector-text-content"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Text Content
              </label>
              <textarea
                id="inspector-text-content"
                rows={2}
                value={selectedElement.text}
                onChange={(e) =>
                  onUpdateElement(selectedElement.id, { text: e.target.value }, true)
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold text-slate-700">Typography</h3>

              <div>
                <label
                  htmlFor="inspector-font-family"
                  className="mb-1 block text-[11px] font-medium text-slate-500"
                >
                  Font Family
                </label>
                <select
                  id="inspector-font-family"
                  value={selectedElement.fontFamily}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, { fontFamily: e.target.value }, true)
                  }
                  style={{ fontFamily: `"${selectedElement.fontFamily}", sans-serif` }}
                  className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {STUDIO_FONTS.map((font) => (
                    <option
                      key={font.family}
                      value={font.family}
                      style={{ fontFamily: `"${font.family}", sans-serif` }}
                    >
                      {font.label} ({font.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="inspector-font-size"
                    className="mb-1 block text-[11px] font-medium text-slate-500"
                  >
                    Size (px @ 300 DPI)
                  </label>
                  <input
                    id="inspector-font-size"
                    type="number"
                    min={10}
                    max={220}
                    value={Math.round(selectedElement.fontSize)}
                    onChange={(e) => {
                      const val = Math.max(10, Math.min(220, Number(e.target.value) || 10));
                      onUpdateElement(selectedElement.id, { fontSize: val }, true);
                    }}
                    className="font-mono-tabular min-h-[40px] w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">Style</span>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateElement(
                          selectedElement.id,
                          { fontWeight: selectedElement.fontWeight === 700 ? 400 : 700 },
                          true
                        )
                      }
                      aria-label="Toggle bold"
                      className={`flex min-h-[40px] items-center justify-center rounded-lg border text-sm transition-colors ${
                        selectedElement.fontWeight === 700
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Bold className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateElement(
                          selectedElement.id,
                          {
                            fontStyle:
                              selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                          },
                          true
                        )
                      }
                      aria-label="Toggle italic"
                      className={`flex min-h-[40px] items-center justify-center rounded-lg border text-sm transition-colors ${
                        selectedElement.fontStyle === 'italic'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Italic className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-medium text-slate-500">
                  Text Alignment
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                  {(['left', 'center', 'right'] as const).map((align) => {
                    const Icon =
                      align === 'left'
                        ? AlignLeft
                        : align === 'center'
                        ? AlignCenter
                        : AlignRight;
                    const active = selectedElement.textAlign === align;
                    return (
                      <button
                        key={align}
                        type="button"
                        aria-label={`Align text ${align}`}
                        onClick={() =>
                          onUpdateElement(selectedElement.id, { textAlign: align }, true)
                        }
                        className={`flex min-h-[36px] items-center justify-center rounded-md transition-colors ${
                          active
                            ? 'bg-white text-blue-600 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">Text Color</span>
                  <span className="font-mono-tabular text-[11px] text-slate-600">
                    {selectedElement.color.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Text color"
                    value={selectedElement.color}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { color: e.target.value }, true)
                    }
                    className="h-9 w-11 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                  />
                  <div className="flex flex-1 flex-wrap gap-1">
                    {COLOR_SWATCHES.slice(0, 8).map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Set text color ${hex}`}
                        onClick={() => onUpdateElement(selectedElement.id, { color: hex }, true)}
                        className={`h-6 w-6 rounded border ${
                          selectedElement.color.toLowerCase() === hex.toLowerCase()
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-500">Letter Spacing</span>
                    <span className="font-mono-tabular text-slate-700">
                      {selectedElement.letterSpacing}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-2}
                    max={20}
                    step={0.5}
                    value={selectedElement.letterSpacing}
                    onChange={(e) =>
                      onUpdateElement(
                        selectedElement.id,
                        { letterSpacing: Number(e.target.value) },
                        true
                      )
                    }
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-500">Line Height</span>
                    <span className="font-mono-tabular text-slate-700">
                      {selectedElement.lineHeight.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.9}
                    max={2.2}
                    step={0.05}
                    value={selectedElement.lineHeight}
                    onChange={(e) =>
                      onUpdateElement(
                        selectedElement.id,
                        { lineHeight: Number(e.target.value) },
                        true
                      )
                    }
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Image Specific Controls */}
        {selectedElement.type === 'image' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="truncate text-xs font-medium text-slate-900">
                {selectedElement.fileName}
              </div>
              <div className="font-mono-tabular mt-0.5 text-[11px] text-slate-500">
                Source {selectedElement.naturalWidth} × {selectedElement.naturalHeight} px
              </div>
            </div>

            <label className="flex min-h-[38px] cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
              <span>Lock Aspect Ratio</span>
              <input
                type="checkbox"
                checked={selectedElement.preserveAspect}
                onChange={(e) =>
                  onUpdateElement(
                    selectedElement.id,
                    { preserveAspect: e.target.checked },
                    true
                  )
                }
                className="h-4 w-4 rounded accent-blue-600"
              />
            </label>

            <button
              type="button"
              onClick={() => onFitImageSafeZone(selectedElement.id)}
              className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Fit Inside Safe Zone</span>
            </button>
          </div>
        )}

        {/* Quick Alignment Helpers */}
        <div className="border-t border-slate-100 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700">Align to Safe Zone</h3>
          </div>
          <div className="grid grid-cols-6 gap-1">
            <button
              type="button"
              title="Align Left"
              aria-label="Align Left"
              onClick={() => onAlignElement(selectedElement.id, 'left')}
              className="flex min-h-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <AlignStartVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Align Horizontal Center"
              aria-label="Align Horizontal Center"
              onClick={() => onAlignElement(selectedElement.id, 'center-h')}
              className="flex min-h-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <AlignCenterHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Align Right"
              aria-label="Align Right"
              onClick={() => onAlignElement(selectedElement.id, 'right')}
              className="flex min-h-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <AlignEndVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Align Top"
              aria-label="Align Top"
              onClick={() => onAlignElement(selectedElement.id, 'top')}
              className="flex min-h-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <AlignStartHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Align Vertical Middle"
              aria-label="Align Vertical Middle"
              onClick={() => onAlignElement(selectedElement.id, 'center-v')}
              className="flex min-h-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <AlignCenterVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Align Bottom"
              aria-label="Align Bottom"
              onClick={() => onAlignElement(selectedElement.id, 'bottom')}
              className="flex min-h-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <AlignEndHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Layer Ordering */}
        <div className="border-t border-slate-100 pt-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <h3 className="text-xs font-semibold text-slate-700">Layer Order</h3>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              disabled={isLast}
              onClick={() => onReorderLayer(selectedElement.id, 'forward')}
              title="Bring Forward"
              className="flex min-h-[36px] items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onReorderLayer(selectedElement.id, 'backward')}
              title="Send Backward"
              className="flex min-h-[36px] items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onReorderLayer(selectedElement.id, 'front')}
              title="Bring to Front"
              className="flex min-h-[36px] items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowUpToLine className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onReorderLayer(selectedElement.id, 'back')}
              title="Send to Back"
              className="flex min-h-[36px] items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Transform & Opacity */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-semibold text-slate-700">Position &amp; Transform</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">X (px)</label>
              <input
                type="number"
                value={Math.round(selectedElement.x)}
                onChange={(e) =>
                  onUpdateElement(
                    selectedElement.id,
                    { x: Number(e.target.value) || 0 },
                    true
                  )
                }
                className="font-mono-tabular min-h-[38px] w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Y (px)</label>
              <input
                type="number"
                value={Math.round(selectedElement.y)}
                onChange={(e) =>
                  onUpdateElement(
                    selectedElement.id,
                    { y: Number(e.target.value) || 0 },
                    true
                  )
                }
                className="font-mono-tabular min-h-[38px] w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">W (px)</label>
              <input
                type="number"
                min={20}
                value={Math.round(selectedElement.width)}
                onChange={(e) => {
                  const nextW = Math.max(20, Number(e.target.value) || 20);
                  if (selectedElement.type === 'image' && selectedElement.preserveAspect) {
                    const ratio = selectedElement.height / selectedElement.width;
                    onUpdateElement(
                      selectedElement.id,
                      { width: nextW, height: Math.round(nextW * ratio) },
                      true
                    );
                  } else {
                    onUpdateElement(selectedElement.id, { width: nextW }, true);
                  }
                }}
                className="font-mono-tabular min-h-[38px] w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">H (px)</label>
              <input
                type="number"
                min={20}
                value={Math.round(selectedElement.height)}
                onChange={(e) => {
                  const nextH = Math.max(20, Number(e.target.value) || 20);
                  if (selectedElement.type === 'image' && selectedElement.preserveAspect) {
                    const ratio = selectedElement.width / selectedElement.height;
                    onUpdateElement(
                      selectedElement.id,
                      { height: nextH, width: Math.round(nextH * ratio) },
                      true
                    );
                  } else {
                    onUpdateElement(selectedElement.id, { height: nextH }, true);
                  }
                }}
                className="font-mono-tabular min-h-[38px] w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">Rotation</span>
                <span className="font-mono-tabular text-slate-700">
                  {Math.round(selectedElement.rotation)}°
                </span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={Math.round(selectedElement.rotation)}
                onChange={(e) =>
                  onUpdateElement(
                    selectedElement.id,
                    { rotation: Number(e.target.value) },
                    true
                  )
                }
                className="w-full accent-blue-600"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">Opacity</span>
                <span className="font-mono-tabular text-slate-700">
                  {Math.round(selectedElement.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(selectedElement.opacity * 100)}
                onChange={(e) =>
                  onUpdateElement(
                    selectedElement.id,
                    { opacity: Number(e.target.value) / 100 },
                    true
                  )
                }
                className="w-full accent-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      <AdSlot variant="sidebar" initialIndex={2} />
    </aside>
  );
}
