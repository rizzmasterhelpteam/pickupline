import { Bookmark, Compass } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  savedCount: number;
  onOpenSaved: () => void;
}

export function Header({
  savedCount,
  onOpenSaved,
}: HeaderProps) {
  return (
    <header className="w-full flex items-center justify-between px-5 pt-4 pb-3 select-none relative z-20">
      {/* Brand & Identity Logo */}
      <Logo size="md" />

      {/* Action Controls: Saved */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="saved-lines-btn"
          onClick={onOpenSaved}
          className="relative flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-95 transition-all text-xs font-semibold shadow-sm backdrop-blur-md"
          aria-label="View saved pickup lines"
        >
          <Bookmark className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
          <span>Saved</span>
          {savedCount > 0 ? (
            <span className="min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm shadow-rose-500/40 animate-pulse">
              {savedCount}
            </span>
          ) : (
            <Compass className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>
      </div>
    </header>
  );
}
