import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2, Download, Image as ImageIcon, Loader2, Heart } from 'lucide-react';
import { PickupLine } from '../types';
import { RizzHeartIcon } from './Logo';
import { shareStoryCard, downloadStoryCard } from '../utils/storyCardGenerator';
import { cleanLineText, resolveAccurateCategory, sanitizePickupLine } from '../utils/textSanitizer';

interface IcebreakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: PickupLine | null;
}

const CARD_THEMES = [
  { id: 'rose', name: 'Rose', bg: 'from-rose-950 via-zinc-900 to-zinc-950', border: 'border-rose-500/40', accent: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' },
  { id: 'midnight', name: 'Midnight', bg: 'from-purple-950 via-zinc-900 to-zinc-950', border: 'border-purple-500/40', accent: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
  { id: 'sunset', name: 'Sunset', bg: 'from-amber-950 via-zinc-900 to-zinc-950', border: 'border-amber-500/40', accent: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  { id: 'emerald', name: 'Emerald', bg: 'from-emerald-950 via-zinc-900 to-zinc-950', border: 'border-emerald-500/40', accent: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
];

export function IcebreakerModal({ isOpen, onClose, line }: IcebreakerModalProps) {
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !line) return null;

  const cleanText = cleanLineText(line.text);
  const accurateCategory = resolveAccurateCategory(cleanText, line.category);
  const sanitizedLine: PickupLine = {
    ...line,
    text: cleanText,
    category: accurateCategory,
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyFormatted = () => {
    const formatted = `"${cleanText}"\n\n✨ [${accurateCategory.toUpperCase()}] • via RizzLine`;
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    showToast('Text copied to clipboard!');
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareCardImage = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (navigator.vibrate) navigator.vibrate(15);

    try {
      const outcome = await shareStoryCard(sanitizedLine, selectedTheme.id);
      if (outcome === 'downloaded') {
        showToast('Story card image saved!');
      } else {
        showToast('Story card shared!');
      }
    } catch (err) {
      console.error('Failed to share story image:', err);
      // Fallback to text copy
      handleCopyFormatted();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadImage = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (navigator.vibrate) navigator.vibrate(15);

    try {
      await downloadStoryCard(sanitizedLine, selectedTheme.id);
      showToast('Story card PNG downloaded!');
    } catch (err) {
      console.error('Failed to download image:', err);
      showToast('Download failed. Copied text instead.');
      handleCopyFormatted();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl z-10 flex flex-col gap-3.5 overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-['Space_Grotesk']">
                  Icebreaker Story Card
                </h3>
                <p className="text-[11px] text-zinc-400">Generates high-res image for stories & DMs</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center justify-center gap-1.5 p-1 bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
            {CARD_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedTheme.id === theme.id
                    ? `${theme.accent} bg-zinc-800 border border-zinc-700/60 shadow-sm`
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>

          {/* Visual Card Frame (Live preview of story card image) */}
          <div
            ref={cardRef}
            className={`w-full rounded-3xl bg-gradient-to-br ${selectedTheme.bg} border ${selectedTheme.border} p-5 shadow-2xl flex flex-col justify-between min-h-[250px] text-center relative overflow-hidden`}
          >
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className={`text-[10px] tracking-wider font-mono font-bold uppercase px-2.5 py-1 rounded-full ${selectedTheme.badge} border border-white/10`}>
                {accurateCategory}
              </span>
              <Heart className={`w-3.5 h-3.5 fill-current ${selectedTheme.accent}`} />
            </div>

            <div className="my-auto py-3.5 relative z-10">
              <p className="text-base sm:text-lg font-semibold text-zinc-100 leading-relaxed font-['Plus_Jakarta_Sans']">
                “{cleanText}”
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-3 border-t border-white/10 relative z-10">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <RizzHeartIcon size={18} />
                <span>RizzLine</span>
              </div>
              <span className="text-[10px] text-zinc-400">1,460+ Master Catalog</span>
            </div>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons: Share Image, Save Image & Copy Text */}
          <div className="flex flex-col gap-2">
            {/* Primary Action: Share Story Card Image */}
            <button
              type="button"
              onClick={handleShareCardImage}
              disabled={isProcessing}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 text-white text-xs font-bold tracking-wide active:scale-[0.98] transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 border border-white/15 disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Preparing Story Image...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-white" />
                  <span>Share Story Card (Image)</span>
                </>
              )}
            </button>

            {/* Secondary Actions: Download PNG Image & Copy Text */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isProcessing}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold active:scale-95 transition-all border border-zinc-700/60 disabled:opacity-60"
                title="Download 1080x1920 PNG image"
              >
                <Download className="w-3.5 h-3.5 text-zinc-300" />
                <span>Save PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFormatted}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold active:scale-95 transition-all border border-zinc-700/60"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
