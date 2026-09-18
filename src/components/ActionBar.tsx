import { ChevronLeft, Heart, Shuffle } from 'lucide-react';

interface ActionBarProps {
  onNext: () => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  isLoading: boolean;
}

export function ActionBar({
  onNext,
  onPrevious,
  canGoPrevious,
  isLoading,
}: ActionBarProps) {
  return (
    <div className="w-full max-w-sm mx-auto px-5 pb-5 pt-2 flex flex-col gap-2 select-none relative z-20">
      <div className="flex items-center justify-between gap-2.5">
        {/* Previous Button */}
        <button
          type="button"
          id="prev-line-btn"
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(10);
            onPrevious();
          }}
          disabled={!canGoPrevious}
          className={`flex items-center justify-center w-14 h-14 rounded-2xl border transition-all ${
            canGoPrevious
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 shadow-md'
              : 'bg-zinc-950/60 border-zinc-900/60 text-zinc-700 cursor-not-allowed opacity-40'
          }`}
          aria-label="Previous pickup line"
          title="Previous line (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Primary Next Line CTA Button */}
        <button
          type="button"
          id="next-line-btn"
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate([15, 20]);
            onNext();
          }}
          disabled={isLoading}
          className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-rose-500/25 hover:shadow-rose-500/40 hover:brightness-105 active:scale-[0.98] transition-all duration-200 border border-white/15"
        >
          <Heart className="w-5 h-5 fill-white text-white animate-pulse drop-shadow-sm" />
          <span>Generate Next</span>
        </button>

        {/* Shuffle Random Button */}
        <button
          type="button"
          id="randomize-line-btn"
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(15);
            onNext();
          }}
          disabled={isLoading}
          className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all shadow-md"
          aria-label="Shuffle pickup line"
          title="Shuffle (Spacebar)"
        >
          <Shuffle className="w-5 h-5 text-zinc-300" />
        </button>
      </div>

      {/* Keyboard navigation hint */}
      <div className="hidden sm:flex items-center justify-center gap-2 text-[11px] text-zinc-500 font-medium">
        <span>Press</span>
        <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-400">
          Space
        </kbd>
        <span>or</span>
        <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-400">
          →
        </kbd>
        <span>for next</span>
      </div>
    </div>
  );
}
