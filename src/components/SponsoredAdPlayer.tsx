import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Lock,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AD_CREATIVES } from './AdSlot';

const AD_DURATION_MS = 6000;

interface SponsoredAdPlayerProps {
  sessionKey: number;
  isRenderingProofs: boolean;
  onContinue: () => void;
  onBackToEditor: () => void;
}

export function SponsoredAdPlayer({
  sessionKey,
  isRenderingProofs,
  onContinue,
  onBackToEditor,
}: SponsoredAdPlayerProps) {
  const creative = AD_CREATIVES[sessionKey % AD_CREATIVES.length];

  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedByVisibility, setPausedByVisibility] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const lastTickRef = useRef<number | null>(null);

  const completed = elapsedMs >= AD_DURATION_MS;
  const remainingSeconds = Math.max(0, Math.ceil((AD_DURATION_MS - elapsedMs) / 1000));
  const progressPercent = Math.min(100, (elapsedMs / AD_DURATION_MS) * 100);

  // Determine 3-scene storyboard beat (0, 1, 2)
  const sceneIndex = completed ? 2 : elapsedMs < 2000 ? 0 : elapsedMs < 4000 ? 1 : 2;

  useEffect(() => {
    setElapsedMs(0);
    setIsPaused(false);
    setPausedByVisibility(false);
    lastTickRef.current = null;
  }, [sessionKey]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !completed) {
        setPausedByVisibility(true);
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [completed]);

  useEffect(() => {
    if (isPaused || completed) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const prev = lastTickRef.current ?? now;
      const delta = now - prev;
      lastTickRef.current = now;

      setElapsedMs((current) => {
        const next = Math.min(AD_DURATION_MS, current + delta);
        return next;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, [isPaused, completed]);

  const handleTogglePlay = () => {
    if (completed) return;
    setPausedByVisibility(false);
    setIsPaused((prev) => !prev);
  };

  const sceneTaglines = [
    `${creative.sponsor} Spotlight`,
    'Built for Modern Networking',
    'Special Offer Unlocked',
  ];

  const toneGradient: Record<string, string> = {
    dark: 'from-slate-950 via-slate-900 to-blue-950',
    blue: 'from-slate-900 via-blue-950 to-indigo-950',
    amber: 'from-stone-950 via-slate-900 to-amber-950',
    slate: 'from-slate-950 via-slate-800 to-slate-900',
  };

  return (
    <div className="studio-scroll flex flex-1 flex-col justify-between overflow-y-auto bg-[#F8FAFC] p-5">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {/* Gate Intro Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            {completed ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <Lock className="h-5 w-5 shrink-0 text-blue-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {completed
                  ? 'Ad watched — your print proof is ready'
                  : 'Watch a short sponsored ad to continue'}
              </p>
              <p className="text-xs text-slate-500">
                {completed
                  ? 'Click Continue below to inspect your 300 DPI print proof, order cards, or download files.'
                  : 'TapCard Studio stays free with a quick 6-second sponsor message before review & export.'}
              </p>
            </div>
          </div>
          <span
            className={`font-mono-tabular rounded-full px-3 py-1 text-xs font-semibold ${
              completed
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            {completed ? 'Unlocked' : `${remainingSeconds}s left`}
          </span>
        </div>

        {/* Interactive Video-Style Ad Player */}
        <div
          className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br ${toneGradient[creative.tone]} text-white shadow-xl`}
        >
          {/* Player Top Overlay Controls */}
          <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 py-2.5 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-950 uppercase">
                Ad
              </span>
              <span className="text-xs font-semibold text-slate-200">{creative.sponsor}</span>
              <span className="hidden text-xs text-slate-400 sm:inline">
                · {sceneTaglines[sceneIndex]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!completed && (
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={isPaused ? 'Resume ad' : 'Pause ad'}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? 'Unmute ad' : 'Mute ad'}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5 text-slate-300" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-blue-300" />
                )}
              </button>

              <div className="font-mono-tabular rounded-lg bg-black/40 px-2.5 py-1 text-xs font-semibold text-slate-100">
                {completed ? 'Ad finished' : `0:0${remainingSeconds}`}
              </div>
            </div>
          </div>

          {/* Animated Ad Stage */}
          <div className="relative flex min-h-[260px] flex-col justify-between gap-6 p-6 sm:min-h-[290px] sm:flex-row sm:items-center sm:p-8">
            {/* Subtle ambient glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl"
            />

            {/* Left Copy Column */}
            <div className="relative z-10 max-w-md space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-blue-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>{sceneTaglines[sceneIndex]}</span>
              </div>

              <h3 className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">
                {creative.headline}
              </h3>

              <p className="text-sm leading-relaxed text-slate-300">{creative.body}</p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={creative.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  <span>{creative.cta}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>

                {/* Equalizer visualizer when playing */}
                {!isPaused && !completed && (
                  <div className="flex items-end gap-1 px-1" aria-hidden="true">
                    <span className="h-2 w-1 animate-pulse rounded-full bg-blue-400" />
                    <span className="h-4 w-1 animate-pulse rounded-full bg-blue-300 [animation-delay:150ms]" />
                    <span className="h-3 w-1 animate-pulse rounded-full bg-emerald-400 [animation-delay:300ms]" />
                    <span className="h-2.5 w-1 animate-pulse rounded-full bg-blue-400 [animation-delay:450ms]" />
                  </div>
                )}
              </div>
            </div>

            {/* Right Animated Mockup Card */}
            <div className="relative z-10 flex shrink-0 items-center justify-center">
              <div
                className={`relative w-56 rounded-xl border border-white/20 bg-gradient-to-br from-slate-800/90 to-slate-950/95 p-4 shadow-2xl transition-transform duration-500 ${
                  sceneIndex === 1 ? 'scale-105 -rotate-1' : sceneIndex === 2 ? 'scale-105 rotate-1' : 'rotate-0'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  <span>{creative.sponsor}</span>
                  <CreditCard className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mt-5 space-y-1.5">
                  <div className="h-2.5 w-24 rounded-full bg-white/80" />
                  <div className="h-2 w-32 rounded-full bg-white/35" />
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-[11px] font-semibold text-emerald-300">NFC + Print</span>
                  <span className="rounded bg-blue-500/25 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
                    300 DPI
                  </span>
                </div>
              </div>
            </div>

            {/* Pause Overlay */}
            {isPaused && !completed && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/75 p-6 text-center backdrop-blur-xs">
                <p className="text-sm font-semibold text-white">
                  {pausedByVisibility
                    ? 'Ad paused while tab was inactive'
                    : 'Ad paused'}
                </p>
                <p className="max-w-xs text-xs text-slate-300">
                  Keep watching for {remainingSeconds} more second{remainingSeconds === 1 ? '' : 's'} to unlock your print proof.
                </p>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Resume Ad</span>
                </button>
              </div>
            )}
          </div>

          {/* Smooth Progress Bar */}
          <div className="relative h-1.5 w-full bg-white/15">
            <div
              style={{ width: `${progressPercent}%` }}
              className={`h-full transition-[width] duration-75 ${
                completed ? 'bg-emerald-400' : 'bg-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Status + Continue Footer */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center">
          <div className="text-xs text-slate-600">
            {isRenderingProofs
              ? 'Preparing your 300 DPI Front & Back proofs in the background...'
              : completed
                ? 'Your 300 DPI print proofs are ready.'
                : `Continue unlocks in ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}.`}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onBackToEditor}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Editor</span>
            </button>

            <button
              type="button"
              disabled={!completed}
              onClick={onContinue}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-5 text-xs font-semibold text-white transition-colors ${
                completed
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'cursor-not-allowed bg-slate-400 opacity-75'
              }`}
            >
              {completed ? (
                <>
                  <span>Continue to Print Proof</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Continue ({remainingSeconds}s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
