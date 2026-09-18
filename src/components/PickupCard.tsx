import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
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

interface PickupCardProps {
  line: PickupLine;
  isSaved: boolean;
  onToggleSave: (line: PickupLine) => void;
  onNext: () => void;
  onOpenIcebreaker: (line: PickupLine) => void;
  userReaction?: RizzReaction | null;
  onReact: (lineId: string, reaction: RizzReaction) => void;
  reactions: { fire: number; cheesy: number; cringe: number };
  latencyMs?: number;
  apiSource?: string;
  isFallback?: boolean;
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

export function PickupCard({
  line,
  isSaved,
  onToggleSave,
  onNext,
  onOpenIcebreaker,
  userReaction,
  onReact,
  reactions,
  latencyMs,
}: PickupCardProps) {
  const [copied, setCopied] = useState(false);
  const [showTip, setShowTip] = useState(false);

  // Motion drag value for swipe gesture
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -120, 0, 120, 200], [0.6, 0.95, 1, 0.95, 0.6]);

  useEffect(() => {
    setShowTip(false);
    setCopied(false);
  }, [line.id]);

  const cleanedText = cleanLineText(line.text);
  const resolvedCategory = resolveAccurateCategory(cleanedText, line.category);

  const categoryObj = CATEGORIES.find(c => c.id === resolvedCategory) || {
    label: resolvedCategory,
    emoji: '✨',
  };

  const theme = CATEGORY_THEMES[resolvedCategory] || CATEGORY_THEMES.smooth;

  const totalReactions = Math.max(1, reactions.fire + reactions.cheesy + reactions.cringe);
  const firePercent = Math.round((reactions.fire / totalReactions) * 100);
  const cheesyPercent = Math.round((reactions.cheesy / totalReactions) * 100);
  const cringePercent = Math.round((reactions.cringe / totalReactions) * 100);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanedText);
      setCopied(true);
      if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pickup Line',
          text: `"${cleanedText}"\n\n✨ [${resolvedCategory.toUpperCase()}] • via RizzLine`,
        });
      } catch {
        // Dismissed share sheet
      }
    } else {
      handleCopy();
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 350) {
      if (navigator.vibrate) navigator.vibrate(20);
      onNext();
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center items-center px-4 py-2 relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={line.id}
          style={{ x, rotate, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.65}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: -12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="w-full max-w-sm cursor-grab active:cursor-grabbing select-none"
        >
          <div className="relative rounded-[2rem] bg-gradient-to-b from-zinc-900/90 via-zinc-900/80 to-zinc-950/90 border border-zinc-800/90 p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col justify-between min-h-[400px] overflow-hidden group">
            
            {/* Ambient category glow spotlight */}
            <div className={`absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-b ${theme.glowTop} rounded-full blur-3xl pointer-events-none transition-colors duration-500`} />
            <div className={`absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-t ${theme.glowBottom} rounded-full blur-3xl pointer-events-none transition-colors duration-500`} />

            {/* Top metadata bar */}
            <div className="flex items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${theme.badgeBg} border text-xs font-semibold ${theme.badgeText} shadow-sm backdrop-blur-md`}>
                  <span>{categoryObj.emoji}</span>
                  <span className="capitalize">{categoryObj.label}</span>
                </span>

                {latencyMs !== undefined && (
                  <span className="text-[10px] text-zinc-500 font-mono tracking-tight">
                    {latencyMs}ms
                  </span>
                )}
              </div>

              {/* Action utilities */}
              <div className="flex items-center gap-1">
                {/* Icebreaker Card Snapshot */}
                <button
                  type="button"
                  onClick={() => onOpenIcebreaker(line)}
                  id="icebreaker-preview-btn"
                  title="Generate Icebreaker Card image snapshot"
                  className="p-2.5 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-90 transition-all"
                >
                  <Layers className="w-4 h-4" />
                </button>

                {/* Favorite Bookmark */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(15);
                    onToggleSave(line);
                  }}
                  id="save-favorite-btn"
                  title={isSaved ? 'Remove from favorites' : 'Add to favorites'}
                  className={`p-2.5 rounded-2xl active:scale-90 transition-all ${
                    isSaved
                      ? 'text-rose-500 bg-rose-500/15 ring-1 ring-rose-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Central Pickup Line Typography */}
            <div className="my-auto py-5 relative z-10 flex flex-col justify-center">
              <span className="text-4xl text-rose-500/25 font-serif select-none -mb-3 leading-none">
                “
              </span>
              
              <p className="text-lg sm:text-[21px] font-semibold tracking-tight text-zinc-100 leading-[1.65] font-['Plus_Jakarta_Sans'] max-w-[36ch]">
                {cleanedText}
              </p>

              <div className="flex items-center justify-between mt-2">
                <span className="text-3xl text-rose-500/25 font-serif select-none -mt-3 leading-none">
                  ”
                </span>

                {line.deliveryTip && (
                  <button
                    type="button"
                    onClick={() => setShowTip(!showTip)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-all"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Delivery Coach</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showTip ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Delivery coach tip card */}
              <AnimatePresence>
                {showTip && line.deliveryTip && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    className="mt-3 p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/30 text-xs text-zinc-300 leading-relaxed shadow-lg backdrop-blur-md"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px] uppercase tracking-wider mb-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Pro Delivery Advice</span>
                    </div>
                    <p className="text-zinc-300 font-normal">
                      {line.deliveryTip}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Actions & Rizz Meter */}
            <div className="space-y-3 pt-3 border-t border-zinc-800/80 relative z-10">
              
              {/* Rizz Meter interactive reaction bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 tracking-wide uppercase">
                    Rizz Rating
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {totalReactions.toLocaleString()} votes
                  </span>
                </div>

                {/* Reaction Pill Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    id="react-fire-btn"
                    onClick={() => onReact(line.id, 'fire')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
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
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  id="copy-line-btn"
                  onClick={handleCopy}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-semibold active:scale-95 transition-all shadow-sm ${
                    copied
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-700/60'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Line</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="share-line-btn"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/60 text-xs font-semibold active:scale-95 transition-all shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Share Line</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Subtle interaction cue */}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500/50" />
        <span>Swipe card left/right or tap Generate Next below</span>
      </div>
    </div>
  );
}
