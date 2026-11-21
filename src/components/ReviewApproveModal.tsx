import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  Save,
  ShoppingBag,
  X,
} from 'lucide-react';
import { CardProject, getCanvasMetrics } from '../types/card';
import {
  TAPCARD_STORE_URL,
  extractEmailFromProject,
  isValidCustomerEmail,
  loadSavedCustomerEmail,
} from '../utils/cardDatabase';
import {
  exportPrintReadyPdf,
  exportProjectJsonBackup,
  renderSideToPngDataUrl,
  slugifyFilename,
  triggerFileDownload,
} from '../utils/exportRenderer';
import { AdSlot } from './AdSlot';
import { SponsoredAdPlayer } from './SponsoredAdPlayer';

interface ReviewApproveModalProps {
  open: boolean;
  project: CardProject;
  onClose: () => void;
  onAcceptDesign: () => void;
  onSaveDraftFromReview: () => void;
  onGetCards: (email: string) => Promise<{ cardId: string } | null>;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', message: string) => void;
}

function navigateToTapCardStore(url: string) {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch {
    // Sandboxed iframe blocked cross-origin top navigation; fall back to anchor click
  }
  if (window.self === window.top) {
    window.location.href = url;
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ReviewApproveModal({
  open,
  project,
  onClose,
  onAcceptDesign,
  onSaveDraftFromReview,
  onGetCards,
  onNotify,
}: ReviewApproveModalProps) {
  const [frontPng, setFrontPng] = useState<string>('');
  const [backPng, setBackPng] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSavingCards, setIsSavingCards] = useState(false);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [checkedConfirm, setCheckedConfirm] = useState(project.accepted);
  const [mobileSideTab, setMobileSideTab] = useState<'front' | 'back'>('front');
  const [showTrimOverlay, setShowTrimOverlay] = useState(true);
  const [adGatePassed, setAdGatePassed] = useState(false);
  const [adSessionKey, setAdSessionKey] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const metrics = getCanvasMetrics(project.orientation);

  useEffect(() => {
    if (!open) return;
    setAdGatePassed(false);
    setAdSessionKey((prev) => prev + 1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCheckedConfirm(project.accepted);
    setMobileSideTab('front');
    setSavedCardId(null);
    setEmailError('');
    setCustomerEmail((prev) => {
      if (prev.trim()) return prev;
      return loadSavedCustomerEmail() || extractEmailFromProject(project);
    });

    let cancelled = false;
    setIsRendering(true);

    Promise.all([
      renderSideToPngDataUrl(project.front, project.orientation, 1),
      project.sidedness === 'double'
        ? renderSideToPngDataUrl(project.back, project.orientation, 1)
        : Promise.resolve(''),
    ])
      .then(([frontUrl, backUrl]) => {
        if (cancelled) return;
        setFrontPng(frontUrl);
        setBackPng(backUrl);
      })
      .catch(() => {
        if (!cancelled) {
          onNotify('error', 'Failed to render high-resolution proof previews.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, project, onNotify]);

  if (!open) return null;

  const slug = slugifyFilename(project.name);

  const handleDownloadPng = (side: 'front' | 'back') => {
    const url = side === 'front' ? frontPng : backPng;
    if (!url) return;
    triggerFileDownload(url, `${slug}-${side}-300dpi.png`);
    onNotify('success', `Downloaded ${side === 'front' ? 'Front' : 'Back'} 300 DPI PNG.`);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportPrintReadyPdf(project);
      onNotify('success', 'Downloaded print-ready PDF with 0.125" bleed.');
    } catch {
      onNotify('error', 'Could not generate print-ready PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadJson = () => {
    exportProjectJsonBackup(project);
    onNotify('success', 'Downloaded JSON design backup.');
  };

  const handleClickGetCards = async () => {
    if (isSavingCards) return;
    const trimmed = customerEmail.trim();
    if (!isValidCustomerEmail(trimmed)) {
      setEmailError('Enter a valid email address to save your card.');
      emailInputRef.current?.focus();
      return;
    }

    setEmailError('');
    setIsSavingCards(true);
    try {
      const result = await onGetCards(trimmed);
      if (!result) return;
      setSavedCardId(result.cardId);
      navigateToTapCardStore(TAPCARD_STORE_URL);
    } finally {
      setIsSavingCards(false);
    }
  };

  const trimInsetPercentX = (metrics.bleedPx / metrics.fullW) * 100;
  const trimInsetPercentY = (metrics.bleedPx / metrics.fullH) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-[1px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="review-modal-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              Review &amp; Approve Print Proof
            </h2>
            <p className="font-mono-tabular mt-0.5 text-xs text-slate-500">
              {project.name} · {project.sidedness === 'double' ? '2-Sided' : '1-Sided'} ·{' '}
              {metrics.trimInW.toFixed(1)}&quot; × {metrics.trimInH.toFixed(1)}&quot; Trim ({metrics.fullInW.toFixed(2)}&quot; ×{' '}
              {metrics.fullInH.toFixed(2)}&quot; w/ Bleed · 300 DPI)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!adGatePassed ? (
          <SponsoredAdPlayer
            sessionKey={adSessionKey}
            isRenderingProofs={isRendering}
            onContinue={() => setAdGatePassed(true)}
            onBackToEditor={onClose}
          />
        ) : (
          <>
            {/* Proof Body */}
            <div className="studio-scroll flex-1 overflow-y-auto bg-[#F8FAFC] p-5">
          {/* Controls Strip */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {project.sidedness === 'double' && (
              <div className="flex rounded-lg bg-slate-200/70 p-0.5 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileSideTab('front')}
                  className={`min-h-[34px] rounded-md px-3 text-xs font-semibold ${
                    mobileSideTab === 'front'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  Front Side
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSideTab('back')}
                  className={`min-h-[34px] rounded-md px-3 text-xs font-semibold ${
                    mobileSideTab === 'back'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  Back Side
                </button>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={showTrimOverlay}
                onChange={(e) => setShowTrimOverlay(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
              <span>Show preview trim reference line (automatically omitted in downloads)</span>
            </label>

            <button
              type="button"
              onClick={onSaveDraftFromReview}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Snapshot to Drafts</span>
            </button>
          </div>

          {isRendering ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span>Rendering 300 DPI print proofs...</span>
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                project.sidedness === 'double' ? 'md:grid-cols-2' : 'mx-auto max-w-xl'
              }`}
            >
              {/* Front Proof */}
              <div
                className={`${
                  project.sidedness === 'double' && mobileSideTab === 'back'
                    ? 'hidden md:block'
                    : 'block'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Front Side Proof</span>
                  <span className="font-mono-tabular text-[11px] text-slate-500">
                    {metrics.fullW} × {metrics.fullH} px
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                  {frontPng && (
                    <img
                      src={frontPng}
                      alt="Front business card print proof"
                      className="block h-auto w-full"
                    />
                  )}
                  {showTrimOverlay && (
                    <div
                      style={{
                        top: `${trimInsetPercentY}%`,
                        bottom: `${trimInsetPercentY}%`,
                        left: `${trimInsetPercentX}%`,
                        right: `${trimInsetPercentX}%`,
                      }}
                      className="pointer-events-none absolute border border-dashed border-sky-500/80"
                    />
                  )}
                </div>
              </div>

              {/* Back Proof */}
              {project.sidedness === 'double' && (
                <div
                  className={`${
                    mobileSideTab === 'front' ? 'hidden md:block' : 'block'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Back Side Proof</span>
                    <span className="font-mono-tabular text-[11px] text-slate-500">
                      {metrics.fullW} × {metrics.fullH} px
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                    {backPng && (
                      <img
                        src={backPng}
                        alt="Back business card print proof"
                        className="block h-auto w-full"
                      />
                    )}
                    {showTrimOverlay && (
                      <div
                        style={{
                          top: `${trimInsetPercentY}%`,
                          bottom: `${trimInsetPercentY}%`,
                          left: `${trimInsetPercentX}%`,
                          right: `${trimInsetPercentX}%`,
                        }}
                        className="pointer-events-none absolute border border-dashed border-sky-500/80"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {savedCardId && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Card design saved for <strong>{customerEmail.trim().toLowerCase()}</strong>. Taking you to TapCard products...
                </span>
              </div>
              <a
                href={TAPCARD_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                <span>Open TapCard Store</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Review Modal Sponsored Ad Banner */}
          <AdSlot variant="banner" initialIndex={0} className="mt-5" />
        </div>

        {/* Approval & Export Footer */}
        <div className="space-y-3 border-t border-slate-200 bg-white px-5 py-4">
          {/* Email + Get Cards Order Bar */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="get-cards-email"
                className="block text-xs font-semibold text-slate-800"
              >
                Your Email Address (no login required)
              </label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={emailInputRef}
                  id="get-cards-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleClickGetCards();
                    }
                  }}
                  placeholder="you@company.com"
                  className={`min-h-[42px] w-full rounded-lg border bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:outline-none ${
                    emailError
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
              {emailError && (
                <p className="mt-1 text-xs font-medium text-red-600">{emailError}</p>
              )}
            </div>

            <button
              type="button"
              disabled={isSavingCards || isRendering}
              onClick={handleClickGetCards}
              className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45 sm:mt-5"
            >
              {isSavingCards ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              <span>{isSavingCards ? 'Saving Card...' : 'Get Cards'}</span>
              {!isSavingCards && <ExternalLink className="h-3.5 w-3.5" />}
            </button>
          </div>

          {!project.accepted ? (
            <div className="flex flex-col justify-between gap-3 pt-1 sm:flex-row sm:items-center">
              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={checkedConfirm}
                  onChange={(e) => setCheckedConfirm(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-blue-600"
                />
                <span>
                  I have reviewed spelling, safe-zone margins, and bleed coverage and approve this design for print file downloads.
                </span>
              </label>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Back to Editor
                </button>
                <button
                  type="button"
                  disabled={!checkedConfirm || isRendering}
                  onClick={onAcceptDesign}
                  className="min-h-[38px] rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Unlock Print Downloads
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Print Downloads Unlocked</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Return to Editor
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  disabled={!frontPng}
                  onClick={() => handleDownloadPng('front')}
                  className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span>Front PNG (300 DPI)</span>
                </button>

                {project.sidedness === 'double' && (
                  <button
                    type="button"
                    disabled={!backPng}
                    onClick={() => handleDownloadPng('back')}
                    className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <span>Back PNG (300 DPI)</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={handleDownloadPdf}
                  className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-900 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  {isExportingPdf ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0" />
                  )}
                  <span>Print-Ready PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                >
                  <FileJson className="h-4 w-4 shrink-0 text-slate-600" />
                  <span>JSON Backup</span>
                </button>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>
                  All exported PNG and PDF files include the full 0.125&quot; bleed margin with editor guide lines removed.
                </span>
              </p>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
