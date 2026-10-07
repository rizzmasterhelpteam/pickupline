import { memo, type PointerEvent as ReactPointerEvent, type ReactNode, useState, useEffect, useRef } from 'react';
import { animate, motion, AnimatePresence, useMotionValue, useReducedMotion, type Variants } from 'motion/react';
import { 
  Copy, 
  Check, 
  Heart, 
  Share2, 
  Sparkles, 
  Layers,
  Lightbulb,
  ChevronDown
} from 'lucide-react';
import { PickupLine, RizzReaction } from '../types';
import { CATEGORIES } from '../data/curatedLines';
import { cleanLineText, resolveAccurateCategory } from '../utils/textSanitizer';
import { shareText } from '../utils/share';
import { copyText } from '../utils/clipboard';
import { tapFeedback } from '../utils/haptics';
import { useTransientMessage } from '../hooks/useTransientMessage';

interface PickupCardProps {
  line: PickupLine;
  isSaved: boolean;
  onToggleSave: (line: PickupLine) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSwipe: () => void;
  canGoPrevious: boolean;
  onOpenIcebreaker: (line: PickupLine) => void;
  userReaction?: RizzReaction | null;
  onReact: (lineId: string, reaction: RizzReaction) => void;
  reactions: { fire: number; cheesy: number; cringe: number };
  isLoading?: boolean;
  latencyMs?: number;
  apiSource?: string;
  isFallback?: boolean;
  skipTransition?: boolean;
  transitionKey?: string;
}

const CATEGORY_THEMES: Record<string, {
  glowTop: string;
  glowBottom: string;
  borderAccent: string;
  badgeBg: string;
  badgeText: string;
}> = {
  smooth: {
    glowTop: 'from-amber-500/15 via-rose-500/5 to-transparent',
    glowBottom: 'from-amber-500/10 to-transparent',
    borderAccent: 'group-hover:border-amber-500/30',
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeText: 'text-amber-300',
  },
  cheesy: {
    glowTop: 'from-yellow-500/15 via-amber-500/5 to-transparent',
    glowBottom: 'from-yellow-500/10 to-transparent',
    borderAccent: 'group-hover:border-yellow-500/30',
    badgeBg: 'bg-yellow-500/15 border-yellow-500/30',
    badgeText: 'text-yellow-300',
  },
  nerdy: {
    glowTop: 'from-cyan-500/15 via-blue-500/5 to-transparent',
    glowBottom: 'from-cyan-500/10 to-transparent',
    borderAccent: 'group-hover:border-cyan-500/30',
    badgeBg: 'bg-cyan-500/15 border-cyan-500/30',
    badgeText: 'text-cyan-300',
  },
  romantic: {
    glowTop: 'from-rose-500/20 via-pink-500/5 to-transparent',
    glowBottom: 'from-rose-500/10 to-transparent',
    borderAccent: 'group-hover:border-rose-500/30',
    badgeBg: 'bg-rose-500/15 border-rose-500/30',
    badgeText: 'text-rose-300',
  },
  funny: {
    glowTop: 'from-orange-500/20 via-amber-500/5 to-transparent',
    glowBottom: 'from-orange-500/10 to-transparent',
    borderAccent: 'group-hover:border-orange-500/30',
    badgeBg: 'bg-orange-500/15 border-orange-500/30',
    badgeText: 'text-orange-300',
  },
  foodie: {
    glowTop: 'from-red-500/15 via-orange-500/5 to-transparent',
    glowBottom: 'from-red-500/10 to-transparent',
    borderAccent: 'group-hover:border-red-500/30',
    badgeBg: 'bg-red-500/15 border-red-500/30',
    badgeText: 'text-red-300',
  },
  clever: {
    glowTop: 'from-purple-500/15 via-indigo-500/5 to-transparent',
    glowBottom: 'from-purple-500/10 to-transparent',
    borderAccent: 'group-hover:border-purple-500/30',
    badgeBg: 'bg-purple-500/15 border-purple-500/30',
    badgeText: 'text-purple-300',
  },
};

const CARD_VARIANTS: Variants = {
  initial: (direction: -1 | 1) => ({
    // Enter from the opposite edge of the swipe. A small offset makes the
    // replacement appear in place; a viewport-sized offset makes it visibly
    // travel in with the gesture.
    x: -direction * Math.min(Math.max(window.innerWidth * 0.7, 220), 360),
    scale: 0.98,
    opacity: 0.45,
  }),
  animate: {
    x: 0,
    scale: 1,
    opacity: 1,
    transition: {
      x: { type: 'spring', stiffness: 360, damping: 32, mass: 0.78 },
      scale: { duration: 0.24, ease: 'easeOut' },
      opacity: { duration: 0.16, ease: 'easeOut' },
    },
  },
  exit: (direction: -1 | 1) => ({
    // Keep the old card moving in the same direction while the new card
    // enters from the opposite side, so the two cards share one trajectory.
    x: direction * Math.min(Math.max(window.innerWidth * 0.9, 300), 520),
    scale: 0.98,
    opacity: 0,
    transition: {
      x: { duration: 0.28, ease: 'easeOut' },
      scale: { duration: 0.22, ease: 'easeOut' },
      opacity: { duration: 0.2, ease: 'easeOut' },
    },
  }),
};

interface SwipeSurfaceProps {
  children: ReactNode;
  onSwipe: (direction: -1 | 1) => void;
  canSwipePrevious: boolean;
  disabled?: boolean;
}

const SwipeSurface = memo(function SwipeSurface({ children, onSwipe, canSwipePrevious, disabled = false }: SwipeSurfaceProps) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const isSwiping = useRef(false);
  const swipeAnimation = useRef<ReturnType<typeof animate> | null>(null);
  const swipeTimer = useRef<number | null>(null);
  const pointer = useRef({
    id: null as number | null,
    startX: 0,
    startY: 0,
    startedAt: 0,
    cancelled: false,
  });

  useEffect(() => {
    return () => {
      swipeAnimation.current?.stop();
      if (swipeTimer.current !== null) {
        window.clearTimeout(swipeTimer.current);
      }
    };
  }, []);

  const settleSwipe = (displacement: number, velocity: number) => {
    if (isSwiping.current) return;

    const direction = (displacement || velocity) >= 0 ? 1 : -1;
    const shouldAdvance = Math.abs(displacement) > 90 || Math.abs(velocity) > 350;

    if (!shouldAdvance) {
      swipeAnimation.current?.stop();
      swipeAnimation.current = animate(x, 0, {
        type: 'spring',
        stiffness: 520,
        damping: 34,
        mass: 0.55,
      });
      return;
    }

    // Left swipe goes forward. Right swipe goes back, but the first card has
    // no previous entry, so keep it in place with the same spring-back feel.
    if (direction === 1 && !canSwipePrevious) {
      swipeAnimation.current?.stop();
      swipeAnimation.current = animate(x, 0, {
        type: 'spring',
        stiffness: 520,
        damping: 34,
        mass: 0.55,
      });
      return;
    }

    isSwiping.current = true;
    tapFeedback();
    if (reducedMotion) { x.set(0); isSwiping.current = false; onSwipe(direction); return; }

    const animation = animate(x, direction * Math.max(window.innerWidth + 120, 520), {
      duration: 0.28,
      ease: 'easeOut',
    });
    swipeAnimation.current = animation;
    // Give the outgoing card a short head start before the replacement enters.
    // This keeps the transition smooth without making the next card feel instant.
    swipeTimer.current = window.setTimeout(() => {
      if (!isSwiping.current) return;
      isSwiping.current = false;
      swipeAnimation.current = null;
      swipeTimer.current = null;
      onSwipe(direction);
    }, 160);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (disabled || isSwiping.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (target instanceof Element && target.closest('button')) return;

    swipeAnimation.current?.stop();
    swipeAnimation.current = null;
    if (swipeTimer.current !== null) {
      window.clearTimeout(swipeTimer.current);
      swipeTimer.current = null;
    }

    pointer.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      cancelled: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current.id !== event.pointerId || isSwiping.current) return;

    const deltaX = event.clientX - pointer.current.startX;
    const deltaY = event.clientY - pointer.current.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) + 10 && Math.abs(deltaY) > 10) {
      pointer.current.cancelled = true;
      x.set(0);
      return;
    }

    if (pointer.current.cancelled) return;
    event.preventDefault();
    x.set(Math.max(-280, Math.min(280, deltaX)));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current.id !== event.pointerId) return;

    const { startedAt, cancelled } = pointer.current;
    pointer.current.id = null;
    if (cancelled) {
      x.set(0);
      return;
    }

    const elapsed = Math.max(1, performance.now() - startedAt);
    const displacement = Math.max(-280, Math.min(280, event.clientX - pointer.current.startX));
    x.set(displacement);
    settleSwipe(displacement, (displacement / elapsed) * 1000);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current.id !== event.pointerId) return;
    pointer.current.id = null;
    // Android cancels a pointer when the OS takes over a scroll. Never advance.
    pointer.current.cancelled = true;
    swipeAnimation.current = animate(x, 0, {
      type: 'spring',
      stiffness: 520,
      damping: 34,
      mass: 0.55,
    });
  };

  return (
    <div className="relative w-full min-w-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[2rem] border border-zinc-800/80 bg-zinc-900/70 shadow-[0_10px_26px_rgba(0,0,0,0.32)]"
      />
      <motion.div
        style={{ x }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative z-10 w-full min-w-0 max-w-full cursor-grab active:cursor-grabbing select-none touch-pan-y will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
});

export const PickupCard = memo(function PickupCard({
  line,
  isSaved,
  onToggleSave,
  onNext,
  onPrevious,
  onSwipe,
  canGoPrevious,
  onOpenIcebreaker,
  userReaction,
  onReact,
  reactions,
  isLoading = false,
  latencyMs,
  skipTransition = false,
  transitionKey,
}: PickupCardProps) {
  const reducedMotion = useReducedMotion();
  const [copied, showCopied, resetCopied] = useTransientMessage(false);
  const [error, showError] = useTransientMessage<string | null>(null);
  const [showTip, setShowTip] = useState(false);
  const enterDirectionRef = useRef<-1 | 1>(1);

  useEffect(() => {
    setShowTip(false);
    resetCopied();
  }, [line.id, resetCopied]);

  const cleanedText = cleanLineText(line.text);
  const resolvedCategory = resolveAccurateCategory(cleanedText, line.category);

  const categoryObj = CATEGORIES.find(c => c.id === resolvedCategory) || {
    label: resolvedCategory,
    emoji: '✨',
  };

  const theme = CATEGORY_THEMES[resolvedCategory] || CATEGORY_THEMES.smooth;

  const totalReactions = reactions.fire + reactions.cheesy + reactions.cringe;
  const firePercent = totalReactions ? (reactions.fire / totalReactions) * 100 : 0;
  const cheesyPercent = totalReactions ? (reactions.cheesy / totalReactions) * 100 : 0;
  const cringePercent = totalReactions ? (reactions.cringe / totalReactions) * 100 : 0;

  const handleCopy = async () => {
    try {
      await copyText(cleanedText);
      showCopied(true);
      tapFeedback();
    } catch {
      showError('Could not copy. Please try sharing the line.');
    }
  };

  const handleShare = async () => {
    tapFeedback();
    try {
      const outcome = await shareText({
        title: 'Pickup Line',
        text: `"${cleanedText}"\n\n\u2728 [${resolvedCategory.toUpperCase()}] \u2022 via RizzLine`,
        dialogTitle: 'Share Pickup Line',
      });
      if (outcome === 'copied') {
        showCopied(true);
      }
    } catch {
      await handleCopy();
    }
  };

  return (
    <div className="card-stage w-full max-w-full min-w-0 min-h-0 flex-1 flex flex-col items-center overflow-x-hidden overflow-y-auto overscroll-contain px-2.5 sm:px-6 py-2 sm:py-4 relative">
      <AnimatePresence initial={false} mode="popLayout" custom={enterDirectionRef.current}>
        <motion.div
          key={transitionKey || line.id}
          custom={enterDirectionRef.current}
          variants={CARD_VARIANTS}
          initial={skipTransition || reducedMotion ? false : 'initial'}
          animate="animate"
          exit={skipTransition || reducedMotion ? undefined : 'exit'}
          className="my-auto w-full max-w-full min-w-0 shrink-0 will-change-transform"
        >
          <SwipeSurface
            onSwipe={(direction) => {
              enterDirectionRef.current = direction;
              if (direction < 0) onNext();
              else onPrevious();
              onSwipe();
            }}
            canSwipePrevious={canGoPrevious}
            disabled={isLoading}
          >
            <div className="relative min-w-0 rounded-[1.7rem] sm:rounded-[2.25rem] bg-gradient-to-b from-[#15151a] via-[#111116] to-[#0d0d11] border border-white/[0.09] p-3 sm:p-7 shadow-[0_18px_46px_rgba(0,0,0,0.58)] ring-1 ring-inset ring-white/[0.025] flex flex-col justify-between min-h-[320px] sm:min-h-[500px] overflow-hidden group rizz-card-surface">
            
            {/* Ambient category glow spotlight */}
            <div className={`absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-b ${theme.glowTop} rounded-full blur-xl pointer-events-none`} />
            <div className={`absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-t ${theme.glowBottom} rounded-full blur-xl pointer-events-none`} />

            {/* Top metadata bar */}
            <div className="flex items-center justify-between gap-2 min-w-0 relative z-10 pb-2.5 sm:pb-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-flex min-w-0 max-w-[9rem] items-center gap-1.5 px-3 py-1.5 rounded-full ${theme.badgeBg} border text-xs font-semibold ${theme.badgeText} shadow-sm backdrop-blur-md`}>
                  <span>{categoryObj.emoji}</span>
                  <span className="capitalize truncate">{categoryObj.label}</span>
                </span>

                {latencyMs !== undefined && (
                  <span className="hidden sm:inline text-[10px] text-zinc-500 font-mono tracking-tight">
                    {latencyMs}ms
                  </span>
                )}
              </div>

              {/* Action utilities */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Icebreaker Card Snapshot */}
                <button
                  type="button"
                  onClick={() => onOpenIcebreaker(line)}
                  id="icebreaker-preview-btn"
                  title="Generate Icebreaker Card image snapshot"
                  aria-label="Create a shareable story card"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-zinc-400 transition-all hover:bg-white/[0.07] hover:text-white active:scale-[0.92]"
                >
                   <Layers className="w-5 h-5" />
                </button>

                {/* Favorite Bookmark */}
                <button
                  type="button"
                  onClick={() => {
                    tapFeedback();
                    onToggleSave(line);
                  }}
                  id="save-favorite-btn"
                  title={isSaved ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={isSaved ? 'Remove line from saved' : 'Save line'}
                  aria-pressed={isSaved}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all active:scale-[0.92] ${
                    isSaved
                      ? 'bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/30'
                      : 'text-zinc-400 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                   <Heart className={`w-5 h-5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Central Pickup Line Typography */}
            <div className="my-auto py-1.5 sm:py-8 relative z-10 flex flex-col justify-center min-w-0">
              <span aria-hidden="true" className="-mb-2 select-none font-serif text-3xl leading-none text-rose-500/25">
                &ldquo;
              </span>
              
              <p className="max-w-[36ch] break-words text-[clamp(1rem,4.2vw,1.28rem)] font-bold leading-[1.24] tracking-tight text-zinc-100">
                {cleanedText}
              </p>

              <div className="flex items-center justify-between mt-1.5">
                <span aria-hidden="true" className="-mt-2 select-none font-serif text-2xl leading-none text-rose-500/25">
                  &rdquo;
                </span>

                {line.deliveryTip && (
                  <button
                    type="button"
                    onClick={() => setShowTip(!showTip)}
                    aria-expanded={showTip}
                    aria-label={showTip ? 'Hide delivery coach tip' : 'Show delivery coach tip'}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20"
                  >
                     <Lightbulb className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delivery Coach</span>
                     <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTip ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Delivery coach tip card */}
              {showTip && line.deliveryTip && (
                  <div className="mt-3 rounded-2xl border border-rose-500/30 bg-zinc-950/95 p-3.5 text-xs leading-relaxed text-zinc-300 shadow-lg">
                     <div className="flex items-center gap-1.5 font-bold text-rose-300 text-[11px] uppercase tracking-wider mb-1">
                       <Sparkles className="w-3 h-3 text-rose-400" />
                      <span>Pro Delivery Advice</span>
                    </div>
                    <p className="text-zinc-300 font-normal">
                      {line.deliveryTip}
                    </p>
                  </div>
              )}
            </div>

            {/* Bottom Actions & Rizz Meter */}
            <div className="relative z-10 space-y-1.5 border-t border-white/[0.07] pt-2 sm:space-y-3 sm:pt-4">
              
              {/* Rizz Meter interactive reaction bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Rizz Rating
                  </span>
                   <span className="text-xs font-mono text-zinc-500">
                    {totalReactions.toLocaleString()} votes
                  </span>
                </div>

                {/* Reaction Pill Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    id="react-fire-btn"
                    onClick={() => onReact(line.id, 'fire')}
                    aria-pressed={userReaction === 'fire'}
                    className={`min-h-11 min-w-0 flex items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-all sm:py-3 ${
                      userReaction === 'fire'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-[1.03]'
                        : 'bg-zinc-800/70 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/50'
                    }`}
                  >
                    <span>🔥</span>
                    <span>Fire</span>
                    <span className="text-[10px] font-mono opacity-80">{reactions.fire}</span>
                  </button>

                  <button
                    type="button"
                    id="react-cheesy-btn"
                    onClick={() => onReact(line.id, 'cheesy')}
                    aria-pressed={userReaction === 'cheesy'}
                    className={`min-h-11 min-w-0 flex items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-all sm:py-3 ${
                      userReaction === 'cheesy'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-[1.03]'
                        : 'bg-zinc-800/70 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/50'
                    }`}
                  >
                    <span>🧀</span>
                    <span>Cheesy</span>
                    <span className="text-[10px] font-mono opacity-80">{reactions.cheesy}</span>
                  </button>

                  <button
                    type="button"
                    id="react-cringe-btn"
                    onClick={() => onReact(line.id, 'cringe')}
                    aria-pressed={userReaction === 'cringe'}
                    className={`min-h-11 min-w-0 flex items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-all sm:py-3 ${
                      userReaction === 'cringe'
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30 scale-[1.03]'
                        : 'bg-zinc-800/70 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/50'
                    }`}
                  >
                    <span>💀</span>
                    <span>Cringe</span>
                    <span className="text-[10px] font-mono opacity-80">{reactions.cringe}</span>
                  </button>
                </div>

                {/* Proportional Rizz spectrum bar */}
                <div
                  className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
                  role="img"
                  aria-label={`Rizz rating: ${firePercent}% fire, ${cheesyPercent}% cheesy, ${cringePercent}% cringe`}
                >
                  <div
                    style={{ width: `${firePercent}%` }}
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-300"
                    title={`Fire: ${firePercent}%`}
                  />
                  <div
                    style={{ width: `${cheesyPercent}%` }}
                    className="h-full bg-amber-400 transition-all duration-300"
                    title={`Cheesy: ${cheesyPercent}%`}
                  />
                  <div
                    style={{ width: `${cringePercent}%` }}
                    className="h-full bg-purple-500 transition-all duration-300"
                    title={`Cringe: ${cringePercent}%`}
                  />
                </div>
              </div>

              {/* Utility actions: Copy & Share */}
              <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                <button
                  type="button"
                  id="copy-line-btn"
                  onClick={handleCopy}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold shadow-sm transition-all active:scale-[0.97] sm:py-3.5 ${
                    copied
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-700/60'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-zinc-400" />
                      <span>Copy Line</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="share-line-btn"
                  onClick={handleShare}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.055] px-2 py-2 text-xs font-semibold text-zinc-200 shadow-sm transition-all hover:bg-white/[0.09] hover:text-white active:scale-[0.97] sm:py-3.5"
                >
                  <Share2 className="w-4 h-4 text-zinc-400" />
                  <span>Share Line</span>
                </button>
              </div>
              {error && <p role="status" className="text-center text-xs text-rose-300">{error}</p>}
            </div>
            </div>
          </SwipeSurface>
        </motion.div>
      </AnimatePresence>

    </div>
  );
});
