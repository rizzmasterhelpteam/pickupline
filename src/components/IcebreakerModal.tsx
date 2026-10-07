import { memo, useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Share2, Download, Image as ImageIcon, Loader2, Heart } from 'lucide-react';
import { PickupLine } from '../types';
import { RizzHeartIcon } from './Logo';
import { shareStoryCard, downloadStoryCard, generateStoryCardBlob } from '../utils/storyCardGenerator';
import { cleanLineText, resolveAccurateCategory } from '../utils/textSanitizer';
import { copyText } from '../utils/clipboard';
import { tapFeedback } from '../utils/haptics';
import { useTransientMessage } from '../hooks/useTransientMessage';
import { useDialog } from '../hooks/useDialog';

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

export const IcebreakerModal = memo(function IcebreakerModal({ isOpen, onClose, line }: IcebreakerModalProps) {
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [creatorName, setCreatorName] = useState('');
  const [copied, showCopied] = useTransientMessage(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const [toastMessage, showToast] = useTransientMessage<string | null>(null, 2500);
  const dialogRef = useDialog(isOpen, onClose);
  useEffect(() => {
    if (!isOpen || !line) return;
    let timer: number | null = null;
    let idleId: number | null = null;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const warmStory = () => { void generateStoryCardBlob(line, selectedTheme.id, creatorName).catch(() => {}); };
    if (idleWindow.requestIdleCallback) idleId = idleWindow.requestIdleCallback(warmStory, { timeout: 1500 });
    else timer = window.setTimeout(warmStory, 1200);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [creatorName, isOpen, line, selectedTheme.id]);

  if (!isOpen || !line) return null;

  const cleanText = cleanLineText(line.text);
  const accurateCategory = resolveAccurateCategory(cleanText, line.category);
  const sanitizedLine: PickupLine = {
    ...line,
    text: cleanText,
    category: accurateCategory,
  };

  const handleCopyFormatted = async () => {
    const formatted = `"${cleanText}"\n\n✨ [${accurateCategory.toUpperCase()}] • via RizzLine`;
    try {
      await copyText(formatted);
      showCopied(true);
      showToast('Text copied to clipboard!');
      tapFeedback();
    } catch { showToast('Could not copy. Please try again.'); }
  };

  const handleShareCardImage = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    tapFeedback();

    try {
      const outcome = await shareStoryCard(sanitizedLine, selectedTheme.id, creatorName);
      if (outcome === 'downloaded') {
        showToast('Story card image saved!');
      } else if (outcome === 'shared') {
        showToast('Story card shared!');
      }
    } catch (err) {
      console.error('Failed to share story image:', err);
      showToast('Image sharing failed. Try Save PNG instead.');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleDownloadImage = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    tapFeedback();

    try {
      const outcome = await downloadStoryCard(sanitizedLine, selectedTheme.id, creatorName);
      if (outcome === 'saved') showToast('Story card saved!');
      else if (outcome === 'downloaded') showToast('Story card PNG downloaded!');
    } catch (err) {
      console.error('Failed to download image:', err);
      showToast('Image could not be saved. Please try again.');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="icebreaker-dialog-title">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="overlay-backdrop fixed inset-0 bg-black/80"
        />

        {/* Modal Container */}
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="relative z-10 flex max-h-[calc(100svh-1.5rem)] w-full max-w-sm flex-col gap-3.5 overflow-y-auto rounded-[2rem] border border-white/[0.09] bg-[#111116] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:max-h-[calc(100svh-2rem)] sm:p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 id="icebreaker-dialog-title" className="font-['Space_Grotesk'] text-sm font-bold text-zinc-100">
                  Love Note Card
                </h3>
                <p className="text-[11px] text-zinc-400">Create a romantic card for stories & DMs</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close love note card preview"
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/[0.07] bg-zinc-950/60 p-1">
            {CARD_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme)}
                className={`min-h-10 flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all ${
                  selectedTheme.id === theme.id
                    ? `${theme.accent} bg-zinc-800 border border-zinc-700/60 shadow-sm`
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>

          {/* Optional name shown on the exported card */}
          <label htmlFor="love-note-card-name" className="space-y-1">
            <span className="flex items-center justify-between px-1 text-[11px] font-semibold text-zinc-400">
              <span>Name on card</span>
              <span className="font-normal text-zinc-600">Optional</span>
            </span>
            <input
              id="love-note-card-name"
              type="text"
              value={creatorName}
              maxLength={32}
              autoComplete="name"
              onChange={(event) => setCreatorName(event.target.value.slice(0, 32))}
              placeholder="e.g. Alex"
              className="min-h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] px-3.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30"
            />
          </label>

          {/* Visual Card Frame (Live preview of story card image) */}
          <div
            className={`relative flex min-h-[250px] w-full flex-col justify-between overflow-hidden rounded-3xl border ${selectedTheme.border} bg-gradient-to-br ${selectedTheme.bg} p-5 text-center shadow-2xl`}
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
              <p className="text-base sm:text-lg font-semibold text-zinc-100 leading-relaxed">
                “{cleanText}”
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-3 border-t border-white/10 relative z-10">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <RizzHeartIcon size={18} />
                <span>RizzLine</span>
              </div>
              <span className="max-w-[9rem] truncate text-[10px] text-zinc-400">
                {creatorName.trim() ? `— ${creatorName.trim()}` : 'Add your name'}
              </span>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
              <div
                role="status"
                className="py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{toastMessage}</span>
              </div>
            )}

          {/* Action Buttons: Share Image, Save Image & Copy Text */}
          <div className="flex flex-col gap-2">
            {/* Primary Action: Share Story Card Image */}
            <button
              type="button"
              onClick={handleShareCardImage}
              disabled={isProcessing}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 py-3 text-xs font-bold tracking-wide text-white shadow-lg shadow-rose-500/25 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Preparing Story Image...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-white" />
                  <span>Share Love Note Card</span>
                </>
              )}
            </button>

            {/* Secondary Actions: Download PNG Image & Copy Text */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isProcessing}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.055] py-2.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/[0.09] active:scale-[0.97] disabled:opacity-60"
                title="Save 1080x1920 love note card"
              >
                <Download className="w-3.5 h-3.5 text-zinc-300" />
                <span>Save PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFormatted}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.055] py-2.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/[0.09] active:scale-[0.97]"
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
        </div>
    </div>
  );
});
