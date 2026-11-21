import React, { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Download,
  FileJson,
  Globe,
  ImagePlus,
  LayoutTemplate,
  Mail,
  Palette,
  Phone,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Type,
  Upload,
  User,
} from 'lucide-react';
import { CARD_TEMPLATES, CardTemplate } from '../data/templates';
import { AdSlot } from './AdSlot';
import {
  COLOR_SWATCHES,
  CardBackground,
  CardProject,
  CardSideId,
  GRADIENT_PRESETS,
  SavedDraft,
  TextFieldType,
  UploadedAsset,
} from '../types/card';
import { SubmittedCardHistoryItem } from '../utils/cardDatabase';
import {
  VCardData,
  extractVCardFromProject,
  generateQrCodeDataUrl,
  hasValidQrContent,
} from '../utils/qrGenerator';

export type LeftTabId = 'add' | 'templates' | 'uploads' | 'background' | 'drafts';

interface LeftToolPanelProps {
  activeTab: LeftTabId;
  onTabChange: (tab: LeftTabId) => void;
  project: CardProject;
  activeSide: CardSideId;
  onRenameProject: (name: string) => void;
  onAddTextField: (fieldType: TextFieldType) => void;
  onAddQrCode: (src: string, label: string) => void;
  onUploadFiles: (files: FileList | null) => void;
  uploadedAssets: UploadedAsset[];
  onPlaceUploadedAsset: (asset: UploadedAsset) => void;
  onApplyTemplate: (template: CardTemplate) => void;
  onStartBlank: () => void;
  onUpdateBackground: (bg: CardBackground) => void;
  onApplyBackgroundToBothSides: () => void;
  savedDrafts: SavedDraft[];
  onSaveDraft: (customName?: string) => void;
  onLoadDraft: (draft: SavedDraft) => void;
  onDeleteDraft: (draftId: string) => void;
  onExportJson: () => void;
  onImportJsonFile: (file: File) => void;
  onResetToStarter: () => void;
  submittedCards: SubmittedCardHistoryItem[];
  onLoadSubmittedCard: (item: SubmittedCardHistoryItem) => void;
}

const TEXT_FIELDS: Array<{
  type: TextFieldType;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: 'name', label: 'Full Name', hint: 'Display name', icon: User },
  { type: 'title', label: 'Job Title', hint: 'Role or credential', icon: Briefcase },
  { type: 'company', label: 'Company', hint: 'Brand or studio', icon: Building2 },
  { type: 'phone', label: 'Phone', hint: 'Direct number', icon: Phone },
  { type: 'email', label: 'Email', hint: 'Contact address', icon: Mail },
  { type: 'website', label: 'Website', hint: 'URL or portfolio', icon: Globe },
  { type: 'tagline', label: 'Tagline', hint: 'Short motto', icon: Sparkles },
  { type: 'custom', label: 'Custom Text', hint: 'Freeform block', icon: Type },
];

export function LeftToolPanel({
  activeTab,
  onTabChange,
  project,
  activeSide,
  onRenameProject,
  onAddTextField,
  onAddQrCode,
  onUploadFiles,
  uploadedAssets,
  onPlaceUploadedAsset,
  onApplyTemplate,
  onStartBlank,
  onUpdateBackground,
  onApplyBackgroundToBothSides,
  savedDrafts,
  onSaveDraft,
  onLoadDraft,
  onDeleteDraft,
  onExportJson,
  onImportJsonFile,
  onResetToStarter,
  submittedCards,
  onLoadSubmittedCard,
}: LeftToolPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');

  // QR Code Generator state
  const [qrMode, setQrMode] = useState<'url' | 'vcard'>('url');
  const [qrUrl, setQrUrl] = useState('https://vancepartners.studio');
  const [qrVCard, setQrVCard] = useState<VCardData>(() =>
    extractVCardFromProject(project)
  );
  const [qrDarkColor, setQrDarkColor] = useState('#0F172A');
  const [qrLightColor, setQrLightColor] = useState('#FFFFFF');
  const [qrTransparentBg, setQrTransparentBg] = useState(false);
  const [qrPreviewSrc, setQrPreviewSrc] = useState<string>('');
  const [qrError, setQrError] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  useEffect(() => {
    const options = {
      mode: qrMode,
      url: qrUrl,
      vcard: qrVCard,
      darkColor: qrDarkColor,
      lightColor: qrLightColor,
      transparentBg: qrTransparentBg,
    };

    if (!hasValidQrContent(options)) {
      setQrPreviewSrc('');
      setQrError('');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      generateQrCodeDataUrl(options)
        .then((url) => {
          if (!cancelled) {
            setQrPreviewSrc(url);
            setQrError('');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setQrPreviewSrc('');
            setQrError('Unable to encode QR data.');
          }
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [qrMode, qrUrl, qrVCard, qrDarkColor, qrLightColor, qrTransparentBg]);

  const handlePlaceQr = async () => {
    const options = {
      mode: qrMode,
      url: qrUrl,
      vcard: qrVCard,
      darkColor: qrDarkColor,
      lightColor: qrLightColor,
      transparentBg: qrTransparentBg,
    };
    if (!hasValidQrContent(options)) {
      setQrError(
        qrMode === 'url'
          ? 'Enter a website URL to generate a QR code.'
          : 'Enter at least one contact field for the vCard.'
      );
      return;
    }
    setIsGeneratingQr(true);
    try {
      const dataUrl = await generateQrCodeDataUrl(options);
      const label =
        qrMode === 'url'
          ? `QR · ${qrUrl.trim().replace(/^https?:\/\//i, '').slice(0, 28)}`
          : `QR vCard · ${qrVCard.fullName.trim() || qrVCard.company.trim() || 'Contact'}`;
      onAddQrCode(dataUrl, label);
      setQrError('');
    } catch (err) {
      setQrError(err instanceof Error ? err.message : 'Failed to generate QR code.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const currentSide = project[activeSide];
  const bg = currentSide.background;

  const tabs: Array<{
    id: LeftTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'add', label: 'Elements', icon: Plus },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'uploads', label: 'Uploads', icon: ImagePlus },
    { id: 'background', label: 'Fill', icon: Palette },
    { id: 'drafts', label: 'Drafts', icon: Save },
  ];

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white lg:w-[276px] lg:shrink-0">
      {/* Compact studio tab strip */}
      <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50/70 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active tab body */}
      <div className="studio-scroll flex-1 overflow-y-auto p-4">
        {activeTab === 'add' && (
          <div className="space-y-5">
            <div>
              <label
                htmlFor="card-project-name"
                className="block text-xs font-medium text-slate-700"
              >
                Project Name
              </label>
              <input
                id="card-project-name"
                type="text"
                value={project.name}
                onChange={(e) => onRenameProject(e.target.value)}
                placeholder="Business Card Name"
                className="mt-1.5 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Add Text Block
                </h2>
                <span className="text-xs text-slate-500">
                  {activeSide === 'front' ? 'Front Side' : 'Back Side'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {TEXT_FIELDS.map((field) => {
                  const Icon = field.icon;
                  return (
                    <button
                      key={field.type}
                      type="button"
                      onClick={() => onAddTextField(field.type)}
                      className="flex min-h-[48px] flex-col items-start justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                        <Icon className="h-3.5 w-3.5 text-blue-600" />
                        <span>{field.label}</span>
                      </div>
                      <span className="mt-0.5 text-[11px] text-slate-500">{field.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h2 className="font-display mb-2 text-sm font-semibold text-slate-900">
                Logo &amp; Artwork
              </h2>
              <button
                type="button"
                onClick={() => onTabChange('uploads')}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-700"
              >
                <ImagePlus className="h-4 w-4" />
                <span>Upload Logo or Graphic</span>
              </button>
            </div>

            {/* Dynamic QR Code Generator */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-blue-600" />
                  <h2 className="font-display text-sm font-semibold text-slate-900">
                    QR Code
                  </h2>
                </div>
                <div className="flex rounded-md bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQrMode('url');
                      setQrError('');
                    }}
                    className={`min-h-[28px] rounded px-2.5 text-[11px] font-medium transition-colors ${
                      qrMode === 'url'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQrMode('vcard');
                      setQrError('');
                    }}
                    className={`min-h-[28px] rounded px-2.5 text-[11px] font-medium transition-colors ${
                      qrMode === 'vcard'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    vCard
                  </button>
                </div>
              </div>

              {qrMode === 'url' ? (
                <div>
                  <label
                    htmlFor="qr-url-input"
                    className="mb-1 block text-[11px] font-medium text-slate-600"
                  >
                    Destination URL
                  </label>
                  <input
                    id="qr-url-input"
                    type="url"
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-600">
                      Contact Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setQrVCard(extractVCardFromProject(project))}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      Fill from Card
                    </button>
                  </div>
                  <input
                    type="text"
                    value={qrVCard.fullName}
                    onChange={(e) =>
                      setQrVCard((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Full Name"
                    className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={qrVCard.company}
                      onChange={(e) =>
                        setQrVCard((prev) => ({ ...prev, company: e.target.value }))
                      }
                      placeholder="Company"
                      className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={qrVCard.title}
                      onChange={(e) =>
                        setQrVCard((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Job Title"
                      className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <input
                    type="tel"
                    value={qrVCard.phone}
                    onChange={(e) =>
                      setQrVCard((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="Phone Number"
                    className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="email"
                    value={qrVCard.email}
                    onChange={(e) =>
                      setQrVCard((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Email Address"
                    className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="url"
                    value={qrVCard.website}
                    onChange={(e) =>
                      setQrVCard((prev) => ({ ...prev, website: e.target.value }))
                    }
                    placeholder="Website"
                    className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* QR Color Controls */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <input
                    type="color"
                    aria-label="QR code foreground color"
                    value={qrDarkColor}
                    onChange={(e) => setQrDarkColor(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                  />
                  <span>Modules</span>
                </label>

                <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <input
                    type="color"
                    aria-label="QR code background color"
                    disabled={qrTransparentBg}
                    value={qrLightColor}
                    onChange={(e) => setQrLightColor(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white p-0.5 disabled:opacity-40"
                  />
                  <span>Fill</span>
                </label>

                <label className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={qrTransparentBg}
                    onChange={(e) => setQrTransparentBg(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-blue-600"
                  />
                  <span>Clear BG</span>
                </label>
              </div>

              {qrError && <p className="text-xs text-red-600">{qrError}</p>}

              <div className="flex items-center gap-2.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {qrPreviewSrc ? (
                    <img
                      src={qrPreviewSrc}
                      alt="Live QR code preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <QrCode className="h-6 w-6 text-slate-300" />
                  )}
                </div>

                <button
                  type="button"
                  disabled={isGeneratingQr}
                  onClick={handlePlaceQr}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>{isGeneratingQr ? 'Generating...' : 'Add QR Code'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Starter Templates
              </h2>
              <button
                type="button"
                onClick={onStartBlank}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Blank Card
              </button>
            </div>

            <div className="space-y-2.5">
              {CARD_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onApplyTemplate(tpl)}
                  className="group flex min-h-[56px] w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/30"
                >
                  <div
                    className={`flex shrink-0 items-center justify-center rounded border border-slate-200 shadow-2xs ${
                      tpl.orientation === 'horizontal' ? 'h-9 w-14' : 'h-12 w-8 mx-3'
                    }`}
                    style={{ backgroundColor: tpl.bgSwatch }}
                  >
                    <span
                      className="block h-1.5 w-6 rounded-xs"
                      style={{ backgroundColor: tpl.accentSwatch }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                      {tpl.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {tpl.orientation === 'horizontal' ? 'Landscape' : 'Portrait'} · {tpl.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'uploads' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Upload Artwork
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Supports PNG, JPG, SVG, and WebP up to 10 MB.
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                isDraggingFile
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/30'
              }`}
            >
              <Upload className="h-6 w-6 text-blue-600" />
              <span className="mt-2 text-sm font-medium text-slate-900">
                Click or drop image here
              </span>
              <span className="mt-0.5 text-xs text-slate-500">
                Placed directly on {activeSide === 'front' ? 'Front' : 'Back'} side
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  onUploadFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-2 text-xs font-semibold text-slate-700">
                Session Graphics ({uploadedAssets.length})
              </h3>
              {uploadedAssets.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  Uploaded logos appear here so you can reuse them across the front and back of your card.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {uploadedAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => onPlaceUploadedAsset(asset)}
                      className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-2 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/30"
                    >
                      <div className="flex h-14 w-full items-center justify-center overflow-hidden rounded bg-slate-50 p-1">
                        <img
                          src={asset.src}
                          alt={asset.fileName}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="mt-1.5 w-full truncate text-[11px] font-medium text-slate-700">
                        {asset.fileName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Card Background
              </h2>
              <span className="text-xs text-slate-500">
                {activeSide === 'front' ? 'Front' : 'Back'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => onUpdateBackground({ ...bg, type: 'solid' })}
                className={`min-h-[38px] rounded-md text-xs font-medium transition-colors ${
                  bg.type === 'solid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Solid Fill
              </button>
              <button
                type="button"
                onClick={() => onUpdateBackground({ ...bg, type: 'gradient' })}
                className={`min-h-[38px] rounded-md text-xs font-medium transition-colors ${
                  bg.type === 'gradient'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gradient
              </button>
            </div>

            {bg.type === 'solid' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Solid background color"
                    value={bg.color}
                    onChange={(e) => onUpdateBackground({ ...bg, color: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                  />
                  <input
                    type="text"
                    value={bg.color.toUpperCase()}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                        onUpdateBackground({ ...bg, color: v });
                      }
                    }}
                    className="font-mono-tabular min-h-[40px] flex-1 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium text-slate-600">Studio Swatches</div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Set background color ${hex}`}
                        onClick={() => onUpdateBackground({ ...bg, color: hex })}
                        className={`h-7 w-7 rounded border transition-transform hover:scale-105 ${
                          bg.color.toLowerCase() === hex.toLowerCase()
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Start</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        aria-label="Gradient start color"
                        value={bg.gradientStart}
                        onChange={(e) =>
                          onUpdateBackground({ ...bg, gradientStart: e.target.value })
                        }
                        className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                      />
                      <span className="font-mono-tabular text-[11px] text-slate-700">
                        {bg.gradientStart.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">End</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        aria-label="Gradient end color"
                        value={bg.gradientEnd}
                        onChange={(e) =>
                          onUpdateBackground({ ...bg, gradientEnd: e.target.value })
                        }
                        className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                      />
                      <span className="font-mono-tabular text-[11px] text-slate-700">
                        {bg.gradientEnd.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Gradient Angle</span>
                    <span className="font-mono-tabular text-slate-700">{bg.gradientAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={bg.gradientAngle}
                    onChange={(e) =>
                      onUpdateBackground({ ...bg, gradientAngle: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium text-slate-600">Gradient Presets</div>
                  <div className="grid grid-cols-2 gap-2">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          onUpdateBackground({
                            ...bg,
                            type: 'gradient',
                            gradientStart: preset.start,
                            gradientEnd: preset.end,
                            gradientAngle: preset.angle,
                          })
                        }
                        className="flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 text-left transition-colors hover:border-blue-400"
                      >
                        <span
                          className="h-6 w-6 shrink-0 rounded border border-slate-200"
                          style={{
                            background: `linear-gradient(${preset.angle}deg, ${preset.start}, ${preset.end})`,
                          }}
                        />
                        <span className="truncate text-[11px] font-medium text-slate-700">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {project.sidedness === 'double' && (
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={onApplyBackgroundToBothSides}
                  className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Copy This Fill to Both Sides
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Save Design Draft
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Stored locally in your browser with preview thumbnails.
              </p>
              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={draftNameInput}
                  onChange={(e) => setDraftNameInput(e.target.value)}
                  placeholder={project.name || 'Draft name'}
                  className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSaveDraft(draftNameInput.trim() || undefined);
                    setDraftNameInput('');
                  }}
                  className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-2.5 text-xs font-semibold text-slate-700">
                Saved Drafts ({savedDrafts.length})
              </h3>
              {savedDrafts.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  No saved drafts yet. Click Save above to snapshot your current front and back layout.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {savedDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="rounded-lg border border-slate-200 bg-white p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-900">
                            {draft.name}
                          </div>
                          <div className="font-mono-tabular mt-0.5 text-[11px] text-slate-500">
                            {new Date(draft.savedAt).toLocaleDateString()} ·{' '}
                            {draft.sidedness === 'double' ? '2-Sided' : '1-Sided'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteDraft(draft.id)}
                          aria-label={`Delete draft ${draft.name}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <img
                          src={draft.frontPreviewDataUrl}
                          alt={`${draft.name} front preview`}
                          className="aspect-[1.66] w-full rounded border border-slate-200 bg-slate-50 object-contain"
                        />
                        {draft.backPreviewDataUrl ? (
                          <img
                            src={draft.backPreviewDataUrl}
                            alt={`${draft.name} back preview`}
                            className="aspect-[1.66] w-full rounded border border-slate-200 bg-slate-50 object-contain"
                          />
                        ) : (
                          <div className="flex aspect-[1.66] items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                            1-Sided
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onLoadDraft(draft)}
                        className="mt-2 min-h-[36px] w-full rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
                      >
                        Load Draft
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submittedCards.length > 0 && (
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <h3 className="text-xs font-semibold text-slate-700">
                    Submitted Cards ({submittedCards.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {submittedCards.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-white p-2.5"
                    >
                      <div className="truncate text-xs font-semibold text-slate-900">
                        {item.name}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {item.email}
                      </div>
                      <div className="font-mono-tabular mt-0.5 text-[11px] text-slate-400">
                        {new Date(item.submittedAt).toLocaleDateString()} ·{' '}
                        {item.sidedness === 'double' ? '2-Sided' : '1-Sided'}
                      </div>
                      <button
                        type="button"
                        onClick={() => onLoadSubmittedCard(item)}
                        className="mt-2 min-h-[36px] w-full rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
                      >
                        Load Card Design
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold text-slate-700">Backup &amp; Reset</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onExportJson}
                  className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FileJson className="h-3.5 w-3.5" />
                  <span>Import JSON</span>
                </button>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportJsonFile(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <button
                type="button"
                onClick={onResetToStarter}
                className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Workspace to Starter</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pinned Left Rail Sponsor Ad */}
      <AdSlot variant="sidebar" initialIndex={1} />
    </aside>
  );
}
