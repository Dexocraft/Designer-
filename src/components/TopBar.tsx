import { LeftTabId } from './LeftToolPanel';

interface TopBarProps {
  activeLeftTab: LeftTabId;
  onSelectTab: (tab: LeftTabId) => void;
  onOpenReview: () => void;
}

export function TopBar({ activeLeftTab, onSelectTab, onOpenReview }: TopBarProps) {
  const navItems: Array<{ id: LeftTabId; label: string }> = [
    { id: 'add', label: 'Elements' },
    { id: 'templates', label: 'Templates' },
    { id: 'uploads', label: 'Uploads' },
    { id: 'background', label: 'Background' },
    { id: 'drafts', label: 'Saved Drafts' },
  ];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-8 border-b border-slate-200 bg-white px-4 lg:px-6">
      {/* Zone 1: Single-element Brand Wordmark */}
      <a
        href="#studio"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('add');
        }}
        className="font-display shrink-0 whitespace-nowrap text-lg font-bold tracking-tight text-slate-900"
      >
        TapCard Studio
      </a>

      {/* Zone 2: Clean single-line studio navigation links */}
      <nav
        aria-label="Studio workspace sections"
        className="hidden items-center gap-6 md:flex"
      >
        {navItems.map((item) => {
          const isActive = activeLeftTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onOpenReview}
          className="min-h-[40px] shrink-0 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Review &amp; Export
        </button>
      </div>
    </header>
  );
}
