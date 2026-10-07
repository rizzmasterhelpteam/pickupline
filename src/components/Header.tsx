import { memo } from 'react';
import { Bookmark } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  savedCount: number;
  onOpenSaved: () => void;
}

export const Header = memo(function Header({
  savedCount,
  onOpenSaved,
}: HeaderProps) {
  return (
    <header className="w-full min-w-0 shrink-0 flex min-h-[5.7rem] items-center justify-between gap-2 px-4 sm:px-6 pt-[calc(0.85rem+env(safe-area-inset-top))] pb-2.5 select-none relative z-20">
      {/* Brand & Identity Logo */}
      <Logo size="md" showBadge={false} showSubtitle={false} className="min-w-0 shrink" />

      {/* Action Controls: Saved */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          id="saved-lines-btn"
          onClick={onOpenSaved}
          className="relative flex min-h-12 items-center gap-1.5 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.045] px-3 py-2 text-xs font-semibold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-[0.97] sm:gap-2 sm:px-4 sm:text-sm"
          aria-label="View saved pickup lines"
        >
          <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 fill-rose-400/20" />
          <span>Saved</span>
          {savedCount > 0 ? (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm shadow-rose-500/30">
              {savedCount}
            </span>
          ) : (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-800/90 px-1 font-mono text-xs leading-none text-zinc-500">0</span>
          )}
        </button>
      </div>
    </header>
  );
});
