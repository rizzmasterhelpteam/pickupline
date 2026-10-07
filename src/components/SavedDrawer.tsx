import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { 
  X, 
  Trash2, 
  Copy, 
  Check, 
  Share2, 
  Bookmark, 
  Search, 
  ExternalLink
} from 'lucide-react';
import { PickupLine } from '../types';
import { CATEGORIES } from '../data/curatedLines';
import { RizzHeartIcon } from './Logo';
import { cleanLineText, resolveAccurateCategory } from '../utils/textSanitizer';
import { shareText } from '../utils/share';
import { copyText } from '../utils/clipboard';
import { tapFeedback } from '../utils/haptics';
import { useTransientMessage } from '../hooks/useTransientMessage';
import { useDialog } from '../hooks/useDialog';

interface SavedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedLines: PickupLine[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onSelectLine: (line: PickupLine) => void;
}

const INITIAL_VISIBLE_LINES = 24;
const VISIBLE_LINES_STEP = 24;

export const SavedDrawer = memo(function SavedDrawer({
  isOpen,
  onClose,
  savedLines,
  onRemove,
  onClearAll,
  onSelectLine,
}: SavedDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_LINES);
  const [copiedId, showCopied] = useTransientMessage<string | null>(null, 1800);
  const [error, showError] = useTransientMessage<string | null>(null);
  const dialogRef = useDialog(isOpen, onClose);

  const normalizedSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE_LINES); }, [normalizedSearchTerm, filterCat]);

  const filteredLines = useMemo(() => savedLines.filter((item) => {
    const matchesSearch = item.text.toLowerCase().includes(normalizedSearchTerm);
    const matchesCategory = filterCat === 'all' || item.category === filterCat;
    return matchesSearch && matchesCategory;
  }), [savedLines, filterCat, normalizedSearchTerm]);

  const handleCopy = async (line: PickupLine) => {
    const cleanText = cleanLineText(line.text);
    try {
      await copyText(cleanText);
      showCopied(line.id);
      tapFeedback();
    } catch { showError('Could not copy this line.'); }
  };

  const handleShare = async (line: PickupLine) => {
    const cleanText = cleanLineText(line.text);
    const cleanCat = resolveAccurateCategory(cleanText, line.category);
    try {
      const outcome = await shareText({
        title: 'Pickup Line',
        text: `"${cleanText}"\n\n\u2728 [${cleanCat.toUpperCase()}] \u2022 via RizzLine`,
        dialogTitle: 'Share Pickup Line',
      });
      if (outcome === 'copied') {
        showCopied(line.id);
      }
    } catch {
      await handleCopy(line);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="overlay-backdrop fixed inset-0 bg-black/80 z-40"
      />

      {/* Bottom Sheet / Drawer */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Saved lines"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border-t border-white/[0.09] bg-[#111116] pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_70px_rgba(0,0,0,0.55)] sm:rounded-t-[2.5rem]"
      >
            {/* Sheet Handle */}
            <div className="mx-auto mb-1 mt-3 h-1.5 w-12 rounded-full bg-zinc-700/80" />

            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 pb-3 pt-2">
              <div className="flex min-h-10 items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-zinc-950/80 px-3.5 py-1.5 text-xs font-bold text-white">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved</span>
                  <span className="rounded-full bg-black/25 px-1.5 py-0.2 text-[10px]">
                    {savedLines.length}
                  </span>
              </div>

              <div className="flex items-center gap-2">
                {savedLines.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    id="clear-all-saved-btn"
                    className="flex min-h-11 items-center gap-1 rounded-xl p-2 text-xs text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    title="Clear all saved"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
                  aria-label="Close saved lines"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search & Filter Header */}
            <div className="space-y-2.5 border-b border-white/[0.07] bg-zinc-950/50 px-5 py-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search pickup lines"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your saved lines..."
                  className="min-h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] pl-10 pr-3.5 text-xs text-zinc-200 placeholder-zinc-500 transition-all focus:border-rose-500/60 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 py-1">
                <button
                  type="button"
                  onClick={() => setFilterCat('all')}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filterCat === 'all'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                  }`}
                >
                  🔥 All Vibes
                </button>
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFilterCat(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                      filterCat === cat.id
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List Content Area */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
              {error && <p role="status" className="text-xs text-rose-300">{error}</p>}
              {savedLines.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-900/80 border border-zinc-800 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/10">
                    <RizzHeartIcon size={38} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-200">No saved lines yet</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Generate a new line on the main deck, then tap the heart to keep your favorites here.
                    </p>
                  </div>
                </div>
              ) : filteredLines.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No pickup lines match your search filter.
                </div>
              ) : (
                filteredLines.slice(0, visibleCount).map((line) => {
                  const cleanText = cleanLineText(line.text);
                  const cleanCategory = resolveAccurateCategory(cleanText, line.category);
                  return (
                    <div
                      key={line.id}
                      className="saved-list-card group space-y-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 transition-colors hover:border-white/[0.13] hover:bg-white/[0.06]"
                    >
                      <p className="text-sm text-zinc-200 font-medium leading-relaxed">
                        “{cleanText}”
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-xs text-zinc-400">
                        <span className="capitalize px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800/80 text-zinc-400 font-medium">
                          {cleanCategory}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLine(line);
                              onClose();
                            }}
                            title="Load on main card"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(line)}
                            title="Copy line"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                          >
                            {copiedId === line.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShare(line)}
                            title="Share line"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemove(line.id)}
                            title="Remove saved line"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {filteredLines.length > visibleCount && (
                <button type="button" onClick={() => setVisibleCount(count => count + VISIBLE_LINES_STEP)}
                  className="min-h-11 w-full rounded-xl border border-zinc-700 px-3 py-3 text-xs text-zinc-300">
                  Show more ({Math.min(visibleCount, filteredLines.length)} of {filteredLines.length})
                </button>
              )}
            </div>
      </div>
    </>
  );
});
