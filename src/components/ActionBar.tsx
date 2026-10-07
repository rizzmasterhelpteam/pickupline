import { memo } from 'react';
import { ChevronLeft, Heart, Shuffle, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { tapFeedback } from '../utils/haptics';

interface ActionBarProps {
  onNext: () => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  isLoading: boolean;
  privacyRequired?: boolean;
  onPrivacyOptions?: () => void;
}

export const ActionBar = memo(function ActionBar({
  onNext,
  onPrevious,
  canGoPrevious,
  isLoading,
  privacyRequired = false,
  onPrivacyOptions,
}: ActionBarProps) {
  return (
    <div className="glass-divider w-full min-w-0 shrink-0 max-w-sm mx-auto border-t px-3 sm:px-6 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 sm:pt-4 flex flex-col gap-2 select-none relative z-20">
      <div className="grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          id="prev-line-btn"
          onClick={() => {
            tapFeedback();
            onPrevious();
          }}
          disabled={!canGoPrevious || isLoading}
          className={`flex h-12 min-h-11 w-full items-center justify-center rounded-[1.1rem] border transition-all ${
            canGoPrevious
              ? 'bg-white/[0.045] border-white/[0.08] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white active:scale-[0.97]'
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
            tapFeedback();
            onNext();
          }}
          disabled={isLoading}
          className="flex min-w-0 w-full h-12 min-h-11 items-center justify-center gap-1.5 overflow-hidden rounded-[1.1rem] border border-white/20 bg-gradient-to-r from-rose-500 via-pink-600 to-orange-500 px-2 text-xs font-bold tracking-wide text-white shadow-[0_8px_22px_rgba(244,63,94,0.22)] transition-[transform,filter] duration-200 hover:brightness-105 active:scale-[0.985] disabled:opacity-70 sm:text-base"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5 fill-white text-white drop-shadow-sm" />}
          <span className="truncate">Generate Next</span>
        </button>

        {/* Shuffle Random Button */}
        <button
          type="button"
          id="randomize-line-btn"
          onClick={() => {
            tapFeedback();
            onNext();
          }}
          disabled={isLoading}
          className="flex h-12 min-h-11 w-full items-center justify-center rounded-[1.1rem] border border-white/[0.08] bg-white/[0.045] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white active:scale-[0.97]"
          aria-label="Shuffle pickup line"
          title="Shuffle"
        >
          <Shuffle className="w-5 h-5 text-zinc-300" />
        </button>
      </div>

      {/* Reserved banner-ad slot. Keep this height stable when an ad SDK is attached. */}
      <div
        id="banner-ad-slot"
        data-ad-slot="banner-bottom"
        role="complementary"
        aria-label="Reserved space for banner advertisement"
        className={`mx-auto flex h-[50px] w-full max-w-[320px] shrink-0 items-center justify-between overflow-hidden ${Capacitor.isNativePlatform() ? 'bg-transparent' : 'border border-zinc-300 bg-white px-2 text-zinc-900 shadow-[0_2px_12px_rgba(0,0,0,0.25)]'}`}
      >
        {!Capacitor.isNativePlatform() && <>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-cyan-500 text-sm font-bold text-cyan-600">i</span>
          <span className="truncate text-[11px] font-medium leading-tight text-zinc-500">Advertisement preview</span>
        </div>
        <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Test Ad</span>
        <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-[11px] font-bold text-white">320 × 50</span>
        </>}
      </div>
      {privacyRequired && <button type="button" onClick={onPrivacyOptions}
        className="absolute -top-7 right-4 rounded-full bg-zinc-950 px-3 py-1 text-[11px] text-zinc-400 hover:text-white">
        Ad privacy options
      </button>}
    </div>
  );
});
