import { useEffect, useState } from 'react';
import { ArrowUpRight, Megaphone, RefreshCw, X } from 'lucide-react';
import { TAPCARD_STORE_URL } from '../utils/cardDatabase';

export type AdVariant = 'leaderboard' | 'banner' | 'sidebar' | 'footer' | 'floating';

export interface AdCreative {
  id: string;
  sponsor: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
  tone: 'dark' | 'blue' | 'amber' | 'slate';
}

export const AD_CREATIVES: AdCreative[] = [
  {
    id: 'tapcard-nfc',
    sponsor: 'TapCard Store',
    headline: 'Upgrade to Smart NFC TapCards',
    body: 'Share your contact info, portfolio, and socials with a single phone tap.',
    cta: 'Shop TapCards',
    href: TAPCARD_STORE_URL,
    tone: 'dark',
  },
  {
    id: 'foil-print',
    sponsor: 'TapCard Print Pro',
    headline: '20% Off Matte & Gold Foil Cards',
    body: 'Heavy 18pt silk-laminated stock with free 3-day express shipping.',
    cta: 'Claim Offer',
    href: TAPCARD_STORE_URL,
    tone: 'blue',
  },
  {
    id: 'team-packs',
    sponsor: 'TapCard Teams',
    headline: 'Equip Your Entire Sales Team',
    body: 'Bulk NFC + QR business card bundles starting at $14 per card.',
    cta: 'View Bundles',
    href: TAPCARD_STORE_URL,
    tone: 'amber',
  },
  {
    id: 'qr-stands',
    sponsor: 'The DB Company',
    headline: 'Countertop QR & NFC Review Stands',
    body: 'Turn walk-in customers into 5-star reviews at your checkout desk.',
    cta: 'Browse Stands',
    href: TAPCARD_STORE_URL,
    tone: 'slate',
  },
  {
    id: 'metal-cards',
    sponsor: 'TapCard Metal',
    headline: 'Laser-Engraved Stainless NFC Cards',
    body: 'Brushed black and titanium finishes built to make a lasting impression.',
    cta: 'Explore Metal',
    href: TAPCARD_STORE_URL,
    tone: 'dark',
  },
  {
    id: 'brand-kit',
    sponsor: 'Studio Partner',
    headline: 'Custom Branded Packaging & Stickers',
    body: 'Match your business cards with die-cut mailers and foil seals.',
    cta: 'See Catalog',
    href: TAPCARD_STORE_URL,
    tone: 'blue',
  },
];

interface AdSlotProps {
  variant: AdVariant;
  initialIndex?: number;
  className?: string;
}

export function AdSlot({ variant, initialIndex = 0, className = '' }: AdSlotProps) {
  const [index, setIndex] = useState(initialIndex % AD_CREATIVES.length);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % AD_CREATIVES.length);
    }, 18000);
    return () => window.clearInterval(interval);
  }, []);

  if (dismissed) return null;

  const creative = AD_CREATIVES[index];

  const toneClasses: Record<AdCreative['tone'], { box: string; cta: string; meta: string }> = {
    dark: {
      box: 'border-slate-800 bg-slate-900 text-white',
      cta: 'bg-blue-500 text-white hover:bg-blue-400',
      meta: 'text-slate-400',
    },
    blue: {
      box: 'border-blue-200 bg-blue-50/70 text-slate-900',
      cta: 'bg-blue-600 text-white hover:bg-blue-700',
      meta: 'text-blue-700',
    },
    amber: {
      box: 'border-amber-200 bg-amber-50/80 text-slate-900',
      cta: 'bg-slate-900 text-white hover:bg-slate-800',
      meta: 'text-amber-800',
    },
    slate: {
      box: 'border-slate-200 bg-slate-50 text-slate-900',
      cta: 'bg-slate-900 text-white hover:bg-slate-800',
      meta: 'text-slate-500',
    },
  };

  const styles = toneClasses[creative.tone];

  const rotateNext = () => {
    setIndex((prev) => (prev + 1) % AD_CREATIVES.length);
  };

  if (variant === 'leaderboard' || variant === 'footer') {
    return (
      <div
        role="region"
        aria-label="Sponsored advertisement"
        className={`flex shrink-0 items-center justify-between gap-3 border-slate-200 px-3 py-2 lg:px-5 ${
          variant === 'leaderboard' ? 'border-b' : 'border-t'
        } ${styles.box} ${className}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Megaphone className={`hidden h-4 w-4 shrink-0 sm:block ${styles.meta}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={`text-[11px] font-semibold ${styles.meta}`}>
                Sponsored · {creative.sponsor}
              </span>
              <span className="truncate text-xs font-bold sm:text-sm">
                {creative.headline}
              </span>
              <span
                className={`hidden truncate text-xs md:inline ${
                  creative.tone === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                — {creative.body}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={rotateNext}
            title="Show next ad"
            aria-label="Show next ad"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              creative.tone === 'dark'
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-black/5 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <a
            href={creative.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-[34px] shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3.5 text-xs font-semibold transition-colors ${styles.cta}`}
          >
            <span>{creative.cta}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        role="region"
        aria-label="Sponsored banner"
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${styles.box} ${className}`}
      >
        <div className="min-w-0 flex-1">
          <div className={`text-[11px] font-semibold ${styles.meta}`}>
            Sponsored · {creative.sponsor}
          </div>
          <div className="mt-0.5 text-sm font-bold leading-snug">{creative.headline}</div>
          <p
            className={`mt-0.5 text-xs ${
              creative.tone === 'dark' ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {creative.body}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={rotateNext}
            title="Show next ad"
            aria-label="Show next ad"
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              creative.tone === 'dark'
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-black/5 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <a
            href={creative.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-xs font-semibold transition-colors ${styles.cta}`}
          >
            <span>{creative.cta}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div
        role="region"
        aria-label="Sponsored spotlight"
        className={`w-64 rounded-xl border p-3 shadow-lg ${styles.box} ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-semibold ${styles.meta}`}>
            Ad · {creative.sponsor}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={rotateNext}
              aria-label="Next ad"
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                creative.tone === 'dark'
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-500 hover:bg-black/5 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss ad"
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                creative.tone === 'dark'
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-500 hover:bg-black/5 hover:text-slate-900'
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-1 text-xs font-bold leading-snug">{creative.headline}</div>
        <p
          className={`mt-1 text-[11px] leading-relaxed ${
            creative.tone === 'dark' ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {creative.body}
        </p>
        <a
          href={creative.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-2.5 flex min-h-[34px] w-full items-center justify-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors ${styles.cta}`}
        >
          <span>{creative.cta}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  // 'sidebar' variant
  return (
    <div
      role="region"
      aria-label="Sponsored sidebar advertisement"
      className={`shrink-0 border-t border-slate-200 p-3 ${className}`}
    >
      <div className={`rounded-lg border p-3 ${styles.box}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-semibold ${styles.meta}`}>
            Sponsored · {creative.sponsor}
          </span>
          <button
            type="button"
            onClick={rotateNext}
            title="Show next ad"
            aria-label="Show next ad"
            className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
              creative.tone === 'dark'
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-black/5 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-1 text-xs font-bold leading-snug">{creative.headline}</div>
        <p
          className={`mt-1 text-[11px] leading-snug ${
            creative.tone === 'dark' ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {creative.body}
        </p>
        <a
          href={creative.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-2.5 flex min-h-[34px] w-full items-center justify-center gap-1 rounded-md px-3 text-xs font-semibold transition-colors ${styles.cta}`}
        >
          <span>{creative.cta}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
